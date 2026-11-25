import React, { useState } from 'react';
import { Button, Dialog, FormField } from '@torbat/ui';
import {
  User,
  Phone,
  ShieldCheck,
  Building,
  HelpCircle,
  Info,
  LogOut,
  ChevronLeft,
  PhoneCall,
  Check,
  Flame,
  Droplet,
  Zap,
  Truck,
  HeartHandshake,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export interface ProfilePageProps {
  onNavigateMap: () => void;
  onNavigateRequests: () => void;
}

const EMERGENCY_NUMBERS = [
  { name: '۱۳۷ شهرداری تربت حیدریه', number: '137', desc: 'سد معبر، نظافت، آسفالت و خدمات شهری', icon: Truck, color: 'text-purple-600 bg-purple-50' },
  { name: '۱۲۲ امداد آب و فاضلاب', number: '122', desc: 'شکستگی لوله آب و حوادث شبکه', icon: Droplet, color: 'text-blue-600 bg-blue-50' },
  { name: '۱۲۱ اتفاقات برق', number: '121', desc: 'خاموشی معابر، قطعی برق و خطرات شبکه', icon: Zap, color: 'text-amber-600 bg-amber-50' },
  { name: '۱۹۴ امداد و حوادث گاز', number: '194', desc: 'نشت گاز، افت فشار و حوادث', icon: Flame, color: 'text-rose-600 bg-rose-50' },
];

const FAQS = [
  {
    q: 'کد رهگیری چیست و چگونه کار می‌کند؟',
    a: 'هر درخواستی که در تربتینو ثبت می‌شود، یک کد یکتای ۱۰ رقمی (مانند TM-XXXX-XXXX) دریافت می‌کند. با وارد کردن این کد در بخش «پیگیری» بدون نیاز به تماس تلفنی می‌توانید مرحله‌به‌مرحله رسیدگی به مشکل خود را مشاهده کنید.',
  },
  {
    q: 'مدت‌زمان رسیدگی به گزارش‌های مطالبه شهری چقدر است؟',
    a: 'بر اساس تعهد استاندارد (SLA) تعریف‌شده در تربتینو، گزارش‌های ثبت‌شده ظرف حداکثر ۴ ساعت کاری توسط کارشناس مربوطه بررسی اولیه شده و وضعیت نهایی آنها معمولاً ظرف ۲۴ تا ۷۲ ساعت کاری مشخص می‌شود.',
  },
  {
    q: 'آیا برای استفاده از خدمات نیازمند حضور در اداره هستم؟',
    a: 'هدف تربتینو کاهش مراجعات حضوری است. تمامی خدمات با برچسب «فعال» یا «آزمایشی» کاملاً به‌صورت دیجیتال ثبت و مدارک دریافت می‌شوند. برای خدمات خاص که نیازمند امضای فیزیکی است، مدارک از قبل آماده و وقت مراجعه تعیین می‌شود.',
  },
  {
    q: 'اگر از پاسخ اداره رضایت نداشتم چه کنم؟',
    a: 'پس از اعلام حل مشکل، شما می‌توانید به پاسخ کارشناس امتیاز بدهید. در صورت عدم رضایت، دکمه «درخواست بررسی مجدد» فعال است که پرونده را با یادداشت شما به بازرسی و سرپرست مربوطه ارجاع می‌دهد.',
  },
];

export const ProfilePage: React.FC<ProfilePageProps> = ({
  onNavigateMap,
  onNavigateRequests,
}) => {
  const { user, loginAsDemoCitizen, loginWithOtp, requestOtp, logout } = useAuth();
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [customMobile, setCustomMobile] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loadingOtp, setLoadingOtp] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const handleSendOtp = async () => {
    if (!customMobile || customMobile.length < 11) return;
    setLoadingOtp(true);
    try {
      const devCode = await requestOtp(customMobile);
      setOtpSent(true);
      if (devCode) {
        setOtpCode(devCode);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode) return;
    setLoadingOtp(true);
    try {
      await loginWithOtp(customMobile, otpCode);
      setShowSwitchModal(false);
      setOtpSent(false);
      setCustomMobile('');
      setOtpCode('');
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingOtp(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 pb-24 text-right">
      {/* 1. Header Profile Card */}
      <div className="bg-white rounded-2xl p-5 border border-purple-100 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-700 to-purple-500 text-white flex items-center justify-center font-bold text-xl shadow-md">
            {user?.displayName ? user.displayName.slice(0, 1) : <User size={28} />}
          </div>
          <div>
            <h2 className="font-black text-lg text-slate-800">
              {user?.displayName || 'شهروند گرامی'}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5 dir-ltr flex items-center gap-1 justify-end">
              <span>{user?.mobile || 'ورود به عنوان مهمان'}</span>
              <Phone size={12} className="text-purple-600" />
            </p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                <ShieldCheck size={12} />
                احراز هویت شده
              </span>
              <span className="inline-flex items-center text-[11px] text-slate-400">
                تربت حیدریه
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowSwitchModal(true)}
          className="text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-2 rounded-xl transition-colors border border-purple-200"
        >
          تغییر کاربر
        </button>
      </div>

      {/* 2. Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onNavigateRequests}
          className="bg-white p-4 rounded-xl border border-slate-150 shadow-sm text-right flex flex-col justify-between hover:border-purple-300 transition-colors"
        >
          <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center mb-3">
            <Building size={18} />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-800">درخواست‌های من</h4>
            <p className="text-xs text-slate-500 mt-1">مشاهده کارنامه و رهگیری</p>
          </div>
        </button>

        <button
          onClick={onNavigateMap}
          className="bg-white p-4 rounded-xl border border-slate-150 shadow-sm text-right flex flex-col justify-between hover:border-purple-300 transition-colors"
        >
          <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
            <Sparkles size={18} />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-800">نقشه اماکن و گزارش‌ها</h4>
            <p className="text-xs text-slate-500 mt-1">مشاهده اماکن شهری و رویدادها</p>
          </div>
        </button>
      </div>

      {/* 3. Emergency / Civic Contact Numbers */}
      <div className="bg-white rounded-2xl p-4 border border-slate-150 shadow-sm">
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <PhoneCall size={16} className="text-purple-600" />
            شماره‌های فوریتی و امدادی شهر
          </h3>
          <span className="text-[11px] text-slate-400">تماس مستقیم</span>
        </div>

        <div className="space-y-2">
          {EMERGENCY_NUMBERS.map((em, idx) => {
            const Icon = em.icon;
            return (
              <a
                key={idx}
                href={`tel:${em.number}`}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-purple-50/60 border border-slate-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${em.color}`}>
                    <Icon size={16} />
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-slate-800">{em.name}</h5>
                    <p className="text-[11px] text-slate-500">{em.desc}</p>
                  </div>
                </div>
                <span className="font-black text-sm text-purple-700 dir-ltr bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                  {em.number}
                </span>
              </a>
            );
          })}
        </div>
      </div>

      {/* 4. Support and Help */}
      <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden divide-y divide-slate-100">
        <button
          onClick={() => setShowFaqModal(true)}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-right"
        >
          <div className="flex items-center gap-3 text-slate-700">
            <HelpCircle size={18} className="text-purple-600" />
            <span className="text-sm font-semibold">پرسش‌های متداول (FAQ)</span>
          </div>
          <ChevronLeft size={16} className="text-slate-400" />
        </button>

        <button
          onClick={() => setShowAboutModal(true)}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-right"
        >
          <div className="flex items-center gap-3 text-slate-700">
            <Info size={18} className="text-purple-600" />
            <span className="text-sm font-semibold">درباره سامانه «تربتینو»</span>
          </div>
          <ChevronLeft size={16} className="text-slate-400" />
        </button>

        <button
          onClick={logout}
          className="w-full flex items-center justify-between p-4 hover:bg-rose-50 transition-colors text-right text-rose-600"
        >
          <div className="flex items-center gap-3">
            <LogOut size={18} />
            <span className="text-sm font-semibold">خروج از حساب کاربری</span>
          </div>
        </button>
      </div>

      {/* Footer Branding Note */}
      <div className="text-center pt-2">
        <p className="text-xs text-slate-400 font-medium">
          تربتینو • شهر تو، همراه تو
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          توسعه توسط دیجیرال (شرکت نوادید شرق) با همکاری مدیریت شهری
        </p>
      </div>

      {/* Switch / Login Dialog */}
      <Dialog
        isOpen={showSwitchModal}
        onClose={() => setShowSwitchModal(false)}
        title="تغییر حساب کاربری یا ورود"
      >
        <div className="space-y-4 pt-2">
          <p className="text-xs text-slate-600 leading-relaxed">
            برای آزمایش سریع عملکرد سامانه می‌توانید یکی از کاربران تستی از پیش تعریف‌شده را انتخاب کنید یا با شماره دلخواه وارد شوید:
          </p>

          <div className="space-y-2">
            <button
              onClick={() => {
                loginAsDemoCitizen('09120000001');
                setShowSwitchModal(false);
              }}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-purple-200 bg-purple-50/70 hover:bg-purple-100/70 transition-colors text-right"
            >
              <div>
                <p className="text-xs font-bold text-purple-900">علی رضایی (شهروند نمونه)</p>
                <p className="text-[11px] text-purple-700 font-mono">09120000001</p>
              </div>
              <span className="text-xs font-semibold text-purple-700">ورود سریع ←</span>
            </button>

            <button
              onClick={() => {
                loginAsDemoCitizen('09120000002');
                setShowSwitchModal(false);
              }}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors text-right"
            >
              <div>
                <p className="text-xs font-bold text-slate-800">فاطمه کریمی (شهروند منطقه ۲)</p>
                <p className="text-[11px] text-slate-500 font-mono">09120000002</p>
              </div>
              <span className="text-xs font-semibold text-slate-600">ورود سریع ←</span>
            </button>
          </div>

          <div className="relative my-4 text-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
            <span className="relative bg-white px-3 text-[11px] text-slate-400">یا ورود با شماره جدید</span>
          </div>

          <div className="space-y-3">
            <FormField label="شماره تلفن همراه" hint="مثال: 09151234567">
              <input
                type="tel"
                value={customMobile}
                onChange={(e) => setCustomMobile(e.target.value)}
                placeholder="09..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-center"
              />
            </FormField>

            {!otpSent ? (
              <Button
                variant="primary"
                onClick={handleSendOtp}
                isLoading={loadingOtp}
                className="w-full"
                disabled={!customMobile || customMobile.length < 11}
              >
                دریافت کد تایید
              </Button>
            ) : (
              <div className="space-y-3">
                <FormField label="کد تایید پیامکی (در محیط تستی خودکار پر می‌شود)">
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="۱۲۳۴۵۶"
                    className="w-full px-3 py-2 text-sm border border-purple-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-center tracking-widest text-lg"
                  />
                </FormField>
                <Button
                  variant="primary"
                  onClick={handleVerifyOtp}
                  isLoading={loadingOtp}
                  className="w-full"
                >
                  تایید و ورود
                </Button>
              </div>
            )}
          </div>
        </div>
      </Dialog>

      {/* FAQ Dialog */}
      <Dialog
        isOpen={showFaqModal}
        onClose={() => setShowFaqModal(false)}
        title="پرسش‌های متداول سامانه تربتینو"
      >
        <div className="space-y-3 pt-2">
          {FAQS.map((faq, idx) => (
            <div key={idx} className="border border-slate-150 rounded-xl overflow-hidden">
              <button
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className="w-full p-3.5 flex items-center justify-between text-right bg-slate-50 font-bold text-xs text-slate-800"
              >
                <span>{faq.q}</span>
                <ChevronLeft
                  size={16}
                  className={`text-slate-400 transform transition-transform ${activeFaq === idx ? '-rotate-90' : ''}`}
                />
              </button>
              {activeFaq === idx && (
                <div className="p-3.5 bg-white text-xs text-slate-600 leading-relaxed border-t border-slate-150">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </Dialog>

      {/* About Dialog */}
      <Dialog
        isOpen={showAboutModal}
        onClose={() => setShowAboutModal(false)}
        title="درباره سامانه جامع تربتینو"
      >
        <div className="space-y-4 pt-2 text-xs leading-relaxed text-slate-600">
          <div className="flex items-center justify-center py-2">
            <img src="/brand/horizontal-logo-transparent.png" alt="تربتینو" className="h-12 object-contain" />
          </div>

          <p>
            سامانه <strong>«تربتینو»</strong> با شعار <em>«شهر تو، همراه تو»</em> به عنوان پنجره واحد و درگاه هوشمند خدمات الکترونیک شهری، ارتباط شهروندان گرامی با مدیریت شهری و ادارات خدمات‌رسان شهرستان تربت حیدریه را تسهیل می‌نماید.
          </p>

          <div className="p-3 bg-purple-50 rounded-xl border border-purple-150 space-y-1.5">
            <h5 className="font-bold text-purple-900 text-xs">ارکان هویت بصری و معنوی:</h5>
            <ul className="list-disc list-inside space-y-1 text-purple-800 text-[11px]">
              <li><strong>طاق و محراب:</strong> برگرفته از معماری و آرامگاه تاریخی قطب‌الدین حیدر</li>
              <li><strong>گل و پرچم زعفران:</strong> نماد هویت، اصالت و قطب طلای سرخ جهان</li>
              <li><strong>قوس و خط صعودی زرین:</strong> مسیر تعالی، پیشرفت و خدمات مدرن شهروندی</li>
            </ul>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-[11px] text-slate-500">
              توسعه‌یافته با بالاترین استانداردهای مهندسی نرم‌افزار، امنیت و طراحی انسان‌محور توسط دیجیرال (شرکت نوادید شرق).
            </p>
          </div>

          <Button variant="primary" onClick={() => setShowAboutModal(false)} className="w-full">
            متوجه شدم
          </Button>
        </div>
      </Dialog>
    </div>
  );
};
