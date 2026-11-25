import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { Bell, CalendarDays, CheckCircle2, ChevronLeft, ClipboardList, Ellipsis, Heart, Info, LogOut, Settings, UserPen, UserRound, Users, LayoutDashboard } from 'lucide-react';
import { EmptyState, PageHeader, SearchField, ServiceCard } from '../components/ui';
import { allServices } from '../data/services';
import { matchesQuery, normalizeFa } from '../lib/normalize';
import { OTP_LEN, Prefs, applyPrefs, loadPrefs, maskPhone, normalizePhone, session, useFavorites, useUser } from '../state/session';
import { Field } from '../shahrbin/parts';
import { faDigits, relTime } from '../shahrbin/model';
import { useMarkNotice, useNotices } from '../state/notifications';
import { api, json, messageOf, publicDemoQuery } from '../lib/backend';
import { Dialog, MenuItem, Toggle, Unauthorized } from './parts';

const DemoNote = ({ text }: { text: string }) => <p className="demo-note" role="note">{text}</p>;
/* ---------------- Global search ---------------- */
export function SearchPage() {
  const [sp, setSp] = useSearchParams(); const [q, setQ] = useState(sp.get('q') ?? '');
  useEffect(() => { const t = setTimeout(() => setSp(q ? { q } : {}, { replace: true }), 150); return () => clearTimeout(t); }, [q, setSp]);
  const n = normalizeFa(q);
  const res = useMemo(() => (n ? allServices.filter((s) => matchesQuery(`${s.title} ${s.category.title} ${s.provider}`, n)) : []), [n]);
  return (
    <main className="page-enter">
      <PageHeader title="جست‌وجو" subtitle="در همه خدمات تربتینو"><SearchField value={q} onChange={setQ} /></PageHeader>
      <div className="content" aria-live="polite">
        {!n ? <EmptyState title="چه خدمتی لازم دارید؟" text="نام خدمت، سازمان یا موضوع را بنویسید؛ مثلاً «نان» یا «زعفران»." />
          : res.length ? <section className="panel lilac" aria-label="نتایج"><p className="sr-only">{faDigits(res.length)} نتیجه</p><div className="grid">{res.map((s) => <ServiceCard key={s.id} service={s} />)}</div></section>
          : <EmptyState title="نتیجه‌ای پیدا نشد" text="عبارت دیگری را امتحان کنید." />}
      </div>
    </main>
  );
}

/* ---------------- Notifications ---------------- */
export function NotificationsPage() {
  const query = useNotices(); const mark = useMarkNotice();
  const user = useUser(); const items = query.data ?? []; const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'request'>('all');
  const shown = filter === 'request' ? items.filter(item => item.link) : items;
  const unread = items.filter(i => !i.read); const [error, setError] = useState('');
  const markAndGo = async (ids: string[], link?: string) => {
    setError('');
    try { await mark(ids); if (link) navigate(link); }
    catch (error) { setError(messageOf(error)); }
  };
  return (
    <main className="page-enter ref-notices"><PageHeader title="اعلان‌ها" subtitle="" />
      <div className="sheet">
        <div className="chips ref-filter-row" aria-label="نوع اعلان">
          <button type="button" aria-pressed={filter === 'all'} className={'chip' + (filter === 'all' ? ' on' : '')} onClick={() => setFilter('all')}>همه</button>
          <Link to="/city-news" className="chip">اطلاع‌رسانی</Link>
          <button type="button" aria-pressed={filter === 'request'} className={'chip' + (filter === 'request' ? ' on' : '')} onClick={() => setFilter('request')}>درخواست‌ها</button>
          <Link to="/catalog/city-events" className="chip"><CalendarDays size={14}/>رویدادها</Link>
        </div>
        {!user ? <Unauthorized /> : query.isPending ? <p role="status">در حال دریافت اعلان‌ها…</p> : query.isError ? <p className="field-err" role="alert">{messageOf(query.error)}</p> : shown.length === 0 ? <EmptyState title="اعلانی ندارید" text="وقتی وضعیت درخواست‌هایتان تغییر کند، اینجا خبر می‌گیرید." /> : (<>
          <button className="linkbtn" disabled={!unread.length} onClick={() => void markAndGo(unread.map(item => item.id))}>علامت‌گذاری همه به‌عنوان خوانده‌شده</button>
          <ul className="rlist">{shown.map((n) => (
            <li key={n.id}><button type="button" className={`rrow notice${n.read ? '' : ' unread'}`} onClick={() => void markAndGo(n.read ? [] : [n.id], n.link)}>
              <span className="rico ref-notice-icon">{n.read ? <CheckCircle2 size={22}/> : n.link ? <Bell size={22}/> : <Info size={22}/>}</span><span className="rtxt"><strong>{n.title}</strong><small>{n.body}</small><small>{relTime(n.at)}</small></span><ChevronLeft size={18}/>{!n.read && <span className="sr-only">خوانده‌نشده</span>}</button></li>))}</ul>
        </>)}
        {error && <p className="field-err" role="alert">{error}</p>}
      </div></main>
  );
}

/* ---------------- Login flow ---------------- */
function AuthShell({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (<main className="page-enter"><PageHeader title={title} subtitle={sub} /><div className="sheet">{children}</div></main>);
}
export function LoginPage() {
  const navigate = useNavigate(); const [v, setV] = useState(''); const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false); const [sp] = useSearchParams();
  const mode = useQuery(publicDemoQuery);
  const samples = useQuery({
    queryKey: ['demo-accounts'],
    queryFn: ({ signal }) => api<{ data: { mobile: string; label: string; kind: string }[] }>('/demo/accounts', { signal }),
    enabled: mode.data?.publicDemo === true,
  });
  const signInSample = async (mobile: string) => {
    setBusy(true); setErr('');
    try {
      await session.signInDemo(mobile);
      const next = sp.get('next');
      navigate(next?.startsWith('/') && !next.startsWith('//') && !next.includes(String.fromCharCode(92)) ? next : '/', { replace: true });
    } catch (error) { setErr(messageOf(error)); } finally { setBusy(false); }
  };
  const go = async (e: FormEvent) => {
    e.preventDefault();
    const phone = normalizePhone(v);
    if (!phone) { setErr('شماره موبایل معتبر نیست.'); return; }
    setBusy(true);
    try {
      const { devCode } = await session.requestOtp(phone);
      navigate('/login/verify', { state: { phone, devCode, next: sp.get('next') } });
    } catch (error) { setErr(messageOf(error)); } finally { setBusy(false); }
  };
  if (mode.isPending) return <AuthShell title="ورود" sub=""><p role="status">در حال بررسی…</p></AuthShell>;
  if (mode.isError) return <AuthShell title="ورود" sub=""><button className="btn-soft" onClick={() => void mode.refetch()}>تلاش دوباره</button></AuthShell>;
  if (mode.data?.publicDemo) return <AuthShell title="ورود آزمایشی" sub="انتخاب حساب شهروند">
    <div className="stack">
      <DemoNote text="حساب‌ها و پرونده‌های این محیط بین آزمایش‌کنندگان مشترک‌اند. شماره، نشانی، تصویر یا اطلاعات واقعی وارد نکنید."/>
      {samples.isPending && <p role="status">در حال دریافت حساب‌ها…</p>}
      {samples.isError && <button className="btn-soft" onClick={() => void samples.refetch()}>دریافت دوباره حساب‌ها</button>}
      {samples.data?.data.filter(account => account.kind === 'citizen').map(account => <button
        className="btn-main" type="button" key={account.mobile} disabled={busy} onClick={() => void signInSample(account.mobile)}>
        ورود با «{account.label}»
      </button>)}
      {err && <p className="field-err" role="alert">{err}</p>}
      <a className="btn-soft" href="/admin/">ورود آزمایشی کارکنان</a>
    </div>
  </AuthShell>;
  return (
    <AuthShell title="ورود" sub="شهر تو، همراه تو">
      <form className="stack" onSubmit={go} noValidate>
        <h2 className="sec-title">شماره موبایل خود را وارد کنید</h2>
        <Field id="phone" label="شماره موبایل" hint="کد تأیید برای این شماره ارسال می‌شود." error={err}>
          <input id="phone" className="input" dir="ltr" inputMode="tel" autoComplete="tel" autoFocus placeholder="09123456789" value={v} aria-invalid={!!err} aria-describedby={err ? 'phone-err' : 'phone-hint'}
            onChange={(e) => { setV(e.target.value); setErr(''); }} />
        </Field>
        <button className="btn-main" type="submit" disabled={busy}>{busy ? "در حال درخواست کد…" : "دریافت کد تأیید"}</button>
        <DemoNote text="نسخه آزمایشی: در صورت فعال بودن حالت آزمایش، کد را همین‌جا می‌بینید و پیامکی ارسال نمی‌شود." />
      </form>
    </AuthShell>
  );
}
export function VerifyPage() {
  const navigate = useNavigate();
  const state = useLocation().state as { phone?: string; devCode?: string; next?: string } | null;
  const phone = state?.phone ?? '';
  const next = state?.next?.startsWith('/') && !state.next.startsWith('//') && !state.next.includes(String.fromCharCode(92)) ? state.next : '/';
  const [devCode, setDevCode] = useState(state?.devCode);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState(''); const [err, setErr] = useState(''); const [left, setLeft] = useState(60);
  useEffect(() => { if (left <= 0) return; const t = setTimeout(() => setLeft((x) => x - 1), 1000); return () => clearTimeout(t); }, [left]);
  if (!phone) return <AuthShell title="ورود" sub="کد تأیید"><EmptyState title="ابتدا شماره را وارد کنید" text="برای دریافت کد، از مرحله اول شروع کنید." action={<Link className="btn" to="/login">بازگشت</Link>} /></AuthShell>;
  const go = async (e: FormEvent) => {
    e.preventDefault();
    const normalized = normalizeFa(code).replace(/\D/g, '');
    if (normalized.length !== OTP_LEN) { setErr(`کد ${faDigits(OTP_LEN)} رقمی را کامل وارد کنید.`); return; }
    setBusy(true);
    try {
      const firstLogin = await session.signIn(phone, normalized);
      navigate(firstLogin && next === '/' ? '/login/profile' : next, { replace: true });
    } catch (error) { setErr(messageOf(error)); } finally { setBusy(false); }
  };
  const resend = async () => {
    setBusy(true); setErr('');
    try {
      const result = await session.requestOtp(phone);
      setDevCode(result.devCode);
      setLeft(60);
    } catch (error) { setErr(messageOf(error)); } finally { setBusy(false); }
  };
  return (
    <AuthShell title="کد تأیید" sub="ورود">
      <form className="stack" onSubmit={go} noValidate>
        <h2 className="sec-title">کد ارسال‌شده را وارد کنید</h2>
        <p className="field-hint">برای شماره <bdi dir="ltr">{maskPhone(phone)}</bdi></p>
        <Field id="otp" label="کد تأیید" error={err}>
          <input id="otp" className="input otp" dir="ltr" inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={OTP_LEN + 2} value={code} aria-invalid={!!err}
            onChange={(e) => { setCode(e.target.value.replace(/[^\d۰-۹]/g, '')); setErr(''); }} />
        </Field>
        <button className="btn-main" type="submit" disabled={busy}>تأیید و ورود</button>
        <button className="btn-soft" type="button" disabled={busy || left > 0} onClick={resend}>{left > 0 ? `ارسال دوباره تا ${faDigits(left)} ثانیه دیگر` : 'ارسال دوباره کد'}</button>
        <Link to="/login" className="field-hint" style={{ textAlign: 'center' }}>ویرایش شماره موبایل</Link>
        {devCode && <p className="demo-note"><strong>کد آزمایشی: <bdi>{devCode}</bdi></strong></p>}
      </form>
    </AuthShell>
  );
}
export function ProfileSetupPage() {
  const user = useUser(); const navigate = useNavigate(); const [name, setName] = useState(''); const [err, setErr] = useState('');
  if (!user) return <AuthShell title="تکمیل پروفایل" sub="ورود"><Unauthorized /></AuthShell>;
  const go = async (e: FormEvent) => { e.preventDefault(); if (name.trim().length < 2) { setErr('نام را وارد کنید.'); return; } try { await session.setName(name.trim()); navigate('/', { replace: true }); } catch (error) { setErr(messageOf(error)); } };
  return (
    <AuthShell title="تکمیل پروفایل" sub="خوش آمدید">
      <form className="stack" onSubmit={go} noValidate>
        <h2 className="sec-title">نام شما چیست؟</h2>
        <Field id="pname" label="نام و نام خانوادگی" error={err}><input id="pname" className="input" autoFocus autoComplete="name" value={name} aria-invalid={!!err} onChange={(e) => { setName(e.target.value); setErr(''); }} /></Field>
        <button className="btn-main" type="submit">ادامه</button>
        <Link to="/" className="btn-soft">بعداً تکمیل می‌کنم</Link>
      </form>
    </AuthShell>
  );
}

/* ---------------- Account ---------------- */
export function AccountPage() {
  const user = useUser(); const navigate = useNavigate(); const [ask, setAsk] = useState(false); const [logoutError, setLogoutError] = useState('');
  return (
    <main className="page-enter ref-profile"><PageHeader title="پروفایل" subtitle="" />
      <div className="sheet">
        {!user ? <Unauthorized /> : (<>
          <div className="profile-card"><span className="avatar"><UserRound size={41} aria-hidden="true" /><Link className="ref-avatar-edit" to="/account/edit" aria-label="ویرایش اطلاعات"><UserPen size={14}/></Link></span>
            <div className="rtxt"><strong>{user.name || 'کاربر تربتینو'}</strong><small dir="ltr" >{faDigits(user.phone)}</small></div></div>
          <nav className="menu" aria-label="حساب کاربری">
            <MenuItem to="/account/edit" icon={UserPen} title="اطلاعات کاربری" />
            <MenuItem to="/services/my-family" icon={Users} title="خانواده من" />
            <MenuItem to="/requests" icon={ClipboardList} title="درخواست‌های من" />
            <MenuItem to="/account/favorites" icon={Heart} title="علاقه‌مندی‌ها" />
            <MenuItem to="/notifications" icon={Bell} title="اعلان‌ها" />
          </nav>
        </>)}
        <nav className="menu" aria-label="تنظیمات و راهنما">
          <MenuItem to="/account/settings" icon={Settings} title="تنظیمات و امنیت" />
          <MenuItem to="/more" icon={Ellipsis} title="بیشتر" />
          <MenuItem to="/admin" icon={LayoutDashboard} title="پنل مدیریت" />
        </nav>
        {user && <button type="button" className="btn-ghost danger-btn" onClick={() => setAsk(true)}><LogOut size={18} aria-hidden="true" />خروج از حساب</button>}
        <Dialog open={ask} title="از حساب خارج می‌شوید؟" onClose={() => setAsk(false)}>
          <p className="field-hint">درخواست‌های ثبت‌شده در حساب شما می‌مانند.</p>
          {logoutError && <p className="field-err" role="alert">{logoutError}</p>}<div className="actions"><button className="btn-ghost" onClick={() => setAsk(false)}>انصراف</button>
            <button className="btn-main" onClick={async () => { try { await session.signOut(); setAsk(false); navigate('/', { replace: true }); } catch (error) { setLogoutError(messageOf(error)); } }}>خروج</button></div>
        </Dialog>
      </div>
    </main>
  );
}
export function EditProfilePage() {
  const user = useUser(); const navigate = useNavigate(); const [name, setName] = useState(user?.name ?? ''); const [err, setErr] = useState(''); const [ok, setOk] = useState(false);
  if (!user) return <AuthShell title="ویرایش اطلاعات" sub="حساب من"><Unauthorized /></AuthShell>;
  const save = async (e: FormEvent) => { e.preventDefault(); if (name.trim().length < 2) { setErr('نام را وارد کنید.'); return; } try { await session.setName(name.trim()); setOk(true); navigate('/account'); } catch (error) { setErr(messageOf(error)); } };
  return (
    <AuthShell title="ویرایش اطلاعات" sub="حساب من">
      <form className="stack" onSubmit={save} noValidate>
        <Field id="ename" label="نام و نام خانوادگی" error={err}><input id="ename" className="input" value={name} aria-invalid={!!err} autoComplete="name" onChange={(e) => { setName(e.target.value); setErr(''); setOk(false); }} /></Field>
        <Field id="ephone" label="شماره موبایل" hint="تغییر شماره از طریق ورود مجدد انجام می‌شود."><input id="ephone" className="input" dir="ltr" value={user.phone} readOnly aria-readonly="true" /></Field>
        <button className="btn-main" type="submit">ذخیره تغییرات</button>
        {ok && <p className="field-hint" role="status" style={{ color: 'var(--c-success)', fontWeight: 700 }}>ذخیره شد.</p>}
      </form>
    </AuthShell>
  );
}
export function FavoritesPage() {
  const user = useUser(); const favs = useFavorites();
  return (
    <main className="page-enter"><PageHeader title="علاقه‌مندی‌ها" subtitle="خدمات نشان‌شده" />
      <div className="sheet">{!user ? <Unauthorized /> : favs.length === 0
        ? <EmptyState title="هنوز خدمتی نشان نکرده‌اید" text="در صفحه هر خدمت، قلب را بزنید تا اینجا بیاید." action={<Link className="btn" to="/services">همه خدمات</Link>} />
        : <div className="grid">{favs.map((id) => allServices.find((s) => s.id === id)).filter(Boolean).map((s) => <ServiceCard key={s!.id} service={s!} />)}</div>}</div></main>
  );
}
export function SettingsPage() {
  const [p, setP] = useState<Prefs>(loadPrefs); const upd = (x: Partial<Prefs>) => { const n = { ...p, ...x }; setP(n); applyPrefs(n); };
  return (
    <AuthShell title="تنظیمات" sub="حساب من">
      <div className="stack">
        <Toggle id="big" label="متن بزرگ‌تر" hint="اندازه نوشته‌ها را بیشتر می‌کند." checked={p.bigText} onChange={(v) => upd({ bigText: v })} />
        <Toggle id="calm" label="کاهش حرکت" hint="انیمیشن‌ها را حذف می‌کند." checked={p.calm} onChange={(v) => upd({ calm: v })} />
        <Toggle id="notif" label="اعلان‌ها" hint="به‌زودی؛ اعلان مرورگر هنوز فعال نشده است." checked={false} disabled onChange={() => {}} />
        <DemoNote text="این دو گزینه فقط روی همین مرورگر ذخیره می‌شوند." />
      </div>
    </AuthShell>
  );
}
export function PrivacyPage() {
  return (
    <AuthShell title="حریم خصوصی" sub="حساب من">
      <div className="stack prose">
        <h2 className="sec-title">با اطلاعات شما چه می‌شود</h2>
        <ul>
          <li>موقعیت مکانی فقط وقتی دکمه «موقعیت فعلی» را بزنید و مرورگر اجازه بدهد خوانده می‌شود.</li>
          <li>تصویر گزارش فقط با انتخاب خودتان اضافه می‌شود و می‌توانید پیش از ثبت حذفش کنید.</li>
          <li>شمارهٔ موبایل و گزارش‌های ارسال‌شده روی سرور سامانه ذخیره می‌شوند. سوابق پرونده فقط برای صاحب حساب و کارکنان مجاز قابل مشاهده است.</li>
          <li>فقط تنظیمات ظاهر (اندازه متن و کاهش حرکت) روی این دستگاه می‌مانند.</li>
        </ul>
        <DemoNote text="متن حقوقی نهایی حریم خصوصی باید از سوی مسئول محصول ارائه شود؛ این صفحه فقط رفتار رابط کاربری را توضیح می‌دهد." />
      </div>
    </AuthShell>
  );
}
const FAQ: [string, string][] = [
  ['چطور مشکل شهری را گزارش کنم؟', 'از بخش مطالبه شهری، «ثبت گزارش شهری» را بزنید، نوع مشکل و توضیح را بنویسید و موقعیت را روی نقشه مشخص کنید.'],
  ['کد رهگیری را کجا ببینم؟', 'پس از ثبت، کد در صفحه موفقیت نمایش داده می‌شود و گزارش در «درخواست‌ها» هم هست.'],
  ['چرا بعضی خدمات «به‌زودی» هستند؟', 'این خدمت‌ها هنوز به سازمان مربوطه وصل نشده‌اند و پس از راه‌اندازی فعال می‌شوند.'],
];
export function SupportPage() {
  const user = useUser(); const [topic, setTopic] = useState('question'); const [body, setBody] = useState('');
  const [error, setError] = useState(''); const [saved, setSaved] = useState(false); const [busy, setBusy] = useState(false);
  return (
    <AuthShell title="پشتیبانی و راهنما" sub="حساب من">
      <div className="stack">
        <h2 className="sec-title">پرسش‌های پرتکرار</h2>
        <div className="faq">{FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
        {user ? <form className="stack" onSubmit={async event => {
          event.preventDefault(); setBusy(true); setSaved(false); setError('');
          try { await api('/feedback', json({ kind: topic, message: body.trim() })); setBody(''); setSaved(true); }
          catch (error) { setError(messageOf(error)); } finally { setBusy(false); }
        }}>
          <Field id="support-topic" label="موضوع"><select className="input" id="support-topic" value={topic} onChange={event => setTopic(event.target.value)}>
            <option value="question">پشتیبانی</option><option value="bug">گزارش خطا</option><option value="idea">پیشنهاد</option>
          </select></Field>
          <Field id="support-message" label="متن پیام" error={error}><textarea className="input area" id="support-message" value={body} onChange={event => setBody(event.target.value)} required minLength={10} maxLength={2000}/></Field>
          <button className="btn-main" disabled={busy}>ثبت پیام</button>
          {saved && <p role="status">پیام شما ثبت شد.</p>}
        </form> : <Link className="btn-soft" to="/login?next=%2Faccount%2Fsupport">ورود برای ارسال پیام</Link>}
      </div>
    </AuthShell>
  );
}

/* ---------------- Welcome ---------------- */
export function WelcomePage() {
  const navigate = useNavigate(); const [i, setI] = useState(0);
  const slides = [
    { t: 'شهر تو، همراه تو', d: 'همه خدمات تربت حیدریه در یک برنامه ساده.' },
    { t: 'مشکل شهری را گزارش دهید', d: 'با مطالبه شهری، موقعیت را مشخص کنید و رسیدگی را دنبال کنید.' },
    { t: 'نان، اتوبوس، سلامت و بیشتر', d: 'خدمات روزمره را سریع پیدا کنید.' },
  ];
  return (
    <main className="welcome page-enter">
      <img src="/torbatino-mark.svg" alt="تربتینو" width={120} height={120} />
      <h1>{slides[i].t}</h1><p>{slides[i].d}</p>
      <div className="dots" role="tablist" aria-label="اسلایدها">{slides.map((_, k) => <button key={k} role="tab" aria-selected={k === i} aria-label={`اسلاید ${faDigits(k + 1)}`} className={k === i ? 'on' : ''} onClick={() => setI(k)} />)}</div>
      <div className="stack full">
        <button className="btn-main gold" onClick={() => (i < slides.length - 1 ? setI(i + 1) : navigate('/'))}>{i < slides.length - 1 ? 'بعدی' : 'شروع'}</button>
        <Link to="/" className="skip">رد کردن</Link>
      </div>
      <p className="demo-note" role="note">نسخه نمایشی؛ همه داده‌ها ساختگی‌اند.</p>
    </main>
  );
}
