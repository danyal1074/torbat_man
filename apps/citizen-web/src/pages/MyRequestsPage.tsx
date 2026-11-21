import React, { useState, useEffect } from 'react';
import { RequestCard, EmptyState, Button, SearchInput } from '@torbat/ui';
import { Plus, Search, Filter } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export interface MyRequestsPageProps {
  onNavigateRequest: (id: string) => void;
  onNewReport: () => void;
}

export const MyRequestsPage: React.FC<MyRequestsPageProps> = ({
  onNavigateRequest,
  onNewReport,
}) => {
  const { user } = useAuth();
  const [tab, setTab] = useState<'all' | 'open' | 'done'>('all');
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTracking, setSearchTracking] = useState('');
  const [trackedItem, setTrackedItem] = useState<any>(null);
  const [trackError, setTrackError] = useState('');

  const loadRequests = () => {
    setLoading(true);
    api.getMyRequests(tab)
      .then((res) => {
        setRequests(res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRequests();
  }, [tab, user]);

  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTracking.trim()) return;

    setTrackError('');
    setTrackedItem(null);
    try {
      const res = await api.trackRequest(searchTracking.trim());
      setTrackedItem(res.data);
    } catch (err: any) {
      setTrackError('درخواستی با این کد رهگیری پیدا نشد.');
    }
  };

  return (
    <div className="flex flex-col gap-5 pb-24 text-right">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-xl font-extrabold text-[#33313A] tracking-tight">پیگیری درخواست‌ها</h2>
          <p className="text-xs text-[#667085]">سوابق گزارش‌ها و مکاتبات اداری شما</p>
        </div>

        <Button variant="secondary" size="sm" onClick={onNewReport} leftIcon={<Plus className="w-4 h-4" />}>
          گزارش جدید
        </Button>
      </div>

      {/* Direct Tracking Code Search */}
      <form onSubmit={handleTrackSubmit} className="flex gap-2">
        <input
          type="text"
          value={searchTracking}
          onChange={(e) => setSearchTracking(e.target.value)}
          placeholder="جستجوی مستقیم با کد پیگیری (مثلاً TM-4K7P-9XQ2)..."
          className="flex-1 h-11 px-3.5 bg-white rounded-xl border border-slate-200 text-xs font-mono focus:border-[#7541A5] focus:outline-none shadow-2xs"
        />
        <Button variant="primary" size="sm" type="submit">
          <Search className="w-4 h-4" />
        </Button>
      </form>

      {/* Tracked Item Box if found */}
      {trackedItem && (
        <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl flex flex-col gap-2 text-right">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-[#7541A5]">نتیجه استعلام کد پیگیری</span>
            <span className="font-mono text-xs font-bold text-slate-700">{trackedItem.trackingCode}</span>
          </div>
          <span className="text-sm font-extrabold text-[#33313A]">{trackedItem.title}</span>
          <div className="flex justify-between items-center text-xs text-[#667085] pt-1">
            <span>سازمان: {trackedItem.organizationName}</span>
            <button
              type="button"
              onClick={() => onNavigateRequest(trackedItem.id)}
              className="text-xs font-bold text-[#7541A5] hover:underline"
            >
              مشاهده پرونده کامل
            </button>
          </div>
        </div>
      )}
      {trackError && <span className="text-xs text-rose-600 font-medium px-1">{trackError}</span>}

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl">
        <button
          type="button"
          onClick={() => setTab('all')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            tab === 'all' ? 'bg-white text-[#7541A5] shadow-xs' : 'text-[#667085]'
          }`}
        >
          همه
        </button>
        <button
          type="button"
          onClick={() => setTab('open')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            tab === 'open' ? 'bg-white text-[#7541A5] shadow-xs' : 'text-[#667085]'
          }`}
        >
          در جریان
        </button>
        <button
          type="button"
          onClick={() => setTab('done')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            tab === 'done' ? 'bg-white text-[#7541A5] shadow-xs' : 'text-[#667085]'
          }`}
        >
          حل‌شده و مختومه
        </button>
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[160px]">
          <span className="w-6 h-6 border-2 border-[#7541A5] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : requests.length > 0 ? (
        <div className="flex flex-col gap-2.5">
          {requests.map((r) => (
            <RequestCard key={r.id} request={r} onClick={() => onNavigateRequest(r.id)} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="درخواستی ثبت نشده است"
          description="شما می‌توانید مشکلات شهری یا درخواست‌های اداری خود را به سادگی ثبت کنید."
          actionLabel="ثبت گزارش در شهر‌بین"
          onAction={onNewReport}
        />
      )}
    </div>
  );
};
