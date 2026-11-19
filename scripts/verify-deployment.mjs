import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const base='http://localhost:4180';
const browser=await chromium.launch({channel:'chrome'});
const citizen=await browser.newContext({viewport:{width:390,height:844}});
const staff=await browser.newContext();
const errors=[];
try{
 async function api(context,path,body,method='POST'){
  const response=await context.request.fetch(base+'/v1'+path,{method,data:body});
  if(!response.ok())throw new Error(path+': '+response.status()+' '+await response.text());
  return response.json();
 }
 async function login(context,mobile,admin=false){
  const prefix=admin?'/admin':'';
  const otp=await api(context,prefix+'/auth/request-otp',{mobile});
  if(!otp.devCode)throw new Error('Expected explicitly labelled demo authentication.');
  await api(context,prefix+'/auth/verify-otp',{mobile,code:otp.devCode});
 }
 const page=await citizen.newPage();page.on('pageerror',e=>errors.push(e.message));
 await login(citizen,'09120000001');await page.goto(base+'/');
 await page.getByRole('heading',{name:'خدمات پرکاربرد'}).waitFor();
 await page.getByRole('link',{name:/مشکلی در شهر دارم/}).click();
 await page.getByLabel('چه اتفاقی افتاده یا چه درخواستی داری؟').fill('آزمون استقرار روی سرور؛ گزارش آزمایشی خرابی آسفالت برای تأیید گردش‌کار');
 await page.getByLabel('خدمت و سازمان پاسخ‌گو').selectOption('report-road');
 await page.getByRole('button',{name:'ادامه',exact:true}).click();
 await page.getByLabel('نشانی یا محله').fill('نشانی ساختگی مخصوص آزمون نصب سرور');
 await page.getByRole('button',{name:'ادامه',exact:true}).click();
 await page.getByRole('checkbox').check();
 await page.getByRole('button',{name:'تأیید و ثبت درخواست',exact:true}).click();
 await page.getByRole('heading',{name:'درخواستت ثبت شد'}).waitFor();
 await page.getByRole('link',{name:'مشاهده و پیگیری درخواست'}).click();
 await page.getByRole('heading',{name:'مسیر درخواست'}).waitFor();
 const id=page.url().split('/').at(-1);
 await login(staff,'09130000001',true);
 await api(staff,'/admin/requests/'+id+'/assign',{assigneeId:(await api(staff,'/admin/me',undefined,'GET')).id},'PATCH');
 await api(staff,'/admin/requests/'+id+'/comments',{body:'پاسخ آزمایشی برای تأیید اتصال پنل و PostgreSQL مستقل',visibility:'public'});
 await api(staff,'/admin/requests/'+id+'/status',{status:'in_progress',reason:'شروع بررسی آزمایشی استقرار'},'PATCH');
 await api(staff,'/admin/requests/'+id+'/status',{status:'resolved',reason:'آزمون نصب کامل شد؛ این درخواست نمونه واقعی از گردش‌کار آزمایشی است.'},'PATCH');
 await page.reload();await page.getByRole('heading',{name:'از نتیجه رسیدگی راضی هستی؟'}).waitFor();
 if(await page.locator('.spread .chip').innerText()!=='رسیدگی شد')throw new Error('Resolved status missing.');
 const notifications=await api(citizen,'/notifications',undefined,'GET');
 if(!notifications.data.some(n=>n.entityId===id&&n.type==='status_changed'))throw new Error('Notification missing.');
 const list=await api(citizen,'/services',undefined,'GET');
 if(list.data.length!==47)throw new Error('Unexpected catalog size.');
 if(errors.length)throw new Error('Browser errors: '+errors.join('; '));
 await mkdir('.release/verification',{recursive:true});
 await page.screenshot({path:'.release/verification/server-request-mobile.png',fullPage:true});
 await page.goto(base+'/');await page.locator('.service-tile').first().waitFor();
 await page.screenshot({path:'.release/verification/server-home-mobile.png',fullPage:true});
 const result={checkedAt:new Date().toISOString(),database:'isolated-postgresql-16',catalogCount:list.data.length,checks:['built-ui','cookie-login','request-create','staff-assignment','staff-reply','status-history','citizen-result','notification'],browserErrors:errors.length,status:'passed'};
 await writeFile('.release/verification/server-smoke.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify(result));
}finally{await browser.close();}
