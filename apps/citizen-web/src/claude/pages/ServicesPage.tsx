import { Link, useSearchParams } from 'react-router';
import { useEffect, useMemo, useState } from 'react';
import { BriefcaseBusiness, Bus, ChevronLeft, GraduationCap, HeartPlus, LayoutGrid, List, MapPinned, ShoppingCart } from 'lucide-react';
import { categories, allServices } from '../data/services';
import { matchesQuery, normalizeFa } from '../lib/normalize';
import { CategorySection, EmptyState, PageHeader, SearchField, ServiceCard } from '../components/ui';
import { ReferenceIcon } from '../components/ReferenceIcon';

const SCROLL_KEY = 'tn.services.scroll';
const baseCategories = new Map(categories.map(category => [category.id, category]));
const listItems = [
  { id: 'city', title: 'خدمات شهری', detail: 'فضای سبز، روشنایی، نظافت و معابر', path: '/categories/city', filter: 'شهری', icon: baseCategories.get('city')!.icon },
  { id: 'daily', title: 'زندگی روزمره', detail: 'خرید، نان، بازار و نیازهای روزانه', path: '/categories/daily', filter: 'روزمره', icon: ShoppingCart },
  { id: 'guilds', title: 'اصناف و اقتصاد', detail: 'کسب‌وکارها، امکانات و مجوزها', path: '/categories/economy', filter: 'اداری', icon: BriefcaseBusiness },
  { id: 'health', title: 'سلامت و بهداشت', detail: 'مراکز درمانی و خدمات سلامت', path: '/services/health', filter: 'سلامت', icon: HeartPlus },
  { id: 'bus', title: 'حمل‌ونقل و تردد', detail: 'اتوبوس، ایستگاه‌ها و مسیرها', path: '/services/bus', filter: 'حمل‌ونقل', icon: Bus },
  { id: 'education', title: 'آموزش و فرهنگ', detail: 'مدارس، آموزش و رویدادها', path: '/categories/family', filter: 'فرهنگی', icon: GraduationCap },
  { id: 'tourism', title: 'تربت‌گرد (گردشگری)', detail: 'دیدنی‌ها و راهنمای سفر', path: '/services/tourism', filter: 'فرهنگی', icon: MapPinned },
] as const;

export default function ServicesPage() {
  const [query, setQuery] = useState('');
  const [params, setParams] = useSearchParams();
  const isList = params.get('view') === 'list';
  const [tab, setTab] = useState('همه');
  const [debounced, setDebounced] = useState('');
  useEffect(() => { const t = setTimeout(() => setDebounced(query), 120); return () => clearTimeout(t); }, [query]);

  // Restore scroll when coming back from a category/service page.
  useEffect(() => {
    const y = Number(sessionStorage.getItem(SCROLL_KEY) || 0);
    if (y) requestAnimationFrame(() => window.scrollTo(0, y));
    const save = () => sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
    window.addEventListener('scroll', save, { passive: true });
    return () => { save(); window.removeEventListener('scroll', save); };
  }, []);

  const q = normalizeFa(debounced);
  const results = useMemo(() => {
    if (!q) return [];
    return allServices.filter((s) => matchesQuery(`${s.title} ${s.category.title} ${s.provider}`, q));
  }, [q]);

  return (
    <main className={`page-enter ref-services ${isList ? 'ref-services-list' : 'ref-services-dashboard'}`}>
      <PageHeader title="همه خدمات" subtitle={isList ? '' : 'دسته‌بندی کامل خدمات تربتینو'} tone={isList ? 'plain' : 'purple'}>
        <SearchField value={query} onChange={setQuery} />
      </PageHeader>
      <div className="content" aria-live="polite">
        <div className="ref-services-tools">
          <button className="ref-layout-toggle" type="button" onClick={() => setParams(isList ? {} : { view: 'list' }, { replace: true })}>
            {isList ? <><LayoutGrid size={16}/>نمای کارت‌ها</> : <><List size={16}/>نمای فهرست</>}
          </button>
        </div>
        {isList ? <>
          <div className="chips ref-filter-row" role="group" aria-label="دسته خدمات">{['همه', 'شهری', 'حمل‌ونقل', 'سلامت', 'اداری', 'روزمره', 'فرهنگی'].map(item =>
            <button className={`chip${tab === item ? ' on' : ''}`} key={item} type="button" aria-pressed={tab === item} onClick={() => setTab(item)}>{item}</button>)}</div>
          <div className="ref-service-rows">{listItems.filter(item => (tab === 'همه' || tab === item.filter) && (!q || matchesQuery(item.title + ' ' + item.detail, q))).map(item =>
            <Link key={item.id} className="rrow ref-service-row" to={item.path}>
              <span className="rico ref-round"><ReferenceIcon name={item.id} fallback={item.icon}/></span>
              <span className="rtxt"><strong>{item.title}</strong><small>{item.detail}</small></span>
              <ChevronLeft size={18}/>
            </Link>)}</div>
        </> : q ? (
          results.length ? (
            <section className="panel lilac" aria-label="نتایج جست‌وجو">
              <p className="sr-only">{results.length} نتیجه یافت شد</p>
              <div className="grid">{results.map((s) => <ServiceCard key={s.id} service={s} />)}</div>
            </section>
          ) : (
            <EmptyState title="نتیجه‌ای پیدا نشد" text="عبارت دیگری را امتحان کنید؛ مثلاً نام خدمت یا سازمان." />
          )
        ) : (
          categories.map((c) => <CategorySection key={c.id} category={c} />)
        )}
        <Link to="/catalog" className="btn-soft">کاتالوگ سامانه و وضعیت ثبت خدمات</Link>
      </div>
    </main>
  );
}
