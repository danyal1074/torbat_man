import React from 'react';
import { Check } from 'lucide-react';
export interface StepItem {
    id: string | number;
    label: string;
}
export interface StepperProps {
    steps: StepItem[];
    currentStep: number;
    className?: string;
}
export const Stepper: React.FC<StepperProps> = ({ steps, currentStep, className = '' }) => {
    return (<div className={`w-full py-2 ${className}`}>
      <div className="flex items-center justify-between relative">
        {/* Connecting progress line */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 -translate-y-1/2 z-0"/>
        <div className="absolute top-1/2 right-0 h-0.5 bg-[#6F248E] -translate-y-1/2 z-0 transition-all duration-300" style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}/>

        {steps.map((step, idx) => {
            const isDone = idx < currentStep;
            const isCurrent = idx === currentStep;
            return (<div key={step.id} className="flex flex-col items-center gap-1 relative z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${isDone
                    ? 'bg-[#6F248E] text-white'
                    : isCurrent
                        ? 'bg-white border-2 border-[#6F248E] text-[#6F248E] shadow-sm'
                        : 'bg-white border border-slate-300 text-slate-400'}`}>
                {isDone ? <Check className="w-4 h-4 stroke-[2.5]"/> : idx + 1}
              </div>
              <span className={`text-[11px] font-medium whitespace-nowrap ${isCurrent ? 'text-[#6F248E] font-bold' : isDone ? 'text-[#20212A]' : 'text-slate-400'}`}>
                {step.label}
              </span>
            </div>);
        })}
      </div>
    </div>);
};
