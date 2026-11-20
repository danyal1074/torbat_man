import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Heart, X, ShieldCheck, UserRound, LogOut, CircleHelp } from 'lucide-react';
import type { StaffMeDTO, CategoryDTO } from '@torbat/contracts';
import { normalizePersian } from '@torbat/i18n';
import { serviceStatus, call, useMe, useCatalog, Alert, Empty, Status, Tile, Page } from './lib';
export function Services() { const catalog = useCatalog(); const categories = useQuery({ queryKey: ['categories'], queryFn: () => call<{
        data: CategoryDTO[];
    }>('/services/categories') }); const [params, setParams] = useSearchParams(); const [only, setOnly] = useState(false); const [fav, setFav] = useState<string[]>(() => { try {
    return JSON.parse(localStorage.getItem('torbat-favorites') ?? '[]');
}
catch {
    return [];
} }); const [favorites, setFavorites] = useState(false); const q = params.get('q') ?? ''; const workflow = params.get('workflow'); const category = params.get('category'); const items = catalog.data?.data.filter(s => normalizePersian(s.title + ' ' + s.description + ' ' + s.keywords.join(' ')).includes(normalizePersian(q)) && (!only || s.status.startsWith('active')) && (!workflow || s.workflow === workflow) && (!category || s.categorySlug === category) && (!favorites || fav.includes(s.slug))) ?? []; return <Page title={category ? categories.data?.data.find(c => c.slug === category)?.title ?? "خدمات" : "همه خدمات"} eyebrow="یک شهر، یک درگاه"><p className="muted">خدمت موردنیازت را پیدا کن. وضعیت اتصال هر خدمت مشخص است.</p><div className="search"><Search size={21}/><input aria-label="جست‌وجوی خدمت" placeholder="نام خدمت یا نیازت را بنویس…" value={q} onChange={e => setParams({ ...Object.fromEntries(params), q: e.target.value })}/></div><div className="filters"><label><input type="checkbox" checked={only} onChange={e => setOnly(e.target.checked)}/> فقط خدمات قابل ثبت</label><label><input type="checkbox" checked={favorites} onChange={e => setFavorites(e.target.checked)}/> علاقه‌مندی‌ها</label>{(workflow || category) && <button onClick={() => setParams(q ? { q } : {})}>نمایش همه دسته‌ها <X size={16}/></button>}</div>{catalog.isError && <Alert>خطا در دریافت کاتالوگ. <button onClick={() => catalog.refetch()}>تلاش دوباره</button></Alert>}{catalog.isPending && <p role="status">در حال دریافت…</p>}{categories.data?.data.map(c => { const group = items.filter(s => s.categorySlug === c.slug); return group.length > 0 && <details open key={c.id} className="category"><summary>{c.title}<span>{group.length.toLocaleString('fa-IR')} خدمت</span></summary><div className="service-grid">{group.map(s => <div className="tile-wrap" key={s.id}><Tile s={s}/><button className="favorite" aria-label={'علاقه‌مندی ' + s.shortTitle} aria-pressed={fav.includes(s.slug)} onClick={() => { const next = fav.includes(s.slug) ? fav.filter(x => x !== s.slug) : [...fav, s.slug]; setFav(next); localStorage.setItem('torbat-favorites', JSON.stringify(next)); }}><Heart size={16} fill={fav.includes(s.slug) ? 'currentColor' : 'none'}/></button></div>)}</div></details>; })}{!catalog.isPending && !items.length && <Empty>خدمتی پیدا نشد. عبارت دیگری را امتحان کن.</Empty>}</Page>; }
export function ServiceDetail() { const { slug } = useParams(); const catalog = useCatalog(); const s = catalog.data?.data.find(s => s.slug === slug); if (!s)
    return <Empty>{catalog.isPending ? 'در حال دریافت…' : 'خدمت پیدا نشد.'}</Empty>; const active = s.status.startsWith('active') && ['city_report', 'admin_request'].includes(s.workflow); return <Page title={s.title} eyebrow={s.organization?.name ?? 'راهنمای خدمات شهر'}><div className="panel narrow"><Status status={s.status}/><p>{s.description}</p>{s.integrationNote && <Alert>{s.integrationNote}</Alert>}{s.workflow === 'emergency' && <Alert>این مسیر برای موارد اضطراری نیست. از محل خطر فاصله بگیرید و از مسیر رسمی امداد اقدام کنید. این اپ رسیدگی فوری را تضمین نمی‌کند.</Alert>}<h2>مدارک و اطلاعات موردنیاز</h2>{s.requirements.length ? <ul>{s.requirements.map(r => <li key={r}>{r}</li>)}</ul> : <p>اطلاعات تأییدشده بیشتری در دسترس نیست.</p>}<h2>مراحل انجام</h2>{s.steps.length ? <ol>{s.steps.map(r => <li key={r}>{r}</li>)}</ol> : <p>جزئیات پس از اتصال رسمی سازمان تکمیل می‌شود.</p>}{['smart-assistant', 'citizen-account', 'city-announcements','citizen-support'].includes(s.slug) && <Link className="button outline" to={s.slug === 'smart-assistant' ? '/assistant' : s.slug === 'citizen-account' ? '/account' : s.slug==='citizen-support'?'/support' : '/'}>مشاهده {s.shortTitle}</Link>}{active ? <Link className="button" to={'/new?service=' + s.slug}>شروع ثبت درخواست {s.status === 'active_demo' ? 'آزمایشی' : ''}</Link> : <p className="notice">ثبت مستقیم این خدمت هنوز فعال نیست. {serviceStatus[s.status]}</p>}<p className="metadata">هزینه و اطلاعات تماس تأیید نشده‌اند؛ پرداختی در این سامانه انجام نمی‌شود.</p></div></Page>; }
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
        const signedIn=await call<StaffMeDTO>((admin ? '/admin' : '') + '/auth/verify-otp', { mobile, code });
        await qc.invalidateQueries({ queryKey: ['me'] });
        const next = params.get('next');
        const destination=admin?(signedIn.platformRole==='content_editor'?'/admin/content':signedIn.platformRole==='support_agent'?'/admin/support':'/admin'):'/';
        nav(next?.startsWith('/')&&!next.startsWith('//')?next:destination);
    }
}
catch (e) {
    setError((e as Error).message);
}
finally {
    setBusy(false);
} } return <Page title={admin ? 'ورود به پنل سازمان' : 'ورود به تربت من'} eyebrow="خوش آمدی"><form className="panel narrow" onSubmit={submit}><ShieldCheck size={32} className="purple"/><p>{admin ? 'ورود فقط برای کارکنان دارای دسترسی سازمانی است.' : 'با شماره همراه، درخواست‌هایت همیشه در دسترس توست.'}</p>{admin && <label>حساب نمونه آزمایشی<select onChange={e => setMobile(e.target.value)} value={mobile}><option value="">انتخاب حساب / ورود شماره</option><option value="09130000001">کارشناس شهرداری</option><option value="09140000001">کارشناس آبفا</option><option value="09150000001">کارشناس برق</option><option value="09130000002">مسئول ارجاع شهرداری</option><option value="09130000003">مدیر شهرداری</option><option value="09140000002">مسئول ارجاع آبفا</option><option value="09100000001">مدیر محتوا</option><option value="09100000002">پشتیبان سامانه</option><option value="09100000000">مدیر سامانه</option></select></label>}<label>شماره همراه<input required type="tel" inputMode="tel" autoComplete="tel" dir="ltr" value={mobile} disabled={otp} placeholder="09xxxxxxxxx" onChange={e => setMobile(e.target.value)}/></label>{otp && <label>کد ورود<input required inputMode="numeric" autoComplete="one-time-code" dir="ltr" value={code} onChange={e => setCode(e.target.value)}/></label>}{dev && <div className="notice">پیامکی ارسال نشده است. کد آزمایشی: <bdi>{dev}</bdi></div>}{error && <Alert>{error}</Alert>}<button disabled={busy} className="button">{busy ? 'در حال انجام…' : otp ? 'تأیید و ورود' : 'دریافت کد ورود'}</button>{otp && <button type="button" className="text-link" onClick={() => { setOtp(false); setDev(''); setCode(''); }}>تغییر شماره</button>}</form></Page>; }
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
} } return <Page title={admin ? 'حساب کارشناس' : 'پروفایل من'}>{me.data ? <div className="panel narrow"><div className={admin ? undefined : "civic-profile-banner"}><span><UserRound size={35}/></span><h2>{me.data.displayName ?? 'همشهری عزیز'}</h2><p dir="ltr">{me.data.mobile}</p></div>{admin ? <p>{me.data.memberships?.map(m => m.organizationName).join('، ')}</p> : <form onSubmit={async (e) => { e.preventDefault(); setError(''); try {
    await call('/me', { displayName: name }, 'PATCH');
    await qc.invalidateQueries({ queryKey: ['me'] });
    setNotice('نام ذخیره شد.');
}
catch (e) {
    setError((e as Error).message);
} }}><label>نام نمایشی<input required minLength={2} maxLength={60} value={name} onChange={e => setName(e.target.value)} placeholder={me.data.displayName ?? 'نام شما'}/></label><button className="button outline">ذخیره نام</button></form>}<div className="filters"><button className="button outline" onClick={logout}><LogOut size={18}/>خروج از حساب</button>{!admin && <a className="text-link" href="/v1/me/export" download>دریافت اطلاعات من</a>}</div>{notice && <p role="status">{notice}</p>}</div> : <Link className="button" to={admin ? '/admin/login' : '/login'}>ورود به حساب</Link>}{error && <Alert>{error}</Alert>}<Link className="button outline" to="/support">راهنما و پشتیبانی</Link><div className="panel narrow"><h2><CircleHelp size={21}/> درباره این نسخه</h2><p>تربت من، درگاه خدمات شهروندی تربت حیدریه. ثبت درخواست، پیگیری و پاسخ سازمان در این نسخه به پایگاه داده متصل است؛ سازمان‌ها آزمایشی هستند.</p><p>اطلاعات خصوصی پرونده فقط برای صاحب حساب و سازمان دارای دسترسی نمایش داده می‌شود. پرداخت، ارسال پیامک و اتصال رسمی ادارات فعال نیست.</p><Link className="text-link" to={admin ? '/' : '/admin/login'}>{admin ? 'رفتن به اپ شهروندی' : 'ورود کارکنان و مدیریت'}</Link></div></Page>; }
