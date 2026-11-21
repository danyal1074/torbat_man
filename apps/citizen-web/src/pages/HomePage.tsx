import React, { useState, useEffect } from 'react';
import { Logo, SearchInput, ServiceTile, RequestCard, Button, StatusChip } from '@torbat/ui';
import {
  Camera,
  Building2,
  Sparkles,
  MapPin,
  Megaphone,
  ArrowLeft,
  ChevronLeft,
  CheckCircle2,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { greeting, formatJalaliDate } from '@torbat/i18n';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { AiAssistantModal } from '../components/AiAssistantModal';

export interface HomePageProps {
  onNavigate: (page: string, params?: Record<string, any>) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [services, setServices] = useState<any[]>([]);
  const [popularServices, setPopularServices] = useState<any[]>([]);
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  useEffect(() => {
    // Load services
    api.getServices().then((res) => {
      setServices(res.data);
      setPopularServices(res.data.filter((s: any) => s.isPopular).slice(0, 6));
    }).catch(console.error);

    // Load recent requests
    api.getMyRequests('open').then((res) => {
      setRecentRequests(res.data.slice(0, 2));
    }).catch(console.error);

    // Load announcements
    api.getAnnouncements().then((res) => {
      setAnnouncements(res.data.slice(0, 1));
    }).catch(console.error);

    // Load notifications count
    api.getNotifications().then((res) => {
      setUnreadCount(res.meta?.unreadCount || 0);
    }).catch(console.error);
  }, [user]);

  // Search filtered services
  const filteredServices = searchQuery.trim()
    ? services.filter(
        (s) =>
          s.title.includes(searchQuery) ||
          s.description.includes(searchQuery) ||
          s.slug.includes(searchQuery)
      )
    : [];

  return (
    <div className="flex flex-col gap-5 pb-24 text-right">
      {/* 1. Header */}
      <header className="flex items-center justify-between pt-4 px-1">
        <Logo size={36} variant="horizontal" />

        <div className="flex items-center gap-2">
          {/* Notifications Button */}
          <button
            type="button"
            onClick={() => onNavigate('notifications')}
            className="w-10 h-10 rounded-2xl bg-white border border-[#E9E6EE] flex items-center justify-center text-slate-600 hover:text-[#7541A5] hover:border-[#7541A5]/30 relative transition-all shadow-2xs"
          >
            <Megaphone className="w-5 h-5 stroke-[1.8]" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white" />
            )}
          </button>

          {/* Profile Button */}
          <button
            type="button"
            onClick={() => onNavigate('profile')}
            className="w-10 h-10 rounded-2xl bg-[#F5F3F8] border border-[#7541A5]/20 flex items-center justify-center text-[#7541A5] font-bold text-xs hover:bg-[#7541A5] hover:text-white transition-all shadow-2xs"
          >
            {user?.displayName ? user.displayName.slice(0, 1) : 'من'}
          </button>
        </div>
      </header>

      {/* 2. Personalized Greeting & Brand Slogan */}
      <div className="flex flex-col gap-1 px-1">
        <h2 className="text-xl font-extrabold text-[#33313A] tracking-tight">
          {greeting()}، {user?.displayName || 'شهروند گرامی'} 👋
        </h2>
        <p className="text-xs text-[#667085] flex items-center gap-1.5">
          <span className="font-semibold text-[#7541A5]">تربت نو؛</span>
          <span>شهر تو، همراه تو</span>
        </p>
      </div>

      {/* 3. Global Search */}
      <div className="relative">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="دنبال چه خدمتی در شهر می‌گردی؟"
        />

        {/* Live Search Suggestions Dropdown */}
        {searchQuery.trim() && (
          <div className="absolute top-14 left-0 right-0 bg-white rounded-2xl border border-[#E9E6EE] shadow-lg p-2 z-30 flex flex-col gap-1 max-h-64 overflow-y-auto">
            {filteredServices.length > 0 ? (
              filteredServices.slice(0, 5).map((s) => (
                <button
                  key={s.slug}
                  type="button"
                  onClick={() => onNavigate('service-detail', { slug: s.slug })}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#F5F3F8] text-right transition-colors"
                >
                  <span className="text-xs font-bold text-[#33313A]">{s.title}</span>
                  <ChevronLeft className="w-4 h-4 text-slate-400" />
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-xs text-slate-400">
                خدمتی با این عبارت پیدا نشد.
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Two Hero Action Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Shahrbin (Report problem) */}
        <button
          type="button"
          onClick={() => onNavigate('shahrbin')}
          className="group flex flex-col justify-between p-4 bg-gradient-to-br from-[#7541A5] to-[#592582] text-white rounded-3xl shadow-md hover:shadow-lg transition-all active:scale-[0.98] text-right min-h-[145px] relative overflow-hidden"
        >
          {/* Subtle background glow */}
          <div className="absolute -top-10 -left-10 w-28 h-28 bg-white/10 rounded-full blur-xl" />

          <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white mb-2 shadow-xs">
            <Camera className="w-5 h-5 stroke-[2]" />
          </div>

          <div className="flex flex-col gap-1 z-10">
            <span className="text-sm font-extrabold tracking-tight">مشکلی در شهر دارم</span>
            <span className="text-[11px] text-purple-100/90 font-medium leading-relaxed">
              گزارش چاله، روشنایی، زباله، آبفا و...
            </span>
          </div>

          <div className="self-end mt-1 text-[11px] font-bold text-amber-300 flex items-center gap-1">
            <span>ثبت در شهر‌بین</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </div>
        </button>

        {/* Administrative Services */}
        <button
          type="button"
          onClick={() => onNavigate('services')}
          className="group flex flex-col justify-between p-4 bg-white border border-[#E9E6EE] text-[#33313A] rounded-3xl shadow-2xs hover:border-[#7541A5]/40 hover:shadow-md transition-all active:scale-[0.98] text-right min-h-[145px]"
        >
          <div className="w-11 h-11 rounded-2xl bg-[#F5F3F8] flex items-center justify-center text-[#7541A5] mb-2">
            <Building2 className="w-5 h-5 stroke-[2]" />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-sm font-extrabold tracking-tight">کار اداری دارم</span>
            <span className="text-[11px] text-[#667085] font-medium leading-relaxed">
              میز خدمت شهرداری، آب، برق، گاز و...
            </span>
          </div>

          <div className="self-end mt-1 text-[11px] font-bold text-[#7541A5] flex items-center gap-1">
            <span>فهرست خدمات</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </div>
        </button>
      </div>

      {/* 5. Smart Assistant Trigger Banner */}
      <button
        type="button"
        onClick={() => setIsAssistantOpen(true)}
        className="flex items-center justify-between p-3.5 bg-gradient-to-r from-amber-50 to-[#F5F3F8] border border-amber-200/80 rounded-2xl text-right hover:border-[#7541A5]/30 transition-all shadow-2xs cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-400 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-5 h-5 fill-current" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-[#33313A]">دستیار هوشمند تربت نو</span>
            <span className="text-[11px] text-[#667085]">نمی‌دونی کدوم فرم رو پر کنی؟ از من بپرس!</span>
          </div>
        </div>
        <span className="text-xs font-bold text-[#7541A5] bg-white px-2.5 py-1 rounded-lg border border-purple-100 shadow-2xs">
          گفتگو
        </span>
      </button>

      {/* 6. Popular Services Grid (2-3 columns minimal tiles) */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-extrabold text-[#33313A]">خدمات پرکاربرد</h3>
          <button
            type="button"
            onClick={() => onNavigate('services')}
            className="text-xs font-semibold text-[#7541A5] hover:underline"
          >
            همه خدمات ({services.length})
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {popularServices.map((svc) => (
            <ServiceTile
              key={svc.slug}
              id={svc.id}
              slug={svc.slug}
              title={svc.title}
              shortTitle={svc.shortTitle}
              icon={svc.icon}
              status={svc.status}
              onClick={() => onNavigate('service-detail', { slug: svc.slug })}
            />
          ))}
        </div>
      </div>

      {/* 7. My Requests (Active / Recent) */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-extrabold text-[#33313A]">درخواست‌های من</h3>
          <button
            type="button"
            onClick={() => onNavigate('requests')}
            className="text-xs font-semibold text-[#7541A5] hover:underline"
          >
            مشاهده همه
          </button>
        </div>

        {recentRequests.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {recentRequests.map((req) => (
              <RequestCard
                key={req.id}
                request={req}
                onClick={() => onNavigate('request-detail', { id: req.id })}
              />
            ))}
          </div>
        ) : (
          <div className="p-4 bg-white rounded-2xl border border-dashed border-slate-200 text-center flex flex-col items-center gap-1">
            <Clock className="w-5 h-5 text-slate-300" />
            <span className="text-xs font-semibold text-slate-500">درخواست بازی در حال حاضر ندارید</span>
            <span className="text-[11px] text-slate-400">گزارش‌های جدید شما اینجا نمایش داده می‌شوند.</span>
          </div>
        )}
      </div>

      {/* 8. City Announcement Card */}
      {announcements.length > 0 && (
        <div className="flex flex-col gap-2 bg-white rounded-2xl border border-[#E9E6EE] p-4 text-right shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              اطلاعیه رسمی شهر
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              {formatJalaliDate(announcements[0].publishedAt)}
            </span>
          </div>
          <h4 className="text-xs font-bold text-[#33313A] mt-1 leading-snug">
            {announcements[0].title}
          </h4>
          <p className="text-[11px] text-[#667085] leading-relaxed line-clamp-2">
            {announcements[0].body}
          </p>
          <span className="text-[10px] text-slate-400 font-medium">
            منبع: {announcements[0].sourceName}
          </span>
        </div>
      )}

      {/* 9. City Map Shortcut */}
      <button
        type="button"
        onClick={() => onNavigate('map')}
        className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-[#E9E6EE] hover:border-[#7541A5]/40 transition-all text-right shadow-2xs"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#F5F3F8] text-[#7541A5] flex items-center justify-center">
            <MapPin className="w-5 h-5 stroke-[2]" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-[#33313A]">نقشه و راهنمای شهر تربت حیدریه</span>
            <span className="text-[11px] text-[#667085]">مزار قطب‌الدین حیدر، ادارات، خدمات و گزارش‌های عمومی</span>
          </div>
        </div>
        <ChevronLeft className="w-4 h-4 text-slate-400" />
      </button>

      {/* AI Assistant Dialog */}
      <AiAssistantModal
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        onSelectService={(slug) => onNavigate('service-detail', { slug })}
      />
    </div>
  );
};
