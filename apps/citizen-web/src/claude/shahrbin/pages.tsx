import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { ArrowLeft, ArrowRight, BookOpen, Camera, CheckCircle2, ChevronLeft, ClipboardList, Copy, FileSearch, Info, Map as MapIcon, Megaphone, Plus, Save, Send, Star, Trash2, X } from 'lucide-react';
import { Brand, EmptyState, PageHeader } from '../components/ui';
import {
  Draft, DraftErrors, MAX_DESC, MAX_PHOTOS, Report, emptyDraft, faDigits, formatDate, problemTypes, reportStore,
  statusMeta, typeOf, useReports, useReport, useReportCollection, validateInfo, validateLocation, validatePhoto, ReportStatus, DEMO_USER, kindLabel, draftStore, useDrafts, relTime,
} from './model';
import { useQueryClient } from '@tanstack/react-query';
import { useUser } from '../state/session';
import { messageOf } from '../lib/backend';
import { statusLabels } from '../../lib';
import { Field, MapPicker, Stepper, StatusBadge, TypeTile } from './parts';

const DemoNote = () => (
  <p className="demo-note" role="note"><Info size={18} aria-hidden="true" />گزارش در سامانه ذخیره می‌شود. اتصال رسمی به شهرداری و ادارات هنوز برقرار نیست.</p>
);

/* ---------------- Home ---------------- */
export function ShahrbinHome() {
  const navigate = useNavigate();
  const reports = useReports();
  const [type, setType] = useState<string | null>(null);
  const [point] = useState<null>(null);
  return (
    <main className="page-enter">
      <header className="hero hero-shahrbin">
        <div className="hero-inner">
          <Brand />
          <span />
          <button type="button" className="icon-btn" aria-label="بازگشت" onClick={() => navigate('/services')}><ArrowRight size={22} aria-hidden="true" /></button>
        </div>
        <div className="hero-sb">
          <span className="hero-sb-icon"><Megaphone size={30} aria-hidden="true" /></span>
          <div><h1>شهربین</h1><p>گزارش مشکلات شهری و پیگیری رسیدگی</p></div>
        </div>
      </header>
      <div className="content sb-content">
        <section className="panel map-card" aria-label="موقعیت گزارش">
          <MapPicker point={point} readOnly label="نقشه تربت حیدریه" />
          <div className="map-bar"><span>موقعیت گزارش را در مرحله دوم ثبت، روی نقشه مشخص می‌کنید</span></div>
        </section>
        <section aria-labelledby="pick-type">
          <h2 id="pick-type" className="sec-title">نوع مشکل را انتخاب کنید</h2>
          <div className="tiles">{problemTypes.map((t) => <TypeTile key={t.id} type={t} selected={type === t.id} onSelect={() => setType(type === t.id ? null : t.id)} />)}</div>
        </section>
        <button type="button" className="cta" onClick={() => navigate(`/shahrbin/new${type ? `?type=${type}` : ''}`)}>
          ثبت گزارش شهری <span className="cta-plus"><Plus size={22} aria-hidden="true" /></span>
        </button>
        <Link to="/requests" className="track-card">
          <span className="track-ico"><ClipboardList size={28} aria-hidden="true" /></span>
          <span className="track-txt"><strong>پیگیری گزارش‌های من</strong><small>{reports.length ? `${faDigits(reports.length)} گزارش در حساب شما` : 'مشاهده وضعیت و پاسخ گزارش‌های قبلی'}</small></span>
          <ChevronLeft size={22} aria-hidden="true" />
        </Link>
        <div className="shortcuts">
          <Link to="/shahrbin/map"><MapIcon size={22} aria-hidden="true" />نقشه گزارش‌ها</Link>
          <Link to="/shahrbin/guide"><BookOpen size={22} aria-hidden="true" />راهنما</Link>
          <Link to="/requests?tab=drafts"><Save size={22} aria-hidden="true" />پیش‌نویس‌ها</Link>
        </div>
        <DemoNote />
      </div>
    </main>
  );
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
      <PageHeader title="ثبت گزارش جدید" subtitle="شهربین" />
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
  if (!r) return <main><PageHeader title="ثبت گزارش" subtitle="شهربین" /><EmptyState title="گزارشی پیدا نشد" text="این گزارش در حساب شما موجود نیست." action={<Link className="btn" to="/services/shahrbin">بازگشت به شهربین</Link>} /></main>;
  const copy = async () => { try { await navigator.clipboard.writeText(r.code); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard blocked */ } };
  return (
    <main className="page-enter">
      <PageHeader title="ثبت گزارش جدید" subtitle="شهربین" />
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
  { id: 'all', label: 'همه' }, { id: 'submitted', label: 'ثبت‌شده' }, { id: 'progress', label: 'در حال رسیدگی' }, { id: 'done', label: 'انجام‌شده' }, { id: 'rejected', label: 'ردشده' },
];
export function MyReportsPage() {
  const collection = useReportCollection(); const user = useUser();
  const all = collection.data?.records ?? []; const drafts = useDrafts(); const [sp, setSp] = useSearchParams();
  const tab = sp.get('tab') === 'drafts' ? 'drafts' : 'cases';
  const [f, setF] = useState<'all' | ReportStatus>('all');
  const reports = all.filter((r) => r.owner === DEMO_USER);
  const list = reports.filter((r) => f === 'all' || r.status === f || (f === 'progress' && r.status === 'review'));
  return (
    <main className="page-enter">
      <PageHeader title="درخواست‌ها" subtitle="پیگیری گزارش‌ها و درخواست‌های من" />
      <div className="sheet">
        <div className="seg" role="group" aria-label="بخش">
          <button aria-pressed={tab === 'cases'} onClick={() => setSp({})}>درخواست‌ها ({faDigits(reports.length)})</button>
          <button aria-pressed={tab === 'drafts'} onClick={() => setSp({ tab: 'drafts' })}>پیش‌نویس‌ها ({faDigits(drafts.length)})</button>
        </div>
        {tab === 'drafts' ? (
          drafts.length === 0 ? <EmptyState title="پیش‌نویسی ندارید" text="در مراحل ثبت گزارش می‌توانید آن را به‌عنوان پیش‌نویس ذخیره کنید." action={<Link className="btn" to="/shahrbin/new">ثبت گزارش شهری</Link>} />
            : <ul className="rlist">{drafts.map((d) => (
              <li key={d.id} className="rrow"><Link to={`/shahrbin/new?draft=${d.id}`} className="rtxt"><strong>{d.typeId ? typeOf(d.typeId).title : 'بدون نوع'}</strong><small>{d.description || 'بدون توضیح'}</small><small>{relTime(d.updatedAt)}</small></Link>
                <button className="linkish" aria-label="حذف پیش‌نویس" onClick={() => draftStore.remove(d.id)}><Trash2 size={18} aria-hidden="true" /></button></li>))}</ul>
        ) : (<>
          <div className="chips" role="tablist" aria-label="فیلتر وضعیت">
            {FILTERS.map((x) => <button key={x.id} role="tab" aria-selected={f === x.id} className={`chip${f === x.id ? ' on' : ''}`} onClick={() => setF(x.id)}>{x.label}</button>)}
          </div>
          {!user ? <Link className="btn" to="/login?next=%2Frequests">ورود برای مشاهده درخواست‌ها</Link> : collection.isPending ? <p role="status">در حال دریافت درخواست‌ها…</p> : collection.isError ? <p className="field-err" role="alert">{messageOf(collection.error)}</p> : list.length === 0 ? (
            <EmptyState title={reports.length ? 'موردی با این وضعیت نیست' : 'هنوز درخواستی ثبت نکرده‌اید'} text={reports.length ? 'فیلتر دیگری را امتحان کنید.' : 'مشکلات شهری را از بخش شهربین گزارش دهید.'}
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
  return (
    <li><Link to={`/shahrbin/reports/${r.id}`} className="rrow">
      <span className="rico"><Icon size={26} aria-hidden="true" /></span>
      <span className="rtxt"><strong>{r.title}</strong><small>{kindLabel[r.kind]} · <bdi dir="ltr">{r.code}</bdi></small><small>{relTime(r.createdAt)}{r.needsDocs ? ' · نیاز به مدرک' : ''}</small></span>
      <StatusBadge status={r.status} /><ChevronLeft size={18} aria-hidden="true" />
    </Link></li>
  );
}

/* ---------------- Detail ---------------- */
export function ReportDetailPage() {
  const { code = '' } = useParams();
  const query = useReport(code); const r = query.data; const client = useQueryClient();
  const [reply, setReply] = useState(''); const [reason, setReason] = useState('');
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  if (query.fetchStatus === 'fetching' && !r) return <p role="status">در حال دریافت پرونده…</p>;
  if (!r) return <main><PageHeader title="جزئیات" subtitle="شهربین" /><EmptyState title="مورد پیدا نشد" text="در حساب فعلی به این پرونده دسترسی ندارید." action={<Link className="btn" to="/requests">درخواست‌های من</Link>} /></main>;
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
export function ReportsMapPage() {
  const all = useReports().filter((r) => r.kind === 'report' && r.point); const [sel, setSel] = useState<string | null>(null);
  const cur = all.find((r) => r.code === sel);
  return (
    <main className="page-enter"><PageHeader title="نقشه گزارش‌ها" subtitle="موقعیت گزارش‌های حساب شما" />
      <div className="sheet">
        <MapPins reports={all} onSel={setSel} />
        {cur ? <Link className="rrow" to={`/shahrbin/reports/${cur.id}`}><span className="rtxt"><strong>{cur.title}</strong><small>{cur.description}</small></span><StatusBadge status={cur.status} /></Link> : <p className="field-hint">برای دیدن جزئیات گزارش، روی نشان مربوط به آن بزنید.</p>}
        <DemoNote />
      </div>
    </main>
  );
}
export function MapPins({ reports, onSel }: { reports: Report[]; onSel: (id: string) => void }) {
  return <MapPicker point={null} readOnly label="نقشه گزارش‌های من" onSelect={onSel}
    markers={reports.flatMap(report => report.point ? [{ id: report.code, point: report.point, title: report.title }] : [])}/>;
}

/* ---------------- Guide ---------------- */
export function GuidePage() {
  const steps = [['نوع مشکل را انتخاب کنید', 'مثلاً آسفالت، روشنایی یا زباله.'], ['موقعیت را روی نقشه مشخص کنید', 'با لمس نقشه یا دکمه موقعیت فعلی.'], ['ثبت کنید و کد رهگیری بگیرید', 'وضعیت را از «درخواست‌ها» دنبال کنید.']];
  return (
    <main className="page-enter"><PageHeader title="راهنمای شهربین" subtitle="ثبت گزارش در سه قدم" />
      <div className="sheet"><ol className="guide">{steps.map(([t, d], i) => <li key={t}><span className="dot">{faDigits(i + 1)}</span><div><strong>{t}</strong><p>{d}</p></div></li>)}</ol>
        <h2 className="sec-title sm">معنی وضعیت‌ها</h2>
        <ul className="prose">{(Object.keys(statusMeta) as ReportStatus[]).map((k) => <li key={k}><StatusBadge status={k} /></li>)}</ul>
        <Link className="btn-main" to="/shahrbin/new">ثبت گزارش شهری</Link><DemoNote /></div></main>
  );
}
