import React, { useState } from 'react';
import { Logo } from '@torbat/ui';
import {
  Home,
  LayoutGrid,
  Camera,
  ClipboardList,
  MapPin,
  User,
  Bell,
  Sparkles,
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { HomePage } from './pages/HomePage';
import { ServicesPage } from './pages/ServicesPage';
import { ServiceDetailPage } from './pages/ServiceDetailPage';
import { ShahrbinReportPage } from './pages/ShahrbinReportPage';
import { MyRequestsPage } from './pages/MyRequestsPage';
import { RequestDetailPage } from './pages/RequestDetailPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { CityMapPage } from './pages/CityMapPage';
import { ProfilePage } from './pages/ProfilePage';
import { AiAssistantModal } from './components/AiAssistantModal';
import { api } from './api/client';

export type NavTab = 'home' | 'services' | 'report' | 'requests' | 'map' | 'profile';

function AppContent() {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavTab>('home');
  const [activeServiceSlug, setActiveServiceSlug] = useState<string | null>(null);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Poll notifications count
  React.useEffect(() => {
    api.getNotifications()
      .then((res: any) => {
        setUnreadCount(res.meta?.unreadCount || 0);
      })
      .catch(() => {});
  }, [user, currentTab]);

  const handleNavigate = (page: string, params?: Record<string, any>) => {
    if (page === 'services') {
      setActiveServiceSlug(null);
      setCurrentTab('services');
    } else if (page === 'service-detail' && params?.slug) {
      setActiveServiceSlug(params.slug);
      setCurrentTab('services');
    } else if (page === 'report') {
      setCurrentTab('report');
    } else if (page === 'requests') {
      setActiveRequestId(null);
      setCurrentTab('requests');
    } else if (page === 'request-detail' && params?.id) {
      setActiveRequestId(params.id);
      setCurrentTab('requests');
    } else if (page === 'notifications') {
      setActiveRequestId(null);
      setCurrentTab('home');
    } else if (page === 'map') {
      setCurrentTab('map');
    } else if (page === 'profile') {
      setCurrentTab('profile');
    } else {
      setActiveServiceSlug(null);
      setActiveRequestId(null);
      setCurrentTab('home');
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F3F8]/50 text-slate-900 font-sans antialiased selection:bg-purple-100 selection:text-purple-900 flex justify-center">
      {/* Container simulating a refined mobile & desktop app experience */}
      <div className="w-full max-w-md md:max-w-xl min-h-screen bg-[#FAFAFC] shadow-xl flex flex-col relative border-x border-slate-200/60">
        
        {/* Top App Bar (Hidden on Services tab to present the dedicated reference header) */}
        {currentTab !== 'services' && (
          <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-150 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleNavigate('home')}>
              <Logo variant="horizontal" size={32} />
            </div>

            <div className="flex items-center gap-1.5">
              {/* AI Assistant Button */}
              <button
                onClick={() => setIsAiModalOpen(true)}
                className="p-2 rounded-xl text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors relative"
                title="دستیار هوشمند شهری"
              >
                <Sparkles size={18} />
              </button>

              {/* Notifications Button */}
              <button
                onClick={() => {
                  setActiveRequestId(null);
                  setActiveServiceSlug(null);
                  setCurrentTab('home');
                  handleNavigate('notifications');
                }}
                className="p-2 rounded-xl text-slate-600 hover:text-purple-700 hover:bg-slate-100 transition-colors relative"
                title="اعلان‌ها"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
                )}
              </button>
            </div>
          </header>
        )}

        {/* Main Content Area */}
        <main className={`flex-1 overflow-y-auto ${currentTab === 'services' && !activeServiceSlug ? 'px-4 py-3' : 'px-4 py-3'}`}>
          {/* Home */}
          {currentTab === 'home' && (
            <HomePage onNavigate={handleNavigate} />
          )}

          {/* Services */}
          {currentTab === 'services' && !activeServiceSlug && (
            <ServicesPage
              onSelectService={(slug) => {
                setActiveServiceSlug(slug);
              }}
              onNavigateHome={() => setCurrentTab('home')}
              onNavigateReport={() => setCurrentTab('report')}
              onNavigateAssistant={() => setIsAiModalOpen(true)}
              onNavigateMap={() => setCurrentTab('map')}
            />
          )}

          {/* Service Detail */}
          {currentTab === 'services' && activeServiceSlug && (
            <ServiceDetailPage
              slug={activeServiceSlug}
              onBack={() => setActiveServiceSlug(null)}
              onNavigateRequest={(id) => {
                setActiveServiceSlug(null);
                setActiveRequestId(id);
                setCurrentTab('requests');
              }}
            />
          )}

          {/* Shahrbin Citizen Report */}
          {currentTab === 'report' && (
            <ShahrbinReportPage
              onBack={() => setCurrentTab('home')}
              onNavigateRequest={(id) => {
                setActiveRequestId(id);
                setCurrentTab('requests');
              }}
            />
          )}

          {/* My Requests List */}
          {currentTab === 'requests' && !activeRequestId && (
            <MyRequestsPage
              onNavigateRequest={(id) => setActiveRequestId(id)}
              onNewReport={() => setCurrentTab('report')}
            />
          )}

          {/* Request Detail */}
          {currentTab === 'requests' && activeRequestId && (
            <RequestDetailPage
              id={activeRequestId}
              onBack={() => setActiveRequestId(null)}
            />
          )}

          {/* City Map */}
          {currentTab === 'map' && (
            <CityMapPage />
          )}

          {/* Citizen Profile & Settings */}
          {currentTab === 'profile' && (
            <ProfilePage
              onNavigateMap={() => setCurrentTab('map')}
              onNavigateRequests={() => {
                setActiveRequestId(null);
                setCurrentTab('requests');
              }}
            />
          )}
        </main>

        {/* Fixed Bottom Navigation (Blu Style) */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
          <div className="w-full max-w-md md:max-w-xl bg-white/95 backdrop-blur-lg border-t border-slate-200/80 px-2 py-2 flex items-center justify-around shadow-2xl pointer-events-auto">
            
            {/* 1. Home */}
            <button
              onClick={() => {
                setActiveServiceSlug(null);
                setActiveRequestId(null);
                setCurrentTab('home');
              }}
              className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
                currentTab === 'home'
                  ? 'text-[#7541A5] font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Home size={20} className={currentTab === 'home' ? 'stroke-[2.5]' : 'stroke-[1.8]'} />
              <span className="text-[10px]">خانه</span>
            </button>

            {/* 2. Services */}
            <button
              onClick={() => {
                setActiveServiceSlug(null);
                setActiveRequestId(null);
                setCurrentTab('services');
              }}
              className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
                currentTab === 'services'
                  ? 'text-[#7541A5] font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <LayoutGrid size={20} className={currentTab === 'services' ? 'stroke-[2.5]' : 'stroke-[1.8]'} />
              <span className="text-[10px]">خدمات</span>
            </button>

            {/* 3. Central Report Button (Elevated) */}
            <button
              onClick={() => {
                setActiveServiceSlug(null);
                setActiveRequestId(null);
                setCurrentTab('report');
              }}
              className="flex flex-col items-center -mt-6 group"
            >
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-[#592582] to-[#7541A5] text-white flex items-center justify-center shadow-lg shadow-purple-900/30 group-hover:scale-105 group-active:scale-95 transition-all border-2 border-white">
                <Camera size={22} className="stroke-[2.2]" />
              </div>
              <span className="text-[10px] font-bold text-[#7541A5] mt-1">مطالبه شهری</span>
            </button>

            {/* 4. Requests */}
            <button
              onClick={() => {
                setActiveServiceSlug(null);
                setActiveRequestId(null);
                setCurrentTab('requests');
              }}
              className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
                currentTab === 'requests'
                  ? 'text-[#7541A5] font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <ClipboardList size={20} className={currentTab === 'requests' ? 'stroke-[2.5]' : 'stroke-[1.8]'} />
              <span className="text-[10px]">پیگیری</span>
            </button>

            {/* 5. Map */}
            <button
              onClick={() => {
                setActiveServiceSlug(null);
                setActiveRequestId(null);
                setCurrentTab('map');
              }}
              className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
                currentTab === 'map'
                  ? 'text-[#7541A5] font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <MapPin size={20} className={currentTab === 'map' ? 'stroke-[2.5]' : 'stroke-[1.8]'} />
              <span className="text-[10px]">نقشه</span>
            </button>

            {/* 6. Profile */}
            <button
              onClick={() => {
                setActiveServiceSlug(null);
                setActiveRequestId(null);
                setCurrentTab('profile');
              }}
              className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
                currentTab === 'profile'
                  ? 'text-[#7541A5] font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <User size={20} className={currentTab === 'profile' ? 'stroke-[2.5]' : 'stroke-[1.8]'} />
              <span className="text-[10px]">پروفایل</span>
            </button>
          </div>
        </nav>

        {/* Global AI Assistant Modal */}
        <AiAssistantModal
          isOpen={isAiModalOpen}
          onClose={() => setIsAiModalOpen(false)}
          onSelectService={(slug) => {
            setActiveServiceSlug(slug);
            setCurrentTab('services');
          }}
        />
      </div>
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
