import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { ArrowLeft, ArrowRight, BookOpen, Bus, Camera, Crosshair, HeartPlus, Layers3, MapPinned, Search, Wheat, Wrench, CheckCircle2, ChevronLeft, ClipboardList, Copy, FileSearch, Info, Plus, Save, Send, Star, Trash2, X } from 'lucide-react';
import { EmptyState, PageHeader } from '../components/ui';
import {
  Draft, DraftErrors, MAX_DESC, MAX_PHOTOS, Report, emptyDraft, faDigits, formatDate, problemTypes, reportStore,
  statusMeta, typeOf, useReports, useReport, useReportCollection, validateInfo, validateLocation, validatePhoto, ReportStatus, DEMO_USER, kindLabel, draftStore, useDrafts, relTime,
} from './model';
import { useQueryClient } from '@tanstack/react-query';
import { useUser } from '../state/session';
import { messageOf } from '../lib/backend';
import { normalizeFa } from '../lib/normalize';
import { ReferenceIcon } from '../components/ReferenceIcon';
import { statusLabels } from '../../lib';
import { Field, MapPicker, Stepper, StatusBadge, TypeTile } from './parts';

const DemoNote = () => (
  <p className="demo-note" role="note"><Info size={18} aria-hidden="true" />گزارش در سامانه ذخیره می‌شود. اتصال رسمی به شهرداری و ادارات هنوز برقرار نیست.</p>
);

/* ---------------- Home ---------------- */
const issueGlyphs: Record<string, string> = { lighting: 'lighting', roads: 'roads', waste: 'waste', green: 'green-space' };
const featuredIssues = [
  ['lighting', 'خرابی روشنایی معابر'],
  ['roads', 'آسیب‌دیدگی آسفالت'],
  ['waste', 'جمع‌آوری زباله'],
  ['green', 'مشکلات فضای سبز'],
  ['other', 'سایر مشکلات شهری'],
] as const;

export function ShahrbinHome() {
  return <main className="page-enter ref-report-intro">
    <PageHeader title="گزارش مشکل شهری" subtitle=""/>
    <div className="sheet">
      <div className="ref-report-lead">
        <span className="ref-round ref-tone-purple"><Wrench size={37} strokeWidth={1.55}/></span>
        <h2>گزارش مشکل شهری</h2>
        <p>مشکلات شهری مانند خرابی روشنایی، آسفالت و جمع‌آوری زباله را گزارش کنید.</p>
      </div>
      <h3>موارد قابل گزارش</h3>
      <ul className="rlist ref-report-topics">
        {featuredIssues.map(([id, label]) => <li key={id}><Link className="rrow" to={'/shahrbin/new?type=' + id}>
          <ReferenceIcon name={issueGlyphs[id] ?? id} fallback={typeOf(id).icon} size={23}/>
          <strong>{label}</strong><ChevronLeft size={18}/>
        </Link></li>)}
      </ul>
      <Link to="/shahrbin/new" className="btn-main ref-report-cta">ثبت گزارش جدید</Link>
      <Link className="ref-more-link" to="/shahrbin/guide"><BookOpen size={16}/>راهنمای ثبت و پیگیری</Link>
    </div>
  </main>;
}

/* ---------------- New report wizard ---------------- */
const STEPS = ['اطلاعات', 'مکان', 'ارسال'];
export function NewReportPage() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const [step, setStep] = useState(0);
  const user = useUser();
  const client = useQueryClient();
  const requestKey = useRef('');
  const draftId = sp.get('draft');
  const [draft, setDraft] = useState<Draft>(() => {
    const d = draftId ? draftStore.find(draftId) : undefined;
    if (d) return { ...emptyDraft(), typeId: d.typeId, description: d.description, landmark: d.landmark, point: d.point };
    return { ...emptyDraft(), typeId: problemTypes.some((p) => p.id === sp.get('type')) ? sp.get('type') : null };
  });
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [geoMsg, setGeoMsg] = useState('');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const urls = useMemo(() => draft.photos.map((f) => URL.createObjectURL(f)), [draft.photos]);
  useEffect(() => () => { urls.forEach((u) => URL.revokeObjectURL(u)); }, [urls]);
  useEffect(() => { headingRef.current?.focus(); window.scrollTo(0, 0); }, [step]);
  const set = (p: Partial<Draft>) => { requestKey.current = ''; setDraft((d) => ({ ...d, ...p })); };

  const addPhotos = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []); e.target.value = '';
    const next = [...draft.photos]; let err = '';
    for (const f of files) {
      const v = validatePhoto(f); if (v) { err = v; continue; }
      if (next.length >= MAX_PHOTOS) { err = `حداکثر ${faDigits(MAX_PHOTOS)} تصویر مجاز است.`; break; }
      next.push(f);
    }
    set({ photos: next }); setErrors((x) => ({ ...x, photos: err || undefined }));
  };
  const locate = () => {
    setGeoMsg('');
    if (!navigator.geolocation) { setGeoMsg('مرورگر شما دسترسی به موقعیت را پشتیبانی نمی‌کند؛ روی نقشه انتخاب کنید.'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { set({ point: { lat: pos.coords.latitude, lon: pos.coords.longitude } }); setErrors({}); setGeoMsg('موقعیت فعلی شما ثبت شد. در صورت نیاز روی نقشه اصلاح کنید.'); },
      () => setGeoMsg('دسترسی به موقعیت داده نشد؛ می‌توانید روی نقشه انتخاب کنید.'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };
  const next = () => {
    const e = step === 0 ? validateInfo(draft) : validateLocation(draft);
    setErrors(e); if (Object.keys(e).length) return;
    setStep(step + 1);
  };
  const back = () => (step === 0 ? navigate('/services/shahrbin') : setStep(step - 1));
  const submit = async () => {
    if (busy) return;
    if (!user) {
      const savedDraft = draftStore.save(draft, draftId ?? undefined);
      navigate('/login?next=' + encodeURIComponent('/shahrbin/new?draft=' + savedDraft));
      return;
    }
    setBusy(true); setSubmitError('');
    try {
      requestKey.current ||= crypto.randomUUID();
      const report = await reportStore.submit(draft, requestKey.current);
      if (draftId) draftStore.remove(draftId);
      await client.invalidateQueries({ queryKey: ['claude-requests'] });
      navigate('/shahrbin/success/' + report.id, { replace: true });
    } catch (error) { setSubmitError(messageOf(error)); }
    finally { setBusy(false); }
  };
  const type = draft.typeId ? typeOf(draft.typeId) : null;

  return (
    <main className="page-enter">
      <PageHeader title="ثبت گزارش جدید" subtitle="مطالبه شهری" />
      <div className="sheet">
        <Stepper steps={STEPS} current={step} />
        <h2 ref={headingRef} tabIndex={-1} className="sec-title">{['نوع مشکل را انتخاب کنید', 'موقعیت را روی نقشه مشخص کنید', 'بررسی و ارسال'][step]}</h2>

        {step === 0 && (
          <div className="stack">
            <div className="tiles" role="group" aria-label="نوع مشکل">
              {problemTypes.map((t) => <TypeTile key={t.id} type={t} selected={draft.typeId === t.id} onSelect={() => { set({ typeId: t.id }); setErrors((x) => ({ ...x, typeId: undefined })); }} />)}
            </div>
            {errors.typeId && <p className="field-err" role="alert">{errors.typeId}</p>}
            <Field id="desc" label="توضیحات مشکل" error={errors.description} hint="مشکل را به‌صورت کوتاه توضیح دهید.">
              <textarea id="desc" className="input area" rows={4} maxLength={MAX_DESC + 50} value={draft.description} placeholder="مشکل را به صورت کوتاه توضیح دهید..."
                aria-invalid={!!errors.description} aria-describedby={errors.description ? 'desc-err' : 'desc-hint'}
                onChange={(e) => { set({ description: e.target.value }); if (errors.description) setErrors((x) => ({ ...x, description: undefined })); }} />
              <span className={`counter${draft.description.length > MAX_DESC ? ' over' : ''}`} aria-hidden="true">{faDigits(draft.description.length)}/{faDigits(MAX_DESC)}</span>
            </Field>
            <div className="field">
              <span className="field-label">افزودن تصویر <small>(اختیاری)</small></span>
              <div className="photos">
                {draft.photos.map((f, i) => (
                  <div className="photo" key={`${f.name}-${i}`}>
                    <img src={urls[i]} alt={`تصویر ${faDigits(i + 1)}`} />
                    <button type="button" className="photo-x" aria-label={`حذف تصویر ${faDigits(i + 1)}`} onClick={() => set({ photos: draft.photos.filter((_, j) => j !== i) })}><X size={14} aria-hidden="true" /></button>
                  </div>
                ))}
                {draft.photos.length < MAX_PHOTOS && (
                  <label className="photo add"><Camera size={26} aria-hidden="true" /><span>افزودن تصویر</span>
                    <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={addPhotos} /></label>
                )}
              </div>
              <p className="field-hint">تصویر فقط با انتخاب خودتان به گزارش اضافه می‌شود. حداکثر {faDigits(MAX_PHOTOS)} تصویر.</p>
              {errors.photos && <p className="field-err" role="alert">{errors.photos}</p>}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="stack">
            <MapPicker point={draft.point} onChange={(p) => { set({ point: p }); setErrors({}); setGeoMsg(''); }} onLocate={locate} />
            {errors.point && <p className="field-err" role="alert">{errors.point}</p>}
            {geoMsg && <p className="field-hint" role="status">{geoMsg}</p>}
            <div className="loc-card"><span className="field-label">موقعیت انتخاب‌شده</span>
              <strong>{draft.point ? `تربت حیدریه — ${faDigits(draft.point.lat.toFixed(5))}، ${faDigits(draft.point.lon.toFixed(5))}` : 'هنوز انتخاب نشده'}</strong></div>
            <Field id="landmark" label="نشانی یا نشانه (اختیاری)" hint="مثلاً «روبه‌روی پارک» یا «کوچه ۱۲».">
              <input id="landmark" className="input" value={draft.landmark} maxLength={120} onChange={(e) => set({ landmark: e.target.value })} />
            </Field>
          </div>
        )}

        {step === 2 && type && (
          <div className="stack">
            <dl className="summary">
              <div><dt>نوع مشکل</dt><dd>{type.title}</dd></div>
              <div><dt>توضیحات</dt><dd>{draft.description.trim()}</dd></div>
              <div><dt>موقعیت</dt><dd>{draft.landmark.trim() || 'روی نقشه مشخص شده'}</dd></div>
              <div><dt>تصاویر</dt><dd>{draft.photos.length ? `${faDigits(draft.photos.length)} تصویر` : 'بدون تصویر'}</dd></div>
            </dl>
            {draft.point && <MapPicker point={draft.point} readOnly label="موقعیت انتخاب‌شده" />}
            <DemoNote />
            {submitError && <p className="field-err" role="alert">{submitError}</p>}
          </div>
        )}

        {step < 2 && (
          <button type="button" className="linkbtn" onClick={() => { draftStore.save(draft, draftId ?? undefined); setSaved(true); }}>
            <Save size={16} aria-hidden="true" />ذخیره به‌عنوان پیش‌نویس{saved && <span role="status"> — ذخیره شد</span>}</button>
        )}
        <div className="actions">
          <button type="button" className="btn-ghost" onClick={back} disabled={busy}><ArrowRight size={18} aria-hidden="true" />{step === 0 ? 'انصراف' : 'مرحله قبل'}</button>
          {step < 2 ? (
            <button type="button" className="btn-main" onClick={next}>مرحله بعد<ArrowLeft size={18} aria-hidden="true" /></button>
          ) : (
            <button type="button" className="btn-main" onClick={submit} disabled={busy} aria-busy={busy}>{busy ? 'در حال ثبت…' : 'ثبت گزارش'}</button>
          )}
        </div>
      </div>
    </main>
  );
}

/* ---------------- Success ---------------- */
export function SuccessPage() {
  const { code = '' } = useParams();
  const query = useReport(code);
  const r = query.data;
  const [copied, setCopied] = useState(false);
  if (query.fetchStatus === "fetching" && !r) return <p role="status">در حال دریافت گزارش…</p>;
  if (!r) return <main><PageHeader title="ثبت گزارش" subtitle="مطالبه شهری" /><EmptyState title="گزارشی پیدا نشد" text="این گزارش در حساب شما موجود نیست." action={<Link className="btn" to="/services/shahrbin">بازگشت به مطالبه شهری</Link>} /></main>;
  const copy = async () => { try { await navigator.clipboard.writeText(r.code); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard blocked */ } };
  return (
    <main className="page-enter">
      <PageHeader title="ثبت گزارش جدید" subtitle="مطالبه شهری" />
      <div className="sheet success">
        <span className="ok-ring"><CheckCircle2 size={56} aria-hidden="true" /></span>
        <h2 className="sec-title" role="status">{kindLabel[r.kind]} ثبت شد</h2>
        <span className="field-label">کد رهگیری</span>
        <div className="code-box" dir="ltr"><button type="button" className="copy" onClick={copy} aria-label="کپی کد رهگیری"><Copy size={20} aria-hidden="true" /></button><strong>{r.code}</strong></div>
        <p className="field-hint" role="status">{copied ? 'کد کپی شد.' : ' '}</p>
        <DemoNote />
        <div className="stack full">
          <Link className="btn-main" to={`/shahrbin/reports/${r.id}`}><FileSearch size={18} aria-hidden="true" />مشاهده وضعیت گزارش</Link>
          <Link className="btn-soft" to="/shahrbin/new"><Plus size={18} aria-hidden="true" />ثبت گزارش جدید</Link>
        </div>
      </div>
    </main>
  );
}

/* ---------------- My requests ---------------- */
const FILTERS: { id: 'all' | ReportStatus; label: string }[] = [
  { id: 'all', label: 'همه' }, { id: 'progress', label: 'در حال رسیدگی' }, { id: 'done', label: 'پایان‌یافته' },
];
export function MyReportsPage() {
  const collection = useReportCollection(); const user = useUser();
  const all = collection.data?.records ?? []; const drafts = useDrafts(); const [sp, setSp] = useSearchParams();
  const tab = sp.get('tab') === 'drafts' ? 'drafts' : 'cases';
  const [f, setF] = useState<'all' | ReportStatus>('all');
  const reports = all.filter((r) => r.owner === DEMO_USER);
  const list = reports.filter(r => f === 'all' || (f === 'done' ? ['done','rejected'].includes(r.status) : !['done','rejected'].includes(r.status)));
  return (
    <main className="page-enter ref-requests">
      <PageHeader title="درخواست‌های من" subtitle="" />
      <div className="sheet">
        <div className="seg ref-request-seg" role="group" aria-label="بخش">
          <button aria-pressed={tab === 'cases'} onClick={() => setSp({})}>درخواست‌ها ({faDigits(reports.length)})</button>
          <button aria-pressed={tab === 'drafts'} onClick={() => setSp({ tab: 'drafts' })}>پیش‌نویس‌ها ({faDigits(drafts.length)})</button>
        </div>
        {tab === 'drafts' ? (
          drafts.length === 0 ? <EmptyState title="پیش‌نویسی ندارید" text="در مراحل ثبت گزارش می‌توانید آن را به‌عنوان پیش‌نویس ذخیره کنید." action={<Link className="btn" to="/shahrbin/new">ثبت گزارش شهری</Link>} />
            : <ul className="rlist">{drafts.map((d) => (
              <li key={d.id} className="rrow"><Link to={`/shahrbin/new?draft=${d.id}`} className="rtxt"><strong>{d.typeId ? typeOf(d.typeId).title : 'بدون نوع'}</strong><small>{d.description || 'بدون توضیح'}</small><small>{relTime(d.updatedAt)}</small></Link>
                <button className="linkish" aria-label="حذف پیش‌نویس" onClick={() => draftStore.remove(d.id)}><Trash2 size={18} aria-hidden="true" /></button></li>))}</ul>
        ) : (<>
          <div className="chips ref-filter-row" role="tablist" aria-label="فیلتر وضعیت">
            {FILTERS.map((x) => <button key={x.id} role="tab" aria-selected={f === x.id} className={`chip${f === x.id ? ' on' : ''}`} onClick={() => setF(x.id)}>{x.label}</button>)}
          </div>
          {!user ? <Link className="btn" to="/login?next=%2Frequests">ورود برای مشاهده درخواست‌ها</Link> : collection.isPending ? <p role="status">در حال دریافت درخواست‌ها…</p> : collection.isError ? <p className="field-err" role="alert">{messageOf(collection.error)}</p> : list.length === 0 ? (
            <EmptyState title={reports.length ? 'موردی با این وضعیت نیست' : 'هنوز درخواستی ثبت نکرده‌اید'} text={reports.length ? 'فیلتر دیگری را امتحان کنید.' : 'مشکلات شهری را از بخش مطالبه شهری گزارش دهید.'}
              action={<Link className="btn" to="/shahrbin/new">ثبت گزارش شهری</Link>} />
          ) : (<ul className="rlist">{list.map((r) => <ReportRow key={r.code} r={r} />)}</ul>)}
          {collection.hasNextPage && <button className="btn-soft" onClick={() => void collection.fetchNextPage()} disabled={collection.isFetchingNextPage}>نمایش درخواست‌های بیشتر</button>}
        </>)}
        <DemoNote />
      </div>
    </main>
  );
}
function ReportRow({ r }: { r: Report }) {
  const Icon = r.kind === 'report' ? typeOf(r.typeId).icon : ClipboardList;
  return <li><Link to={'/shahrbin/reports/' + r.id} className="rrow ref-request-card">
    <span className="rtxt"><strong>{r.title}</strong><small>کد: <bdi dir="ltr">{r.code}</bdi></small>
      <small>{new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(r.createdAt)}</small></span>
    <span className="ref-case-preview">
      {r.thumbnailUrl ? <img className="ref-case-thumb" src={r.thumbnailUrl} alt="" loading="lazy" width="88" height="60"/>
        : <span className="ref-case-thumb ref-case-thumb-placeholder"><ReferenceIcon name={issueGlyphs[r.typeId] ?? r.typeId} fallback={Icon} size={31}/></span>}
      <StatusBadge status={r.status}/>
    </span>
    <ChevronLeft size={19} aria-hidden="true"/>
  </Link></li>;
}

/* ---------------- Detail ---------------- */
export function ReportDetailPage() {
  const { code = '' } = useParams();
  const query = useReport(code); const r = query.data; const client = useQueryClient();
  const [reply, setReply] = useState(''); const [reason, setReason] = useState('');
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  if (query.fetchStatus === 'fetching' && !r) return <p role="status">در حال دریافت پرونده…</p>;
  if (!r) return <main><PageHeader title="جزئیات" subtitle="مطالبه شهری" /><EmptyState title="مورد پیدا نشد" text="در حساب فعلی به این پرونده دسترسی ندارید." action={<Link className="btn" to="/requests">درخواست‌های من</Link>} /></main>;
  const Icon = r.kind === 'report' ? typeOf(r.typeId).icon : ClipboardList;
  const mine = r.owner === DEMO_USER;
  const run = async (action: () => Promise<unknown>) => {
    setError(''); setBusy(true);
    try {
      await action();
      await Promise.all([query.refetch(), client.invalidateQueries({ queryKey: ['claude-requests'] })]);
      return true;
    } catch (error) { setError(messageOf(error)); return false; }
    finally { setBusy(false); }
  };
  const send = async (event: FormEvent) => {
    event.preventDefault();
    if (reply.trim() && await run(() => reportStore.addMessage(r.id, reply.trim()))) setReply('');
  };
  return (
    <main className="page-enter">
      <PageHeader title="جزئیات" subtitle={kindLabel[r.kind]} />
      <div className="sheet">
        <div className="detail-top"><span className="rico big"><Icon size={30} aria-hidden="true" /></span><div><strong>{r.title}</strong><small dir="ltr">{r.code}</small></div><StatusBadge status={r.status} /></div>
        <dl className="summary">
          <div><dt>توضیحات</dt><dd>{r.description}</dd></div>
          <div><dt>سازمان رسیدگی‌کننده (نمایشی)</dt><dd>{r.orgName}</dd></div>
          {r.landmark && <div><dt>نشانی / نشانه</dt><dd>{r.landmark}</dd></div>}
          <div><dt>زمان ثبت</dt><dd>{formatDate(r.createdAt)}</dd></div>
          {r.photoNames.length > 0 && <div><dt>پیوست‌ها</dt><dd>{r.photoNames.join('، ')}</dd></div>}
        </dl>
        {r.point && <MapPicker point={r.point} readOnly label="موقعیت" />}
        <h3 className="sec-title sm">روند رسیدگی</h3>
        <ol className="timeline">
          {r.history.slice().reverse().map((entry, index) => <li key={entry.id} className="done" aria-current={index === r.history.length - 1 ? 'step' : undefined}>
            <span className="tl-dot"/><span>{statusLabels[entry.toStatus] ?? entry.toStatus}
              <small> — {formatDate(Date.parse(entry.createdAt))}</small>{entry.reason && <p>{entry.reason}</p>}</span>
          </li>)}
        </ol>
        {r.attachments.length > 0 && <ul className="rlist" aria-label="پیوست‌ها">{r.attachments.map((file, index) => <li key={file.id}><a className="btn-soft" href={file.url} target="_blank" rel="noreferrer">مشاهده پیوست {faDigits(index + 1)}</a></li>)}</ul>}
        {r.needsDocs && <p className="demo-note">کارشناس منتظر پاسخ شماست. توضیح را در بخش پیام‌ها وارد کنید.</p>}
        {error && <p className="field-err" role="alert">{error}</p>}

        <h3 className="sec-title sm">پیام‌ها</h3>
        {r.messages.length === 0 ? <p className="field-hint">هنوز پیامی ردوبدل نشده است.</p> : (
          <ul className="thread" aria-label="گفتگو">{r.messages.map((m, i) => <li key={i} className={`msg ${m.from}`}><b>{m.from === 'org' ? r.orgName : 'شما'}</b><p>{m.text}</p><small>{relTime(m.at)}</small></li>)}</ul>
        )}
        {mine && r.status !== 'done' && r.status !== 'rejected' && (
          <form className="chatbar" onSubmit={send}><label htmlFor="reply" className="sr-only">پیام به سازمان</label>
            <input id="reply" className="input" placeholder="پیام به سازمان…" value={reply} onChange={(e) => setReply(e.target.value)} /><button className="btn-main sq" aria-label="ارسال پیام" disabled={busy}><Send size={18} /></button></form>
        )}

        {mine && r.rawStatus === 'resolved' && (
          <section className="panel rate" aria-labelledby="rate-h">
            <h3 id="rate-h" className="sec-title sm">{r.rating ? 'امتیاز شما ثبت شد' : 'از نتیجه راضی بودید؟'}</h3>
            <div className="rate-stars" role="radiogroup" aria-labelledby="rate-h">{[1, 2, 3, 4, 5].map((n) => (
              <button key={n} role="radio" aria-checked={r.rating === n} aria-label={`${faDigits(n)} ستاره`} className={r.rating && n <= r.rating ? 'on' : ''} disabled={busy || !!r.rating} onClick={() => void run(() => reportStore.rate(r.id, n))}><Star size={28} fill={r.rating && n <= r.rating ? 'currentColor' : 'none'} /></button>))}</div>
          </section>
        )}
        {['resolved', 'rejected'].includes(r.rawStatus) && <form className="stack" onSubmit={async event => {
          event.preventDefault();
          if (await run(() => reportStore.reopen(r.id, reason.trim()))) setReason('');
        }}>
          <Field id="reopen-reason" label="دلیل درخواست بررسی دوباره"><textarea id="reopen-reason" className="input area" required minLength={5} maxLength={500} value={reason} onChange={event => setReason(event.target.value)}/></Field>
          <button className="btn-soft" disabled={busy}>بازگشایی گزارش</button>
        </form>}
        <DemoNote />
        <Link className="btn-soft" to="/requests">بازگشت به درخواست‌ها</Link>
      </div>
    </main>
  );
}

/* ---------------- Map of reports ---------------- */
const cityMapLinks = [
  { id: 'health', label: 'مراکز درمانی', path: '/services/health', icon: HeartPlus },
  { id: 'pharmacy', label: 'داروخانه', path: '/services/health', icon: HeartPlus },
  { id: 'bread', label: 'نانوایی', path: '/services/bread', icon: Wheat },
  { id: 'bus', label: 'اتوبوس', path: '/services/bus', icon: Bus },
] as const;

export function ReportsMapPage() {
  const reports = useReports();
  const [selected, setSelected] = useState('');
  const [search, setSearch] = useState('');
  const [showReports, setShowReports] = useState(true);
  const [point, setPoint] = useState<Report['point']>(null);
  const [message, setMessage] = useState('');
  const needle = normalizeFa(search);
  const markers = reports.filter(report => report.point && (!needle || normalizeFa(report.title + ' ' + report.landmark).includes(needle)));
  const current = markers.find(item => item.id === selected);
  const links = cityMapLinks.filter(item => !needle || normalizeFa(item.label).includes(needle));
  const locate = () => {
    setMessage('');
    if (!navigator.geolocation) { setMessage('موقعیت‌یابی روی این دستگاه در دسترس نیست.'); return; }
    navigator.geolocation.getCurrentPosition(position => {
      setPoint({ lat: position.coords.latitude, lon: position.coords.longitude });
    }, () => setMessage('دسترسی به موقعیت داده نشد.'), { timeout: 10000 });
  };
  return <main className="page-enter ref-map">
    <PageHeader title="نقشه شهر" subtitle=""/>
    <div className="sheet">
      <label className="ref-map-search"><Search size={22}/><span className="sr-only">جست‌وجوی مکان یا خدمت</span>
        <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="جست‌وجوی مکان یا خدمت…"/></label>
      <div className="ref-map-card">
        <MapPicker point={point} readOnly label="نقشه تربت حیدریه" onSelect={setSelected}
          markers={showReports ? markers.flatMap(report => report.point ? [{ id: report.id, point: report.point, title: report.title }] : []) : []}/>
        <button type="button" className="ref-map-control ref-map-layers" aria-label="نمایش گزارش‌های من" aria-pressed={showReports} onClick={() => setShowReports(value => !value)}><Layers3 size={22}/></button>
        <button type="button" className="ref-map-control ref-map-locate" aria-label="موقعیت فعلی من" onClick={locate}><Crosshair size={22}/></button>
      </div>
      <div className="ref-shortcut-grid">{links.map(item => <Link key={item.id} to={item.path}>
        <ReferenceIcon name={item.id} fallback={item.icon} size={24}/><strong>{item.label}</strong>
      </Link>)}</div>
      {message && <p className="field-hint" role="status">{message}</p>}
      {needle && !links.length && !markers.length && <p className="field-hint">موردی پیدا نشد.</p>}
      {current && showReports && <Link className="rrow" to={'/shahrbin/reports/' + current.id}>
        <MapPinned size={22}/><span className="rtxt"><strong>{current.title}</strong><small>{current.landmark}</small></span><StatusBadge status={current.status}/>
      </Link>}
    </div>
  </main>;
}

/* ---------------- Guide ---------------- */
export function GuidePage() {
  const steps = [['نوع مشکل را انتخاب کنید', 'مثلاً آسفالت، روشنایی یا زباله.'], ['موقعیت را روی نقشه مشخص کنید', 'با لمس نقشه یا دکمه موقعیت فعلی.'], ['ثبت کنید و کد رهگیری بگیرید', 'وضعیت را از «درخواست‌ها» دنبال کنید.']];
  return (
    <main className="page-enter"><PageHeader title="راهنمای مطالبه شهری" subtitle="ثبت گزارش در سه قدم" />
      <div className="sheet"><ol className="guide">{steps.map(([t, d], i) => <li key={t}><span className="dot">{faDigits(i + 1)}</span><div><strong>{t}</strong><p>{d}</p></div></li>)}</ol>
        <h2 className="sec-title sm">معنی وضعیت‌ها</h2>
        <ul className="prose">{(Object.keys(statusMeta) as ReportStatus[]).map((k) => <li key={k}><StatusBadge status={k} /></li>)}</ul>
        <Link className="btn-main" to="/shahrbin/new">ثبت گزارش شهری</Link><DemoNote /></div></main>
  );
}
