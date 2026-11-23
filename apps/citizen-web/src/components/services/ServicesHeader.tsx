import React from 'react';
import { ArrowLeft, Search, X, Wifi, BatteryMedium } from 'lucide-react';
import { Logo } from '@torbat/ui';

interface ServicesHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onBack: () => void;
}

export const ServicesHeader: React.FC<ServicesHeaderProps> = ({
  searchQuery,
  onSearchChange,
  onBack,
}) => {
  return (
    <div className="relative bg-gradient-to-b from-[#42105F] via-[#521272] to-[#64158C] text-white pt-2 pb-6 px-4 rounded-b-[32px] shadow-lg shadow-purple-950/20">
      
      {/* 1. Mobile Status Bar Mockup */}
      <div className="flex items-center justify-between text-[11px] font-sans opacity-85 px-1 pb-3 text-purple-150">
        <span className="font-semibold tracking-wider font-mono">10:24</span>
        <div className="flex items-center gap-1.5">
          <Wifi size={13} className="stroke-[2.2]" />
          <BatteryMedium size={14} className="stroke-[2.2]" />
        </div>
      </div>

      {/* 2. Top Navigation Bar */}
      <div className="flex items-center justify-between gap-3 pt-1 pb-4">
        {/* Left: Back Button */}
        <button
          type="button"
          onClick={onBack}
          aria-label="بازگشت"
          className="w-10 h-10 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 transition-all flex items-center justify-center text-white border border-white/20 shadow-xs cursor-pointer"
        >
          <ArrowLeft size={18} className="stroke-[2.5]" />
        </button>

        {/* Center: Title & Subtitle */}
        <div className="flex-1 text-center">
          <h1 className="text-lg font-black tracking-tight text-white drop-shadow-xs">
            همه خدمات
          </h1>
          <p className="text-[11px] text-[#E8D4F4] font-medium mt-0.5">
            دسته‌بندی کامل خدمات تربتینو
          </p>
        </div>

        {/* Right: Torbatino Logo */}
        <div className="flex items-center justify-end">
          <img
            src="/brand/horizontal-logo-transparent.png"
            alt="تربتینو"
            className="h-8 object-contain brightness-0 invert"
          />
        </div>
      </div>

      {/* 3. Large Rounded Search Bar */}
      <div className="relative mt-1">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="جست‌وجوی خدمت، سازمان یا موضوع..."
          className="w-full bg-white text-[#24202A] placeholder:text-[#948D9E] text-xs font-medium rounded-2xl py-3.5 pr-11 pl-10 shadow-md border-0 focus:outline-none focus:ring-2 focus:ring-[#F5AE16] transition-all"
        />

        {/* Search Icon */}
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#77717E] pointer-events-none">
          <Search size={18} className="stroke-[2.2]" />
        </div>

        {/* Clear Button */}
        {searchQuery.trim() && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            aria-label="پاک کردن جست‌وجو"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={13} className="stroke-[2.5]" />
          </button>
        )}
      </div>
    </div>
  );
};
