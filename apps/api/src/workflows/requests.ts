import { and, eq, inArray, sql } from 'drizzle-orm';
import type { z } from 'zod';
import {
  CITIZEN_CAN_COMMENT, CITIZEN_REOPENABLE, REASON_REQUIRED, canStaffTransition,
  generateTrackingCode, validateFormData, type CreateRequestInput,
  type adminAssignBody, type adminStatusBody, type adminTransferBody, type adminCommentBody,
} from '@torbat/contracts';
import type { Db } from '../db/client';
import type { AppContext, CitizenAuth, StaffAuth } from '../context';
import { attachments, idempotencyKeys, notifications, organizationMembers, organizations, requests, requestAssignments, requestComments, requestStatusHistory } from '../db/schema';
import { audit } from '../lib/audit';
import { badRequest, conflict, forbidden, notFound } from '../lib/errors';
import { sha256 } from '../lib/crypto';

export type RequestRecord = typeof requests.$inferSelect;
type StaffAction = 'read' | 'work' | 'dispatch';
export function requireOrganization(staff: StaffAuth, organizationId: string | null, action: StaffAction = 'work') {
  if (staff.platformRole === 'platform_admin') return;
  const membership = staff.memberships.find(m => m.organizationId === organizationId);
  if (!membership) throw forbidden('دسترسی به پرونده سازمان دیگر مجاز نیست.');
  if (action === 'dispatch' && !['org_dispatcher', 'org_manager'].includes(membership.role)) {
    throw forbidden('این اقدام فقط برای مسئول ارجاع یا مدیر سازمان مجاز است.');
  }
}
export function canDispatch(staff: StaffAuth, organizationId: string | null) {
  return staff.platformRole === 'platform_admin' || staff.memberships.some(m => m.organizationId === organizationId && ['org_dispatcher','org_manager'].includes(m.role));
}
export async function lockedStaffRequest(tx: Db, ctx: AppContext, staff: StaffAuth, id: string) {
  const [row] = await tx.select().from(requests).where(and(eq(requests.id,id),eq(requests.cityId,ctx.cityId))).for('update');
  if (!row) throw notFound('درخواست');
  requireOrganization(staff,row.organizationId);
  return row;
}
async function lockedCitizenRequest(tx: Db, citizen: CitizenAuth, id: string) {
  const [row] = await tx.select().from(requests).where(and(eq(requests.id,id),eq(requests.citizenId,citizen.userId))).for('update');
  if (!row) throw notFound('درخواست');
  return row;
}
function editable(row: RequestRecord) {
  if (['closed','rejected'].includes(row.status)) throw badRequest('REQUEST_NOT_EDITABLE','این پرونده برای تغییر یا ارجاع بسته است.');
}
export async function createRequest(ctx: AppContext, citizen: CitizenAuth, body: CreateRequestInput, key?: string) {
  if (key && key.length > 128) throw badRequest('INVALID_KEY','شناسه ارسال نامعتبر است.');
  const fingerprint=sha256(JSON.stringify([body.serviceSlug,body.description,body.title??'',Object.entries(body.formData??{}).sort(([a],[b])=>a.localeCompare(b)),body.location??null,body.addressText??'', [...body.attachmentIds].sort()]));
  const replay=async(tx:Db)=>{
    const [prior]=await tx.select().from(idempotencyKeys).where(and(eq(idempotencyKeys.key,key!),eq(idempotencyKeys.userId,citizen.userId),eq(idempotencyKeys.scope,'create_request')));
    if(!prior) return null;
    if(prior.fingerprint && prior.fingerprint!==fingerprint) throw conflict('IDEMPOTENCY_MISMATCH','با این شناسه قبلاً درخواست دیگری ثبت شده است. اطلاعات ارسال را تغییر ندهید.');
    const [saved]=prior.resourceId?await tx.select().from(requests).where(eq(requests.id,prior.resourceId)):[];
    if(!saved) throw conflict('REQUEST_IN_PROGRESS','ارسال قبلی هنوز در حال انجام است. دوباره تلاش کنید.');
    return saved;
  };
  if(key){const prior=await replay(ctx.db);if(prior)return prior;}
  if(/(?:نشت|نشتی|بوی).*گاز|برق.?گرفتگی|سیم.*لخت/.test(body.description)) throw badRequest('POTENTIAL_EMERGENCY','احتمال خطر فوری وجود دارد. از محل خطر فاصله بگیرید و از مسیر رسمی امداد اقدام کنید؛ این سامانه برای رسیدگی فوری نیست.');
  const svc=await ctx.catalog.getServiceBySlug(body.serviceSlug);
  if(!svc) throw notFound('خدمت');
  if(!['active_demo','active_integrated'].includes(svc.status)||!['city_report','admin_request'].includes(svc.workflow)) throw badRequest('SERVICE_UNAVAILABLE','این خدمت هنوز برای ثبت درخواست فعال نیست.');
  if(!svc.organizationId) throw badRequest('NO_ORGANIZATION','سازمان پاسخ‌گو مشخص نشده است.');
  const form=validateFormData(svc.form??{version:1,fields:[]},body.formData??{});
  if(!form.ok) throw badRequest('INVALID_FORM','اطلاعات فرم را کامل کنید.',form.errors);
  if(new Set(body.attachmentIds).size!==body.attachmentIds.length) throw badRequest('INVALID_ATTACHMENTS','هر پیوست فقط یک بار قابل انتخاب است.');
  return ctx.db.transaction(async tx=>{
    if(key){
      const [reserved]=await tx.insert(idempotencyKeys).values({key,scope:'create_request',userId:citizen.userId,fingerprint}).onConflictDoNothing().returning();
      if(!reserved){const prior=await replay(tx);if(prior)return prior;throw conflict('REQUEST_IN_PROGRESS','دوباره تلاش کنید.');}
    }
    if(body.attachmentIds.length){
      const owned=await tx.select().from(attachments).where(and(inArray(attachments.id,body.attachmentIds),eq(attachments.ownerId,citizen.userId),sql`${attachments.requestId} IS NULL`)).orderBy(attachments.id).for('update');
      if(owned.length!==body.attachmentIds.length) throw badRequest('INVALID_ATTACHMENTS','پیوست معتبر نیست یا به پرونده دیگری متصل شده است.');
    }
    const [row]=await tx.insert(requests).values({cityId:ctx.cityId,citizenId:citizen.userId,serviceId:svc.id,organizationId:svc.organizationId,trackingCode:generateTrackingCode(),title:body.title||svc.title,description:body.description,status:'submitted',formData:form.data,formSchemaVersion:svc.form?.version,lat:body.location?.lat,lng:body.location?.lng,address:body.location?.address??body.addressText,addressText:body.addressText,neighborhood:body.location?.neighborhood,dueAt:svc.slaHours?new Date(Date.now()+svc.slaHours*3600000):null}).returning();
    await tx.insert(requestStatusHistory).values({requestId:row.id,toStatus:'submitted',actorKind:'citizen',actorId:citizen.userId,reason:'درخواست توسط شهروند ثبت شد.'});
    if(body.attachmentIds.length) await tx.update(attachments).set({requestId:row.id}).where(and(inArray(attachments.id,body.attachmentIds),eq(attachments.ownerId,citizen.userId),sql`${attachments.requestId} IS NULL`));
    await tx.insert(notifications).values({userId:citizen.userId,type:'request_submitted',title:'درخواست شما با موفقیت ثبت شد',body:`درخواست «${row.title}» با کد پیگیری ${row.trackingCode} ثبت شد.`,entityType:'request',entityId:row.id});
    await audit(tx,{actorId:citizen.userId,organizationId:row.organizationId,action:'request.created',entityType:'request',entityId:row.id,metadata:{trackingCode:row.trackingCode,serviceSlug:svc.slug}});
    if(key)await tx.update(idempotencyKeys).set({resourceId:row.id}).where(and(eq(idempotencyKeys.key,key),eq(idempotencyKeys.userId,citizen.userId),eq(idempotencyKeys.scope,'create_request')));
    return row;
  });
}
export async function assignRequest(ctx:AppContext,staff:StaffAuth,id:string,body:z.infer<typeof adminAssignBody>){
  return ctx.db.transaction(async tx=>{
    const row=await lockedStaffRequest(tx,ctx,staff,id);editable(row);
    const selfService=body.assigneeId===staff.userId&&(!row.assigneeId||row.assigneeId===staff.userId) || body.assigneeId===null&&(!row.assigneeId||row.assigneeId===staff.userId);
    if(!selfService)requireOrganization(staff,row.organizationId,'dispatch');
    if(body.assigneeId){
      const [member]=await tx.select().from(organizationMembers).where(and(eq(organizationMembers.userId,body.assigneeId),eq(organizationMembers.organizationId,row.organizationId!),eq(organizationMembers.status,'active')));
      if(!member)throw badRequest('INVALID_ASSIGNEE','کارشناس عضو فعال این سازمان نیست.');
    }
    if(row.assigneeId===body.assigneeId)return;
    await tx.update(requests).set({assigneeId:body.assigneeId,updatedAt:new Date()}).where(eq(requests.id,id));
    await tx.insert(requestAssignments).values({requestId:id,kind:'assign',fromOrgId:row.organizationId,toOrgId:row.organizationId,fromAssigneeId:row.assigneeId,toAssigneeId:body.assigneeId,actorId:staff.userId});
    await tx.insert(requestStatusHistory).values({requestId:id,fromStatus:row.status,toStatus:row.status,actorKind:'staff',actorId:staff.userId,reason:body.assigneeId?'پرونده به کارشناس ارجاع شد.':'ارجاع لغو شد.'});
    await audit(tx,{actorId:staff.userId,organizationId:row.organizationId,action:'request.assigned',entityType:'request',entityId:id,metadata:{from:row.assigneeId,to:body.assigneeId}});
  });
}
export async function changeRequestStatus(ctx:AppContext,staff:StaffAuth,id:string,body:z.infer<typeof adminStatusBody>){
  return ctx.db.transaction(async tx=>{
    const row=await lockedStaffRequest(tx,ctx,staff,id);
    if(!canStaffTransition(row.status,body.status))throw badRequest('INVALID_STATUS_TRANSITION','این تغییر وضعیت دیگر مجاز نیست؛ پرونده را به‌روز کنید.');
    if(REASON_REQUIRED.includes(body.status)&&!body.reason?.trim())throw badRequest('REASON_REQUIRED','دلیل تغییر وضعیت را وارد کنید.');
    const now=new Date();
    await tx.update(requests).set({status:body.status,updatedAt:now,firstResponseAt:row.firstResponseAt??now,...(body.status==='resolved'?{resolvedAt:now}:{}),...(body.status==='closed'?{closedAt:now}:{}),...(body.status==='in_progress'?{resolvedAt:null,closedAt:null}:{}),}).where(eq(requests.id,id));
    await tx.insert(requestStatusHistory).values({requestId:id,fromStatus:row.status,toStatus:body.status,actorKind:'staff',actorId:staff.userId,reason:body.reason});
    const labels:Record<string,string>={triaged:'در حال ارزیابی',assigned:'ارجاع‌شده به کارشناس',in_progress:'در دست اقدام',waiting_for_citizen:'منتظر پاسخ یا مدارک شما',resolved:'حل‌شده',closed:'مختومه',rejected:'ردشده'};
    await tx.insert(notifications).values({userId:row.citizenId,type:'status_changed',title:`وضعیت درخواست شما تغییر کرد: ${labels[body.status]??body.status}`,body:body.reason??`کد پیگیری ${row.trackingCode}`,entityType:'request',entityId:id});
    await audit(tx,{actorId:staff.userId,organizationId:row.organizationId,action:'request.status_changed',entityType:'request',entityId:id,metadata:{from:row.status,to:body.status,reason:body.reason}});
  });
}
export async function transferRequest(ctx:AppContext,staff:StaffAuth,id:string,body:z.infer<typeof adminTransferBody>){
  return ctx.db.transaction(async tx=>{
    const row=await lockedStaffRequest(tx,ctx,staff,id);requireOrganization(staff,row.organizationId,'dispatch');editable(row);
    if(row.organizationId===body.organizationId)throw badRequest('SAME_ORGANIZATION','این پرونده هم‌اکنون متعلق به همین سازمان است.');
    const [destination]=await tx.select().from(organizations).where(and(eq(organizations.id,body.organizationId),eq(organizations.cityId,ctx.cityId),eq(organizations.status,'active')));
    if(!destination)throw badRequest('INVALID_DESTINATION','سازمان مقصد برای دریافت درخواست فعال نیست.');
    await tx.update(requests).set({organizationId:destination.id,unitId:null,assigneeId:null,updatedAt:new Date()}).where(eq(requests.id,id));
    await tx.insert(requestAssignments).values({requestId:id,kind:'transfer',fromOrgId:row.organizationId,toOrgId:destination.id,fromAssigneeId:row.assigneeId,actorId:staff.userId,reason:body.reason});
    await tx.insert(requestStatusHistory).values({requestId:id,fromStatus:row.status,toStatus:row.status,actorKind:'staff',actorId:staff.userId,reason:`انتقال به ${destination.name}: ${body.reason}`});
    await tx.insert(notifications).values({userId:row.citizenId,type:'request_transferred',title:'سازمان پاسخ‌گو تغییر کرد',body:`پرونده به ${destination.name} منتقل شد. ${body.reason}`,entityType:'request',entityId:id});
    await audit(tx,{actorId:staff.userId,organizationId:row.organizationId,action:'request.transferred',entityType:'request',entityId:id,metadata:{from:row.organizationId,to:destination.id,reason:body.reason}});
  });
}
export async function staffComment(ctx:AppContext,staff:StaffAuth,id:string,body:z.infer<typeof adminCommentBody>){
  return ctx.db.transaction(async tx=>{
    const row=await lockedStaffRequest(tx,ctx,staff,id);
    const [comment]=await tx.insert(requestComments).values({requestId:id,authorId:staff.userId,authorKind:'staff',visibility:body.visibility,body:body.body}).returning();
    await tx.update(requests).set({updatedAt:new Date(),firstResponseAt:body.visibility==='public'?(row.firstResponseAt??new Date()):row.firstResponseAt}).where(eq(requests.id,id));
    if(body.visibility==='public')await tx.insert(notifications).values({userId:row.citizenId,type:'staff_reply',title:'پاسخ جدید کارشناس در پرونده شما',body:body.body.slice(0,150),entityType:'request',entityId:id});
    await audit(tx,{actorId:staff.userId,organizationId:row.organizationId,action:'request.staff_comment',entityType:'request',entityId:id,metadata:{visibility:body.visibility}});
    return comment;
  });
}
export async function citizenComment(ctx:AppContext,citizen:CitizenAuth,id:string,body:string){
  return ctx.db.transaction(async tx=>{
    const row=await lockedCitizenRequest(tx,citizen,id);
    if(!CITIZEN_CAN_COMMENT.includes(row.status))throw badRequest('COMMENTS_CLOSED','برای ادامه گفت‌وگو ابتدا پرونده را بازگشایی کنید.');
    const [comment]=await tx.insert(requestComments).values({requestId:id,authorId:citizen.userId,authorKind:'citizen',visibility:'public',body}).returning();
    await tx.update(requests).set({updatedAt:new Date()}).where(eq(requests.id,id));
    await audit(tx,{actorId:citizen.userId,organizationId:row.organizationId,action:'request.citizen_comment',entityType:'request',entityId:id});
    return comment;
  });
}
export async function reopenRequest(ctx:AppContext,citizen:CitizenAuth,id:string,reason:string){
  return ctx.db.transaction(async tx=>{
    const row=await lockedCitizenRequest(tx,citizen,id);
    if(!CITIZEN_REOPENABLE.includes(row.status))throw badRequest('CANNOT_REOPEN','فقط درخواست حل‌شده یا ردشده قابل بازگشایی است.');
    await tx.update(requests).set({status:'reopened',resolvedAt:null,closedAt:null,ratingScore:null,ratingComment:null,updatedAt:new Date()}).where(eq(requests.id,id));
    await tx.insert(requestStatusHistory).values({requestId:id,fromStatus:row.status,toStatus:'reopened',actorKind:'citizen',actorId:citizen.userId,reason:`بازگشایی توسط شهروند: ${reason}`});
    await audit(tx,{actorId:citizen.userId,organizationId:row.organizationId,action:'request.reopened',entityType:'request',entityId:id,metadata:{from:row.status,reason,previousRating:row.ratingScore}});
  });
}
export async function rateRequest(ctx:AppContext,citizen:CitizenAuth,id:string,score:number,comment?:string){
  return ctx.db.transaction(async tx=>{
    const row=await lockedCitizenRequest(tx,citizen,id);
    if(row.status!=='resolved')throw badRequest('CANNOT_RATE','فقط درخواست حل‌شده قابل امتیازدهی است.');
    if(row.ratingScore!==null)throw conflict('ALREADY_RATED','امتیاز این نتیجه قبلاً ثبت شده است.');
    await tx.update(requests).set({ratingScore:score,ratingComment:comment,updatedAt:new Date()}).where(eq(requests.id,id));
    await audit(tx,{actorId:citizen.userId,organizationId:row.organizationId,action:'request.rated',entityType:'request',entityId:id,metadata:{score}});
  });
}
