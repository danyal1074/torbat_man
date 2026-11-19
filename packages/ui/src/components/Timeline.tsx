import React from 'react';
import { formatJalaliDate } from '@torbat/i18n';
import { StatusChip } from './StatusChip';
export interface TimelineEvent {
    id: string;
    toStatus: string;
    notes?: string;
    actorKind: string;
    createdAt: string;
}
export interface TimelineProps {
    events: TimelineEvent[];
    className?: string;
}
export const Timeline: React.FC<TimelineProps> = ({ events, className = '' }) => {
    return (<div className={`flex flex-col gap-4 relative pr-4 border-r-2 border-[#E9E6EE] ${className}`}>
      {events.map((ev, idx) => (<div key={ev.id || idx} className="relative flex flex-col gap-1.5">
          {/* Timeline bullet on the border */}
          <div className="absolute -right-[21px] top-1 w-3 h-3 rounded-full bg-[#6F248E] ring-4 ring-[#F5EDF9]"/>

          <div className="flex items-center justify-between gap-2">
            <StatusChip status={ev.toStatus} size="sm"/>
            <span className="text-[11px] text-[#667085] font-mono">
              {formatJalaliDate(ev.createdAt)}
            </span>
          </div>

          {ev.notes && (<p className="text-xs text-[#20212A] bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
              {ev.notes}
            </p>)}
        </div>))}
    </div>);
};
