import React, { useState } from 'react';
import { Logo, Button, Dialog } from '@torbat/ui';
import {
  LayoutDashboard,
  ClipboardList,
  Layers,
  Megaphone,
  LogOut,
  User,
  ShieldCheck,
  Building2,
  RefreshCw,
  Droplet,
  Zap,
  Lock,
} from 'lucide-react';
import { StaffAuthProvider, useStaffAuth } from './context/StaffAuthContext';
import { StaffLoginPage } from './pages/StaffLoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { CartablePage } from './pages/CartablePage';
import { CaseDetailPage } from './pages/CaseDetailPage';
import { ServicesManagementPage } from './pages/ServicesManagementPage';
import { AnnouncementsManagementPage } from './pages/AnnouncementsManagementPage';

type AdminTab = 'dashboard' | 'cartable' | 'services' | 'announcements';

function AdminContent() {
  const { staff, isLoading, logout, loginAsDemoStaff } = useStaffAuth();
  const [currentTab, setCurrentTab] = useState<AdminTab>('dashboard');
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [cartableStatusFilter, setCartableStatusFilter] = useState<string | undefined>(undefined);
  const [showSwitchModal, setShowSwitchModal] = useState(false);

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
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 lg:px-8 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-6">
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

          {/* Navigation Links */}
          <nav className="flex items-center gap-1 text-xs">
            <button
              onClick={() => {
                setActiveCaseId(null);
                setCurrentTab('dashboard');
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-colors ${
                currentTab === 'dashboard'
                  ? 'bg-purple-50 text-purple-800 border border-purple-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <LayoutDashboard size={16} />
              <span>داشبورد پایش</span>
            </button>

            <button
              onClick={() => {
                setActiveCaseId(null);
                setCartableStatusFilter(undefined);
                setCurrentTab('cartable');
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-colors ${
                currentTab === 'cartable'
                  ? 'bg-purple-50 text-purple-800 border border-purple-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ClipboardList size={16} />
              <span>کارتابل پرونده‌ها</span>
            </button>

            <button
              onClick={() => {
                setActiveCaseId(null);
                setCurrentTab('services');
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-colors ${
                currentTab === 'services'
                  ? 'bg-purple-50 text-purple-800 border border-purple-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Layers size={16} />
              <span className="hidden sm:inline">مدیریت خدمات</span>
            </button>

            <button
              onClick={() => {
                setActiveCaseId(null);
                setCurrentTab('announcements');
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-colors ${
                currentTab === 'announcements'
                  ? 'bg-purple-50 text-purple-800 border border-purple-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Megaphone size={16} />
              <span className="hidden sm:inline">اطلاعیه‌ها</span>
            </button>
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
            onClick={() => setShowSwitchModal(true)}
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

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8">
        {currentTab === 'dashboard' && (
          <DashboardPage
            onNavigateCartable={handleNavigateCartable}
            onNavigateCase={handleNavigateCase}
          />
        )}

        {currentTab === 'cartable' && !activeCaseId && (
          <CartablePage
            initialStatus={cartableStatusFilter}
            onNavigateCase={handleNavigateCase}
          />
        )}

        {currentTab === 'cartable' && activeCaseId && (
          <CaseDetailPage
            id={activeCaseId}
            onBack={() => setActiveCaseId(null)}
          />
        )}

        {currentTab === 'services' && (
          <ServicesManagementPage />
        )}

        {currentTab === 'announcements' && (
          <AnnouncementsManagementPage />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-400">
        سامانه جامع «تربت نو» • شهر تو، همراه تو • توسعه‌یافته توسط شرکت نوادید شرق (دیجیرال)
      </footer>

      {/* Fast Demo Role Switcher Dialog */}
      <Dialog
        isOpen={showSwitchModal}
        onClose={() => setShowSwitchModal(false)}
        title="تغییر سریع حساب کاربری و نقش سازمانی"
      >
        <div className="space-y-3 pt-2 text-xs">
          <p className="text-slate-600">
            برای آزمودن اختیارات سطوح مختلف (ارجاع، اقدام فنی، انتقال بین ادارات یا مدیریت کل):
          </p>

          <div className="space-y-2">
            <button
              onClick={() => {
                loginAsDemoStaff('09130000002');
                setShowSwitchModal(false);
              }}
              className="w-full text-right p-3 rounded-xl border border-purple-200 bg-purple-50/70 hover:bg-purple-100 flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <Building2 size={16} className="text-purple-700" />
                <div>
                  <div className="font-bold text-purple-950">مسئول ارجاع شهرداری</div>
                  <div className="text-[10px] text-purple-700">09130000002 (دسترسی تریاژ و ارجاع)</div>
                </div>
              </div>
              <span className="font-bold text-purple-700">ورود ←</span>
            </button>

            <button
              onClick={() => {
                loginAsDemoStaff('09130000001');
                setShowSwitchModal(false);
              }}
              className="w-full text-right p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <Building2 size={16} className="text-slate-700" />
                <div>
                  <div className="font-bold text-slate-800">کارشناس عملیات شهرداری</div>
                  <div className="text-[10px] text-slate-500">09130000001 (حل پرونده و اقدام فنی)</div>
                </div>
              </div>
              <span className="font-bold text-slate-600">ورود ←</span>
            </button>

            <button
              onClick={() => {
                loginAsDemoStaff('09140000002');
                setShowSwitchModal(false);
              }}
              className="w-full text-right p-3 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100 flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <Droplet size={16} className="text-blue-600" />
                <div>
                  <div className="font-bold text-blue-950">مسئول ارجاع آب و فاضلاب</div>
                  <div className="text-[10px] text-blue-700">09140000002 (کارتابل حوادث آبفا)</div>
                </div>
              </div>
              <span className="font-bold text-blue-700">ورود ←</span>
            </button>

            <button
              onClick={() => {
                loginAsDemoStaff('09150000002');
                setShowSwitchModal(false);
              }}
              className="w-full text-right p-3 rounded-xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100 flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <Zap size={16} className="text-amber-600" />
                <div>
                  <div className="font-bold text-amber-950">مسئول ارجاع توزیع برق</div>
                  <div className="text-[10px] text-amber-700">09150000002 (کارتابل روشنایی و برق)</div>
                </div>
              </div>
              <span className="font-bold text-amber-700">ورود ←</span>
            </button>

            <button
              onClick={() => {
                loginAsDemoStaff('09100000000');
                setShowSwitchModal(false);
              }}
              className="w-full text-right p-3 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100 flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <Lock size={16} className="text-rose-700" />
                <div>
                  <div className="font-bold text-rose-950">مدیر ارشد سامانه (Super Admin)</div>
                  <div className="text-[10px] text-rose-700">09100000000 (دسترسی به تمامی ادارات)</div>
                </div>
              </div>
              <span className="font-bold text-rose-700">ورود ←</span>
            </button>
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
