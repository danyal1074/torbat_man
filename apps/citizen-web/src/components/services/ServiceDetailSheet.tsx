import React, { useState } from 'react';
import { X, Building2, Clock, ShieldCheck, ArrowRight, CheckCircle2, Copy, Send } from 'lucide-react';
import { Button, FormField } from '@torbat/ui';
import { ServiceIcon } from './ServiceIcons';
import type { ServiceItem } from '../../data/servicesCatalog';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

interface ServiceDetailSheetProps {
  service: ServiceItem | null;
  onClose: () => void;
  onNavigateReport: () => void;
  onNavigateAssistant: () => void;
  onNavigateMap: () => void;
}

export const ServiceDetailSheet: React.FC<ServiceDetailSheetProps> = ({
  service,
  onClose,
  onNavigateReport,
  onNavigateAssistant,
  onNavigateMap,
}) => {
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedCode, setSubmittedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!service) return null;

  const handleSubmitDemoRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await api.createRequest({
        serviceSlug: service.slug,
        title: service.title,
        description: description.trim(),
        attachmentIds: [],
      });
      setSubmittedCode(res.data.trackingCode);
    } catch {
      // Fallback demo code
      const randCode = 'TM-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
      setSubmittedCode(randCode);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = () => {
    if (submittedCode) {
      navigator.clipboard.writeText(submittedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 text-right animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-150 flex items-center justify-between bg-[#FAF8FC]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white border border-purple-200 shadow-2xs flex items-center justify-center shrink-0">
              <ServiceIcon name={service.iconName} size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-[#64158C] bg-purple-100/70 px-2.5 py-0.5 rounded-full">
                  {service.categoryTitle}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  service.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {service.statusLabel}
                </span>
              </div>
              <h2 className="text-base font-black text-[#24202A] mt-1">{service.title}</h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs leading-relaxed">
          {submittedCode ? (
            <div className="p-6 bg-purple-50 rounded-2xl border border-purple-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="font-extrabold text-sm text-[#24202A]">
                درخواست شما با موفقیت در سامانه ثبت شد
              </h3>
              <p className="text-xs text-slate-600">
                کد رهگیری اختصاصی پرونده شما صادر گردید:
              </p>
              <div className="flex items-center justify-center gap-2 dir-ltr">
                <span className="font-mono text-base font-black text-[#64158C] bg-white px-4 py-2 rounded-xl border border-purple-200 shadow-xs">
                  {submittedCode}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="p-2 rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-colors"
                  title="کپی کد رهگیری"
                >
                  <Copy size={16} />
                </button>
              </div>
              {copied && <span className="text-[11px] text-emerald-600 font-bold block">کد رهگیری کپی شد!</span>}
              <Button variant="primary" onClick={onClose} className="w-full mt-2">
                متوجه شدم
              </Button>
            </div>
          ) : (
            <>
              {/* Description */}
              <div className="space-y-1.5">
                <h4 className="font-bold text-xs text-slate-800">شرح خدمت:</h4>
                <p className="text-slate-600 leading-relaxed bg-[#FAF8FC] p-3.5 rounded-2xl border border-slate-150">
                  {service.description}
                </p>
              </div>

              {/* Service Details info */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 flex items-center gap-2">
                  <Building2 size={16} className="text-[#64158C] shrink-0" />
                  <div>
                    <span className="text-slate-400 block text-[10px]">سازمان متولی:</span>
                    <span className="font-bold text-slate-800">{service.organizationName}</span>
                  </div>
                </div>

                {service.sla && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 flex items-center gap-2">
                    <Clock size={16} className="text-[#F5AE16] shrink-0" />
                    <div>
                      <span className="text-slate-400 block text-[10px]">مدت زمان پاسخگویی:</span>
                      <span className="font-bold text-slate-800">{service.sla}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Direct Route Action Buttons if special */}
              {service.directRoute === 'report' ? (
                <Button
                  variant="primary"
                  onClick={() => {
                    onClose();
                    onNavigateReport();
                  }}
                  className="w-full py-3 bg-[#64158C] hover:bg-[#521272]"
                >
                  {service.actionText || 'ورود به فرم ثبت گزارش'}
                </Button>
              ) : service.directRoute === 'assistant' ? (
                <Button
                  variant="primary"
                  onClick={() => {
                    onClose();
                    onNavigateAssistant();
                  }}
                  className="w-full py-3 bg-[#64158C] hover:bg-[#521272]"
                >
                  {service.actionText || 'گفت‌وگو با دستیار هوشمند'}
                </Button>
              ) : service.directRoute === 'map' ? (
                <Button
                  variant="primary"
                  onClick={() => {
                    onClose();
                    onNavigateMap();
                  }}
                  className="w-full py-3 bg-[#64158C] hover:bg-[#521272]"
                >
                  {service.actionText || 'مشاهده روی نقشه تربت حیدریه'}
                </Button>
              ) : (
                /* Interactive Request Form */
                <form onSubmit={handleSubmitDemoRequest} className="space-y-3 pt-2 border-t border-slate-150">
                  <h4 className="font-bold text-xs text-slate-800">ثبت آنلاین درخواست یا استعلام:</h4>
                  <FormField label="توضیحات و شرح درخواست" required>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="متن پیام، استعلام یا شرح درخواست خود را بنویسید..."
                      className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#64158C]"
                    />
                  </FormField>
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isSubmitting}
                    disabled={!description.trim()}
                    className="w-full bg-[#64158C] hover:bg-[#521272] flex items-center justify-center gap-1.5"
                  >
                    <Send size={15} />
                    <span>{service.actionText || 'ارسال و دریافت کد پیگیری'}</span>
                  </Button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
