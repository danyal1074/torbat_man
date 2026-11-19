import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { STAFF_TRANSITIONS } from '@torbat/contracts';
import { call, statusLabels, useMe, type RecordRow } from './lib';
import { ResultUpload } from './result-upload';

export function StaffActions({record:r,busy,onAction}:{record:RecordRow;busy:boolean;onAction:(path:string,body:unknown,method?:string)=>Promise<boolean>}){
 const me=useMe(true);const [next,setNext]=useState('');const [reason,setReason]=useState('');const [target,setTarget]=useState('');const [transferReason,setTransferReason]=useState('');const [assignee,setAssignee]=useState('');
 const orgs=useQuery({queryKey:['organizations'],queryFn:()=>call<{data:{id:string;name:string;status:string}[]}>('/organizations'),enabled:!!r.permissions?.canTransfer});
 const members=useQuery({queryKey:['members',r.organizationId],queryFn:()=>call<{data:{userId:string;name:string|null;mobile:string;role:string}[]}>('/admin/members?organizationId='+r.organizationId),enabled:!!r.organizationId&&!!r.permissions?.canAssign});
 const transitions=r.allowedTransitions??STAFF_TRANSITIONS[r.status];
 const editable=!['closed','rejected'].includes(r.status);
 return <section className="panel"><h2>رسیدگی به درخواست</h2><ResultUpload requestId={r.id}/>
  {transitions.length>0&&<form onSubmit={async e=>{e.preventDefault();if(await onAction('/admin/requests/'+r.id+'/status',{status:next,reason},'PATCH')){setNext('');setReason('')}}}>
   <label>وضعیت بعدی<select required value={next} onChange={e=>setNext(e.target.value)}><option value="">انتخاب وضعیت</option>{transitions.map(s=><option key={s} value={s}>{statusLabels[s]}</option>)}</select></label><label>دلیل و توضیح رسیدگی<textarea required minLength={5} maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)}/></label><button className="button" disabled={busy}>ثبت تغییر وضعیت</button>
  </form>}
  {editable&&<div className="filters"><button className="button outline" disabled={busy||!!r.assigneeId&&r.assigneeId!==me.data?.id&&!r.permissions?.canAssign} onClick={()=>onAction('/admin/requests/'+r.id+'/assign',{assigneeId:me.data!.id},'PATCH')}>ارجاع به خودم</button>{(!r.assigneeId||r.assigneeId===me.data?.id||r.permissions?.canAssign)&&<button className="text-link" disabled={busy||!r.assigneeId} onClick={()=>onAction('/admin/requests/'+r.id+'/assign',{assigneeId:null},'PATCH')}>لغو ارجاع</button>}</div>}
  {editable&&r.permissions?.canAssign&&<form onSubmit={async e=>{e.preventDefault();await onAction('/admin/requests/'+r.id+'/assign',{assigneeId:assignee},'PATCH')}}><label>ارجاع به کارشناس<select required value={assignee} onChange={e=>setAssignee(e.target.value)}><option value="">انتخاب کارشناس</option>{members.data?.data.map(m=><option key={m.userId} value={m.userId}>{m.name??m.mobile}</option>)}</select></label><button className="button outline" disabled={busy}>ثبت ارجاع</button></form>}
  {editable&&r.permissions?.canTransfer&&<form onSubmit={async e=>{e.preventDefault();if(await onAction('/admin/requests/'+r.id+'/transfer',{organizationId:target,reason:transferReason},'PATCH')){setTarget('');setTransferReason('')}}}>
   <label>انتقال به سازمان دیگر<select required value={target} onChange={e=>setTarget(e.target.value)}><option value="">انتخاب سازمان</option>{orgs.data?.data.filter(o=>o.status==='active'&&o.id!==r.organizationId).map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label><label>دلیل انتقال<textarea required minLength={5} maxLength={500} value={transferReason} onChange={e=>setTransferReason(e.target.value)}/></label><button className="button outline" disabled={busy}>ثبت انتقال سازمانی</button>
  </form>}
  {!r.permissions?.canTransfer&&<p className="metadata">انتقال به سازمان دیگر در اختیار مسئول ارجاع یا مدیر سازمان است.</p>}
 </section>;
}
