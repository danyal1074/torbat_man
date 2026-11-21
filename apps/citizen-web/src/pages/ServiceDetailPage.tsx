import React, { useState, useEffect } from 'react';
import { Button, FormField, Dialog } from '@torbat/ui';
import {
  ArrowRight,
  Clock,
  Building2,
  FileText,
  AlertTriangle,
  CheckCircle,
  Copy,
  Info,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export interface ServiceDetailPageProps {
  slug: string;
  onBack: () => void;
  onNavigateRequest: (id: string) => void;
}

export const ServiceDetailPage: React.FC<ServiceDetailPageProps> = ({
  slug,
  onBack,
  onNavigateRequest,
}) => {
  const { user } = useAuth();
  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{ id: string; trackingCode: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.getServiceBySlug(slug)
      .then((res) => {
        setService(res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <span className="w-6 h-6 border-2 border-[#7541A5] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="p-8 text-center text-xs text-slate-500">
        خدمت مورد نظر یافت نشد.
        <Button variant="ghost" size="sm" onClick={onBack} className="mt-2">
          بازگشت
        </Button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await api.createRequest({
        serviceSlug: service.slug,
        title: service.title,
        description,
        formData,
        attachmentIds: [],
      });
      setSuccessData(res.data);
    } catch (err: any) {
      alert(err.message || 'خطا در ثبت درخواست');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (successData?.trackingCode) {
      navigator.clipboard.writeText(successData.trackingCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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
          <span>بازگشت به خدمات</span>
        </button>

        <span className="text-xs font-bold text-slate-400">جزئیات خدمت</span>
      </div>

      {/* Header Card */}
      <div className="bg-white rounded-3xl border border-[#E9E6EE] p-5 flex flex-col gap-3 shadow-2xs">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-lg font-black text-[#33313A]">{service.title}</h1>
            <p className="text-xs text-[#667085] leading-relaxed">{service.description}</p>
          </div>

          <div className="w-12 h-12 rounded-2xl bg-[#F5F3F8] text-[#7541A5] flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6 stroke-[1.8]" />
          </div>
        </div>

        {/* Integration Status Banner */}
        {service.status === 'active_demo' && (
          <div className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-200 rounded-2xl text-[11px] text-[#7541A5] leading-relaxed">
            <Info className="w-4 h-4 shrink-0 text-[#7541A5]" />
            <span>
              <strong>حالت آزمایشی:</strong> درخواست شما با چرخه کامل، کد رهگیری و قابلیت ارجاع در کارتابل آزمایشی ثبت خواهد شد.
            </span>
          </div>
        )}
        {service.status === 'informational' && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-800 leading-relaxed">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>
              <strong>نیازمند اتصال رسمی:</strong> اتصال سیستمی به این اداره در مرحله هماهنگی است؛ ثبت فعلی به عنوان پیش‌نویس در سامانه تربت نو بایگانی می‌شود.
            </span>
          </div>
        )}

        {/* Meta Pills */}
        <div className="flex items-center gap-3 pt-2 border-t border-slate-100 text-xs text-[#667085]">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>مهلت پاسخگویی: ۷۲ ساعت کاری</span>
          </div>
        </div>
      </div>

      {/* Submission Form */}
      <div className="bg-white rounded-3xl border border-[#E9E6EE] p-5 flex flex-col gap-4 shadow-2xs">
        <h3 className="text-sm font-black text-[#33313A] flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#7541A5]" />
          <span>فرم ثبت درخواست</span>
        </h3>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Dynamic Form Fields if defined */}
          {service.form?.fields?.map((field: any) => (
            <FormField key={field.name} label={field.label} required={field.required}>
              <input
                type="text"
                placeholder={field.placeholder || ''}
                value={formData[field.name] || ''}
                onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                className="w-full h-11 px-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:bg-white focus:outline-none focus:border-[#7541A5] transition-all"
              />
            </FormField>
          ))}

          {/* Description */}
          <FormField label="شرح درخواست یا مسئله شما" required hint="حداقل ۱۰ نویسه">
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="توضیحات کامل درخواست یا گزارش خود را به زبان ساده بنویسید..."
              className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:bg-white focus:outline-none focus:border-[#7541A5] transition-all leading-relaxed"
            />
          </FormField>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={submitting}
            disabled={description.trim().length < 10}
            fullWidth
          >
            ثبت نهایی و دریافت کد پیگیری
          </Button>
        </form>
      </div>

      {/* Success Modal */}
      <Dialog
        isOpen={!!successData}
        onClose={() => {
          const id = successData?.id;
          setSuccessData(null);
          if (id) onNavigateRequest(id);
        }}
        title="درخواست با موفقیت ثبت شد"
      >
        <div className="flex flex-col items-center text-center gap-4 py-2">
          <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 stroke-[2]" />
          </div>

          <div className="flex flex-col gap-1">
            <h4 className="text-sm font-extrabold text-[#33313A]">درخواست شما در سیستم تربت نو ثبت گردید</h4>
            <p className="text-xs text-[#667085]">
              کد پیگیری زیر را برای پیگیری‌های بعدی یادداشت یا کپی کنید:
            </p>
          </div>

          {/* Copyable Tracking Code */}
          <div className="flex items-center justify-between w-full bg-[#F5F3F8] p-3 rounded-2xl border border-purple-200/80">
            <span className="font-mono font-black text-base text-[#7541A5] tracking-widest">
              {successData?.trackingCode}
            </span>
            <Button variant="secondary" size="sm" onClick={handleCopy}>
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? 'کپی شد!' : 'کپی کد'}</span>
            </Button>
          </div>

          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={() => {
              const id = successData?.id;
              setSuccessData(null);
              if (id) onNavigateRequest(id);
            }}
          >
            مشاهده پرونده و پیگیری
          </Button>
        </div>
      </Dialog>
    </div>
  );
};
