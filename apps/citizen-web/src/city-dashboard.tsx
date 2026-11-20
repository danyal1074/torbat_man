import { useQuery } from '@tanstack/react-query';
import {
  Bell, Bot, Building2, Bus, ChevronLeft, ClipboardList, CreditCard, Droplet,
  FileText, Flame, Headphones, LayoutGrid, Map as MapIcon, MapPin, Megaphone,
  Mountain, Search, Sparkles, TreePine, Users, Wheat, Zap,
} from 'lucide-react';
import { Link } from 'react-router';
import cityHero from './city-hero.webp';
import { MapPreview } from './city-map';
import { Alert, Empty, Status, call, date, useCatalog, useMe, type RecordRow } from './lib';

const shortcuts = [
  ['شهرداری', 'municipality', Building2],
  ['آب و فاضلاب', 'water', Droplet],
  ['برق', 'electricity', Zap],
  ['گاز', 'gas', Flame],
  ['پرداخت‌ها', 'payments', CreditCard],
  ['حمل و نقل', 'transport', Bus],
  ['نانوایی‌ها', 'bakery', Wheat],
  ['گردشگری', 'tourism', Mountain],
  ['خدمات شهروندی', 'citizen', Users],
  ['درختکاری', '/services/muni-tree', TreePine],
  ['اطلاعیه‌ها', '/city-news', Bell],
  ['گزارش شهری', 'shahrbin', Megaphone],
  ['راهنما', '/support', Headphones],
  ['سایر خدمات', '/services', LayoutGrid],
] as const;

interface Announcement {
  id: string;
  title: string;
  body: string;
  isDemo: boolean;
  sourceName: string;
  publishedAt: string;
}

function useAnnouncements() {
  return useQuery({ queryKey: ['news'], queryFn: () => call<{ data: Announcement[] }>('/announcements') });
}

export function CityNews({ compact = false }: { compact?: boolean }) {
  const news = useAnnouncements();
  const items = news.data?.data.slice(0, compact ? 3 : undefined);

  return <section className="civic-surface city-news" aria-labelledby={compact ? 'home-news' : 'city-news'}>
    <div className="civic-section-title">
      <h2 id={compact ? 'home-news' : 'city-news'}><Megaphone size={21}/> اطلاعیه‌های شهر</h2>
      {compact && <Link to="/city-news">همه <ChevronLeft size={15}/></Link>}
    </div>
    {news.isError && <Alert>دریافت اطلاعیه‌ها ممکن نشد. <button onClick={() => news.refetch()}>تلاش دوباره</button></Alert>}
    {news.isPending && <p className="civic-caption" role="status">در حال دریافت اطلاعیه‌ها…</p>}
    {items?.length === 0 && <p className="civic-caption">اطلاعیهٔ فعالی منتشر نشده است.</p>}
    {items?.map(item => <details className="city-news-item" key={item.id}>
      <summary><span>
        <strong>{item.title}</strong>
        <small>{item.isDemo ? 'آزمایشی · ' : ''}{date(item.publishedAt)}</small>
      </span><ChevronLeft size={17}/></summary>
      <p>{item.body}</p>
      <small>{item.sourceName}</small>
    </details>)}
  </section>;
}

function RecentRequests() {
  const me = useMe();
  const requests = useQuery({
    queryKey: ['requests', 'dashboard', me.data?.id],
    queryFn: () => call<{ data: RecordRow[] }>('/requests?limit=3'),
    enabled: !!me.data,
  });

  return <section className="civic-surface civic-recent">
    <div className="civic-section-title">
      <h2><ClipboardList size={21}/> درخواست‌های من</h2>
      <Link to="/requests">مشاهده همه <ChevronLeft size={15}/></Link>
    </div>
    {me.isPending ? <p className="civic-caption" role="status">در حال بررسی حساب…</p>
      : !me.data ? <div className="recent-login">
        <p>برای دیدن آخرین وضعیت درخواست‌ها وارد شوید.</p>
        <Link className="button outline" to="/login?next=%2Frequests">ورود و پیگیری</Link>
      </div>
      : requests.isError ? <Alert>دریافت درخواست‌ها ممکن نشد. <button onClick={() => requests.refetch()}>تلاش دوباره</button></Alert>
      : requests.isPending ? <p className="civic-caption" role="status">در حال دریافت درخواست‌ها…</p>
      : requests.data?.data.length === 0 ? <Empty>هنوز درخواستی ثبت نکرده‌اید.</Empty>
      : requests.data?.data.map(row => <Link className="recent-row" to={'/requests/' + row.id} key={row.id}>
        <span className="recent-icon"><FileText size={22}/></span>
        <span className="recent-title"><strong>{row.title}</strong><small><bdi>{row.trackingCode}</bdi></small></span>
        <Status status={row.status}/><ChevronLeft size={17} className="recent-chevron"/>
      </Link>)}
  </section>;
}

export function Dashboard() {
  const me = useMe();
  const catalog = useCatalog();
  const categories = new Set(catalog.data?.data.map(service => service.categorySlug));
  const tiles = shortcuts.filter(([, target]) => target.startsWith('/') || categories.has(target));

  return <div className="civic-dashboard">
    <div className="civic-center">
      <div className="civic-mobile-greeting">
        <strong>سلام {me.data?.displayName || 'همشهری عزیز'} <span aria-hidden="true">👋</span></strong>
        <span>به تربت من خوش آمدید</span>
      </div>
      <section className="civic-hero" aria-labelledby="city-hero-title">
        <img src={cityHero} alt="" fetchPriority="high"/>
        <div className="hero-copy">
          <h1 id="city-hero-title">تربت من</h1>
          <p>همه خدمات شهر در یک سامانه</p>
        </div>
      </section>
      <div className="civic-actions">
        <Link to="/new?kind=city_report" className="civic-action civic-action-report" aria-label="گزارش مشکل شهری؛ مشکلی در شهر دارم">
          <Megaphone size={42} strokeWidth={1.75}/>
          <span><strong>گزارش مشکل شهری</strong><small>ثبت و پیگیری مشکلات شهر</small></span>
          <ChevronLeft size={22} className="civic-action-arrow"/>
        </Link>
        <Link to="/services?workflow=admin_request" className="civic-action civic-action-office">
          <FileText size={42} strokeWidth={1.75}/>
          <span><strong>کار اداری دارم</strong><small>ثبت و پیگیری درخواست اداری</small></span>
          <ChevronLeft size={22} className="civic-action-arrow"/>
        </Link>
      </div>
      <section className="civic-surface civic-shortcuts">
        <div className="civic-section-title">
          <h2>خدمات پرکاربرد</h2>
          <Link to="/services">مشاهده همه خدمات <ChevronLeft size={15}/></Link>
        </div>
        {catalog.isError && <Alert>دریافت خدمات ممکن نشد. <button onClick={() => catalog.refetch()}>تلاش دوباره</button></Alert>}
        {catalog.isPending && <p className="civic-caption" role="status">در حال دریافت خدمات…</p>}
        <div className="civic-shortcut-grid">{tiles.map(([label, target, Icon]) => <Link
          className="service-tile civic-tile" key={label}
          to={target.startsWith('/') ? target : '/services?category=' + target}>
          <Icon size={27} strokeWidth={1.8}/><strong>{label}</strong>
        </Link>)}</div>
      </section>
      <div className="civic-lower">
        <RecentRequests/>
        <section className="civic-surface civic-assistant">
          <div className="civic-section-title"><h2>دستیار تربت من</h2><span className="civic-demo-chip">آزمایشی</span></div>
          <div className="assistant-preview"><span className="assistant-mascot"><Bot aria-hidden="true" size={42}/></span>
            <Link to="/assistant" className="assistant-start"><Search size={18}/> سوال خود را بپرسید <ChevronLeft size={17}/></Link>
          </div>
          <div className="assistant-suggestions">
            <Link to="/services?workflow=admin_request">چه خدمات اداری در دسترس است؟ <ChevronLeft size={15}/></Link>
            <Link to="/requests">وضعیت درخواستم چیست؟ <ChevronLeft size={15}/></Link>
            <Link to="/services/bakery-finder">از کجا نانوایی پیدا کنم؟ <ChevronLeft size={15}/></Link>
          </div>
        </section>
      </div>
    </div>
    <aside className="civic-rail">
      <Link to="/services/saffron" className="civic-surface city-identifier">
        <span><MapPin size={19}/> تربت حیدریه</span>
        <strong>شهر زعفران</strong>
        <span>راهنمای زعفران تربت <ChevronLeft size={16}/></span>
      </Link>
      <section className="civic-surface city-map">
        <div className="civic-section-title"><h2><MapIcon size={20}/> نقشه شهر</h2></div>
        <MapPreview/>
        <Link className="button outline" to="/city-map">مشاهده نقشه کامل <ChevronLeft size={16}/></Link>
      </section>
      <CityNews compact/>
    </aside>
    <Link to="/services/saffron" className="civic-mobile-city"><Sparkles size={25}/><span><strong>تربت حیدریه</strong><small>راهنمای زعفران تربت</small></span><ChevronLeft size={20}/></Link>
  </div>;
}
