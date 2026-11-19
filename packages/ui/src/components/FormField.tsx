import React from 'react';
export interface FormFieldProps {
    label: string;
    required?: boolean;
    error?: string;
    hint?: string;
    children: React.ReactNode;
    className?: string;
}
export const FormField: React.FC<FormFieldProps> = ({ label, required, error, hint, children, className = '', }) => {
    return (<div className={`flex flex-col gap-1.5 text-right ${className}`}>
      <label className="text-xs font-semibold text-[#20212A] flex items-center gap-1">
        <span>{label}</span>
        {required && <span className="text-rose-500">*</span>}
      </label>
      {children}
      {hint && !error && <span className="text-[11px] text-[#667085]">{hint}</span>}
      {error && <span className="text-[11px] text-rose-600 font-medium">{error}</span>}
    </div>);
};
