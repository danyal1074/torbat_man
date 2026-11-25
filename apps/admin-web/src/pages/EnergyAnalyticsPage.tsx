
import { useEffect, useState } from 'react';
export function EnergyAnalyticsPage(){
 const [data,setData]=useState<{households:number;participants:number;quality:string}>();
 const [error,setError]=useState('');
 useEffect(()=>{const controller=new AbortController();void fetch('/v1/admin/energy/analytics',{signal:controller.signal}).then(async response=>{
  if(!response.ok)throw new Error('دریافت آمار انرژی مجاز یا ممکن نیست.');
  setData(await response.json());
 }).catch(error=>{if(!controller.signal.aborted)setError(error.message);});return ()=>controller.abort();},[]);
 function download(){
  if(!data)return;
  const blob=new Blob(['\ufeffشاخص,مقدار\nخانه‌های ثبت‌شده,'+data.households+'\nعضویت داوطلبانه,'+data.participants+'\n'],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='energy-aggregates.csv';a.click();URL.revokeObjectURL(url);
 }
 return <section className="space-y-5"><h1 className="text-xl font-bold">پایش تجمیعی انرژی</h1>{error&&<p role="alert">{error}</p>}{data?<><div className="rounded-2xl bg-white p-6 border"><p>{data.households.toLocaleString('fa-IR')} خانه ثبت‌شده</p><p>{data.participants.toLocaleString('fa-IR')} مشارکت داوطلبانه</p></div><p>{data.quality}</p><p>قبض و اطلاعات فردی در این گزارش نمایش داده نمی‌شود.</p><button onClick={download} className="rounded-xl bg-purple-700 text-white px-4 py-3">دریافت CSV تجمیعی</button></>:!error&&<p role="status">در حال دریافت…</p>}</section>;
}
