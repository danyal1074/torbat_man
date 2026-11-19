import React from 'react';
import { StatusChip } from './StatusChip';
import { formatJalaliDate } from '@torbat/i18n';
import { ChevronLeft } from 'lucide-react';
import type { RequestSummaryDTO } from '@torbat/contracts';
export interface RequestCardProps {
    request: RequestSummaryDTO;
    onClick?: () => void;
    className?: string;
}
export const RequestCard: React.FC<RequestCardProps> = ({ request, onClick, className = '' }) => {
    return (<div onClick={onClick} role="button" tabIndex={0} className={`p-4 bg-white rounded-2xl border border-[#E9E6EE] hover:border-[#6F248E]/40 hover:shadow-md transition-all active:scale-[0.99] cursor-pointer flex flex-col gap-2.5 text-right ${className}`}>
      <div className="flex items-center justify-between">
        <StatusChip status={request.status}/>
        <span className="text-xs font-mono font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
          {request.trackingCode}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-bold text-[#20212A] line-clamp-1">{request.title}</h4>
        <ChevronLeft className="w-4 h-4 text-slate-400 shrink-0"/>
      </div>

      <div className="flex items-center justify-between text-xs text-[#667085] pt-1 border-t border-slate-100">
        <span>{request.organization?.name || 'سامانه یکپارچه'}</span>
        <span>{formatJalaliDate(request.createdAt)}</span>
      </div>
    </div>);
};
