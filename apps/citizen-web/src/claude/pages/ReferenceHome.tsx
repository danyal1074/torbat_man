import { useState } from 'react';
import {
  ArrowUpRight, Briefcase, Building2, Bus, Camera, ChevronLeft, ClipboardList, Cpu,
  GraduationCap, HeartPlus, MapPinned, Search, ShoppingCart, Sprout, Store, UserRound, Users, Wheat,
} from 'lucide-react';
import { Link } from 'react-router';
import { Brand } from '../components/ui';
import { ReferenceIcon } from '../components/ReferenceIcon';
import { useReportCollection } from '../shahrbin/model';
import { StatusBadge } from '../shahrbin/parts';
import { useUser } from '../state/session';

const categories = [
  { name: 'city', label: 'خدمات شهری', to: '/categories/city', icon: Building2, tone: 'purple' },
  { name: 'bread', label: 'نان من', to: '/services/bread', icon: Wheat, tone: 'gold' },
  { name: 'bus', label: 'اتوبوس من', to: '/services/bus', icon: Bus, tone: 'purple' },
  { name: 'health', label: 'سلامت من', to: '/services/health', icon: HeartPlus, tone: 'pink' },
  { name: 'guilds', label: 'اصناف', to: '/services/guilds', icon: Store, tone: 'gold' },
  { name: 'bazaar', label: 'بازار تربت', to: '/services/bazaar', icon: ShoppingCart, tone: 'pink' },
  { name: 'digital', label: 'کار اداری', to: '/services/digital', icon: Briefcase, tone: 'purple' },
  { name: 'tourism', label: 'تربت‌گرد', to: '/services/tourism', icon: MapPinned, tone: 'purple' },
  { name: 'farmer', label: 'کشاورزی', to: '/services/farmer', icon: Sprout, tone: 'green' },
  { name: 'education', label: 'آموزش', to: '/services/education', icon: GraduationCap, tone: 'blue' },
  { name: 'my-family', label: 'خانواده', to: '/services/my-family', icon: Users, tone: 'pink' },
  { name: 'smart', label: 'هوشمندسازی', to: '/categories/smart', icon: Cpu, tone: 'purple' },
];

const shortcuts = [
  { name: 'shahrbin', label: 'شهربین', to: '/services/shahrbin', icon: Camera },
  { name: 'tracking', label: 'پیگیری', to: '/requests', icon: ClipboardList },
  { name: 'bread', label: 'نانوایی‌ها', to: '/services/bread', icon: Wheat },
  { name: 'tourism', label: 'نقشه شهر', to: '/city-map', icon: MapPinned },
];

const highlights = [
  { title: 'شهر تو، همراه تو', text: 'خدمات شهری در یک جا', to: '/services' },
  { title: 'شهر را بهتر کنیم', text: 'ثبت و پیگیری مشکلات شهر', to: '/services/shahrbin' },
  { title: 'تربت را بگرد', text: 'نقشه و راهنمای شهر', to: '/city-map' },
];

export function ReferenceHome() {
  const [slide, setSlide] = useState(0);
  const highlight = highlights[slide];
  const user = useUser();
  const cases = useReportCollection();
  const latest = cases.data?.records[0];

  return <main className="page-enter ref-home">
    <header className="ref-home-header">
      <Brand/>
      <div className="ref-home-tools">
        <Link to="/search" aria-label="جست‌وجوی خدمت"><Search size={23}/></Link>
        <Link to="/account" aria-label="پروفایل"><UserRound size={23}/></Link>
      </div>
    </header>
    <div className="ref-home-body">
      <section aria-label="معرفی تربتینو" className="ref-highlights">
        <Link className="ref-banner" to={highlight.to}>
          <span className="ref-banner-arrow"><ChevronLeft size={21}/></span>
          <span className="ref-banner-text" key={slide}>
            <h1>{highlight.title}</h1><span>{highlight.text}</span>
          </span>
          <img src="/torbatino-mark.svg" alt="" width="76" height="76"/>
        </Link>
        <div className="ref-carousel-dots" aria-label="اسلایدها">
          {highlights.map((item, index) => <button key={item.to} type="button" onClick={() => setSlide(index)}
            aria-label={item.title} aria-pressed={slide === index}><span/></button>)}
        </div>
      </section>
      <Link className="nb-home-entry" to="/nobatino"><ClipboardList size={26}/><span><strong>نوبتینو</strong><small>وقتت ارزش داره؛ زمان مناسب خودت را پیدا کن</small></span><ChevronLeft size={20}/></Link>
      <Link className="energy-home-entry" to="/energy"><Sprout size={26}/><span><strong>انرژی من</strong><small>انرژی‌یار؛ یک قدم کوچک برای خانه و شهر</small></span><ChevronLeft size={20}/></Link>
      <section className="ref-home-section" aria-labelledby="ref-home-categories">
        <div className="ref-section-head">
          <h2 id="ref-home-categories">دسته‌بندی خدمات</h2>
          <Link to="/services">مشاهده همه <ChevronLeft size={16}/></Link>
        </div>
        <div className="ref-home-grid">{categories.map(item => <Link key={item.name} to={item.to}>
          <span className={'ref-round ref-tone-' + item.tone}><ReferenceIcon name={item.name} fallback={item.icon} size={29}/></span>
          <strong>{item.label}</strong>
        </Link>)}</div>
      </section>
      <section className="ref-home-section" aria-labelledby="ref-home-popular">
        <div className="ref-section-head"><h2 id="ref-home-popular">خدمات پرکاربرد</h2></div>
        <div className="ref-shortcut-grid">{shortcuts.map(item => <Link key={item.name} to={item.to}>
          <ReferenceIcon name={item.name} fallback={item.icon} size={28}/><strong>{item.label}</strong>
        </Link>)}</div>
      </section>
      <Link className="ref-recent" to={latest ? '/shahrbin/reports/' + latest.id : '/requests'}>
        <ClipboardList className="ref-recent-icon" size={28}/>
        <span className="rtxt"><strong>آخرین درخواست من</strong><small>{latest?.title ?? (user ? 'مشاهده و پیگیری درخواست‌ها' : 'برای دیدن وضعیت وارد شوید')}</small></span>
        {latest && <StatusBadge status={latest.status}/>}
        <ChevronLeft size={19} className="ref-row-caret"/>
      </Link>
      <Link className="ref-more-link" to="/more">بیشتر <ArrowUpRight size={15}/></Link>
    </div>
  </main>;
}
