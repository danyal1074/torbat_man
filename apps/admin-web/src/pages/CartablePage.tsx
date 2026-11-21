import React, { useState, useEffect } from 'react';
import { Button, StatusChip, SearchInput } from '@torbat/ui';
import {
  Filter,
  RefreshCw,
  Search,
  Building2,
  Calendar,
  User,
  AlertCircle,
  Clock,
  ArrowRight,
  ChevronLeft,
  SlidersHorizontal,
} from 'lucide-react';
import { formatRelative, formatJalaliDate } from '@torbat/i18n';
import { adminApi, type AdminRequestSummary } from '../api/client';
import { useStaffAuth } from '../context/StaffAuthContext';

export interface CartablePageProps {
  initialStatus?: string;
  onNavigateCase: (id: string) => void;
}

export const CartablePage: React.FC<CartablePageProps> = ({
  initialStatus,
  onNavigateCase,
}) => {
  const { staff } = useStaffAuth();
  const [requests, setRequests] = useState<AdminRequestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus || 'all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<'all' | 'me' | 'unassigned'>('all');
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [orgFilter, setOrgFilter] = useState<string>('all');

  const loadRequests = () => {
    setLoading(true);
    adminApi
      .getRequests({
        status: statusFilter,
        priority: priorityFilter,
        assignee: assigneeFilter,
        organizationId: orgFilter,
        q: search.trim() || undefined,
        limit: 50,
      })
      .then((res) => {
        setRequests(res.data);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    adminApi.getOrganizations().then((res) => setOrganizations(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    loadRequests();
  }, [statusFilter, priorityFilter, assigneeFilter, orgFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadRequests();
  };

  return (
    <div className="space-y-5 text-right">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-800">
            کارتابل رسیدگی و ارجاع درخواست‌ها
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            فهرست درخواست‌ها و گزارش‌های ارسالی شهروندان تربت حیدریه
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadRequests}
            isLoading={loading}
            className="flex items-center gap-1.5 text-xs"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>بروزرسانی کارتابل</span>
          </Button>
        </div>
      </div>

      {/* 2. Search & Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جست‌وجو با کد رهگیری (TM-...)، شرح مشکل، نام یا شماره شهروند..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pr-10 pl-4 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white"
            />
            <Search size={18} className="absolute right-3.5 top-2.5 text-slate-400" />
          </div>
          <Button type="submit" variant="primary" size="md" className="shrink-0">
            جست‌وجو
          </Button>
        </form>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">وضعیت پرونده:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-600"
            >
              <option value="all">همه وضعیت‌ها</option>
              <option value="submitted">جدید / ثبت‌شده</option>
              <option value="triaged">بررسی اولیه / تریاژ</option>
              <option value="in_progress">در دست اقدام</option>
              <option value="waiting_for_citizen">منتظر پاسخ شهروند</option>
              <option value="resolved">حل‌شده</option>
              <option value="closed">خاتمه‌یافته</option>
            </select>
          </div>

          {/* Assignee Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">تخصیص کارشناس:</label>
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-600"
            >
              <option value="all">همه پرونده‌ها</option>
              <option value="me">ارجاع‌شده به من</option>
              <option value="unassigned">بدون کارشناس اقدام‌کننده</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">اولویت رسیدگی:</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-600"
            >
              <option value="all">همه اولویت‌ها</option>
              <option value="urgent">فوری / اضطراری</option>
              <option value="high">بالا</option>
              <option value="normal">عادی</option>
              <option value="low">پایین</option>
            </select>
          </div>

          {/* Org Filter (If platform admin) */}
          {staff?.platformRole === 'platform_admin' ? (
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">سازمان مسئول:</label>
              <select
                value={orgFilter}
                onChange={(e) => setOrgFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-600"
              >
                <option value="all">همه سازمان‌ها</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex flex-col justify-end">
              <span className="text-[11px] text-slate-400">
                سازمان شما: <strong>{staff?.memberships[0]?.orgName || 'سازمان'}</strong>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 3. Requests Table / List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            در حال بارگذاری کارتابل...
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            هیچ پرونده‌ای با فیلترهای انتخابی یافت نشد.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="py-3 px-4">کد رهگیری</th>
                  <th className="py-3 px-4">عنوان و خدمت</th>
                  <th className="py-3 px-4">سازمان</th>
                  <th className="py-3 px-4">شهروند</th>
                  <th className="py-3 px-4">وضعیت</th>
                  <th className="py-3 px-4">اولویت</th>
                  <th className="py-3 px-4">زمان ثبت</th>
                  <th className="py-3 px-4 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => onNavigateCase(r.id)}
                    className="hover:bg-purple-50/50 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-purple-700">
                      {r.trackingCode}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800 group-hover:text-purple-900 transition-colors">
                        {r.title}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                        {r.description}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {r.organizationName}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <div>{r.citizenName || 'شهروند'}</div>
                      <div className="font-mono text-[10px] text-slate-400 dir-ltr text-right">{r.citizenMobile}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusChip status={r.status as any} />
                    </td>
                    <td className="py-3.5 px-4">
                      {r.priority === 'urgent' && (
                        <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          فوری
                        </span>
                      )}
                      {r.priority === 'high' && (
                        <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          بالا
                        </span>
                      )}
                      {r.priority === 'normal' && (
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px]">
                          عادی
                        </span>
                      )}
                      {r.priority === 'low' && (
                        <span className="bg-slate-50 text-slate-400 px-2 py-0.5 rounded-full text-[10px]">
                          پایین
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                      {formatRelative(new Date(r.createdAt))}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="text-[11px] py-1 px-3"
                      >
                        رسیدگی
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
