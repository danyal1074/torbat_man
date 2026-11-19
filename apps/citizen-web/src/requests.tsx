import { ResultUpload } from './result-upload';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Copy, MapPin, Bell } from 'lucide-react';
import { STAFF_TRANSITIONS, type NotificationDTO } from '@torbat/contracts';
import { call, date, useMe, Page, Alert, Empty, Status, Card, statusLabels, type RecordRow } from './lib';
export function Requests({ admin = false }: {
    admin?: boolean;
}) { const me = useMe(admin); const [filter, setFilter] = useState('all'); const list = useQuery({ queryKey: ['requests', admin, filter], queryFn: () => call<{
        data: RecordRow[];
    }>((admin ? '/admin' : '') + '/requests?limit=50' + (filter !== 'all' ? '&status=' + filter : '')), enabled: !!me.data, refetchInterval: 15000 }); const stats = useQuery({ queryKey: ['stats'], queryFn: () => call<{
        data: {
            total: number;
            submitted: number;
            inProgress: number;
            resolved: number;
        };
    }>('/admin/dashboard'), enabled: admin && !!me.data, refetchInterval: 15000 }); const [code, setCode] = useState(''); const [tracking, setTracking] = useState<{
    status: string;
    updatedAt: string;
}>(); const [error, setError] = useState(''); return <Page title={admin ? 'کارتابل سازمان' : 'درخواست‌های من'} eyebrow={admin ? me.data?.displayName ?? 'پنل کارشناسان' : 'هر درخواست، یک مسیر روشن'}>{!me.data ? <div className="panel"><p>برای دیدن درخواست‌ها وارد حساب شو.</p><Link className="button" to={admin ? '/admin/login' : '/login?next=/requests'}>ورود {admin ? 'کارکنان' : 'شهروند'}</Link></div> : <>{stats.data && <div className="stats">{[['همه درخواست‌ها', stats.data.data.total], ['تازه ثبت‌شده', stats.data.data.submitted], ['در دست اقدام', stats.data.data.inProgress], ['رسیدگی‌شده', stats.data.data.resolved]].map(([label, count]) => <div className="panel" key={label as string}><strong>{Number(count).toLocaleString('fa-IR')}</strong><span>{label}</span></div>)}</div>}<div className="filters"><label>وضعیت<select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">همه درخواست‌ها</option><option value="open">در حال رسیدگی</option>{!admin && <option value="done">نتیجه‌دار</option>}</select></label><button className="button outline" onClick={() => list.refetch()}><RefreshCw size={17}/>به‌روزرسانی</button>{!admin && <Link className="button" to="/new">درخواست جدید</Link>}</div>{list.isError && <Alert>{list.error.message}</Alert>}{list.isPending ? <p role="status">در حال دریافت…</p> : list.data?.data.length ? <div className="request-grid">{list.data.data.map(r => <Card key={r.id} r={r} admin={admin}/>)}</div> : <Empty>درخواستی در این بخش نیست.</Empty>}</>}{!admin && <form className="panel tracking-form" onSubmit={async (e) => { e.preventDefault(); setError(''); setTracking(undefined); try {
    const r = await call<{
        data: {
            status: string;
            updatedAt: string;
        };
    }>('/tracking/' + encodeURIComponent(code.trim()));
    setTracking(r.data);
}
catch (e) {
    setError((e as Error).message);
} }}><h2>کد پیگیری داری؟</h2><label>کد پیگیری<input dir="ltr" required value={code} onChange={e => setCode(e.target.value)} placeholder="TM-…"/></label><button className="button outline">بررسی وضعیت</button>{tracking && <p><Status status={tracking.status}/> آخرین تغییر: {date(tracking.updatedAt)}</p>}{error && <Alert>{error}</Alert>}<small>این بخش فقط وضعیت کلی را نمایش می‌دهد؛ جزئیات پرونده نیازمند ورود است.</small></form>}</Page>; }
export function Detail({ admin = false }: {
    admin?: boolean;
}) { const { id } = useParams(); const me = useMe(admin); const qc = useQueryClient(); const detail = useQuery({ queryKey: ['detail', admin, id], queryFn: () => call<{
        data: RecordRow;
    }>((admin ? '/admin' : '') + '/requests/' + id), enabled: !!me.data, refetchInterval: 10000 }); const [message, setMessage] = useState(''); const [internal, setInternal] = useState(false); const [next, setNext] = useState(''); const [reason, setReason] = useState(''); const [target, setTarget] = useState(''); const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [busy, setBusy] = useState(false); const orgs = useQuery({ queryKey: ['orgs'], queryFn: () => call<{
        data: {
            id: string;
            name: string;
        }[];
    }>('/organizations'), enabled: admin }); async function mutate(path: string, body: unknown, method = 'POST') { setBusy(true); setError(''); setNotice(''); try {
    await call(path, body, method);
    await Promise.all([qc.invalidateQueries({ queryKey: ['detail'] }), qc.invalidateQueries({ queryKey: ['requests'] }), qc.invalidateQueries({ queryKey: ['notifications'] }), qc.invalidateQueries({ queryKey: ['stats'] })]);
    setMessage('');
    setReason('');
    setNext('');
    setNotice('تغییرات ذخیره شد.');
}
catch (e) {
    setError((e as Error).message);
}
finally {
    setBusy(false);
} } const r = detail.data?.data; if (!me.data)
    return <Link className="button" to={admin ? '/admin/login' : '/login'}>ورود برای مشاهده پرونده</Link>; if (!r)
    return detail.isError ? <Alert>{detail.error.message}</Alert> : <p role="status">در حال دریافت پرونده…</p>; return <Page title={r.title} eyebrow={r.organizationName}><div className="detail-layout"><div><div className="panel"><div className="spread"><Status status={r.status}/><bdi>{r.trackingCode}</bdi></div><button className="text-link" onClick={async () => { try {
    await navigator.clipboard.writeText(r.trackingCode);
    setNotice('کد پیگیری کپی شد.');
}
catch {
    setNotice('کپی خودکار ممکن نشد؛ کد را انتخاب و کپی کنید.');
} }}><Copy size={16}/>کپی کد پیگیری</button><p className="description">{r.description}</p>{r.address && <p><MapPin size={17}/>{r.address}</p>}<small>{date(r.createdAt)}</small><div className="attachments">{r.attachments?.map(a => <a key={a.id} href={a.url} target="_blank" rel="noreferrer"><img alt="پیوست خصوصی درخواست" src={a.url}/></a>)}</div></div><section className="panel"><h2>گفت‌وگو با {admin ? 'شهروند' : 'کارشناس'}</h2>{r.comments?.length ? r.comments.map(c => <article className="comment" key={c.id}><small>{c.visibility === 'internal' ? 'یادداشت داخلی' : c.isStaff ? 'پاسخ کارشناس' : 'پیام پرونده'} · {date(c.createdAt)}</small><p>{c.body}</p></article>) : <p className="muted">هنوز پیامی ثبت نشده است.</p>}<form onSubmit={e => { e.preventDefault(); mutate((admin ? '/admin' : '') + '/requests/' + id + '/comments', { body: message, ...(admin ? { visibility: internal ? 'internal' : 'public' } : {}) }); }}><label>پیام جدید<textarea required maxLength={2000} value={message} onChange={e => setMessage(e.target.value)}/></label>{admin && <label className="checkbox"><input type="checkbox" checked={internal} onChange={e => setInternal(e.target.checked)}/>یادداشت داخلی؛ برای شهروند نمایش داده نمی‌شود</label>}<button className="button outline" disabled={busy}>ارسال پیام</button></form></section>{admin && <section className="panel"><h2>رسیدگی به درخواست</h2><ResultUpload requestId={r.id}/><form onSubmit={e => { e.preventDefault(); mutate('/admin/requests/' + id + '/status', { status: next, reason }, 'PATCH'); }}><label>وضعیت بعدی<select required value={next} onChange={e => setNext(e.target.value)}><option value="">انتخاب وضعیت</option>{STAFF_TRANSITIONS[r.status].map(s => <option value={s} key={s}>{statusLabels[s]}</option>)}</select></label><label>دلیل و توضیح رسیدگی<textarea required minLength={5} maxLength={1000} value={reason} onChange={e => setReason(e.target.value)}/></label><button className="button" disabled={busy}>ثبت تغییر وضعیت</button></form><div className="filters"><button className="button outline" disabled={busy} onClick={() => mutate('/admin/requests/' + id + '/assign', { assigneeId: me.data.id }, 'PATCH')}>ارجاع به خودم</button><button className="text-link" disabled={busy} onClick={() => mutate('/admin/requests/' + id + '/assign', { assigneeId: null }, 'PATCH')}>لغو ارجاع</button></div><form onSubmit={e => { e.preventDefault(); mutate('/admin/requests/' + id + '/transfer', { organizationId: target, reason }, 'PATCH'); }}><label>انتقال به سازمان دیگر<select required value={target} onChange={e => setTarget(e.target.value)}><option value="">انتخاب سازمان</option>{orgs.data?.data.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label><label>دلیل انتقال<textarea required minLength={5} value={reason} onChange={e => setReason(e.target.value)}/></label><button className="button outline" disabled={busy}>ثبت انتقال سازمانی</button></form></section>}{!admin && r.status === 'resolved' && <section className="panel"><h2>از نتیجه رسیدگی راضی هستی؟</h2>{r.satisfactionScore ? <p>امتیاز ثبت‌شده: {r.satisfactionScore.toLocaleString('fa-IR')}</p> : <div className="filters">{[1, 2, 3, 4, 5].map(score => <button key={score} className="button outline" disabled={busy} onClick={() => mutate('/requests/' + id + '/rate', { score })}>امتیاز {score.toLocaleString('fa-IR')}</button>)}</div>}<form onSubmit={e => { e.preventDefault(); mutate('/requests/' + id + '/reopen', { reason }); }}><label>اگر مشکل حل نشده، دلیل بازگشایی را بنویس<textarea required minLength={5} value={reason} onChange={e => setReason(e.target.value)}/></label><button className="button outline" disabled={busy}>بازگشایی درخواست</button></form></section>}</div><aside className="panel timeline"><h2>مسیر درخواست</h2>{r.history?.map(h => <article key={h.id}><span className="timeline-dot"/><strong>{statusLabels[h.toStatus]}</strong><p>{h.reason}</p><small>{date(h.createdAt)}</small></article>)}</aside></div>{notice && <div className="notice" role="status">{notice}</div>}{error && <Alert>{error}</Alert>}</Page>; }
export function Notifications() { const me = useMe(); const qc = useQueryClient(); const list = useQuery({ queryKey: ['notifications'], queryFn: () => call<{
        data: NotificationDTO[];
    }>('/notifications'), enabled: !!me.data, refetchInterval: 15000 }); const [error, setError] = useState(''); return <Page title="اعلان‌ها" eyebrow="خبر تازه از درخواستت">{!me.data ? <Link className="button" to="/login?next=/notifications">ورود برای دیدن اعلان‌ها</Link> : list.isError ? <Alert>{list.error.message}</Alert> : list.data?.data.length ? list.data.data.map(n => <article className={'panel notification ' + (!n.readAt ? 'unread' : '')} key={n.id}><Bell size={21}/><div><h2>{n.title}</h2><p>{n.body}</p><small>{date(n.createdAt)}</small><div className="filters">{n.entityType === 'request' && <Link className="text-link" to={'/requests/' + n.entityId}>مشاهده درخواست</Link>}{!n.readAt && <button className="text-link" onClick={async () => { try {
    await call('/notifications/' + n.id + '/read', undefined, 'PATCH');
    await qc.invalidateQueries({ queryKey: ['notifications'] });
}
catch (e) {
    setError((e as Error).message);
} }}>خواندم</button>}</div></div></article>) : <Empty>اعلان تازه‌ای نداری.</Empty>}{error && <Alert>{error}</Alert>}</Page>; }
