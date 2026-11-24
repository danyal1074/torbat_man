import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const base=process.env.TORBAT_SMOKE_URL ?? 'http://localhost:4180';
const accessPath=process.env.TORBAT_SMOKE_ACCESS_FILE;
let auth={};
if(accessPath){
 const origin=new URL(base);
 if(origin.protocol!=='https:'||origin.hostname!=='torbat.digiral.ir')throw new Error('Access credentials require the Torbat HTTPS domain.');
 const access=await readFile(accessPath,'utf8');
 const username=access.match(/^Username: (\S+)\s*$/m)?.[1];
 const password=access.match(/^Password: (\S+)\s*$/m)?.[1];
 if(!username||!password)throw new Error('Missing preview credentials.');
 auth={httpCredentials:{username,password,origin:origin.origin,send:'always'}};
}
const browser=await chromium.launch({channel:'chrome'});
const citizen=await browser.newContext({...auth,viewport:{width:390,height:844}});
const staff=await browser.newContext(auth);
const errors=[];
let stage='login';
try{
 async function api(context,path,body,method='POST'){
  const response=await context.request.fetch(base+'/v1'+path,{method,data:body}).catch(error=>{
   const code=/\b(?:ETIMEDOUT|ECONNREFUSED|ECONNRESET|ENOTFOUND)\b/.exec(error.message)?.[0] ?? 'transport error';
   throw new Error(method+' '+path+': '+code);
  });
  if(!response.ok())throw new Error(method+' '+path+': '+response.status());
  return response.json();
 }
 async function login(context,mobile,admin=false){
  const prefix=admin?'/admin':'';
  const otp=await api(context,prefix+'/auth/request-otp',{mobile});
  if(!otp.devCode)throw new Error('Expected explicitly labelled demo authentication.');
  await api(context,prefix+'/auth/verify-otp',{mobile,code:otp.devCode});
 }
 const page=await citizen.newPage();page.on('pageerror',e=>errors.push(e.message));
 if(accessPath){
  const loginPage=await page.goto(base+'/login');
  if(loginPage?.status()!==200)throw new Error('Demo sign-in page unavailable.');
 }
 await login(citizen,'09120000001');await page.goto(base+'/');
 stage='public home';
 await page.getByRole('heading',{name:'دسته‌بندی خدمات'}).waitFor();
 stage='report form';
 await page.goto(base+'/shahrbin/new?type=roads');
 await page.getByLabel('توضیحات مشکل').fill('آزمون استقرار روی سرور؛ گزارش آزمایشی خرابی آسفالت برای تأیید گردش‌کار');
 await page.getByRole('button',{name:'مرحله بعد'}).click();
 await page.getByLabel('نشانی یا نشانه').fill('نشانی ساختگی مخصوص آزمون نصب سرور');
 await page.getByRole('button',{name:'مرحله بعد'}).click();
 stage='report submission';
 const submitted=page.waitForResponse(r=>new URL(r.url()).pathname==='/v1/requests'&&r.request().method()==='POST'&&(!accessPath||r.status()!==401));
 await page.getByRole('button',{name:'ثبت گزارش',exact:true}).click();
 const submission=await submitted;
 if(!submission.ok())throw new Error('Report submission HTTP '+submission.status());
 stage='stored report';
 await page.getByText('گزارش شهری ثبت شد',{exact:true}).waitFor();
 await page.getByRole('link',{name:'مشاهده وضعیت گزارش'}).click();
 await page.getByRole('heading',{name:'روند رسیدگی'}).waitFor();
 const id=page.url().split('/').at(-1);
 stage='staff workflow';
 await login(staff,'09130000001',true);
 await api(staff,'/admin/requests/'+id+'/assign',{assigneeId:(await api(staff,'/admin/me',undefined,'GET')).id},'PATCH');
 await api(staff,'/admin/requests/'+id+'/comments',{body:'پاسخ آزمایشی برای تأیید اتصال پنل و PostgreSQL مستقل',visibility:'public'});
 await api(staff,'/admin/requests/'+id+'/status',{status:'in_progress',reason:'شروع بررسی آزمایشی استقرار'},'PATCH');
 await api(staff,'/admin/requests/'+id+'/status',{status:'resolved',reason:'آزمون نصب کامل شد؛ این درخواست نمونه واقعی از گردش‌کار آزمایشی است.'},'PATCH');
 stage='citizen result';
 await page.reload();await page.getByRole('heading',{name:'از نتیجه راضی بودید؟'}).waitFor();
 if(await page.locator('.detail-top .sbadge').innerText()!=='انجام‌شده')throw new Error('Resolved status missing.');
 const notifications=await api(citizen,'/notifications',undefined,'GET');
 if(!notifications.data.some(n=>n.entityId===id&&n.type==='status_changed'))throw new Error('Notification missing.');
 const list=await api(citizen,'/services',undefined,'GET');
 if(list.data.length!==47)throw new Error('Unexpected catalog size.');
 if(errors.length)throw new Error('Browser errors: '+errors.join('; '));
 await mkdir('.release/verification',{recursive:true});
 await page.screenshot({path:'.release/verification/server-request-mobile.png',fullPage:true});
 await page.goto(base+'/');await page.locator('.ref-home-grid a').first().waitFor();
 await page.screenshot({path:'.release/verification/server-home-mobile.png',fullPage:true});
 const result={checkedAt:new Date().toISOString(),database:'isolated-postgresql-16',catalogCount:list.data.length,checks:['built-ui','cookie-login','request-create','staff-assignment','staff-reply','status-history','citizen-result','notification'],browserErrors:errors.length,status:'passed'};
 await writeFile('.release/verification/server-smoke.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify(result));
}catch(error){
 console.error('Deployment smoke failed at '+stage+':', error.message.split('\n',1)[0]);
 process.exitCode=1;
}finally{await browser.close();}
