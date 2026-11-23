import { Link, Navigate, useParams } from 'react-router';
import { Heart } from 'lucide-react';
import { directories } from '../demo/directory';
import { AnalyticsPage, AssistantPage, BusPage, CityServicePage, DirectoryDetailPage, DirectoryPage, JobDetailPage, JobsPage, ShopPage, SmartSearchPage } from '../services/pages';
import { useDisabledServices } from '../state/notifications';
import { favStore, useFavorites, useUser } from '../state/session';
import { allServices, categories } from '../data/services';
import { EmptyState, PageHeader, ServiceCard } from '../components/ui';

export function CategoryPage() {
  const { id } = useParams();
  const c = categories.find((x) => x.id === id);
  if (!c) return <NotFound />;
  return (
    <main className="page-enter">
      <PageHeader title={c.title} subtitle={c.description} />
      <div className="detail" style={{ maxWidth: 'var(--content-max)', marginTop: -28, position: 'relative' }}>
        <section className={`panel ${c.tone}`}><div className="grid">{c.services.map((s) => <ServiceCard key={s.id} service={s} />)}</div></section>
      </div>
    </main>
  );
}

export function ServiceDetailPage() {
  const { id } = useParams();
  const s = allServices.find((x) => x.id === id);
  const off = useDisabledServices().includes(id ?? '');
  const favs = useFavorites(); const user = useUser();
  if (!s) return <Navigate to={'/catalog/' + encodeURIComponent(id ?? '')} replace/>;
  const Icon = s.icon; const isFav = favs.includes(s.id);
  if (off || s.status === 'soon') {
    return (
      <main className="page-enter">
        <PageHeader title={s.title} subtitle={s.category.title} />
        <div className="detail" style={{ marginTop: -28, position: 'relative' }}>
          <section className="panel">
            <span className="ico-wrap state" style={{ padding: 0 }}><span className="ico-wrap"><Icon size={32} aria-hidden="true" /></span></span>
            <h2 style={{ margin: 0 }}>{s.title}</h2>
            <span className="badge soon">{off ? 'موقتاً غیرفعال' : 'به‌زودی'}</span>
            <p style={{ margin: 0, color: 'var(--c-text-2)' }}>{off ? 'این خدمت توسط مدیر سامانه موقتاً غیرفعال شده است.' : 'این خدمت هنوز راه‌اندازی نشده است.'}</p>
            <Link className="btn" to="/services">بازگشت به همه خدمات</Link>
          </section>
        </div>
      </main>
    );
  }
  return (
    <ServiceBody id={s.id}>
      <div className="fav-row">
        {user ? (
          <button type="button" className="btn-soft" aria-pressed={isFav} onClick={() => favStore.toggle(s.id)}>
            <Heart size={18} fill={isFav ? 'currentColor' : 'none'} aria-hidden="true" />{isFav ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}</button>
        ) : <Link className="btn-soft" to="/login"><Heart size={18} aria-hidden="true" />برای نشان‌کردن وارد شوید</Link>}
      </div>
    </ServiceBody>
  );
}

function ServiceBody({ id, children }: { id: string; children: React.ReactNode }) {
  let body: React.ReactNode;
  if (directories[id]) body = <DirectoryPage id={id} />;
  else if (['green-space', 'lighting', 'roads', 'waste'].includes(id)) body = <CityServicePage id={id} />;
  else if (id === 'bus') body = <BusPage />;
  else if (id === 'shop') body = <ShopPage />;
  else if (id === 'jobs') body = <JobsPage />;
  else if (id === 'analytics') body = <AnalyticsPage />;
  else if (id === 'assistant') body = <AssistantPage />;
  else if (id === 'smart-search') body = <SmartSearchPage />;
  else body = <NotFound />;
  return (<>{body}<div className="below-sheet">{children}</div></>);
}

export function ServiceItemPage() {
  const { id = '' } = useParams();
  if (id === 'digital') return <Navigate to='/services/digital' replace/>;
  if (id === 'jobs') return <JobDetailPage />;
  if (directories[id]) return <DirectoryDetailPage id={id} />;
  return <NotFound />;
}

export function Placeholder({ title }: { title: string }) {
  return (
    <main className="page-enter">
      <PageHeader title={title} subtitle="شهر تو، همراه تو" />
      <div className="detail" style={{ marginTop: -28, position: 'relative' }}>
        <section className="panel"><span className="badge soon">در نوبت بازطراحی</span><p style={{ margin: 0, color: 'var(--c-text-2)' }}>این صفحه در فازهای بعدی بازطراحی می‌شود.</p><Link className="btn" to="/services">همه خدمات</Link></section>
      </div>
    </main>
  );
}

export function NotFound() {
  return (
    <main className="page-enter">
      <PageHeader title="صفحه پیدا نشد" subtitle="۴۰۴" />
      <EmptyState title="این صفحه وجود ندارد" text="ممکن است نشانی تغییر کرده باشد." action={<Link className="btn" to="/services">بازگشت به همه خدمات</Link>} />
    </main>
  );
}
