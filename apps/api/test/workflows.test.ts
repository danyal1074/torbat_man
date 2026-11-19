import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { and, eq } from 'drizzle-orm';
import { createDb, type DbHandle } from '../src/db/client';
import { createApp } from '../src/app';
import { loadEnv } from '../src/env';
import { seedDatabase } from '../src/seed/seed-cli';
import { createCatalogCache } from '../src/catalog/cache';
import { createAiGateway } from '../src/ai/gateway';
import { createLocalStorage } from '../src/files/storage';
import { cities, requests, requestStatusHistory, attachments, auditLogs, announcements, serviceFormSchemas, services } from '../src/db/schema';

describe('Locked request workflows and keyset pagination',()=>{
 let app:FastifyInstance;let handle:DbHandle;let dir:string;
 let citizen='';let otherCitizen='';let operator='';let dispatcher='';let water='';let admin='';let manager='';let editor='';let authIp=1;
 async function login(mobile:string,staff=false){
  const prefix=staff?'/v1/admin':'/v1';
  const remoteAddress='127.0.2.'+(authIp++);
  const otp=await app.inject({method:'POST',url:prefix+'/auth/request-otp',remoteAddress,payload:{mobile}});
  expect(otp.statusCode).toBe(200);
  const res=await app.inject({method:'POST',url:prefix+'/auth/verify-otp',remoteAddress,payload:{mobile,code:otp.json().devCode}});
  expect(res.statusCode).toBe(200);
  const header=res.headers['set-cookie'];return (Array.isArray(header)?header[0]:header!).split(';')[0];
 }
 async function create(overrides:Record<string,unknown>={}){
  const result=await app.inject({method:'POST',url:'/v1/requests',headers:{cookie:citizen,'idempotency-key':crypto.randomUUID()},payload:{serviceSlug:'report-road',description:'این یک گزارش آزمایشی برای بررسی گردش‌کار است.',...overrides}});
  expect(result.statusCode).toBe(201);return result.json().data as {id:string;trackingCode:string};
 }
 const mutation=(id:string,action:string,payload:unknown,cookie=operator)=>app.inject({method:action==='comments'?'POST':'PATCH',url:`/v1/admin/requests/${id}/${action}`,headers:{cookie},payload});
 beforeAll(async()=>{
  dir=await mkdtemp(join(tmpdir(),'torbat-workflow-'));handle=await createDb({pgliteDir:join(dir,'db')});await handle.migrate();await seedDatabase(handle.db);
  const [city]=await handle.db.select().from(cities);const catalog=createCatalogCache(handle.db,city.id);const env=loadEnv({NODE_ENV:'test',APP_ENV:'demo',LOG_LEVEL:'silent',OTP_DEV_ECHO:'true'});
  app=await createApp({db:handle.db,env,catalog,cityId:city.id,ai:createAiGateway({db:handle.db,catalog,model:'rules',timeoutMs:100}),storage:createLocalStorage(join(dir,'files'),env.FILE_SIGNING_SECRET)});
  await app.ready();citizen=await login('09120000001');otherCitizen=await login('09120000002');operator=await login('09130000001',true);dispatcher=await login('09130000002',true);water=await login('09140000001',true);admin=await login('09100000000',true);manager=await login('09130000003',true);editor=await login('09100000001',true);
 });
 afterAll(async()=>{if(app)await app.close();if(handle)await handle.close();if(dir&&dir.startsWith(join(tmpdir(),'torbat-workflow-')))await rm(dir,{recursive:true,force:true});});

 it('rejects reuse of an idempotency key with different content',async()=>{
  const key=crypto.randomUUID();const headers={cookie:citizen,'idempotency-key':key};const payload={serviceSlug:'report-road',description:'نمونه اولیه محتوای درخواست یکتا'};
  const first=await app.inject({method:'POST',url:'/v1/requests',headers,payload});expect(first.statusCode).toBe(201);
  const replay=await app.inject({method:'POST',url:'/v1/requests',headers,payload});expect(replay.json().data.id).toBe(first.json().data.id);
  const different=await app.inject({method:'POST',url:'/v1/requests',headers,payload:{...payload,description:'این محتوا با درخواست قبلی متفاوت است.'}});
  expect(different.statusCode).toBe(409);expect(different.json().error.code).toBe('IDEMPOTENCY_MISMATCH');
 });
 it('serializes competing status transitions with a single valid history event',async()=>{
  const r=await create();const results=await Promise.all([1,2].map(()=>mutation(r.id,'status',{status:'in_progress',reason:'شروع بررسی هم‌زمان'})));
  expect(results.map(r=>r.statusCode).sort()).toEqual([200,400]);
  const events=await handle.db.select().from(requestStatusHistory).where(and(eq(requestStatusHistory.requestId,r.id),eq(requestStatusHistory.toStatus,'in_progress')));expect(events).toHaveLength(1);
  const logs=await handle.db.select().from(auditLogs).where(and(eq(auditLogs.entityId,r.id),eq(auditLogs.action,'request.status_changed')));expect(logs).toHaveLength(1);
 });
 it('does not allow two requests to claim the same uploaded attachment',async()=>{
  const me=await app.inject({method:'GET',url:'/v1/me',headers:{cookie:citizen}});
  const [a]=await handle.db.insert(attachments).values({ownerId:me.json().id,objectKey:'test/'+crypto.randomUUID()+'.png',mimeType:'image/png',sizeBytes:1,checksum:'test'}).returning();
  const results=await Promise.all([1,2].map(()=>app.inject({method:'POST',url:'/v1/requests',headers:{cookie:citizen,'idempotency-key':crypto.randomUUID()},payload:{serviceSlug:'report-road',description:'نمونه رقابت برای اتصال پیوست مشترک',attachmentIds:[a.id]}})));
  expect(results.map(r=>r.statusCode).sort()).toEqual([201,400]);
  const [stored]=await handle.db.select().from(attachments).where(eq(attachments.id,a.id));expect(stored.requestId).toBe(results.find(r=>r.statusCode===201)!.json().data.id);
 });
 it('permits self assignment but restricts dispatch and cross-organization transfer',async()=>{
  const r=await create();const me=(await app.inject({method:'GET',url:'/v1/admin/me',headers:{cookie:operator}})).json();
  expect((await mutation(r.id,'assign',{assigneeId:me.id})).statusCode).toBe(200);
  const orgs=(await app.inject({method:'GET',url:'/v1/organizations'})).json().data as {id:string;code:string}[];const destination=orgs.find(o=>o.code==='ABFA')!;
  expect((await mutation(r.id,'transfer',{organizationId:destination.id,reason:'انتقال به سازمان پاسخ‌گوی درست'})).statusCode).toBe(403);
  expect((await mutation(r.id,'transfer',{organizationId:destination.id,reason:'انتقال به سازمان پاسخ‌گوی درست'},dispatcher)).statusCode).toBe(200);
  expect((await mutation(r.id,'status',{status:'in_progress'})).statusCode).toBe(403);
  expect((await mutation(r.id,'status',{status:'in_progress'},water)).statusCode).toBe(200);
  const [stored]=await handle.db.select().from(requests).where(eq(requests.id,r.id));expect(stored.assigneeId).toBeNull();
 });
 it('allows a rejected outcome to be reopened once by its owner',async()=>{
  const r=await create();expect((await mutation(r.id,'status',{status:'rejected',reason:'رد آزمایشی همراه با دلیل'})).statusCode).toBe(200);
  const outsider=await app.inject({method:'POST',url:`/v1/requests/${r.id}/reopen`,headers:{cookie:otherCitizen},payload:{reason:'من مالک این پرونده نیستم'}});expect(outsider.statusCode).toBe(404);
  const first=await app.inject({method:'POST',url:`/v1/requests/${r.id}/reopen`,headers:{cookie:citizen},payload:{reason:'دلیل اعتراض آزمایشی به نتیجه'}});expect(first.statusCode).toBe(200);
  const second=await app.inject({method:'POST',url:`/v1/requests/${r.id}/reopen`,headers:{cookie:citizen},payload:{reason:'تلاش تکراری برای بازگشایی'}});expect(second.statusCode).toBe(400);
 });
 it('records one rating, hides terminal comment controls, resets feedback on reopening',async()=>{
  const r=await create();await mutation(r.id,'status',{status:'in_progress'});await mutation(r.id,'status',{status:'resolved',reason:'نمونه نتیجه رسیدگی'});
  const send=()=>app.inject({method:'POST',url:`/v1/requests/${r.id}/rate`,headers:{cookie:citizen},payload:{score:4}});
  expect((await send()).statusCode).toBe(200);expect((await send()).statusCode).toBe(409);
  const comment=await app.inject({method:'POST',url:`/v1/requests/${r.id}/comments`,headers:{cookie:citizen},payload:{body:'پیام پس از نتیجه نهایی'}});expect(comment.statusCode).toBe(400);
  await app.inject({method:'POST',url:`/v1/requests/${r.id}/reopen`,headers:{cookie:citizen},payload:{reason:'نتیجه هنوز رضایت‌بخش نیست'}});
  const [row]=await handle.db.select().from(requests).where(eq(requests.id,r.id));expect(row.ratingScore).toBeNull();expect(row.resolvedAt).toBeNull();
 });
 it('paginates tied timestamps without duplicates and validates invalid cursors',async()=>{
  const ids:string[]=[];for(let i=0;i<5;i++)ids.push((await create({title:'آزمون صفحه‌بندی '+i})).id);
  for(const id of ids)await handle.db.update(requests).set({createdAt:new Date('2026-01-01T00:00:00Z')}).where(eq(requests.id,id));
  const all:string[]=[];let cursor:string|null=null;
  do{
   const url='/v1/requests?limit=2&q='+encodeURIComponent('آزمون صفحه‌بندی')+(cursor?'&cursor='+cursor:'');
   const response=await app.inject({method:'GET',url,headers:{cookie:citizen}});expect(response.statusCode).toBe(200);const data=response.json();all.push(...data.data.map((r:{id:string})=>r.id));cursor=data.meta.nextCursor;
  }while(cursor);
  expect(all).toEqual([...ids].sort().reverse());expect(new Set(all).size).toBe(5);
  const invalid=await app.inject({method:'GET',url:'/v1/requests?cursor=not-a-cursor',headers:{cookie:citizen}});expect(invalid.statusCode).toBe(400);
 });
 it('honors admin service filters, masks phone numbers and enforces member lookup scope',async()=>{
  const r=await create({title:'فیلتر کارتابل نمونه'});
  const [stored]=await handle.db.select().from(requests).where(eq(requests.id,r.id));
  const list=await app.inject({method:'GET',url:`/v1/admin/requests?serviceId=${stored.serviceId}&overdue=false&q=${encodeURIComponent('فیلتر کارتابل')}`,headers:{cookie:operator}});
  expect(list.statusCode).toBe(200);expect(list.json().data).toHaveLength(1);expect(list.json().data[0].citizenMobile).toContain('***');
  const members=await app.inject({method:'GET',url:`/v1/admin/members?organizationId=${stored.organizationId}`,headers:{cookie:operator}});expect(members.statusCode).toBe(200);expect(members.json().data[0].mobile).toContain('***');
  const forbidden=await app.inject({method:'GET',url:`/v1/admin/members?organizationId=${stored.organizationId}`,headers:{cookie:water}});expect(forbidden.statusCode).toBe(403);
 });
 it('managers can version forms while old requests retain the original field labels',async()=>{
  const service=await app.ctx.catalog.getServiceBySlug('muni-general-request');expect(service?.form).toBeDefined();
  const initial:Record<string,string>={};for(const f of service!.form!.fields)if(f.required)initial[f.name]=f.options?.[0]?.value??'1234567890';
  const old=await create({serviceSlug:service!.slug,formData:initial});
  const nextForm={fields:[{name:'private_code',label:'شناسه محرمانه',type:'text',required:true,sensitive:true}]};
  const unauthorized=await app.inject({method:'PATCH',url:'/v1/admin/services/'+service!.id,headers:{cookie:operator},payload:{form:nextForm}});expect(unauthorized.statusCode).toBe(403);
  const saved=await app.inject({method:'PATCH',url:'/v1/admin/services/'+service!.id,headers:{cookie:manager},payload:{form:nextForm}});expect(saved.statusCode).toBe(200);
  const active=await app.ctx.catalog.getServiceBySlug(service!.slug);expect(active?.form?.version).toBe(2);
  const oldDetail=await app.inject({method:'GET',url:'/v1/requests/'+old.id,headers:{cookie:citizen}});
  expect(oldDetail.json().data.formEntries.map((f:{label:string})=>f.label)).toEqual(service!.form!.fields.filter(f=>initial[f.name]).map(f=>f.label));
  const invalid=await app.inject({method:'POST',url:'/v1/requests',headers:{cookie:citizen},payload:{serviceSlug:service!.slug,description:'نمونه فرم جدید بدون اطلاعات ضروری'}});expect(invalid.statusCode).toBe(400);
  const modern=await create({serviceSlug:service!.slug,formData:{private_code:'private-field-marker'}});
  const hidden=await app.inject({method:'GET',url:'/v1/admin/requests/'+modern.id,headers:{cookie:operator}});expect(hidden.body).not.toContain('private-field-marker');expect(hidden.json().data.formData).toBeUndefined();
  const me=(await app.inject({method:'GET',url:'/v1/admin/me',headers:{cookie:operator}})).json();await mutation(modern.id,'assign',{assigneeId:me.id});
  const visible=await app.inject({method:'GET',url:'/v1/admin/requests/'+modern.id,headers:{cookie:operator}});expect(visible.body).toContain('private-field-marker');
 });
 it('rejects forged official integration and unsafe form expressions',async()=>{
  const service=await app.ctx.catalog.getServiceBySlug('report-road');
  for(const payload of [{status:'active_integrated'},{form:{fields:[{name:'bad',label:'نمونه',type:'text',pattern:'(a+)+$'}]}}]){
   const response=await app.inject({method:'PATCH',url:'/v1/admin/services/'+service!.id,headers:{cookie:admin},payload});expect(response.statusCode).toBe(400);
  }
  const list=await app.inject({method:'GET',url:'/v1/admin/services',headers:{cookie:manager}});expect(list.statusCode).toBe(200);expect(list.json().data.every((s:{organization:{code:string}|null})=>s.organization?.code==='MUNI')).toBe(true);
  const editorList=await app.inject({method:'GET',url:'/v1/admin/services',headers:{cookie:editor}});expect(editorList.statusCode).toBe(403);
 });
 it('draft announcements stay private and publication is explicitly demo',async()=>{
  const payload={title:'اطلاعیه نمونه مدیریت محتوا',body:'این محتوای ساختگی برای بررسی فرایند انتشار است.',sourceName:'منبع آزمایشی',sourceUrl:'https://example.com/source'};
  const denied=await app.inject({method:'POST',url:'/v1/admin/announcements',headers:{cookie:operator},payload});expect(denied.statusCode).toBe(403);
  const created=await app.inject({method:'POST',url:'/v1/admin/announcements',headers:{cookie:editor},payload:{...payload,isDemo:false}});expect(created.statusCode).toBe(201);const row=created.json().data;expect(row.status).toBe('draft');expect(row.isDemo).toBe(true);
  const publicBefore=await app.inject({method:'GET',url:'/v1/announcements'});expect(publicBefore.body).not.toContain(row.id);
  const published=await app.inject({method:'PATCH',url:'/v1/admin/announcements/'+row.id,headers:{cookie:editor},payload:{status:'published'}});expect(published.statusCode).toBe(200);
  const publicAfter=await app.inject({method:'GET',url:'/v1/announcements'});expect(publicAfter.body).toContain(row.id);
  await handle.db.update(announcements).set({expiresAt:new Date(Date.now()-1000)}).where(eq(announcements.id,row.id));
  const expired=await app.inject({method:'GET',url:'/v1/announcements'});expect(expired.body).not.toContain(row.id);
  const republish=await app.inject({method:'PATCH',url:'/v1/admin/announcements/'+row.id,headers:{cookie:editor},payload:{status:'published'}});expect(republish.statusCode).toBe(400);
 });
 it('rejects cross-organization content edits and javascript source URLs',async()=>{
  const orgs=await app.ctx.catalog.getOrganizations();const waterOrg=orgs.find(o=>o.code==='ABFA')!;
  const payload={title:'اطلاعیه مخصوص سازمان آبفا',body:'این یک اطلاعیه سازمانی آزمایشی است.',sourceName:'آزمایشی',organizationId:waterOrg.id};
  const created=await app.inject({method:'POST',url:'/v1/admin/announcements',headers:{cookie:admin},payload});expect(created.statusCode).toBe(201);
  const changed=await app.inject({method:'PATCH',url:'/v1/admin/announcements/'+created.json().data.id,headers:{cookie:manager},payload:{title:'ویرایش نامجاز از سازمان دیگر'}});expect(changed.statusCode).toBe(403);
  const unsafe=await app.inject({method:'POST',url:'/v1/admin/announcements',headers:{cookie:admin},payload:{...payload,sourceUrl:'javascript:alert(1)'}});expect(unsafe.statusCode).toBe(400);
 });
 it('stores support feedback privately and records authorized review in audit',async()=>{
  const created=await app.inject({method:'POST',url:'/v1/feedback',headers:{cookie:citizen},payload:{kind:'bug',message:'گزارش خصوصی آزمایشی برای تیم پشتیبانی'}});expect(created.statusCode).toBe(201);
  const denied=await app.inject({method:'GET',url:'/v1/admin/feedback',headers:{cookie:operator}});expect(denied.statusCode).toBe(403);
  const reviewed=await app.inject({method:'PATCH',url:'/v1/admin/feedback/'+created.json().data.id,headers:{cookie:admin},payload:{status:'seen'}});expect(reviewed.statusCode).toBe(200);
  const audit=await app.inject({method:'GET',url:'/v1/admin/audit?limit=50',headers:{cookie:admin}});expect(audit.statusCode).toBe(200);expect(audit.body).toContain('feedback.reviewed');expect(audit.body).not.toContain('گزارش خصوصی آزمایشی');
  const operatorAudit=await app.inject({method:'GET',url:'/v1/admin/audit',headers:{cookie:operator}});expect(operatorAudit.statusCode).toBe(403);
 });
 it('repeated seed preserves edited services and historical form versions',async()=>{
  await seedDatabase(handle.db);
  const all=await handle.db.select().from(services);expect(all).toHaveLength(47);
  const service=await app.ctx.catalog.getServiceBySlug('muni-general-request');
  const forms=await handle.db.select().from(serviceFormSchemas).where(eq(serviceFormSchemas.serviceId,service!.id));
  expect(forms).toHaveLength(2);expect(forms.filter(f=>f.isActive)).toHaveLength(1);expect(forms.find(f=>f.isActive)?.version).toBe(2);
 });

});
