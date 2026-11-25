import React, { useState } from 'react';
import { Button, FormField } from '@torbat/ui';
import {
  ShieldAlert,
  Building2,
  Droplet,
  Zap,
  Lock,
  ArrowRight,
  Sparkles,
  Phone,
} from 'lucide-react';
import { useStaffAuth } from '../context/StaffAuthContext';

export const StaffLoginPage: React.FC = () => {
  const { loginAsDemoStaff, requestOtp, loginWithOtp, publicDemo, demoAccounts } = useStaffAuth();
  const [mobile, setMobile] = useState('');
  const [code, setCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDemoLogin = async (num: string) => {
    setLoading(true);
    setError('');
    try {
      await loginAsDemoStaff(num);
    } catch (err: any) {
      setError(err.message || 'خطا در ورود به سامانه سازمانی');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!mobile || mobile.length < 11) return;
    setLoading(true);
    setError('');
    try {
      const devCode = await requestOtp(mobile);
      setOtpSent(true);
      if (devCode) setCode(devCode);
    } catch (err: any) {
      setError(err.message || 'خطا در ارسال کد تایید');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!code) return;
    setLoading(true);
    setError('');
    try {
      await loginWithOtp(mobile, code);
    } catch (err: any) {
      setError(err.message || 'کد تایید نادرست است');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1E1B2E] via-[#2A233C] to-[#1E1B2E] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden text-slate-800">
        
        {/* Brand Banner */}
        <div className="bg-[#592582] p-6 text-center text-white relative">
          <div className="flex justify-center mb-3">
            <div className="bg-white rounded-2xl px-4 py-2.5 shadow-sm inline-flex items-center justify-center">
              <img src="/brand/full-logo-transparent.png" alt="تربتینو | TORBATINO — شهر تو، همراه تو" className="h-20 object-contain" />
            </div>
          </div>
          <h1 className="text-lg font-black tracking-tight">میز کار و کارتابل سازمانی تربتینو</h1>
          <p className="text-xs text-purple-200 mt-1">
            سامانه مدیریت درخواست‌ها، ارجاع، رسیدگی و رضایت‌سنجی شهروندی
          </p>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <ShieldAlert size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {publicDemo ? (
            <section className="space-y-3">
              <h2 className="text-sm font-bold text-purple-950">ورود آزمایشی به پنل‌ها</h2>
              <p className="text-xs text-slate-600">یک حساب نمونه انتخاب کنید. این محیط عمومی است و برای تمرین از داده ساختگی استفاده کنید.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {demoAccounts.map(account => (
                  <button key={account.mobile} type="button" disabled={loading}
                    className="rounded-xl border border-purple-200 bg-purple-50 p-3 text-right text-xs font-bold text-purple-950 hover:bg-purple-100 disabled:opacity-60"
                    onClick={() => void handleDemoLogin(account.mobile)}>
                    {account.label}
                  </button>
                ))}
              </div>
              {!demoAccounts.length && <p className="text-xs text-slate-600">در حال دریافت حساب‌های نمونه…</p>}
            </section>
          ) : <>
          {/* 1. Fast Demo Switcher */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700">ورود سریع با نقش‌های کاربری پیش‌فرض:</span>
              <span className="text-[10px] text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full font-bold">نسخه آزمایشی</span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => handleDemoLogin('09130000002')}
                disabled={loading}
                className="w-full text-right p-3 rounded-xl border border-purple-200 bg-purple-50/70 hover:bg-purple-100/70 transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-700 text-white flex items-center justify-center">
                    <Building2 size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-purple-950">مسئول ارجاع شهرداری</h4>
                    <p className="text-[11px] text-purple-700 font-mono">09130000002 (دسترسی کامل ارجاع و تغییر وضعیت)</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-purple-700 group-hover:translate-x-[-4px] transition-transform">ورود ←</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('09130000001')}
                disabled={loading}
                className="w-full text-right p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-700 text-white flex items-center justify-center">
                    <Building2 size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">کارشناس عملیات شهرداری</h4>
                    <p className="text-[11px] text-slate-500 font-mono">09130000001 (اقدام، درج نتیجه و حل پرونده)</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-600 group-hover:translate-x-[-4px] transition-transform">ورود ←</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('09140000002')}
                disabled={loading}
                className="w-full text-right p-3 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100/60 transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                    <Droplet size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-blue-950">مسئول ارجاع آب و فاضلاب</h4>
                    <p className="text-[11px] text-blue-700 font-mono">09140000002 (کارتابل حوادث شبکه آبفا)</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-blue-700 group-hover:translate-x-[-4px] transition-transform">ورود ←</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('09150000002')}
                disabled={loading}
                className="w-full text-right p-3 rounded-xl border border-amber-200 bg-amber-50/60 hover:bg-amber-100/60 transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center">
                    <Zap size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-950">مسئول ارجاع برق شهرستان</h4>
                    <p className="text-[11px] text-amber-700 font-mono">09150000002 (کارتابل شبکه و روشنایی برق)</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-amber-700 group-hover:translate-x-[-4px] transition-transform">ورود ←</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('09100000000')}
                disabled={loading}
                className="w-full text-right p-3 rounded-xl border border-rose-200 bg-rose-50/60 hover:bg-rose-100/60 transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-700 text-white flex items-center justify-center">
                    <Lock size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-rose-950">مدیر ارشد سامانه (Super Admin)</h4>
                    <p className="text-[11px] text-rose-700 font-mono">09100000000 (دسترسی به تمامی سازمان‌ها)</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-rose-700 group-hover:translate-x-[-4px] transition-transform">ورود ←</span>
              </button>
            </div>
          </div>

          <div className="relative my-4 text-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
            <span className="relative bg-white px-3 text-[11px] text-slate-400">یا ورود با شماره کارشناس</span>
          </div>

          {/* 2. Manual Mobile OTP */}
          <div className="space-y-3">
            <FormField label="شماره موبایل سازمانی" hint="شماره ثبت‌شده در سامانه پرسنلی">
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="0913..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 font-mono text-center"
              />
            </FormField>

            {!otpSent ? (
              <Button
                variant="primary"
                onClick={handleSendOtp}
                isLoading={loading}
                disabled={!mobile || mobile.length < 11}
                className="w-full bg-[#592582] hover:bg-[#7541A5]"
              >
                ارسال کد تایید پیامکی
              </Button>
            ) : (
              <div className="space-y-3">
                <FormField label="کد تایید ورود">
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="۱۲۳۴۵۶"
                    className="w-full px-3 py-2 text-sm border border-purple-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 font-mono text-center tracking-widest text-lg font-bold"
                  />
                </FormField>
                <Button
                  variant="primary"
                  onClick={handleVerifyOtp}
                  isLoading={loading}
                  className="w-full bg-[#592582] hover:bg-[#7541A5]"
                >
                  تایید و ورود به کارتابل
                </Button>
              </div>
            )}
          </div>
          </>}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-500">
            سامانه تربتینو • شهر تو، همراه تو • شرکت نوادید شرق (دیجیرال)
          </p>
        </div>
      </div>
    </div>
  );
};
