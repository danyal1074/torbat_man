import { ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import { ArrowRight, ChevronLeft, Home, LayoutGrid, Megaphone, ClipboardList, User, Search, X, SearchX } from 'lucide-react';
import type { Category, Service } from '../data/services';
import { useDisabledServices } from '../state/notifications';

export function Brand() {
  return (
    <Link to="/services" className="brand" aria-label="تربت‌نو؛ شهر تو، همراه تو">
      <img src="/logo-mark.png" alt="" width={44} height={44} />
      <span className="brand-text"><span className="brand-name">تربت‌نو</span><span className="brand-en" aria-hidden="true">TORBAT NOW</span></span>
    </Link>
  );
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle: string; children?: ReactNode }) {
  const navigate = useNavigate();
  return (
    <>
      <header className="hero">
        <div className="hero-inner">
          <Brand />
          <div className="hero-title"><h1>{title}</h1><p>{subtitle}</p></div>
          <button type="button" className="icon-btn" aria-label="بازگشت" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/services'))}>
            <ArrowRight size={22} aria-hidden="true" />
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
      <Icon className="ico" size={30} strokeWidth={1.7} aria-hidden="true" />
      <span className="lbl">{service.title}</span>
    </Link>
  );
}

export function CategorySection({ category }: { category: Category }) {
  const Icon = category.icon;
  return (
    <section className={`panel ${category.tone}`} aria-labelledby={`cat-${category.id}`}>
      <div className="panel-head">
        <span className="panel-icon"><Icon size={24} aria-hidden="true" /></span>
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
  { to: '/services/shahrbin', label: 'شهربین', icon: Megaphone, center: true },
  { to: '/requests', label: 'درخواست‌ها', icon: ClipboardList },
  { to: '/account', label: 'حساب من', icon: User },
];
export function BottomNavigation() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/shahrbin/new') || pathname.startsWith('/login') || pathname.startsWith('/welcome') || pathname.startsWith('/admin')) return null; // wizard has its own action bar
  return (
    <nav className="bottom-nav" aria-label="ناوبری اصلی">
      <ul>
        {NAV.map(({ to, label, icon: Icon, center }) => (
          <li key={to}>
            <NavLink to={to} end={to === '/' || to === '/services' || to === '/account'} className={() => `nav-item${center ? ' center' : ''}`} aria-current={center && pathname.startsWith('/shahrbin') ? 'page' : undefined}>
              <Icon size={center ? 26 : 24} aria-hidden="true" /><span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
