import { BrowserRouter, useLocation, Link, NavLink, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { Home, LayoutGrid, ClipboardList, Bell, UserRound, MapPin, type LucideIcon } from 'lucide-react';
import { Logo } from '@torbat/ui';
import { useMe, Empty } from './lib';
import { Dashboard, Services, ServiceDetail, Login, Account } from './pages';
import { Assistant } from './assistant';
import { NewRequest } from './new-request';
import { Requests, Detail, Notifications } from './requests';
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true } } });
const citizenNav: [
    LucideIcon,
    string,
    string
][] = [[Home, 'خانه', '/'], [LayoutGrid, 'خدمات', '/services'], [ClipboardList, 'درخواست‌ها', '/requests'], [Bell, 'اعلان‌ها', '/notifications'], [UserRound, 'حساب من', '/account']];
function Shell() { const admin = useLocation().pathname.startsWith('/admin'); const me = useMe(admin); const env = useQuery({ queryKey: ['environment'], queryFn: async () => { const res = await fetch('/health'); if (!res.ok)
        throw new Error(); return res.json() as Promise<{
        appEnv: string;
    }>; } }); const nav: [
    LucideIcon,
    string,
    string
][] = admin ? [[ClipboardList, 'کارتابل', '/admin'], [UserRound, 'حساب کارشناس', '/admin/account']] : citizenNav; return <div className={'app ' + (admin ? 'admin-app' : '')}><aside className="sidebar"><Link to={admin ? '/admin' : '/'} className="brand"><Logo size={44}/></Link><p className="sidebar-caption">{admin ? 'میز کار سازمانی' : 'شهر من، همراه من'}</p><nav>{nav.map(([Icon, label, path]) => <NavLink end={path === '/' || path === '/admin'} to={path} key={path}><Icon size={21}/>{label}</NavLink>)}</nav><div className="sidebar-bottom"><MapPin size={18}/><span>تربت حیدریه</span><small>ساخته‌شده برای زندگی بهتر در شهر</small></div></aside><div className="main-area"><header><Link to={admin ? '/admin' : '/'} className="mobile-brand"><Logo size={35}/></Link><span className="desktop-title">{admin ? 'پنل رسیدگی سازمان‌ها' : 'خدمات یکپارچه شهروندی'}</span><div className="header-actions"><Link aria-label="اعلان‌ها" to={admin ? '/admin' : '/notifications'}><Bell size={21}/></Link><Link aria-label="حساب کاربری" to={admin ? '/admin/account' : '/account'}><UserRound size={21}/><span>{me.data?.displayName ?? 'حساب من'}</span></Link></div></header>{env.isError ? <div className="environment">ارتباط با سرور برقرار نیست. اطلاعات فرم را حفظ می‌کنیم؛ پس از اتصال دوباره تلاش کنید.</div> : env.data?.appEnv !== 'production' && <div className="environment"><span className="env-dot"/>محیط آزمایشی · اطلاعات ذخیره می‌شوند؛ اتصال رسمی ادارات و پیامک فعال نیست.</div>}<main id="main"><Routes><Route path="/" element={<Dashboard />}/><Route path="/services" element={<Services />}/><Route path="/services/:slug" element={<ServiceDetail />}/><Route path="/assistant" element={<Assistant />}/><Route path="/new" element={<NewRequest />}/><Route path="/requests" element={<Requests />}/><Route path="/requests/:id" element={<Detail />}/><Route path="/notifications" element={<Notifications />}/><Route path="/account" element={<Account />}/><Route path="/login" element={<Login />}/><Route path="/admin" element={<Requests admin/>}/><Route path="/admin/requests/:id" element={<Detail admin/>}/><Route path="/admin/account" element={<Account admin/>}/><Route path="/admin/login" element={<Login admin/>}/><Route path="*" element={<Empty>صفحه پیدا نشد. <Link to="/">بازگشت به خانه</Link></Empty>}/></Routes></main><footer>تربت من <span>·</span> همه خدمات شهر، توی دست تو</footer></div>{!admin && <nav className="bottom-nav" aria-label="ناوبری اصلی">{citizenNav.map(([Icon, label, path]) => <NavLink end={path === '/'} to={path} key={path}><Icon size={21}/><span>{label}</span></NavLink>)}</nav>}</div>; }
export default function App() { return <QueryClientProvider client={queryClient}><BrowserRouter><a className="skip-link" href="#main">رفتن به محتوای اصلی</a><Shell /></BrowserRouter></QueryClientProvider>; }
