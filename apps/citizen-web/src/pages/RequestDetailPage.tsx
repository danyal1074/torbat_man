import React, { useState, useEffect } from 'react';
import { Button, StatusChip, Timeline, FormField } from '@torbat/ui';
import {
  ArrowRight,
  Clock,
  Building2,
  MapPin,
  Send,
  Star,
  RotateCcw,
  CheckCircle2,
  Image as ImageIcon,
  MessageSquare,
} from 'lucide-react';
import { formatJalaliDateTime } from '@torbat/i18n';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export interface RequestDetailPageProps {
  id: string;
  onBack: () => void;
}

export const RequestDetailPage: React.FC<RequestDetailPageProps> = ({ id, onBack }) => {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Reopen
  const [reopenReason, setReopenReason] = useState('');
  const [isReopening, setIsReopening] = useState(false);

  // Rate
  const [selectedScore, setSelectedScore] = useState(5);
  const [rateComment, setRateComment] = useState('');
  const [hasRated, setHasRated] = useState(false);

  const loadDetail = () => {
    api.getRequestDetail(id)
      .then((res) => {
        setData(res.data);
        if (res.data.satisfactionScore) setHasRated(true);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDetail();
  }, [id]);

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submittingComment) return;

    setSubmittingComment(true);
    try {
      await api.addComment(id, newComment.trim());
      setNewComment('');
      loadDetail();
    } catch (err: any) {
      alert(err.message || 'خطا در ارسال پیام');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleReopen = async () => {
    if (!reopenReason.trim()) return;
    try {
      await api.reopenRequest(id, reopenReason.trim());
      setIsReopening(false);
      setReopenReason('');
      loadDetail();
    } catch (err: any) {
      alert(err.message || 'خطا در بازگشایی پرونده');
    }
  };

  const handleRate = async () => {
    try {
      await api.rateRequest(id, selectedScore, rateComment);
      setHasRated(true);
      alert('امتیاز شما با موفقیت ثبت شد. از بازخورد شما سپاسگزاریم.');
      loadDetail();
    } catch (err: any) {
      alert(err.message || 'خطا در ثبت نظر');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <span className="w-6 h-6 border-2 border-[#7541A5] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-xs text-slate-500">
        اطلاعات پرونده یافت نشد.
        <Button variant="ghost" size="sm" onClick={onBack} className="mt-2">
          بازگشت
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-24 text-right">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-xs font-semibold text-[#7541A5] p-2 hover:bg-[#F5F3F8] rounded-xl transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          <span>بازگشت</span>
        </button>

        <span className="font-mono text-xs font-bold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-xl">
          {data.trackingCode}
        </span>
      </div>

      {/* Main Info Card */}
      <div className="bg-white rounded-3xl border border-[#E9E6EE] p-5 flex flex-col gap-3.5 shadow-2xs">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-extrabold text-[#33313A]">{data.title}</h2>
            <span className="text-xs text-[#667085] flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>سازمان مسئول: {data.organizationName}</span>
            </span>
          </div>

          <StatusChip status={data.status} size="md" />
        </div>

        <p className="text-xs text-[#33313A] bg-slate-50 p-3.5 rounded-2xl border border-slate-100 leading-relaxed">
          {data.description}
        </p>

        {/* Address & Location */}
        {data.address && (
          <div className="flex items-center gap-2 text-xs text-[#667085] pt-1">
            <MapPin className="w-4 h-4 text-[#7541A5] shrink-0" />
            <span>{data.address}</span>
          </div>
        )}

        {/* Attachments */}
        {data.attachments && data.attachments.length > 0 && (
          <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-[#7541A5]" />
              <span>تصاویر پیوست شده:</span>
            </span>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {data.attachments.map((a: any) => (
                <a
                  key={a.id}
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  className="w-20 h-20 rounded-xl overflow-hidden border border-slate-200 shrink-0 hover:opacity-90"
                >
                  <img src={a.url} alt="پیوست" className="w-full h-full object-cover" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Timeline of Status History */}
      <div className="bg-white rounded-3xl border border-[#E9E6EE] p-5 flex flex-col gap-4 shadow-2xs">
        <h3 className="text-sm font-black text-[#33313A] flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#7541A5]" />
          <span>خط زمانی و وضعیت رسیدگی</span>
        </h3>

        {data.history && data.history.length > 0 ? (
          <Timeline events={data.history} />
        ) : (
          <span className="text-xs text-slate-400">رویدادی ثبت نشده است.</span>
        )}
      </div>

      {/* Reopening & Satisfaction Section for Resolved Requests */}
      {data.status === 'resolved' && (
        <div className="bg-gradient-to-br from-emerald-50 to-[#F5F3F8] rounded-3xl border border-emerald-200 p-5 flex flex-col gap-4 shadow-2xs">
          <div className="flex items-center gap-2 text-emerald-800">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h4 className="text-sm font-extrabold">این درخواست حل شده اعلام شده است</h4>
          </div>

          {!hasRated ? (
            <div className="flex flex-col gap-3 bg-white p-4 rounded-2xl border border-emerald-100">
              <span className="text-xs font-bold text-[#33313A]">
                میزان رضایت خود را از نحوه رسیدگی ثبت کنید:
              </span>
              <div className="flex items-center gap-1.5 justify-center py-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSelectedScore(s)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        s <= selectedScore
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={rateComment}
                onChange={(e) => setRateComment(e.target.value)}
                placeholder="نظر یا پیشنهاد تکمیلی شما (اختیاری)..."
                className="w-full h-10 px-3 bg-slate-50 rounded-xl border border-slate-200 text-xs"
              />
              <Button variant="primary" size="sm" onClick={handleRate}>
                ثبت رضایت‌سنجی
              </Button>
            </div>
          ) : (
            <div className="text-xs text-emerald-700 bg-white p-3 rounded-2xl border border-emerald-100">
              امتیاز رضایت شما ثبت شده است: {data.satisfactionScore || selectedScore} از ۵ ستاره
            </div>
          )}

          {/* Reopen Button */}
          {!isReopening ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsReopening(true)}
              leftIcon={<RotateCcw className="w-4 h-4" />}
            >
              مشکل حل نشده است؟ بازگشایی مجدد پرونده
            </Button>
          ) : (
            <div className="flex flex-col gap-2.5 bg-white p-4 rounded-2xl border border-rose-200">
              <span className="text-xs font-bold text-rose-700">علت عدم رضایت و نیاز به بازگشایی:</span>
              <textarea
                rows={3}
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                placeholder="توضیح دهید چرا مشکل هنوز برطرف نشده است..."
                className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs leading-relaxed"
              />
              <div className="flex gap-2">
                <Button variant="danger" size="sm" onClick={handleReopen} disabled={!reopenReason.trim()}>
                  تأیید و بازگشایی
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setIsReopening(false)}>
                  انصراف
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Messages / Comments Section */}
      <div className="bg-white rounded-3xl border border-[#E9E6EE] p-5 flex flex-col gap-4 shadow-2xs">
        <h3 className="text-sm font-black text-[#33313A] flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#7541A5]" />
          <span>پیام‌ها و مکاتبات پرونده</span>
        </h3>

        <div className="flex flex-col gap-3">
          {data.comments && data.comments.length > 0 ? (
            data.comments.map((c: any) => (
              <div
                key={c.id}
                className={`p-3.5 rounded-2xl text-xs flex flex-col gap-1.5 ${
                  c.isStaff
                    ? 'bg-purple-50/80 border border-purple-200/70 text-[#33313A]'
                    : 'bg-slate-50 border border-slate-200 text-[#33313A]'
                }`}
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className={`font-bold ${c.isStaff ? 'text-[#7541A5]' : 'text-slate-600'}`}>
                    {c.isStaff ? 'پاسخ کارشناس سازمان' : 'پیام شما'}
                  </span>
                  <span className="text-slate-400 font-mono">
                    {formatJalaliDateTime(c.createdAt)}
                  </span>
                </div>
                <p className="leading-relaxed">{c.body}</p>
              </div>
            ))
          ) : (
            <span className="text-xs text-slate-400">هنوز پیامی روی این پرونده ثبت نشده است.</span>
          )}
        </div>

        {/* Reply form */}
        <form onSubmit={handleSendComment} className="flex gap-2 pt-2 border-t border-slate-100">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="ارسال پیام یا پاسخ جدید به کارشناس..."
            className="flex-1 h-11 px-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:bg-white focus:outline-none focus:border-[#7541A5]"
          />
          <Button variant="primary" size="sm" type="submit" isLoading={submittingComment}>
            <Send className="w-4 h-4 rotate-180" />
          </Button>
        </form>
      </div>
    </div>
  );
};
