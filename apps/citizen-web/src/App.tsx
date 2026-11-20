import { useEffect, useState } from 'react';
import { BrowserRouter, useLocation, useNavigate, Link, NavLink, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import {
  Bell, ChevronLeft, ClipboardList, Headphones, Home, LayoutGrid,
  MapPin, Megaphone, Search, UserRound, type LucideIcon,
} from 'lucide-react';
import { Logo } from '@torbat/ui';
import { useMe, Empty, Page } from './lib';
import { Services, ServiceDetail, Login, Account } from './pages';
import { Dashboard, CityNews } from './city-dashboard';
import { CityMap } from './city-map';
import cityBrand from './city-brand.svg';
import cityArt from './city-hero.webp';
import { AdminServices, AdminServiceEditor } from './admin-services';
import { AdminContent } from './admin-content';
import { AdminAudit } from './admin-audit';
import { Support, AdminSupport } from './support';
import { Assistant } from './assistant';
import { NewRequest } from './new-request';
import { Requests, Detail, Notifications } from './requests';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true } },
});

type NavItem = [LucideIcon, string, string];
const citizenNav: NavItem[] = [
  [Home, 'خانه', '/'], [LayoutGrid, 'خدمات', '/services'],
  [ClipboardList, 'درخواست‌ها', '/requests'], [MapPin, 'نقشه', '/city-map'],
  [UserRound, 'پروفایل', '/account'],
];
const citizenSidebar: NavItem[] = [
  ...citizenNav.slice(0, 2), [Megaphone, 'گزارش مشکل شهری', '/new'],
  [ClipboardList, 'درخواست‌های من', '/requests'], [MapPin, 'نقشه شهر', '/city-map'],
  [Bell, 'اعلان‌ها', '/notifications'], [Headphones, 'راهنما و پشتیبانی', '/support'],
];

function CivicBrand({ compact = false }: { compact?: boolean }) {
  return <Link to="/" className={'civic-brand' + (compact ? ' civic-brand-compact' : '')} aria-label="تربت من، خانه">
    <img src={cityBrand} alt=""/>
    <strong>تربت من</strong>
    {!compact && <span>درگاه خدمات شهروندی<br/>تربت حیدریه</span>}
  </Link>;
}

function HeaderSearch() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  return <form className="civic-header-search" role="search" onSubmit={event => {
    event.preventDefault();
    navigate(query.trim() ? '/services?q=' + encodeURIComponent(query.trim()) : '/services');
  }}>
    <button type="submit" aria-label="جست‌وجو"><Search size={23}/></button>
    <input aria-label="جست‌وجوی خدمات" value={query} onChange={event => setQuery(event.target.value)} placeholder="جست‌وجو در خدمات و راهنما…"/>
  </form>;
}

function Navigation({ items, label }: { items: NavItem[]; label: string }) {
  return <nav aria-label={label}>{items.map(([Icon, name, path]) => <NavLink
    end={path === '/' || path === '/admin'} to={path === '/new' ? '/new?kind=city_report' : path} key={path}
  ><Icon size={21}/><span>{name}</span></NavLink>)}</nav>;
}

function Shell() {
  const location = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);
  const admin = location.pathname.startsWith('/admin');
  const home = location.pathname === '/';
  const me = useMe(admin);
  const env = useQuery({
    queryKey: ['environment'],
    queryFn: async () => {
      const result = await fetch('/health');
      if (!result.ok) throw new Error();
      return result.json() as Promise<{ appEnv: string }>;
    },
  });
  const staffNav: NavItem[] = [[ClipboardList, 'کارتابل', '/admin'], [UserRound, 'حساب کارشناس', '/admin/account']];
  const manager = me.data?.memberships?.some(membership => membership.role === 'org_manager');
  const role = me.data?.platformRole;
  if (admin) {
    if (role === 'platform_admin' || manager) staffNav.push([LayoutGrid, 'مدیریت خدمات', '/admin/services']);
    if (role === 'content_editor' || role === 'platform_admin' || manager) staffNav.push([Bell, 'اطلاعیه‌ها', '/admin/content']);
    if (role === 'platform_admin' || role === 'support_agent') staffNav.push([ClipboardList, 'پشتیبانی', '/admin/support']);
    if (role === 'platform_admin' || manager) staffNav.push([ClipboardList, 'گزارش فعالیت', '/admin/audit']);
  }

  return <div className={admin ? 'app admin-app' : 'app citizen-app'}>
    <aside className="sidebar">
      {admin ? <>
        <Link to="/admin" className="brand"><Logo size={44}/></Link>
        <p className="sidebar-caption">میز کار سازمانی</p>
      </> : <CivicBrand/>}
      <Navigation items={admin ? staffNav : citizenSidebar} label={admin ? 'ناوبری مدیریت' : 'ناوبری شهروندی'}/>
      {admin ? <div className="sidebar-bottom"><MapPin size={18}/><span>تربت حیدریه</span></div> : <div className="civic-sidebar-art" aria-hidden="true"><img src={cityArt} alt=""/></div>}
    </aside>
    <div className="main-area">
      <header className={!admin && home ? 'civic-home-header' : undefined}>
        {admin ? <>
          <Link to="/admin" className="mobile-brand"><Logo size={35}/></Link>
          <span className="desktop-title">پنل رسیدگی سازمان‌ها</span>
        </> : <>
          <CivicBrand compact/>
          {home ? <HeaderSearch/> : <Link className="civic-back" to="/">خانه <ChevronLeft size={18}/></Link>}
        </>}
        <div className="header-actions">
          {!admin && <Link aria-label="اعلان‌ها" to="/notifications"><Bell size={21}/></Link>}
          <Link aria-label="حساب کاربری" to={admin ? '/admin/account' : '/account'}><UserRound size={21}/><span>{me.data?.displayName ?? 'حساب من'}</span></Link>
        </div>
      </header>
      {env.isError ? <div className="environment" role="status">ارتباط با سرور برقرار نیست. پس از اتصال دوباره تلاش کنید.</div>
        : env.data?.appEnv && env.data.appEnv !== 'production' && <div className="environment">
          <span className="env-dot"/> نسخه آزمایشی <span className="environment-note"> · اتصال رسمی ادارات و پیامک فعال نیست</span>
        </div>}
      <main id="main" className={!admin && home ? 'civic-home-main' : undefined}>
        <Routes>
          <Route path="/" element={<Dashboard/>}/>
          <Route path="/services" element={<Services/>}/>
          <Route path="/services/:slug" element={<ServiceDetail/>}/>
          <Route path="/city-map" element={<CityMap/>}/>
          <Route path="/city-news" element={<Page title="خبرهای تربت حیدریه"><CityNews/></Page>}/>
          <Route path="/support" element={<Support/>}/>
          <Route path="/assistant" element={<Assistant/>}/>
          <Route path="/new" element={<NewRequest/>}/>
          <Route path="/requests" element={<Requests/>}/>
          <Route path="/requests/:id" element={<Detail/>}/>
          <Route path="/notifications" element={<Notifications/>}/>
          <Route path="/account" element={<Account/>}/>
          <Route path="/login" element={<Login/>}/>
          <Route path="/admin" element={<Requests admin/>}/>
          <Route path="/admin/services" element={<AdminServices/>}/>
          <Route path="/admin/services/:slug" element={<AdminServiceEditor/>}/>
          <Route path="/admin/content" element={<AdminContent/>}/>
          <Route path="/admin/support" element={<AdminSupport/>}/>
          <Route path="/admin/audit" element={<AdminAudit/>}/>
          <Route path="/admin/requests/:id" element={<Detail admin/>}/>
          <Route path="/admin/account" element={<Account admin/>}/>
          <Route path="/admin/login" element={<Login admin/>}/>
          <Route path="*" element={<Empty>صفحه پیدا نشد. <Link to="/">بازگشت به خانه</Link></Empty>}/>
        </Routes>
      </main>
      <footer>تربت من <span>·</span> درگاه خدمات شهروندی</footer>
    </div>
    {!admin && <div className="bottom-nav"><Navigation items={citizenNav} label="ناوبری اصلی"/></div>}
  </div>;
}

export default function App() {
  return <QueryClientProvider client={queryClient}>
    <BrowserRouter><a className="skip-link" href="#main">رفتن به محتوای اصلی</a><Shell/></BrowserRouter>
  </QueryClientProvider>;
}
