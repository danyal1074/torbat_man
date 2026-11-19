import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, MapPin, Camera, Building2, ChevronLeft, ClipboardList, Sparkles, Bell, Heart, X, ShieldCheck, UserRound, LogOut, CircleHelp } from 'lucide-react';
import type { CategoryDTO } from '@torbat/contracts';
import { normalizePersian } from '@torbat/i18n';
import { serviceStatus, call, date, useMe, useCatalog, Alert, Empty, Status, Tile, Card, Page, type RecordRow } from './lib';
export function Dashboard() { const me = useMe(); const catalog = useCatalog(); const requests = useQuery({ queryKey: ['requests'], queryFn: () => call<{
        data: RecordRow[];
    }>('/requests?limit=3'), enabled: !!me.data }); const news = useQuery({ queryKey: ['news'], queryFn: () => call<{
        data: {
            id: string;
            title: string;
            body: string;
            isDemo: boolean;
            sourceName: string;
            publishedAt: string;
        }[];
    }>('/announcements') }); const [search, setSearch] = useState(''); const nav = useNavigate(); return <><div className="greeting"><div><p className="eyebrow">اینجا، شهر توست</p><h1>سلام{me.data?.displayName ? '، ' + me.data.displayName : '، همشهری'}!</h1><p>برای یک شهر بهتر، از همین‌جا شروع کنیم.</p></div><div className="city-tag"><MapPin size={17}/>تربت حیدریه</div></div><form className="search" onSubmit={e => { e.preventDefault(); nav('/services?q=' + encodeURIComponent(search)); }}><Search size={22}/><input aria-label="جست‌وجوی خدمات" value={search} onChange={e => setSearch(e.target.value)} placeholder="چه کاری می‌خوای انجام بدی؟"/><button type="submit" aria-label="جست‌وجو"><ChevronLeft size={22}/></button></form><div className="primary-actions"><Link to="/new?kind=city_report" className="action-card primary-action"><span className="action-icon"><Camera size={29}/></span><h2>مشکلی در شهر دارم</h2><p>عکس بگیر، گزارش بده، پیگیری کن</p><span className="action-link">ثبت گزارش شهری <ChevronLeft size={17}/></span></Link><Link to="/services?workflow=admin_request" className="action-card secondary-action"><span className="action-icon"><Building2 size={29}/></span><h2>کار اداری دارم</h2><p>درخواستت را به اداره مربوط برسان</p><span className="action-link">میز خدمت ادارات <ChevronLeft size={17}/></span></Link></div><section><div className="section-heading"><h2>خدمات پرکاربرد</h2><Link to="/services">همه خدمات <ChevronLeft size={16}/></Link></div>{catalog.isError ? <Alert>دریافت خدمات ممکن نشد. <button onClick={() => catalog.refetch()}>تلاش دوباره</button></Alert> : catalog.isPending ? <p role="status">در حال دریافت خدمات…</p> : <div className="service-grid">{catalog.data?.data.filter(s => s.isFeatured).slice(0, 6).map(s => <Tile key={s.id} s={s}/>)}</div>}</section><section><div className="section-heading"><h2>درخواست‌های من</h2><Link to="/requests">پیگیری درخواست‌ها <ChevronLeft size={16}/></Link></div>{!me.data ? <div className="login-prompt"><ClipboardList /><div><strong>از درخواستت باخبر بمان</strong><p>برای ثبت و پیگیری، وارد حساب خودت شو.</p></div><Link className="button outline" to="/login">ورود به حساب</Link></div> : requests.isError ? <Alert>دریافت درخواست‌ها ناموفق بود. <button onClick={() => requests.refetch()}>تلاش دوباره</button></Alert> : requests.data?.data.length ? <div className="request-grid">{requests.data.data.map(r => <Card key={r.id} r={r}/>)}</div> : <Empty>هنوز درخواستی ثبت نکرده‌ای.</Empty>}</section><div className="home-lower"><section className="panel assistant-card"><Sparkles size={25}/><h2>از کجا شروع کنم؟</h2><p>نیازت را جست‌وجو کن؛ خدمت مناسب را پیدا کن. پیشنهاد خودکار آزمایشی است و انتخاب نهایی با توست.</p><Link className="text-link" to="/assistant">پیدا کردن خدمت <ChevronLeft size={16}/></Link></section><section className="panel"><div className="section-heading"><h2>خبرهای شهر</h2><Bell size={20}/></div>{news.data?.data.length ? news.data.data.slice(0, 2).map(n => <article className="news" key={n.id}><small>{n.isDemo ? 'محتوای آزمایشی · ' : ''}{n.sourceName}</small><h3>{n.title}</h3><p>{n.body}</p><small>{date(n.publishedAt)}</small></article>) : <p className="muted">اطلاعیه تأییدشده جدیدی منتشر نشده است.</p>}</section></div></>; }
export function Services() { const catalog = useCatalog(); const categories = useQuery({ queryKey: ['categories'], queryFn: () => call<{
        data: CategoryDTO[];
    }>('/services/categories') }); const [params, setParams] = useSearchParams(); const [only, setOnly] = useState(false); const [fav, setFav] = useState<string[]>(() => { try {
    return JSON.parse(localStorage.getItem('torbat-favorites') ?? '[]');
}
catch {
    return [];
} }); const [favorites, setFavorites] = useState(false); const q = params.get('q') ?? ''; const workflow = params.get('workflow'); const items = catalog.data?.data.filter(s => normalizePersian(s.title + ' ' + s.description + ' ' + s.keywords.join(' ')).includes(normalizePersian(q)) && (!only || s.status.startsWith('active')) && (!workflow || s.workflow === workflow) && (!favorites || fav.includes(s.slug))) ?? []; return <Page title="همه خدمات" eyebrow="یک شهر، یک درگاه"><p className="muted">خدمت موردنیازت را پیدا کن. وضعیت اتصال هر خدمت مشخص است.</p><div className="search"><Search size={21}/><input aria-label="جست‌وجوی خدمت" placeholder="نام خدمت یا نیازت را بنویس…" value={q} onChange={e => setParams({ ...Object.fromEntries(params), q: e.target.value })}/></div><div className="filters"><label><input type="checkbox" checked={only} onChange={e => setOnly(e.target.checked)}/> فقط خدمات قابل ثبت</label><label><input type="checkbox" checked={favorites} onChange={e => setFavorites(e.target.checked)}/> علاقه‌مندی‌ها</label>{workflow && <button onClick={() => setParams({})}>نمایش همه دسته‌ها <X size={16}/></button>}</div>{catalog.isError && <Alert>خطا در دریافت کاتالوگ. <button onClick={() => catalog.refetch()}>تلاش دوباره</button></Alert>}{catalog.isPending && <p role="status">در حال دریافت…</p>}{categories.data?.data.map(c => { const group = items.filter(s => s.categorySlug === c.slug); return group.length > 0 && <details open key={c.id} className="category"><summary>{c.title}<span>{group.length.toLocaleString('fa-IR')} خدمت</span></summary><div className="service-grid">{group.map(s => <div className="tile-wrap" key={s.id}><Tile s={s}/><button className="favorite" aria-label={'علاقه‌مندی ' + s.shortTitle} aria-pressed={fav.includes(s.slug)} onClick={() => { const next = fav.includes(s.slug) ? fav.filter(x => x !== s.slug) : [...fav, s.slug]; setFav(next); localStorage.setItem('torbat-favorites', JSON.stringify(next)); }}><Heart size={16} fill={fav.includes(s.slug) ? 'currentColor' : 'none'}/></button></div>)}</div></details>; })}{!catalog.isPending && !items.length && <Empty>خدمتی پیدا نشد. عبارت دیگری را امتحان کن.</Empty>}</Page>; }
export function ServiceDetail() { const { slug } = useParams(); const catalog = useCatalog(); const s = catalog.data?.data.find(s => s.slug === slug); if (!s)
    return <Empty>{catalog.isPending ? 'در حال دریافت…' : 'خدمت پیدا نشد.'}</Empty>; const active = s.status.startsWith('active') && ['city_report', 'admin_request'].includes(s.workflow); return <Page title={s.title} eyebrow={s.organization?.name ?? 'راهنمای خدمات شهر'}><div className="panel narrow"><Status status={s.status}/><p>{s.description}</p>{s.integrationNote && <Alert>{s.integrationNote}</Alert>}{s.workflow === 'emergency' && <Alert>این مسیر برای موارد اضطراری نیست. از محل خطر فاصله بگیرید و از مسیر رسمی امداد اقدام کنید. این اپ رسیدگی فوری را تضمین نمی‌کند.</Alert>}<h2>مدارک و اطلاعات موردنیاز</h2>{s.requirements.length ? <ul>{s.requirements.map(r => <li key={r}>{r}</li>)}</ul> : <p>اطلاعات تأییدشده بیشتری در دسترس نیست.</p>}<h2>مراحل انجام</h2>{s.steps.length ? <ol>{s.steps.map(r => <li key={r}>{r}</li>)}</ol> : <p>جزئیات پس از اتصال رسمی سازمان تکمیل می‌شود.</p>}{['smart-assistant', 'citizen-account', 'city-announcements'].includes(s.slug) && <Link className="button outline" to={s.slug === 'smart-assistant' ? '/assistant' : s.slug === 'citizen-account' ? '/account' : '/'}>مشاهده {s.shortTitle}</Link>}{active ? <Link className="button" to={'/new?service=' + s.slug}>شروع ثبت درخواست {s.status === 'active_demo' ? 'آزمایشی' : ''}</Link> : <p className="notice">ثبت مستقیم این خدمت هنوز فعال نیست. {serviceStatus[s.status]}</p>}<p className="metadata">هزینه و اطلاعات تماس تأیید نشده‌اند؛ پرداختی در این سامانه انجام نمی‌شود.</p></div></Page>; }
export function Login({ admin = false }: {
    admin?: boolean;
}) { const [mobile, setMobile] = useState(''); const [code, setCode] = useState(''); const [otp, setOtp] = useState(false); const [dev, setDev] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const nav = useNavigate(); const qc = useQueryClient(); const [params] = useSearchParams(); async function submit(e: FormEvent) { e.preventDefault(); setError(''); setBusy(true); try {
    if (!otp) {
        const r = await call<{
            devCode?: string;
        }>((admin ? '/admin' : '') + '/auth/request-otp', { mobile });
        setDev(r.devCode ?? '');
        setOtp(true);
    }
    else {
        await call((admin ? '/admin' : '') + '/auth/verify-otp', { mobile, code });
        await qc.invalidateQueries({ queryKey: ['me'] });
        const next = params.get('next');
        nav(next?.startsWith('/') && !next.startsWith('//') ? next : admin ? '/admin' : '/');
    }
}
catch (e) {
    setError((e as Error).message);
}
finally {
    setBusy(false);
} } return <Page title={admin ? 'ورود به پنل سازمان' : 'ورود به تربت من'} eyebrow="خوش آمدی"><form className="panel narrow" onSubmit={submit}><ShieldCheck size={32} className="purple"/><p>{admin ? 'ورود فقط برای کارکنان دارای دسترسی سازمانی است.' : 'با شماره همراه، درخواست‌هایت همیشه در دسترس توست.'}</p>{admin && <label>حساب نمونه آزمایشی<select onChange={e => setMobile(e.target.value)} value={mobile}><option value="">انتخاب حساب / ورود شماره</option><option value="09130000001">کارشناس شهرداری</option><option value="09140000001">کارشناس آبفا</option><option value="09150000001">کارشناس برق</option><option value="09100000000">مدیر سامانه</option></select></label>}<label>شماره همراه<input required type="tel" inputMode="tel" autoComplete="tel" dir="ltr" value={mobile} disabled={otp} placeholder="09xxxxxxxxx" onChange={e => setMobile(e.target.value)}/></label>{otp && <label>کد ورود<input required inputMode="numeric" autoComplete="one-time-code" dir="ltr" value={code} onChange={e => setCode(e.target.value)}/></label>}{dev && <div className="notice">پیامکی ارسال نشده است. کد آزمایشی: <bdi>{dev}</bdi></div>}{error && <Alert>{error}</Alert>}<button disabled={busy} className="button">{busy ? 'در حال انجام…' : otp ? 'تأیید و ورود' : 'دریافت کد ورود'}</button>{otp && <button type="button" className="text-link" onClick={() => { setOtp(false); setDev(''); setCode(''); }}>تغییر شماره</button>}</form></Page>; }
export function Account({ admin = false }: {
    admin?: boolean;
}) { const me = useMe(admin); const nav = useNavigate(); const qc = useQueryClient(); const [name, setName] = useState(''); const [error, setError] = useState(''); const [notice, setNotice] = useState(''); async function logout() { try {
    await call((admin ? '/admin' : '') + '/auth/logout', undefined, 'POST');
    qc.clear();
    sessionStorage.removeItem('request-draft');
    nav(admin ? '/admin/login' : '/login');
}
catch (e) {
    setError((e as Error).message);
} } return <Page title={admin ? 'حساب کارشناس' : 'حساب من'}>{me.data ? <div className="panel narrow"><UserRound className="purple" size={35}/><h2>{me.data.displayName ?? 'همشهری عزیز'}</h2><p dir="ltr">{me.data.mobile}</p>{admin ? <p>{me.data.memberships?.map(m => m.organizationName).join('، ')}</p> : <form onSubmit={async (e) => { e.preventDefault(); setError(''); try {
    await call('/me', { displayName: name }, 'PATCH');
    await qc.invalidateQueries({ queryKey: ['me'] });
    setNotice('نام ذخیره شد.');
}
catch (e) {
    setError((e as Error).message);
} }}><label>نام نمایشی<input required minLength={2} maxLength={60} value={name} onChange={e => setName(e.target.value)} placeholder={me.data.displayName ?? 'نام شما'}/></label><button className="button outline">ذخیره نام</button></form>}<div className="filters"><button className="button outline" onClick={logout}><LogOut size={18}/>خروج از حساب</button>{!admin && <a className="text-link" href="/v1/me/export" download>دریافت اطلاعات من</a>}</div>{notice && <p role="status">{notice}</p>}</div> : <Link className="button" to={admin ? '/admin/login' : '/login'}>ورود به حساب</Link>}{error && <Alert>{error}</Alert>}<div className="panel narrow"><h2><CircleHelp size={21}/> درباره این نسخه</h2><p>تربت من، درگاه خدمات شهروندی تربت حیدریه. ثبت درخواست، پیگیری و پاسخ سازمان در این نسخه به پایگاه داده متصل است؛ سازمان‌ها آزمایشی هستند.</p><p>اطلاعات خصوصی پرونده فقط برای صاحب حساب و سازمان دارای دسترسی نمایش داده می‌شود. پرداخت، ارسال پیامک و اتصال رسمی ادارات فعال نیست.</p><Link className="text-link" to={admin ? '/' : '/admin/login'}>{admin ? 'رفتن به اپ شهروندی' : 'ورود کارکنان و مدیریت'}</Link></div></Page>; }
