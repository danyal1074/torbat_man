import React from 'react';
import { Inbox } from 'lucide-react';
import { Button } from './Button';
export interface EmptyStateProps {
    title: string;
    description?: string;
    icon?: React.ReactNode;
    actionLabel?: string;
    onAction?: () => void;
    className?: string;
}
export const EmptyState: React.FC<EmptyStateProps> = ({ title, description, icon, actionLabel, onAction, className = '', }) => {
    return (<div className={`flex flex-col items-center justify-center p-8 text-center bg-white rounded-2xl border border-dashed border-slate-200 ${className}`}>
      <div className="w-14 h-14 rounded-2xl bg-[#F5EDF9] flex items-center justify-center text-[#6F248E] mb-3.5">
        {icon || <Inbox className="w-7 h-7 stroke-[1.7]"/>}
      </div>
      <h3 className="text-sm font-bold text-[#20212A] mb-1">{title}</h3>
      {description && <p className="text-xs text-[#667085] max-w-xs mb-4 leading-relaxed">{description}</p>}
      {actionLabel && onAction && (<Button variant="secondary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>)}
    </div>);
};
