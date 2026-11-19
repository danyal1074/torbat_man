import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { paginationQuery, serviceManagementBody, managedAnnouncementCreate, managedAnnouncementUpdate, feedbackBody } from '@torbat/contracts';
import { announcements, auditLogs, feedback, organizations, serviceFormSchemas, services, users } from '../db/schema';
import { route } from '../lib/route';
import { audit } from '../lib/audit';
import { badRequest, forbidden, notFound } from '../lib/errors';
import { cursorWhere, encodeCursor, newestFirst } from '../lib/pagination';
import type { StaffAuth } from '../context';

function contentScope(staff:StaffAuth,organizationId:string|null){
 if(['platform_admin','content_editor'].includes(staff.platformRole??''))return;
 if(!organizationId||!staff.memberships.some(m=>m.organizationId===organizationId&&m.role==='org_manager'))throw forbidden('فقط مدیر محتوا یا مدیر همین سازمان مجاز است.');
}
function managerScope(staff:StaffAuth,organizationId:string|null){
 if(staff.platformRole==='platform_admin')return;
 if(!organizationId||!staff.memberships.some(m=>m.organizationId===organizationId&&m.role==='org_manager'))throw forbidden('مدیریت خدمت در اختیار مدیر سازمان یا مدیر سامانه است.');
}
function managedOrganizations(staff:StaffAuth){return staff.memberships.filter(m=>m.role==='org_manager').map(m=>m.organizationId);}
function pageMeta<T>(rows:T[],limit:number,get:(r:T)=>{id:string;createdAt:Date}){
 const last=rows.slice(0,limit).at(-1);const r=last?get(last):null;
 return {nextCursor:rows.length>limit&&r?encodeCursor(r.createdAt,r.id):null,limit};
}
export function managementRoutes(app:FastifyInstance){
 route(app,{method:'GET',url:'/v1/admin/services',summary:'فهرست خدمات قابل مدیریت',tags:['management'],auth:'staff',handler:async({req})=>{
  const staff=req.staff!;const orgIds=managedOrganizations(staff);
  if(staff.platformRole!=='platform_admin'&&!orgIds.length)throw forbidden();
  const all=await app.ctx.catalog.getServices();
  return {data:all.filter(s=>staff.platformRole==='platform_admin'||!!s.organizationId&&orgIds.includes(s.organizationId))};
 }});
 route(app,{method:'PATCH',url:'/v1/admin/services/:id',summary:'ویرایش خدمت و ایجاد نسخه فرم جدید',tags:['management'],auth:'staff',body:serviceManagementBody,handler:async({req,params,body})=>{
  await app.ctx.db.transaction(async tx=>{
   const [service]=await tx.select().from(services).where(and(eq(services.id,params.id),eq(services.cityId,app.ctx.cityId))).for('update');
   if(!service)throw notFound('خدمت');managerScope(req.staff!,service.organizationId);
   if(body.status==='active_demo'&&(!service.organizationId||!['city_report','admin_request','info'].includes(service.workflow)))throw badRequest('INVALID_ACTIVATION','این خدمت گردش‌کار قابل فعال‌سازی آزمایشی ندارد.');
   const {form,...patch}=body;
   let version=service.formSchemaVersion;
   if(form){
    if(!['city_report','admin_request'].includes(service.workflow))throw badRequest('FORM_NOT_SUPPORTED','این خدمت فرم ثبت درخواست ندارد.');
    const prior=await tx.select().from(serviceFormSchemas).where(eq(serviceFormSchemas.serviceId,service.id)).orderBy(desc(serviceFormSchemas.version));
    const current=prior.find(f=>f.isActive);
    if(JSON.stringify(current?.jsonSchema.fields??[])!==JSON.stringify(form.fields)){
     version=(prior[0]?.version??0)+1;
     await tx.update(serviceFormSchemas).set({isActive:false}).where(eq(serviceFormSchemas.serviceId,service.id));
     await tx.insert(serviceFormSchemas).values({serviceId:service.id,version,jsonSchema:{version,fields:form.fields}});
    }
   }
   await tx.update(services).set({...patch,formSchemaVersion:version,updatedAt:new Date()}).where(eq(services.id,service.id));
   await audit(tx,{actorId:req.staff!.userId,organizationId:service.organizationId,action:'service.updated',entityType:'service',entityId:service.id,metadata:{fields:Object.keys(body),formVersion:version}});
  });
  app.ctx.catalog.invalidate();return {data:{success:true}};
 }});
 route(app,{method:'GET',url:'/v1/admin/announcements',summary:'کارتابل اطلاعیه‌های پیش‌نویس و منتشرشده',tags:['management'],auth:'staff',query:paginationQuery,handler:async({req,query})=>{
  const staff=req.staff!;const global=['platform_admin','content_editor'].includes(staff.platformRole??'');const orgIds=managedOrganizations(staff);
  if(!global&&!orgIds.length)throw forbidden();
  const rows=await app.ctx.db.select().from(announcements).where(and(eq(announcements.cityId,app.ctx.cityId),global?undefined:inArray(announcements.organizationId,orgIds),cursorWhere(query.cursor,announcements.createdAt,announcements.id))).orderBy(...newestFirst(announcements.createdAt,announcements.id)).limit(query.limit+1);
  return {data:rows.slice(0,query.limit),meta:pageMeta(rows,query.limit,r=>r)};
 }});
 route(app,{method:'POST',url:'/v1/admin/announcements',summary:'ساخت پیش‌نویس اطلاعیه آزمایشی',tags:['management'],auth:'staff',body:managedAnnouncementCreate,successStatus:201,handler:async({req,body})=>{
  contentScope(req.staff!,body.organizationId??null);
  if(body.organizationId){const [org]=await app.ctx.db.select().from(organizations).where(and(eq(organizations.id,body.organizationId),eq(organizations.cityId,app.ctx.cityId)));if(!org)throw notFound('سازمان');}
  const result=await app.ctx.db.transaction(async tx=>{
   const [row]=await tx.insert(announcements).values({...body,organizationId:body.organizationId??null,sourceUrl:body.sourceUrl||null,expiresAt:body.expiresAt?new Date(body.expiresAt):null,cityId:app.ctx.cityId,status:'draft',isDemo:true,createdBy:req.staff!.userId}).returning();
   await audit(tx,{actorId:req.staff!.userId,organizationId:row.organizationId,action:'announcement.created',entityType:'announcement',entityId:row.id});return row;
  });return {data:result};
 }});
 route(app,{method:'PATCH',url:'/v1/admin/announcements/:id',summary:'ویرایش، انتشار آزمایشی یا بایگانی اطلاعیه',tags:['management'],auth:'staff',body:managedAnnouncementUpdate,handler:async({req,params,body})=>{
  const result=await app.ctx.db.transaction(async tx=>{
   const [row]=await tx.select().from(announcements).where(and(eq(announcements.id,params.id),eq(announcements.cityId,app.ctx.cityId))).for('update');
   if(!row)throw notFound('اطلاعیه');contentScope(req.staff!,row.organizationId);
   const destination=body.organizationId===undefined?row.organizationId:body.organizationId;
   contentScope(req.staff!,destination);
   if(destination){const [org]=await tx.select().from(organizations).where(and(eq(organizations.id,destination),eq(organizations.cityId,app.ctx.cityId)));if(!org)throw notFound('سازمان');}
   const expiry=body.expiresAt===undefined?row.expiresAt:body.expiresAt?new Date(body.expiresAt):null;
   if(body.status==='published'&&expiry&&expiry<=new Date())throw badRequest('EXPIRED_ANNOUNCEMENT','اطلاعیه منقضی‌شده قابل انتشار نیست.');
   const {expiresAt:_expiresAt,sourceUrl,...patch}=body;
   const [saved]=await tx.update(announcements).set({...patch,organizationId:destination,expiresAt:expiry,...(sourceUrl===undefined?{}:{sourceUrl:sourceUrl||null}),isDemo:true,updatedAt:new Date(),...(body.status==='published'&&row.status!=='published'?{publishedAt:new Date()}:{}),}).where(eq(announcements.id,row.id)).returning();
   await audit(tx,{actorId:req.staff!.userId,organizationId:row.organizationId,action:'announcement.updated',entityType:'announcement',entityId:row.id,metadata:{fields:Object.keys(body),status:saved.status}});return saved;
  });return {data:result};
 }});
 route(app,{method:'POST',url:'/v1/feedback',summary:'ثبت پیام پشتیبانی یا گزارش باگ',tags:['feedback'],auth:'citizen',body:feedbackBody,successStatus:201,handler:async({req,body})=>{
  const [row]=await app.ctx.db.insert(feedback).values({...body,userId:req.citizen!.userId}).returning();return {data:{id:row.id,status:row.status}};
 }});
 route(app,{method:'GET',url:'/v1/admin/feedback',summary:'صندوق پشتیبانی',tags:['management'],auth:'staff',query:paginationQuery,handler:async({req,query})=>{
  if(!['platform_admin','support_agent'].includes(req.staff!.platformRole??''))throw forbidden();
  const rows=await app.ctx.db.select().from(feedback).where(cursorWhere(query.cursor,feedback.createdAt,feedback.id)).orderBy(...newestFirst(feedback.createdAt,feedback.id)).limit(query.limit+1);
  return {data:rows.slice(0,query.limit),meta:pageMeta(rows,query.limit,r=>r)};
 }});
 route(app,{method:'PATCH',url:'/v1/admin/feedback/:id',summary:'ثبت بررسی پیام پشتیبانی',tags:['management'],auth:'staff',body:z.object({status:z.enum(['new','seen'])}),handler:async({req,params,body})=>{
  if(!['platform_admin','support_agent'].includes(req.staff!.platformRole??''))throw forbidden();
  const result=await app.ctx.db.transaction(async tx=>{
   const [row]=await tx.update(feedback).set(body).where(eq(feedback.id,params.id)).returning();if(!row)throw notFound('پیام');
   await audit(tx,{actorId:req.staff!.userId,action:'feedback.reviewed',entityType:'feedback',entityId:row.id,metadata:{status:row.status}});return row;
  });return {data:result};
 }});
 route(app,{method:'GET',url:'/v1/admin/audit',summary:'گزارش فعالیت‌ها با مرز سازمان',tags:['management'],auth:'staff',query:paginationQuery,handler:async({req,query})=>{
  const staff=req.staff!;const global=staff.platformRole==='platform_admin';const orgIds=managedOrganizations(staff);
  if(!global&&!orgIds.length)throw forbidden();
  const rows=await app.ctx.db.select({a:auditLogs,actorName:users.displayName,organizationName:organizations.name}).from(auditLogs).leftJoin(users,eq(users.id,auditLogs.actorId)).leftJoin(organizations,eq(organizations.id,auditLogs.organizationId)).where(and(global?undefined:inArray(auditLogs.organizationId,orgIds),cursorWhere(query.cursor,auditLogs.createdAt,auditLogs.id))).orderBy(...newestFirst(auditLogs.createdAt,auditLogs.id)).limit(query.limit+1);
  return {data:rows.slice(0,query.limit).map(({a,actorName,organizationName})=>({id:a.id,action:a.action,entityType:a.entityType,entityId:a.entityId,createdAt:a.createdAt,actorName,organizationName})),meta:pageMeta(rows,query.limit,r=>r.a)};
 }});
}
