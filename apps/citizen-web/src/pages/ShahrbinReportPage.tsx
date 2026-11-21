import React, { useState, useEffect } from 'react';
import { Button, FormField, Stepper, Dialog } from '@torbat/ui';
import {
  ArrowRight,
  Camera,
  MapPin,
  Sparkles,
  CheckCircle,
  Copy,
  Upload,
  AlertCircle,
  X,
  Crosshair,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export interface ShahrbinReportPageProps {
  onBack: () => void;
  onNavigateRequest: (id: string) => void;
}

const TOPICS = [
  { slug: 'report-road', title: 'خرابی آسفالت و معبر', icon: '🚧', desc: 'چاله، دست‌انداز، جدول شکسته و پیاده‌رو' },
  { slug: 'report-waste', title: 'زباله و نظافت شهری', icon: '🗑️', desc: 'سطل زباله خراب، نخاله ساختمانی، نظافت معبر' },
  { slug: 'report-lighting', title: 'روشنایی و برق معابر', icon: '💡', desc: 'تیر برق خاموش، سیم رهاشده، تاریکی پارک' },
  { slug: 'report-water-leak', title: 'آب و فاضلاب', icon: '💧', desc: 'ترکیدگی لوله، افت فشار، نشت فاضلاب' },
  { slug: 'report-greenery', title: 'فضای سبز و درختان', icon: '🌳', desc: 'هرس شاخه خطرناک، آبیاری، چمن و بوستان' },
  { slug: 'report-muni-general', title: 'سایر موارد شهری', icon: '🏛️', desc: 'سد معبر، علائم ترافیکی و تجهیزات شهری' },
];

export const ShahrbinReportPage: React.FC<ShahrbinReportPageProps> = ({
  onBack,
  onNavigateRequest,
}) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);

  // Form State
  const [selectedTopic, setSelectedTopic] = useState<string>('report-road');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadedAttachmentId, setUploadedAttachmentId] = useState<string | null>(null);

  // AI Triage
  const [aiSuggestion, setAiSuggestion] = useState<any>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Location (Default: Torbat-e Heydarieh center 35.2741, 59.2195)
  const [lat, setLat] = useState(35.2741);
  const [lng, setLng] = useState(59.2195);
  const [address, setAddress] = useState('تربت حیدریه، میدان شهدا');
  const [isLocating, setIsLocating] = useState(false);

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{ id: string; trackingCode: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const steps = [
    { id: 0, label: 'موضوع' },
    { id: 1, label: 'شرح و تصویر' },
    { id: 2, label: 'موقعیت' },
    { id: 3, label: 'بازبینی' },
  ];

  // Run AI Triage when description changes (debounced)
  useEffect(() => {
    if (description.trim().length > 12) {
      const timer = setTimeout(async () => {
        setIsAiLoading(true);
        try {
          const res = await api.aiTriage(description);
          if (res?.data) {
            setAiSuggestion(res.data);
            if (res.data.serviceSlug) {
              setSelectedTopic(res.data.serviceSlug);
            }
          }
        } catch {
          // graceful fallback
        } finally {
          setIsAiLoading(false);
        }
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [description]);

  // Handle Photo selection
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));

      // Upload file immediately to private storage
      try {
        const uploadRes = await api.uploadFile(file);
        if (uploadRes?.id) {
          setUploadedAttachmentId(uploadRes.id);
        }
      } catch (err: any) {
        console.warn('File upload warning:', err.message);
      }
    }
  };

  // GPS Geolocation
  const handleGps = () => {
    if ('geolocation' in navigator) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLng(pos.coords.longitude);
          setAddress(`موقعیت ثبت‌شده GPS (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`);
          setIsLocating(false);
        },
        () => {
          alert('امکان دریافت خودکار موقعیت مکانی میسر نشد. می‌توانید نشانی را دستی وارد نمایید.');
          setIsLocating(false);
        },
        { timeout: 7000 }
      );
    }
  };

  // Final Submit
  const handleFinalSubmit = async () => {
    setSubmitting(true);
    const idempKey = `shahrbin-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    try {
      const res = await api.createRequest(
        {
          serviceSlug: selectedTopic,
          description,
          location: {
            lat,
            lng,
            address,
          },
          attachmentIds: uploadedAttachmentId ? [uploadedAttachmentId] : [],
        },
        idempKey
      );
      setSuccessData(res.data);
    } catch (err: any) {
      alert(err.message || 'خطا در ثبت گزارش');
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
          <span>انصراف</span>
        </button>

        <span className="text-xs font-bold text-slate-500">شهر‌بین؛ گزارش مشکلات شهر</span>
      </div>

      {/* Stepper Progress */}
      <Stepper steps={steps} currentStep={currentStep} />

      {/* Step 0: Choose Topic */}
      {currentStep === 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1 px-1">
            <h3 className="text-base font-extrabold text-[#33313A]">مشکل مربوط به کدام حوزه است؟</h3>
            <p className="text-xs text-[#667085]">یکی از موضوعات شهری زیر را انتخاب کنید:</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {TOPICS.map((t) => {
              const isSelected = selectedTopic === t.slug;
              return (
                <button
                  key={t.slug}
                  type="button"
                  onClick={() => setSelectedTopic(t.slug)}
                  className={`flex items-start gap-3 p-4 rounded-2xl border text-right transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'bg-[#F5F3F8] border-[#7541A5] shadow-xs'
                      : 'bg-white border-[#E9E6EE] hover:border-slate-300'
                  }`}
                >
                  <span className="text-2xl shrink-0 p-1 bg-white rounded-xl shadow-2xs">{t.icon}</span>
                  <div className="flex flex-col gap-0.5">
                    <span className={`text-xs font-bold ${isSelected ? 'text-[#7541A5]' : 'text-[#33313A]'}`}>
                      {t.title}
                    </span>
                    <span className="text-[11px] text-[#667085] leading-relaxed">{t.desc}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <Button variant="primary" size="lg" onClick={() => setCurrentStep(1)} fullWidth className="mt-2">
            مرحله بعد: شرح مشکل
          </Button>
        </div>
      )}

      {/* Step 1: Description & Photo & AI */}
      {currentStep === 1 && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1 px-1">
            <h3 className="text-base font-extrabold text-[#33313A]">شرح مشکل و افزودن تصویر</h3>
            <p className="text-xs text-[#667085]">توضیح کوتاه بدهید؛ هوش مصنوعی به تکمیل گزارش کمک می‌کند.</p>
          </div>

          {/* Description */}
          <FormField label="شرح گزارش" required hint="مثلاً: در تقاطع خیابان فردوسی یک چاله عمیق به وجود آمده است.">
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="شرح مشکل را به زبان عامیانه و ساده بنویسید..."
              className="w-full p-3 bg-white rounded-2xl border border-[#E9E6EE] text-xs focus:outline-none focus:border-[#7541A5] leading-relaxed shadow-2xs"
            />
          </FormField>

          {/* AI Triage Suggestion Pill */}
          {isAiLoading && (
            <div className="flex items-center gap-2 p-3 bg-purple-50/60 rounded-2xl border border-purple-100 text-xs text-[#7541A5]">
              <Sparkles className="w-4 h-4 animate-spin text-[#7541A5]" />
              <span>هوش مصنوعی در حال تحلیل متن گزارش شما...</span>
            </div>
          )}
          {aiSuggestion && !isAiLoading && (
            <div className="flex items-start gap-2.5 p-3.5 bg-gradient-to-r from-purple-50 to-amber-50 rounded-2xl border border-purple-200/80 text-right">
              <Sparkles className="w-5 h-5 text-[#7541A5] shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-[#7541A5]">پیشنهاد هوشمند شهر‌بین:</span>
                <span className="text-xs text-[#33313A]">«{aiSuggestion.title}»</span>
                <span className="text-[10px] text-[#667085]">
                  دسته‌بندی و اداره مقصد به صورت خودکار پیشنهاد گردید.
                </span>
              </div>
            </div>
          )}

          {/* Photo Upload */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-[#33313A]">تصویر محل (اختیاری اما مفید)</label>
            {imagePreview ? (
              <div className="relative w-full h-44 rounded-2xl overflow-hidden border border-slate-200">
                <img src={imagePreview} alt="پیش‌نمایش" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview(null);
                    setUploadedAttachmentId(null);
                  }}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl border-2 border-dashed border-[#E9E6EE] hover:border-[#7541A5]/50 cursor-pointer transition-colors shadow-2xs">
                <Camera className="w-8 h-8 text-[#7541A5] mb-2 stroke-[1.8]" />
                <span className="text-xs font-bold text-[#33313A]">انتخاب عکس از گالری یا دوربین</span>
                <span className="text-[10px] text-[#667085] mt-1">فرمت‌های JPG، PNG (حداکثر ۵ مگابایت)</span>
                <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              </label>
            )}
          </div>

          <div className="flex items-center gap-2 mt-2">
            <Button variant="outline" onClick={() => setCurrentStep(0)} className="w-1/3">
              قبلی
            </Button>
            <Button
              variant="primary"
              size="lg"
              disabled={description.trim().length < 10}
              onClick={() => setCurrentStep(2)}
              className="w-2/3"
            >
              مرحله بعد: موقعیت مکانی
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Location Picker */}
      {currentStep === 2 && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1 px-1">
            <h3 className="text-base font-extrabold text-[#33313A]">تعیین موقعیت مکانی</h3>
            <p className="text-xs text-[#667085]">مکان مشکل در تربت حیدریه را مشخص کنید:</p>
          </div>

          {/* GPS Quick Button */}
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={handleGps}
            isLoading={isLocating}
            leftIcon={<Crosshair className="w-4 h-4" />}
            fullWidth
          >
            استفاده از مکان‌یاب خودکار گوشی (GPS)
          </Button>

          {/* Interactive Map Visual */}
          <div className="relative w-full h-48 bg-slate-100 rounded-3xl overflow-hidden border border-[#E9E6EE] flex items-center justify-center shadow-2xs">
            <iframe
              title="نقشه تربت حیدریه"
              width="100%"
              height="100%"
              frameBorder="0"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=59.2000%2C35.2600%2C59.2400%2C35.2900&layer=mapnik&marker=${lat}%2C${lng}`}
              className="w-full h-full pointer-events-none opacity-90"
            />
            <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-xl text-[10px] font-mono text-slate-700 shadow-2xs">
              {lat.toFixed(4)}, {lng.toFixed(4)}
            </div>
          </div>

          {/* Address Text */}
          <FormField label="نشانی یا نام خیابان/محله" required>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="مثال: تربت حیدریه، خیابان فردوسی، نرسیده به میدان شهدا"
              className="w-full h-11 px-3.5 bg-white rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#7541A5] shadow-2xs"
            />
          </FormField>

          <div className="flex items-center gap-2 mt-2">
            <Button variant="outline" onClick={() => setCurrentStep(1)} className="w-1/3">
              قبلی
            </Button>
            <Button
              variant="primary"
              size="lg"
              disabled={!address.trim()}
              onClick={() => setCurrentStep(3)}
              className="w-2/3"
            >
              مرحله بعد: بازبینی
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Submit */}
      {currentStep === 3 && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1 px-1">
            <h3 className="text-base font-extrabold text-[#33313A]">بازبینی و ثبت نهایی</h3>
            <p className="text-xs text-[#667085]">اطلاعات گزارش خود را پیش از ارسال بررسی کنید:</p>
          </div>

          <div className="bg-white rounded-3xl border border-[#E9E6EE] p-5 flex flex-col gap-3 shadow-2xs text-xs">
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-400">موضوع گزارش:</span>
              <span className="font-bold text-[#7541A5]">
                {TOPICS.find((t) => t.slug === selectedTopic)?.title || selectedTopic}
              </span>
            </div>

            <div className="flex flex-col gap-1 border-b border-slate-100 pb-2">
              <span className="text-slate-400">شرح گزارش:</span>
              <p className="text-[#33313A] leading-relaxed">{description}</p>
            </div>

            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-400">نشانی:</span>
              <span className="font-medium text-[#33313A]">{address}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">تصویر پیوست:</span>
              <span className="font-medium text-slate-700">
                {imageFile ? '۱ تصویر ضمیمه شده' : 'بدون تصویر'}
              </span>
            </div>
          </div>

          {/* Privacy Notice */}
          <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-[#667085]">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>اطلاعات تماس شما نزد سامانه محفوظ است و در گزارش‌های عمومی نمایش داده نمی‌شود.</span>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <Button variant="outline" onClick={() => setCurrentStep(2)} className="w-1/3">
              قبلی
            </Button>
            <Button
              variant="primary"
              size="lg"
              isLoading={submitting}
              onClick={handleFinalSubmit}
              className="w-2/3"
            >
              ارسال قطعی گزارش
            </Button>
          </div>
        </div>
      )}

      {/* Success Tracking Modal */}
      <Dialog
        isOpen={!!successData}
        onClose={() => {
          const id = successData?.id;
          setSuccessData(null);
          if (id) onNavigateRequest(id);
        }}
        title="گزارش با موفقیت ثبت شد"
      >
        <div className="flex flex-col items-center text-center gap-4 py-2">
          <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 stroke-[2]" />
          </div>

          <div className="flex flex-col gap-1">
            <h4 className="text-sm font-extrabold text-[#33313A]">گزارش شما به کارتابل مسئول مربوطه ارسال شد</h4>
            <p className="text-xs text-[#667085]">
              کد پیگیری زیر را برای رهگیری اقدامات کارشناسان ذخیره کنید:
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
            مشاهده پرونده و خط زمانی
          </Button>
        </div>
      </Dialog>
    </div>
  );
};
