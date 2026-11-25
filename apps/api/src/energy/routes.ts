
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { energyHomes } from '../db/schema';
import { route } from '../lib/route';
import { badRequest, forbidden } from '../lib/errors';
import { emptyHome, makePlan, report, days, compare, type Home } from './engine';
const fuel = z.enum(['gas','electricity','water']);
const numeric = z.preprocess(value => typeof value === 'string' ? Number(value.replace(/[۰-۹]/g,c=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c)))) : value,z.number().finite().nonnegative().max(1e9));
const date = z.iso.date();
export function energyRoutes(app: FastifyInstance) {
 const read = async (userId: string) => {
   const [row] = await app.ctx.db.select().from(energyHomes).where(eq(energyHomes.userId,userId));
   return row ? row.data as Home : emptyHome();
 };
 async function change(userId: string, action: (home: Home) => void) {
   return app.ctx.db.transaction(async tx => {
     await tx.insert(energyHomes).values({userId,data:emptyHome()}).onConflictDoNothing();
     const [row] = await tx.select().from(energyHomes).where(eq(energyHomes.userId,userId)).for('update');
     const home = row!.data as Home;
     action(home);
     await tx.update(energyHomes).set({data:home,updatedAt:new Date()}).where(eq(energyHomes.userId,userId));
     return { data: home, report: report(home) };
   });
 }
 route(app,{method:'GET',url:'/v1/energy',summary:'کارنامه انرژی خانه',tags:['energy'],auth:'citizen',handler:async({req})=>{
   const data=await read(req.citizen!.userId);
   return {data,report:report(data), capabilities:{text:'rules',ocr:false,vision:false,stt:false,tts:false,utilities:false}};
 }});
 route(app,{method:'PUT',url:'/v1/energy/profile',summary:'شناسنامه خانه',tags:['energy'],auth:'citizen',
 body:z.object({area:numeric.pipe(z.number().min(10).max(2000)),residents:numeric.pipe(z.number().int().min(1).max(30)),heating:z.enum(['بخاری','پکیج','مرکزی','سایر']),consent:z.boolean()}),
 handler:async({req,body})=>change(req.citizen!.userId,h=>{h.profile=body;})});
 route(app,{method:'PUT',url:'/v1/energy/goal',summary:'هدف اختیاری مصرف',tags:['energy'],auth:'citizen',body:z.object({percent:numeric.pipe(z.number().min(1).max(20))}),handler:async({req,body})=>change(req.citizen!.userId,h=>{h.goal=body.percent;})});
 route(app,{method:'POST',url:'/v1/energy/bills',summary:'ثبت قبض تأییدشده دستی',tags:['energy'],auth:'citizen',
 body:z.object({fuel,start:date,end:date,consumption:numeric,amount:numeric.pipe(z.number().int()),sample:z.boolean().default(false)}),
 handler:async({req,body})=>change(req.citizen!.userId,h=>{
  if(days(body.start,body.end)<=0 || days(body.start,body.end)>370) throw badRequest('INVALID_PERIOD','بازه قبض باید بین یک تا ۳۷۰ روز باشد.');
  if(h.bills.some(b=>b.fuel===body.fuel && b.start===body.start && b.end===body.end)) throw badRequest('DUPLICATE','این دوره قبلاً ثبت شده است.');
  if(h.bills.length>=120) throw badRequest('LIMIT','حداکثر ۱۲۰ قبض قابل ثبت است.');
  h.bills.push({...body,id:randomUUID()});
 })});
 route(app,{method:'DELETE',url:'/v1/energy/bills/:id',summary:'حذف قبض خانه',tags:['energy'],auth:'citizen',handler:async({req,params})=>change(req.citizen!.userId,h=>{h.bills=h.bills.filter(b=>b.id!==params.id);})});
 route(app,{method:'POST',url:'/v1/energy/readings',summary:'ثبت کنتور',tags:['energy'],auth:'citizen',
 body:z.object({fuel,value:numeric,date,reset:z.boolean().default(false)}),handler:async({req,body})=>change(req.citizen!.userId,h=>{
  const last=h.readings.filter(r=>r.fuel===body.fuel).sort((a,b)=>a.date.localeCompare(b.date)).at(-1);
  if(last && (body.date<=last.date || body.value<last.value&&!body.reset)) throw badRequest('INVALID_READING','تاریخ باید جدیدتر باشد. قرائت کاهشی نیاز به تأیید تعویض کنتور دارد.');
  if(h.readings.length>=1000) throw badRequest('LIMIT','سقف ثبت کنتور رسیده است.');
  h.readings.push({...body,id:randomUUID()});
 })});
 route(app,{method:'POST',url:'/v1/energy/demo',summary:'افزودن قبض‌های کاملاً ساختگی برای ارائه',tags:['energy'],auth:'citizen',handler:async({req})=>{
  if(app.ctx.env.APP_ENV==='production') throw forbidden();
  return change(req.citizen!.userId,h=>{
   for(const bill of [
    {fuel:'gas' as const,start:'2025-12-01',end:'2025-12-31',consumption:350,amount:0,sample:true},
    {fuel:'gas' as const,start:'2025-12-31',end:'2026-01-30',consumption:287,amount:0,sample:true},
   ])if(!h.bills.some(b=>b.fuel===bill.fuel&&b.start===bill.start&&b.end===bill.end))h.bills.push({...bill,id:randomUUID()});
  });
 }});
 route(app,{method:'POST',url:'/v1/energy/plans',summary:'تأیید برنامه ۳۰ روزه',tags:['energy'],auth:'citizen',handler:async({req})=>change(req.citizen!.userId,h=>{if(!h.missions.length) h.missions=makePlan(h);})});
 route(app,{method:'PATCH',url:'/v1/energy/missions',summary:'ثبت نتیجه مأموریت خوداظهاری',tags:['energy'],auth:'citizen',
 body:z.object({day:z.number().int().min(1).max(30),status:z.enum(['done','skipped','pending'])}),handler:async({req,body})=>change(req.citizen!.userId,h=>{
  const mission=h.missions.find(m=>m.day===body.day);if(!mission) throw badRequest('MISSING_PLAN','ابتدا برنامه را بسازید.');
  mission.status=body.status;
  const key='mission:'+body.day, today=new Date().toISOString().slice(0,10);
  if(body.status==='done'&&!h.points.some(p=>p.key===key)&&h.points.filter(p=>p.at.startsWith(today)).length<3) h.points.push({key,points:10,at:new Date().toISOString()});
 })});
 route(app,{method:'POST',url:'/v1/energy/challenge',summary:'عضویت داوطلبانه چالش',tags:['energy'],auth:'citizen',body:z.object({join:z.boolean()}),handler:async({req,body})=>change(req.citizen!.userId,h=>{h.participating=body.join;})});
 route(app,{method:'POST',url:'/v1/energy/ai/chat',summary:'مربی قواعدمحور انرژی',tags:['energy'],auth:'citizen',body:z.object({message:z.string().trim().min(1).max(1500)}),rateLimit:{max:15,timeWindow:'1 minute'},handler:async({req,body})=>{
  const home=await read(req.citizen!.userId), danger=/بوی گاز|دود|مونوکسید|برق گرفت|نشت گاز/.test(body.message);
  const gas = compare(home.bills,'gas');
  const insight = gas
   ? 'بر اساس دو دوره ثبت‌شده، تغییر کاهشی مصرف روزانه گاز '+gas.percent.toLocaleString('fa-IR',{maximumFractionDigits:1})+' درصد است. این مقایسه خام با آب‌وهوا نرمال نشده است.'+(gas.sample?' داده‌ها آزمایشی هستند.':'')
   : 'برای تحلیل مصرف گاز، دو قبض غیرهمپوشان و قابل مقایسه وارد کنید.';
  return {mode:'rules',summary:danger?'در صورت خطر فوری، از محل خطر دور شوید و از محل امن با امداد رسمی تماس بگیرید. تجهیزات را دستکاری نکنید.':insight,
    observations:report(home),recommendations:danger?[]:makePlan(home).slice(0,3),sources:[],missing_data:home.bills.length<2?['دو قبض قابل مقایسه']:[],safety_flags:danger?['urgent']:[],proposed_actions:danger?[]:['create_plan']};
 }});
 route(app,{method:'DELETE',url:'/v1/energy',summary:'پاک کردن حافظه انرژی خانه',tags:['energy'],auth:'citizen',handler:async({req})=>{
  await app.ctx.db.delete(energyHomes).where(eq(energyHomes.userId,req.citizen!.userId));return {ok:true};
 }});
 route(app,{method:'GET',url:'/v1/admin/energy/analytics',summary:'آمار تجمیعی انرژی بدون اطلاعات فردی',tags:['energy'],auth:'staff',handler:async({req})=>{
  if(req.staff!.platformRole!=='platform_admin') throw forbidden();
  const rows=await app.ctx.db.select({data:energyHomes.data}).from(energyHomes);
  return {households:rows.length,participants:rows.filter(r=>(r.data as Home).participating).length,
   confirmedSavings:null,ranking:[],quality:'خوداظهاری؛ کاهش مصرف تأییدشده و رتبه محلات هنوز در دسترس نیست.'};
 }});
}
