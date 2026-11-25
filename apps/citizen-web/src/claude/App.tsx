import NobatinoPage from './nobatino/NobatinoPage';
import EnergyPage from './energy/EnergyPage';
import { useEffect } from 'react';
import { publicDemoQuery } from './lib/backend';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { Navigate, Route, Routes, useSearchParams } from 'react-router';
import { BottomNavigation } from './components/ui';
import ServicesPage from './pages/ServicesPage';
import { GuidePage, ReportsMapPage, MyReportsPage, NewReportPage, ReportDetailPage, ShahrbinHome, SuccessPage } from './shahrbin/pages';
import { WelcomePage, SearchPage, NotificationsPage, LoginPage, VerifyPage, ProfileSetupPage, AccountPage, EditProfilePage, FavoritesPage, SettingsPage, PrivacyPage, SupportPage } from './app/pages';
import { ReferenceHome } from './pages/ReferenceHome';
import { MorePage, TermsPage } from './pages/MorePage';
import { LiveCatalog, LiveService, CityAnnouncements } from './services/catalog';
import { session } from './state/session';

const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 5000 } } });
function LegacyNew() {
  const [params] = useSearchParams();
  const service = params.get('service');
  return <Navigate to={service ? '/catalog/' + encodeURIComponent(service) + '?action=new' : '/shahrbin/new'} replace/>;
}
import { CategoryPage, NotFound, ServiceDetailPage, ServiceItemPage } from './pages/OtherPages';

function PublicDemoBanner() {
  const mode = useQuery(publicDemoQuery);
  return mode.data?.publicDemo
    ? <p className="demo-note" role="note">محیط عمومی آزمایشی · حساب‌ها و گزارش‌ها مشترک‌اند. فقط اطلاعات ساختگی وارد کنید.</p>
    : null;
}

export default function App() {
  useEffect(() => {
    const controller = new AbortController();
    void session.restore(controller.signal);
    return () => controller.abort();
  }, []);
  return (
    <QueryClientProvider client={client}>
    <div className="shell ref-shell">
      <PublicDemoBanner />
      <Routes>
        <Route path="/nobatino/*" element={<NobatinoPage/>}/>
        <Route path="/services/nobatino" element={<Navigate to="/nobatino" replace/>}/>
        <Route path="/energy/*" element={<EnergyPage/>}/>
        <Route path="/services/energy" element={<Navigate to="/energy" replace/>}/>
        <Route path="/" element={<ReferenceHome />} />
        <Route path="/more" element={<MorePage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/welcome" element={<WelcomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/login/verify" element={<VerifyPage />} />
        <Route path="/login/profile" element={<ProfileSetupPage />} />
        <Route path="/account/edit" element={<EditProfilePage />} />
        <Route path="/account/favorites" element={<FavoritesPage />} />
        <Route path="/account/settings" element={<SettingsPage />} />
        <Route path="/account/privacy" element={<PrivacyPage />} />
        <Route path="/account/support" element={<SupportPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/services/shahrbin" element={<ShahrbinHome />} />
        <Route path="/shahrbin/map" element={<ReportsMapPage />} />
        <Route path="/shahrbin/guide" element={<GuidePage />} />
        <Route path="/shahrbin/new" element={<NewReportPage />} />
        <Route path="/shahrbin/success/:code" element={<SuccessPage />} />
        <Route path="/shahrbin/reports/:code" element={<ReportDetailPage />} />
        <Route path="/shahrbin" element={<Navigate to="/services/shahrbin" replace />} />
        <Route path="/services/:id" element={<ServiceDetailPage />} />
        <Route path="/services/:id/:itemId" element={<ServiceItemPage />} />
        <Route path="/categories/:id" element={<CategoryPage />} />
        <Route path="/requests" element={<MyReportsPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/catalog" element={<LiveCatalog />} />
        <Route path="/catalog/:slug" element={<LiveService />} />
        <Route path="/services/digital" element={<LiveCatalog office />} />
        <Route path="/new" element={<LegacyNew />} />
        <Route path="/requests/:code" element={<ReportDetailPage />} />
        <Route path="/city-map" element={<ReportsMapPage />} />
        <Route path="/city-news" element={<CityAnnouncements />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/assistant" element={<Navigate to="/services/assistant" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <BottomNavigation />
    </div>
    </QueryClientProvider>
  );
}
