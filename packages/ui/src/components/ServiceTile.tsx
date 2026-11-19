import React from 'react';
import * as LucideIcons from 'lucide-react';
import type { ServiceStatus } from '@torbat/contracts';
export interface ServiceTileProps {
    id: string;
    slug: string;
    title: string;
    shortTitle?: string;
    icon?: string;
    status?: ServiceStatus;
    isPopular?: boolean;
    onClick?: () => void;
    className?: string;
}
export const ServiceTile: React.FC<ServiceTileProps> = ({ title, shortTitle, icon = 'file-text', status, onClick, className = '', }) => {
    // Dynamically resolve linear Lucide icon
    const pascalName = icon
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join('');
    const IconComponent = ((LucideIcons as Record<string, unknown>)[pascalName] as React.ComponentType<{
        className?: string;
    }>) ||
        LucideIcons.FileText;
    const displayTitle = shortTitle || title;
    return (<button type="button" onClick={onClick} className={`group flex flex-col items-center justify-center p-3 text-center bg-white rounded-2xl border border-[#E9E6EE] hover:border-[#6F248E]/40 hover:shadow-md transition-all duration-150 active:scale-[0.97] min-h-[96px] cursor-pointer w-full relative select-none ${className}`}>
      {/* Icon with subtle background tint */}
      <div className="w-11 h-11 rounded-xl bg-[#F5EDF9] flex items-center justify-center text-[#6F248E] group-hover:scale-105 group-hover:bg-[#6F248E] group-hover:text-white transition-all duration-200 mb-2">
        <IconComponent className="w-5 h-5 stroke-[1.8]"/>
      </div>

      {/* Title */}
      <span className="text-xs font-semibold text-[#20212A] group-hover:text-[#6F248E] line-clamp-2 leading-snug px-1">
        {displayTitle}
      </span>

      {/* Demo / Status badge */}
      {status === 'active_demo' && (<span className="absolute top-2 left-2 text-[9px] font-medium text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded-full border border-purple-200">
          آزمایشی
        </span>)}
      {status === 'informational' && (<span className="absolute top-2 left-2 text-[9px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200">
          اتصال سازمان
        </span>)}
      {status === 'coming_soon' && (<span className="absolute top-2 left-2 text-[9px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">
          به‌زودی
        </span>)}
    </button>);
};
