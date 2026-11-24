import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Bell, ChevronLeft, Home, LayoutGrid, ClipboardList, User, Search, X, SearchX } from 'lucide-react';
import type { Category, Service } from '../data/services';
import { useDisabledServices, useNotices } from '../state/notifications';
import { ReferenceIcon } from './ReferenceIcon';

export function Brand() {
  return (
    <Link to="/" className="brand ref-brand" aria-label="تربتینو؛ خانه">
      <img src="/torbatino-mark.svg" alt="" width={47} height={47} />
      <span className="brand-text"><span className="brand-name">تربتینو</span><span className="brand-en" aria-hidden="true">TORBATINO</span></span>
    </Link>
  );
}

export function PageHeader({ title, subtitle, children, tone = 'plain' }: { title: string; subtitle: string; children?: ReactNode; tone?: 'plain' | 'purple' }) {
  const navigate = useNavigate();
  return (
    <>
      <header className={`hero ref-page-header ref-header-${tone}`}>
        <div className="hero-inner">
          {tone === 'purple' ? <Brand/> : <span/>}
          <div className="hero-title"><h1>{title}</h1><p>{subtitle}</p></div>
          <button type="button" className="icon-btn" aria-label="بازگشت" onClick={() => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/'))}>
            <ChevronLeft size={22} aria-hidden="true" />
          </button>
        </div>
      </header>
      {children}
    </>
  );
}

export function SearchField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="search-wrap">
      <form className="search" role="search" onSubmit={(e) => e.preventDefault()}>
        <Search size={22} aria-hidden="true" />
        <label htmlFor="svc-search" className="sr-only">جست‌وجوی خدمت، سازمان یا موضوع</label>
        <input id="svc-search" type="search" inputMode="search" autoComplete="off" enterKeyHint="search" placeholder="جست‌وجوی خدمت، سازمان یا موضوع..." value={value} onChange={(e) => onChange(e.target.value)} />
        {value && (
          <button type="button" className="clear" aria-label="پاک‌کردن جست‌وجو" onClick={() => onChange('')}><X size={16} aria-hidden="true" /></button>
        )}
      </form>
    </div>
  );
}

export function ServiceCard({ service }: { service: Service }) {
  const Icon = service.icon;
  const off = useDisabledServices().includes(service.id);
  const soon = service.status === 'soon' || off;
  return (
    <Link to={service.path} className="card" aria-label={soon ? `${service.title} (${off ? 'غیرفعال' : 'به‌زودی'})` : service.title}>
      {soon && <span className="soon-dot" aria-hidden="true">{off ? 'غیرفعال' : 'به‌زودی'}</span>}
      <ReferenceIcon name={service.id} fallback={Icon} size={29}/>
      <span className="lbl">{service.title}</span>
    </Link>
  );
}

export function CategorySection({ category }: { category: Category }) {
  const Icon = category.icon;
  return (
    <section className={`panel ${category.tone}`} aria-labelledby={`cat-${category.id}`}>
      <div className="panel-head">
        <span className="panel-icon"><ReferenceIcon name={category.id} fallback={Icon} size={24}/></span>
        <div className="panel-titles"><h2 id={`cat-${category.id}`}>{category.title}</h2><p>{category.description}</p></div>
        <Link className="see-all" to={`/categories/${category.id}`} aria-label={`مشاهده همه ${category.title}`}>
          مشاهده همه <ChevronLeft size={16} aria-hidden="true" />
        </Link>
      </div>
      <div className="row">{category.services.map((s) => <ServiceCard key={s.id} service={s} />)}</div>
    </section>
  );
}

export function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="state" role="status">
      <span className="ico-wrap"><SearchX size={30} aria-hidden="true" /></span>
      <h2>{title}</h2><p>{text}</p>{action}
    </div>
  );
}

const NAV = [
  { to: '/', label: 'خانه', icon: Home },
  { to: '/services', label: 'خدمات', icon: LayoutGrid },
  { to: '/requests', label: 'درخواست‌ها', icon: ClipboardList },
  { to: '/notifications', label: 'اعلان‌ها', icon: Bell },
  { to: '/account', label: 'پروفایل', icon: User },
];
export function BottomNavigation() {
  const { pathname } = useLocation();
  const unread = useNotices().data?.some(item => !item.read);
  if (pathname.startsWith('/shahrbin/new') || pathname.startsWith('/login') || pathname.startsWith('/welcome') || pathname.startsWith('/admin')) return null;
  const current = pathname === '/' ? '/'
    : /^\/(requests|shahrbin\/(reports|success))/.test(pathname) ? '/requests'
    : /^\/(notifications|city-news)/.test(pathname) ? '/notifications'
    : /^\/(account|more|support)/.test(pathname) ? '/account' : '/services';
  return (
    <nav className="bottom-nav" aria-label="ناوبری اصلی">
      <ul>
        {NAV.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <Link to={to} className="nav-item" aria-current={current === to ? 'page' : undefined}>
              <span className="ref-nav-icon"><Icon size={23} aria-hidden="true"/>{to === '/notifications' && unread && <i aria-label="اعلان خوانده‌نشده"/>}</span><span>{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
