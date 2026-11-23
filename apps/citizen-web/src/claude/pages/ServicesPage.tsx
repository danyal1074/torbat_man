import { Link } from 'react-router';
import { useEffect, useMemo, useState } from 'react';
import { categories, allServices } from '../data/services';
import { matchesQuery, normalizeFa } from '../lib/normalize';
import { CategorySection, EmptyState, PageHeader, SearchField, ServiceCard } from '../components/ui';

const SCROLL_KEY = 'tn.services.scroll';

export default function ServicesPage() {
  const [query, setQuery] = useState('');
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
    <main className="page-enter">
      <PageHeader title="همه خدمات" subtitle="دسته‌بندی کامل خدمات تربتینو">
        <SearchField value={query} onChange={setQuery} />
      </PageHeader>
      <div className="content" aria-live="polite">
        {q ? (
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
