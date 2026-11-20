import { StaffActions } from './staff-actions';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, MapPin, Bell } from 'lucide-react';
import { CITIZEN_CAN_COMMENT, CITIZEN_REOPENABLE, type NotificationDTO } from '@torbat/contracts';
import { call, date, useMe, Page, Alert, Empty, Status, statusLabels, type RecordRow } from './lib';
export { Requests } from './request-list';
export function Detail({ admin = false }: {
    admin?: boolean;
}) { const { id } = useParams(); const me = useMe(admin); const qc = useQueryClient(); const detail = useQuery({ queryKey: ['detail', admin, id], queryFn: () => call<{
        data: RecordRow;
    }>((admin ? '/admin' : '') + '/requests/' + id), enabled: !!me.data, refetchInterval: 10000 }); const [message, setMessage] = useState(''); const [internal, setInternal] = useState(false);  const [reason, setReason] = useState('');  const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [busy, setBusy] = useState(false); async function mutate(path: string, body: unknown, method = 'POST') { setBusy(true); setError(''); setNotice(''); try {
    await call(path, body, method);
    await Promise.all([qc.invalidateQueries({ queryKey: ['detail'] }), qc.invalidateQueries({ queryKey: ['requests'] }), qc.invalidateQueries({ queryKey: ['notifications'] }), qc.invalidateQueries({ queryKey: ['stats'] })]);
    setMessage('');
    setReason('');
    setNotice('تغییرات ذخیره شد.');
    return true;
}
catch (e) {
    setError((e as Error).message);
    return false;
}
finally {
    setBusy(false);
} } const r = detail.data?.data; if (!me.data)
    return <Link className="button" to={admin ? '/admin/login' : '/login'}>ورود برای مشاهده پرونده</Link>; if (!r)
    return detail.isError ? <Alert>{detail.error.message}</Alert> : <p role="status">در حال دریافت پرونده…</p>; return <Page title={r.title} eyebrow={r.organizationName}><div className={admin ? "detail-layout" : "detail-layout civic-detail"}><div className="detail-body"><div className={admin ? "panel" : "panel civic-tracking-card"}><div className="spread"><Status status={r.status}/><bdi>{r.trackingCode}</bdi></div><button className="text-link" onClick={async () => { try {
    await navigator.clipboard.writeText(r.trackingCode);
    setNotice('کد پیگیری کپی شد.');
}
catch {
    setNotice('کپی خودکار ممکن نشد؛ کد را انتخاب و کپی کنید.');
} }}><Copy size={16}/>کپی کد پیگیری</button><p className="description">{r.description}</p>{r.address && <p><MapPin size={17}/>{r.address}</p>}<small>{date(r.createdAt)}</small>{r.formEntries?.length?<dl className="form-entries">{r.formEntries.map((entry,i)=><div key={i}><dt>{entry.label}</dt><dd>{entry.value}</dd></div>)}</dl>:null}<div className="attachments">{r.attachments?.map(a => <a key={a.id} href={a.url} target="_blank" rel="noreferrer"><img alt="پیوست خصوصی درخواست" src={a.url}/></a>)}</div></div>{!admin && <aside className="panel timeline"><h2>مسیر درخواست</h2>{r.history?.map((h, index) => <article key={h.id} aria-current={index === 0 ? "step" : undefined}><span className="timeline-dot" aria-hidden="true"/><strong>{statusLabels[h.toStatus]}</strong>{h.reason && <p>{h.reason}</p>}<small>{date(h.createdAt)}</small></article>)}</aside>}<section className="panel"><h2>گفت‌وگو با {admin ? 'شهروند' : 'کارشناس'}</h2>{r.comments?.length ? r.comments.map(c => <article className="comment" key={c.id}><small>{c.visibility === 'internal' ? 'یادداشت داخلی' : c.isStaff ? 'پاسخ کارشناس' : 'پیام پرونده'} · {date(c.createdAt)}</small><p>{c.body}</p></article>) : <p className="muted">هنوز پیامی ثبت نشده است.</p>}{(admin||CITIZEN_CAN_COMMENT.includes(r.status))&&<form onSubmit={e => { e.preventDefault(); mutate((admin ? '/admin' : '') + '/requests/' + id + '/comments', { body: message, ...(admin ? { visibility: internal ? 'internal' : 'public' } : {}) }); }}><label>پیام جدید<textarea required maxLength={2000} value={message} onChange={e => setMessage(e.target.value)}/></label>{admin && <label className="checkbox"><input type="checkbox" checked={internal} onChange={e => setInternal(e.target.checked)}/>یادداشت داخلی؛ برای شهروند نمایش داده نمی‌شود</label>}<button className="button outline" disabled={busy}>ارسال پیام</button></form>}</section>{admin && <StaffActions record={r} busy={busy} onAction={mutate}/>}{!admin && CITIZEN_REOPENABLE.includes(r.status) && <section className="panel"><h2>{r.status==='resolved'?'از نتیجه رسیدگی راضی هستی؟':'اعتراض به نتیجه درخواست'}</h2>{r.status==='resolved'&&(r.satisfactionScore ? <p>امتیاز ثبت‌شده: {r.satisfactionScore.toLocaleString('fa-IR')}</p> : <div className="filters">{[1, 2, 3, 4, 5].map(score => <button key={score} className="button outline" disabled={busy} onClick={() => mutate('/requests/' + id + '/rate', { score })}>امتیاز {score.toLocaleString('fa-IR')}</button>)}</div>)}<form onSubmit={e => { e.preventDefault(); mutate('/requests/' + id + '/reopen', { reason }); }}><label>اگر مشکل حل نشده، دلیل بازگشایی را بنویس<textarea required minLength={5} value={reason} onChange={e => setReason(e.target.value)}/></label><button className="button outline" disabled={busy}>بازگشایی درخواست</button></form></section>}</div>{admin && <aside className="panel timeline"><h2>مسیر درخواست</h2>{r.history?.map((h, index) => <article key={h.id} aria-current={index === 0 ? "step" : undefined}><span className="timeline-dot" aria-hidden="true"/><strong>{statusLabels[h.toStatus]}</strong>{h.reason && <p>{h.reason}</p>}<small>{date(h.createdAt)}</small></article>)}</aside>}</div>{notice && <div className="notice" role="status">{notice}</div>}{error && <Alert>{error}</Alert>}</Page>; }
export function Notifications() { const me = useMe(); const qc = useQueryClient(); const list = useQuery({ queryKey: ['notifications'], queryFn: () => call<{
        data: NotificationDTO[];
    }>('/notifications'), enabled: !!me.data, refetchInterval: 15000 }); const [error, setError] = useState(''); return <Page title="اعلان‌ها" eyebrow="خبر تازه از درخواستت">{!me.data ? <Link className="button" to="/login?next=/notifications">ورود برای دیدن اعلان‌ها</Link> : list.isError ? <Alert>{list.error.message}</Alert> : list.data?.data.length ? list.data.data.map(n => <article className={'panel notification ' + (!n.readAt ? 'unread' : '')} key={n.id}><Bell size={21}/><div><h2>{n.title}</h2><p>{n.body}</p><small>{date(n.createdAt)}</small><div className="filters">{n.entityType === 'request' && <Link className="text-link" to={'/requests/' + n.entityId}>مشاهده درخواست</Link>}{!n.readAt && <button className="text-link" onClick={async () => { try {
    await call('/notifications/' + n.id + '/read', undefined, 'PATCH');
    await qc.invalidateQueries({ queryKey: ['notifications'] });
}
catch (e) {
    setError((e as Error).message);
} }}>خواندم</button>}</div></div></article>) : <Empty>اعلان تازه‌ای نداری.</Empty>}{error && <Alert>{error}</Alert>}</Page>; }
