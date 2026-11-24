import { useState } from 'react';
import { Logo, Dialog } from '@torbat/ui';
import { LayoutDashboard, ClipboardList, Layers, Megaphone, MessageSquare, LogOut } from 'lucide-react';
import { StaffAuthProvider, useStaffAuth } from './context/StaffAuthContext';
import { StaffLoginPage } from './pages/StaffLoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { CartablePage } from './pages/CartablePage';
import { CaseDetailPage } from './pages/CaseDetailPage';
import { ServicesManagementPage } from './pages/ServicesManagementPage';
import { AnnouncementsManagementPage } from './pages/AnnouncementsManagementPage';

import { FeedbackInboxPage } from './pages/FeedbackInboxPage';

const tabs = [
  { id: 'dashboard', label: 'داشبورد پایش', icon: LayoutDashboard },
  { id: 'cartable', label: 'کارتابل پرونده‌ها', icon: ClipboardList },
  { id: 'services', label: 'مدیریت خدمات', icon: Layers },
  { id: 'announcements', label: 'اطلاعیه‌ها', icon: Megaphone },
  { id: 'feedback', label: 'پیام‌های پشتیبانی', icon: MessageSquare },
] as const;
type AdminTab = typeof tabs[number]['id'];

const privateDemoAccounts = [
  { mobile: '09130000002', label: 'مسئول ارجاع شهرداری' },
  { mobile: '09130000001', label: 'کارشناس شهرداری' },
  { mobile: '09140000002', label: 'مسئول ارجاع آبفا' },
  { mobile: '09150000002', label: 'مسئول ارجاع برق' },
  { mobile: '09100000000', label: 'مدیر سامانه' },
];

function AdminContent() {
  const { staff, isLoading, logout, loginAsDemoStaff, publicDemo, demoAccounts } = useStaffAuth();
  const [currentTab, setCurrentTab] = useState<AdminTab>('dashboard');
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [cartableStatusFilter, setCartableStatusFilter] = useState<string | undefined>(undefined);
  const [showSwitchModal, setShowSwitchModal] = useState(false);

  const [switching, setSwitching] = useState(false);
  const [switchError, setSwitchError] = useState('');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] text-slate-400 text-xs font-bold">
        در حال بررسی دسترسی سازمانی...
      </div>
    );
  }

  if (!staff) {
    return <StaffLoginPage />;
  }

  const isPlatformAdmin = staff.platformRole === 'platform_admin';
  const isOrgManager = staff.memberships.some(membership => membership.role === 'org_manager');
  const permissions: Record<AdminTab, boolean> = {
    dashboard: isPlatformAdmin || staff.memberships.length > 0,
    cartable: isPlatformAdmin || staff.memberships.length > 0,
    services: isPlatformAdmin || isOrgManager,
    announcements: isPlatformAdmin || isOrgManager || staff.platformRole === 'content_editor',
    feedback: isPlatformAdmin || staff.platformRole === 'support_agent',
  };
  const visibleTabs = tabs.filter(tab => permissions[tab.id]);
  const activeTab = permissions[currentTab] ? currentTab : visibleTabs[0]?.id;

  const switchAccount = async (mobile: string) => {
    setSwitching(true);
    setSwitchError('');
    try {
      await loginAsDemoStaff(mobile);
      setActiveCaseId(null);
      setCartableStatusFilter(undefined);
      setCurrentTab('dashboard');
      setShowSwitchModal(false);
    } catch (error) {
      setSwitchError(error instanceof Error ? error.message : 'تغییر حساب انجام نشد.');
    } finally {
      setSwitching(false);
    }
  };

  const handleNavigateCartable = (filterStatus?: string) => {
    setActiveCaseId(null);
    setCartableStatusFilter(filterStatus);
    setCurrentTab('cartable');
  };

  const handleNavigateCase = (id: string) => {
    setActiveCaseId(id);
    setCurrentTab('cartable');
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-800 flex flex-col font-sans selection:bg-purple-100 selection:text-purple-900">
      
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-2 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 lg:gap-6">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => {
              setActiveCaseId(null);
              setCurrentTab('dashboard');
            }}
          >
            <Logo variant="horizontal" size={32} />
            <span className="hidden sm:inline-block text-xs font-black text-purple-900 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
              میز کار سازمانی
            </span>
          </div>

          <nav aria-label="بخش‌های پنل" className="flex flex-wrap items-center gap-1 text-xs">
            {visibleTabs.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" aria-current={activeTab === id ? 'page' : undefined}
                onClick={() => {
                  setActiveCaseId(null);
                  setCartableStatusFilter(undefined);
                  setCurrentTab(id);
                }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-colors ${activeTab === id
                  ? 'bg-purple-50 text-purple-800 border border-purple-200'
                  : 'text-slate-600 hover:bg-slate-100'}`}>
                <Icon size={16} aria-hidden="true" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* User Info & Switcher */}
        <div className="flex items-center gap-3">
          <div className="text-left hidden md:block">
            <div className="text-xs font-bold text-slate-800">{staff.displayName}</div>
            <div className="text-[11px] text-purple-700 font-semibold">
              {staff.platformRole === 'platform_admin'
                ? 'مدیر ارشد سامانه'
                : staff.memberships[0]?.orgName || 'کارشناس سازمان'}
            </div>
          </div>

          <button
            onClick={() => { setSwitchError(''); setShowSwitchModal(true); }}
            className="text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-2.5 py-1.5 rounded-xl border border-purple-200 transition-colors"
          >
            تغییر نقش
          </button>

          <button
            onClick={logout}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            title="خروج از کارتابل"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {publicDemo && (
        <p className="bg-purple-50 px-4 py-2 text-center text-xs font-bold text-purple-950">
          محیط عمومی آزمایشی تربتینو · فقط دادهٔ ساختگی وارد کنید.
        </p>
      )}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8">
        {activeTab === 'dashboard' && (
          <DashboardPage
            onNavigateCartable={handleNavigateCartable}
            onNavigateCase={handleNavigateCase}
          />
        )}

        {activeTab === 'cartable' && !activeCaseId && (
          <CartablePage
            initialStatus={cartableStatusFilter}
            onNavigateCase={handleNavigateCase}
          />
        )}

        {activeTab === 'cartable' && activeCaseId && (
          <CaseDetailPage
            id={activeCaseId}
            onBack={() => setActiveCaseId(null)}
          />
        )}

        {activeTab === 'services' && (
          <ServicesManagementPage />
        )}

        {activeTab === 'announcements' && (
          <AnnouncementsManagementPage />
        )}
        {activeTab === 'feedback' && <FeedbackInboxPage />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-400">
        سامانه جامع «تربتینو» • شهر تو، همراه تو • توسعه‌یافته توسط شرکت نوادید شرق (دیجیرال)
      </footer>

      {/* Fast Demo Role Switcher Dialog */}
      <Dialog
        isOpen={showSwitchModal}
        onClose={() => setShowSwitchModal(false)}
        title="تغییر سریع حساب کاربری و نقش سازمانی"
      >
        <div className="space-y-3 pt-2 text-xs">
          <p className="text-slate-600">حساب نمونه‌ای را انتخاب کنید که می‌خواهید با دسترسی آن کار کنید.</p>
          {switchError && <p role="alert" className="text-rose-700">{switchError}</p>}
          <div className="grid gap-2 sm:grid-cols-2">
            {(publicDemo ? demoAccounts : privateDemoAccounts).map(account => (
              <button key={account.mobile} type="button" disabled={switching}
                className="rounded-xl border border-purple-200 bg-purple-50 p-3 text-right font-bold text-purple-950 hover:bg-purple-100 disabled:opacity-60"
                onClick={() => void switchAccount(account.mobile)}>
                {account.label}
              </button>
            ))}
          </div>
        </div>
      </Dialog>
    </div>
  );
}

export function App() {
  return (
    <StaffAuthProvider>
      <AdminContent />
    </StaffAuthProvider>
  );
}

export default App;
