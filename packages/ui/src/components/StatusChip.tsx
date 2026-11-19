import React from 'react';
import type { RequestStatus } from '@torbat/contracts';
export interface StatusChipProps {
    status: RequestStatus | string;
    size?: 'sm' | 'md';
    className?: string;
}
const STATUS_CONFIG: Record<string, {
    label: string;
    bg: string;
    text: string;
    dot: string;
}> = {
    submitted: { label: 'ثبت‌شده', bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500' },
    triaged: { label: 'ارزیابی‌شده', bg: 'bg-purple-50 border-purple-200', text: 'text-purple-700', dot: 'bg-purple-500' },
    assigned: { label: 'ارجاع‌شده', bg: 'bg-purple-50 border-purple-200', text: 'text-purple-700', dot: 'bg-purple-500' },
    in_progress: { label: 'در دست اقدام', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
    waiting_for_citizen: { label: 'منتظر شهروند', bg: 'bg-orange-50 border-orange-200', text: 'text-orange-700', dot: 'bg-orange-500' },
    resolved: { label: 'حل‌شده', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    closed: { label: 'مختومه', bg: 'bg-slate-100 border-slate-200', text: 'text-slate-600', dot: 'bg-slate-400' },
    rejected: { label: 'ردشده', bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700', dot: 'bg-rose-500' },
    reopened: { label: 'بازگشایی‌شده', bg: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-700', dot: 'bg-indigo-500' },
};
export const StatusChip: React.FC<StatusChipProps> = ({ status, size = 'sm', className = '' }) => {
    const config = STATUS_CONFIG[status] || {
        label: status,
        bg: 'bg-slate-50 border-slate-200',
        text: 'text-slate-600',
        dot: 'bg-slate-400',
    };
    const sizes = {
        sm: 'text-[11px] px-2 py-0.5 gap-1.5',
        md: 'text-xs px-2.5 py-1 gap-2',
    };
    return (<span className={`inline-flex items-center font-medium rounded-full border ${config.bg} ${config.text} ${sizes[size]} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`}/>
      <span>{config.label}</span>
    </span>);
};
