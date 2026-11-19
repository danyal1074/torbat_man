import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Alert } from './lib';
export function ResultUpload({requestId}:{requestId:string}) {
 const [file,setFile]=useState<File>();const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [done,setDone]=useState(false);const qc=useQueryClient();
 async function upload(e:FormEvent){
  e.preventDefault();if(!file)return;setBusy(true);setError('');setDone(false);
  try{
   if(file.size>5*1024*1024)throw new Error('تصویر باید کوچک‌تر از ۵ مگابایت باشد.');
   const body=new FormData();body.append('file',file);
   const res=await fetch('/v1/admin/requests/'+requestId+'/attachments',{method:'POST',credentials:'include',body});
   const data=await res.json();if(!res.ok)throw new Error(data.error?.message??'بارگذاری ناموفق بود.');
   await qc.invalidateQueries({queryKey:['detail']});setDone(true);
  }catch(e){setError((e as Error).message)}finally{setBusy(false)}
 }
 return <form onSubmit={upload}><label>تصویر نتیجه رسیدگی<input type="file" required accept="image/jpeg,image/png,image/webp" onChange={e=>{setFile(e.target.files?.[0]);setDone(false)}}/></label><p className="metadata">بدون چهره، پلاک یا سند شخصی؛ خصوصی و قابل مشاهده برای صاحب پرونده و سازمان پاسخ‌گو.</p><button className="button outline" disabled={busy||!file||done}>{busy?'در حال بارگذاری…':'بارگذاری تصویر نتیجه'}</button>{error&&<Alert>{error}</Alert>}{done&&<p role="status">تصویر نتیجه ذخیره شد.</p>}</form>
}
