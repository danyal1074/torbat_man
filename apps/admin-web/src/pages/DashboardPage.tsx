import React, { useState, useEffect } from 'react';
import { Button, StatusChip } from '@torbat/ui';
import {
  Inbox,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Activity,
  ArrowRight,
  TrendingUp,
  FileText,
  Users,
  ChevronLeft,
  Sparkles,
} from 'lucide-react';
import { formatRelative } from '@torbat/i18n';
import { adminApi, type DashboardKPIs, type AdminRequestSummary } from '../api/client';
import { useStaffAuth } from '../context/StaffAuthContext';

export interface DashboardPageProps {
  onNavigateCartable: (filterStatus?: string) => void;
  onNavigateCase: (id: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigateCartable,
  onNavigateCase,
}) => {
  const { staff } = useStaffAuth();
  const [kpis, setKpis] = useState<DashboardKPIs>({
    total: 0,
    submitted: 0,
    triaged: 0,
    inProgress: 0,
    waitingForCitizen: 0,
    resolved: 0,
    closed: 0,
  });
  const [recentRequests, setRecentRequests] = useState<AdminRequestSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminApi.getDashboard().catch(() => ({ data: { total: 0, submitted: 0, triaged: 0, inProgress: 0, waitingForCitizen: 0, resolved: 0, closed: 0 } })),
      adminApi.getRequests({ limit: 5 }).catch(() => ({ data: [], meta: { nextCursor: null, limit: 5 } })),
    ])
      .then(([dashRes, reqsRes]) => {
        if (dashRes?.data) setKpis(dashRes.data);
        if (reqsRes?.data) setRecentRequests(reqsRes.data);
      })
      .finally(() => setLoading(false));
  }, [staff]);

  return (
    <div className="space-y-6 text-right">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-l from-[#592582] to-[#7541A5] rounded-3xl p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full font-bold">
              {staff?.platformRole === 'platform_admin' ? 'مدیریت کل سیستم' : (staff?.memberships[0]?.orgName || 'سازمان')}
            </span>
            <span className="text-xs text-purple-200">
              تربت حیدریه
            </span>
          </div>
          <h1 className="text-2xl font-black">
            میز کار و داشبورد پایش خدمت
          </h1>
          <p className="text-xs text-purple-150 mt-1 max-w-xl leading-relaxed">
            گزارش‌های شهروندی مطالبه شهری و درخواست‌های اداری در این پنل به‌صورت یکپارچه ارجاع، رسیدگی و پیگیری می‌شوند.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            onClick={() => onNavigateCartable()}
            className="bg-white text-purple-900 hover:bg-purple-50 font-bold text-xs"
          >
            مشاهده کامل کارتابل
          </Button>
        </div>
      </div>

      {/* 2. KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {/* Total */}
        <div
          onClick={() => onNavigateCartable('all')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-purple-300 transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">کل پرونده‌ها</span>
            <FileText size={18} className="text-purple-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{kpis.total}</span>
            <span className="text-[11px] text-slate-400">مورد</span>
          </div>
        </div>

        {/* Submitted */}
        <div
          onClick={() => onNavigateCartable('submitted')}
          className="bg-white p-4 rounded-2xl border border-rose-200 shadow-xs hover:border-rose-400 transition-all cursor-pointer flex flex-col justify-between bg-rose-50/20"
        >
          <div className="flex items-center justify-between text-rose-700 mb-2">
            <span className="text-xs font-bold">جدید / منتظر بررسی</span>
            <Inbox size={18} className="text-rose-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-700">{kpis.submitted}</span>
            <span className="text-[11px] text-rose-500">نیازمند تریاژ</span>
          </div>
        </div>

        {/* Triaged */}
        <div
          onClick={() => onNavigateCartable('triaged')}
          className="bg-white p-4 rounded-2xl border border-blue-200 shadow-xs hover:border-blue-400 transition-all cursor-pointer flex flex-col justify-between bg-blue-50/20"
        >
          <div className="flex items-center justify-between text-blue-700 mb-2">
            <span className="text-xs font-bold">بررسی اولیه / تخصیص</span>
            <Clock size={18} className="text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-700">{kpis.triaged}</span>
            <span className="text-[11px] text-blue-500">آماده ارجاع</span>
          </div>
        </div>

        {/* In Progress */}
        <div
          onClick={() => onNavigateCartable('in_progress')}
          className="bg-white p-4 rounded-2xl border border-amber-200 shadow-xs hover:border-amber-400 transition-all cursor-pointer flex flex-col justify-between bg-amber-50/20"
        >
          <div className="flex items-center justify-between text-amber-700 mb-2">
            <span className="text-xs font-bold">در حال اقدام فنی</span>
            <Activity size={18} className="text-amber-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-700">{kpis.inProgress}</span>
            <span className="text-[11px] text-amber-500">در دست کارشناس</span>
          </div>
        </div>

        {/* Waiting for citizen */}
        <div
          onClick={() => onNavigateCartable('waiting_for_citizen')}
          className="bg-white p-4 rounded-2xl border border-purple-200 shadow-xs hover:border-purple-400 transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-purple-700 mb-2">
            <span className="text-xs font-bold">منتظر پاسخ شهروند</span>
            <Users size={18} className="text-purple-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-800">{kpis.waitingForCitizen}</span>
            <span className="text-[11px] text-purple-500">استعلام مدرک</span>
          </div>
        </div>

        {/* Resolved / Closed */}
        <div
          onClick={() => onNavigateCartable('resolved')}
          className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs hover:border-emerald-400 transition-all cursor-pointer flex flex-col justify-between bg-emerald-50/20"
        >
          <div className="flex items-center justify-between text-emerald-700 mb-2">
            <span className="text-xs font-bold">حل‌شده و خاتمه‌یافته</span>
            <CheckCircle2 size={18} className="text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">{kpis.resolved + kpis.closed}</span>
            <span className="text-[11px] text-emerald-500">مختومه</span>
          </div>
        </div>
      </div>

      {/* 3. Recent Requests Cartable Preview */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-150 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-base text-slate-800">
              آخرین پرونده‌های ارجاع‌شده به کارتابل
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              رسیدگی سریع‌تر به پرونده‌ها شاخص رضایت شهروندان تربت حیدریه را ارتقا می‌دهد
            </p>
          </div>

          <button
            onClick={() => onNavigateCartable()}
            className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1"
          >
            <span>مشاهده همه پرونده‌ها</span>
            <ChevronLeft size={16} />
          </button>
        </div>

        {recentRequests.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            در حال حاضر هیچ پرونده‌ای در کارتابل شما وجود ندارد.
          </div>
        ) : (
          <div className="divide-y divide-slate-150">
            {recentRequests.map((req) => (
              <div
                key={req.id}
                onClick={() => onNavigateCase(req.id)}
                className="p-4 hover:bg-purple-50/40 transition-colors cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    {req.serviceTitle.slice(0, 2)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
                        {req.trackingCode}
                      </span>
                      <StatusChip status={req.status as any} />
                      <span className="text-xs font-bold text-slate-800">{req.title}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                      {req.description}
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1.5">
                      <span>{req.organizationName}</span>
                      <span>•</span>
                      <span>ثبت توسط: {req.citizenName || req.citizenMobile}</span>
                      <span>•</span>
                      <span>{formatRelative(new Date(req.createdAt))}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <Button variant="outline" size="sm" className="text-xs">
                    بررسی و اقدام
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. SLA & Performance Standards */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-amber-900">
        <Sparkles size={20} className="text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed space-y-1">
          <h4 className="font-bold text-amber-950">تعهدنامه سطح خدمات (SLA) سامانه تربتینو</h4>
          <p>
            حداکثر زمان تعیین‌تکلیف و تریاژ پرونده‌های شهروندی ۴ ساعت کاری و زمان رفع مشکلات فوری حداکثر ۷۲ ساعت است. پس از اتمام اقدام کارشناس، پرونده وارد وضعیت «حل‌شده» شده و پیامک رضایت‌سنجی برای شهروند ارسال می‌گردد.
          </p>
        </div>
      </div>
    </div>
  );
};
