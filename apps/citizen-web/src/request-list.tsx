import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { RefreshCw, Search } from 'lucide-react';
import { call, date, useMe, useCatalog, Page, Alert, Empty, Status, Card, statusLabels, type RecordRow } from './lib';
import type { OrganizationDTO } from '@torbat/contracts';

export function Requests({admin=false}:{admin?:boolean}) {
 const me=useMe(admin);const catalog=useCatalog();
 const [status,setStatus]=useState('all');const [search,setSearch]=useState('');const [query,setQuery]=useState('');
 const [organization,setOrganization]=useState('');const [service,setService]=useState('');const [overdue,setOverdue]=useState(false);
 useEffect(()=>{const timer=setTimeout(()=>setQuery(search.trim()),300);return()=>clearTimeout(timer);},[search]);
 const organizations=useQuery({queryKey:['organizations'],queryFn:()=>call<{data:OrganizationDTO[]}>('/organizations'),enabled:!!me.data});
 const params=new URLSearchParams({limit:'12'});
 if(status!=='all')params.set('status',status);
 if(query)params.set('q',query);
 if(organization)params.set('organizationId',organization);
 if(admin&&service)params.set('serviceId',service);
 if(admin&&overdue)params.set('overdue','true');
 const list=useInfiniteQuery({
  queryKey:['requests',admin,status,query,organization,service,overdue],
  initialPageParam:null as string|null,
  queryFn:({pageParam})=>call<{data:RecordRow[];meta:{nextCursor:string|null}}>((admin?'/admin':'')+'/requests?'+params+(pageParam?'&cursor='+encodeURIComponent(pageParam):'')),
  getNextPageParam:last=>last.meta.nextCursor??undefined,
  enabled:!!me.data,refetchInterval:30000,
 });
 const stats=useQuery({queryKey:['stats'],queryFn:()=>call<{data:{total:number;submitted:number;inProgress:number;resolved:number}}>('/admin/dashboard'),enabled:admin&&!!me.data,refetchInterval:30000});
 const [code,setCode]=useState('');const [tracking,setTracking]=useState<{status:string;updatedAt:string}>();const [error,setError]=useState('');const [trackingBusy,setTrackingBusy]=useState(false);
 const records=list.data?.pages.flatMap(p=>p.data)??[];
 const orgOptions=organizations.data?.data.filter(o=>!admin||me.data?.platformRole==='platform_admin'||me.data?.memberships.some(m=>m.organizationId===o.id))??[];
 return <Page title={admin?'کارتابل سازمان':'درخواست‌های من'} eyebrow={admin?me.data?.displayName??'پنل کارشناسان':'هر درخواست، یک مسیر روشن'}>
  {me.isPending?<p role="status">در حال بررسی حساب…</p>:!me.data?<div className="panel"><p>برای دیدن درخواست‌ها وارد حساب شو.</p><Link className="button" to={admin?'/admin/login':'/login?next=/requests'}>ورود {admin?'کارکنان':'شهروند'}</Link></div>:<>
   {stats.data&&<div className="stats">{[['همه درخواست‌ها',stats.data.data.total],['تازه ثبت‌شده',stats.data.data.submitted],['در دست اقدام',stats.data.data.inProgress],['رسیدگی‌شده',stats.data.data.resolved]].map(([label,count])=><div className="panel" key={label as string}><strong>{Number(count).toLocaleString('fa-IR')}</strong><span>{label}</span></div>)}</div>}
   <div className="search"><Search size={20} aria-hidden="true"/><input aria-label="جست‌وجوی درخواست‌ها" placeholder="عنوان، شرح یا کد پیگیری…" value={search} maxLength={100} onChange={e=>setSearch(e.target.value)}/></div>
   <div className="filters request-filters">
    <label>وضعیت<select value={status} onChange={e=>setStatus(e.target.value)}><option value="all">همه درخواست‌ها</option><option value="open">در حال رسیدگی</option>{admin?Object.entries(statusLabels).map(([key,label])=><option key={key} value={key}>{label}</option>):<option value="done">نتیجه‌دار</option>}</select></label>
    <label>سازمان<select value={organization} onChange={e=>{setOrganization(e.target.value);setService('')}}><option value="">همه سازمان‌ها</option>{orgOptions.map(o=><option key={o.id} value={o.id}>{o.shortName}</option>)}</select></label>
    {admin&&<><label>خدمت<select value={service} onChange={e=>setService(e.target.value)}><option value="">همه خدمات</option>{catalog.data?.data.filter(s=>s.status.startsWith('active')&&s.organization&&(!organization||s.organization.id===organization)).map(s=><option key={s.id} value={s.id}>{s.shortTitle}</option>)}</select></label><label className="checkbox"><input type="checkbox" checked={overdue} onChange={e=>setOverdue(e.target.checked)}/>گذشته از مهلت آزمایشی</label></>}
    <button className="button outline" onClick={()=>list.refetch()} disabled={list.isFetching}><RefreshCw size={17} aria-hidden="true"/>به‌روزرسانی</button>
    {!admin&&<Link className="button" to="/new">درخواست جدید</Link>}
   </div>
   {list.isError&&<Alert>{list.error.message} <button onClick={()=>list.refetch()}>تلاش دوباره</button></Alert>}
   {list.isPending?<p role="status">در حال دریافت درخواست‌ها…</p>:records.length?<><p className="metadata" role="status">{records.length.toLocaleString('fa-IR')} درخواست نمایش داده می‌شود{list.hasNextPage?'؛ موارد بیشتری موجود است.':'.'}</p><div className="request-grid" aria-busy={list.isFetching}>{records.map(r=><Card key={r.id} r={r} admin={admin}/>)}</div>{list.hasNextPage&&<button className="button outline load-more" disabled={list.isFetchingNextPage} onClick={()=>list.fetchNextPage()}>{list.isFetchingNextPage?'در حال دریافت…':'نمایش درخواست‌های بیشتر'}</button>}</>:<Empty>{query||status!=='all'||organization?'درخواستی با این فیلترها پیدا نشد.':'هنوز درخواستی در این بخش نیست.'}</Empty>}
  </>}
  {!admin&&<form className="panel tracking-form" onSubmit={async e=>{e.preventDefault();setTrackingBusy(true);setError('');setTracking(undefined);try{const r=await call<{data:{status:string;updatedAt:string}}>('/tracking/'+encodeURIComponent(code.trim()));setTracking(r.data)}catch(e){setError((e as Error).message)}finally{setTrackingBusy(false)}}}>
   <h2>کد پیگیری داری؟</h2><label>کد پیگیری<input required dir="ltr" value={code} onChange={e=>setCode(e.target.value)} placeholder="TM-…"/></label><button className="button outline" disabled={trackingBusy}>{trackingBusy?'در حال بررسی…':'بررسی وضعیت'}</button>
   {tracking&&<p role="status"><Status status={tracking.status}/> آخرین تغییر: {date(tracking.updatedAt)}</p>}{error&&<Alert>{error}</Alert>}<small>این بخش فقط وضعیت کلی را نمایش می‌دهد؛ جزئیات پرونده نیازمند ورود است.</small>
  </form>}
 </Page>;
}
