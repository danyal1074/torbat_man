import React from 'react';
import { Search, X } from 'lucide-react';
export interface SearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    onClear?: () => void;
    autoFocus?: boolean;
}
export const SearchInput: React.FC<SearchInputProps> = ({ value, onChange, placeholder = 'چه کاری می‌خوای انجام بدی؟', className = '', onClear, autoFocus = false, }) => {
    return (<div className={`relative flex items-center w-full ${className}`}>
      <div className="absolute right-3.5 text-muted-foreground pointer-events-none flex items-center">
        <Search className="w-4 h-4 text-[#6F248E]/70"/>
      </div>

      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoFocus={autoFocus} className="w-full h-12 pr-10 pl-10 bg-white rounded-2xl border border-[#E9E6EE] text-sm text-[#20212A] placeholder:text-[#667085] focus:outline-none focus:border-[#6F248E] focus:ring-2 focus:ring-[#6F248E]/10 transition-all shadow-sm"/>

      {value && (<button type="button" onClick={() => {
                onChange('');
                onClear?.();
            }} className="absolute left-3 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
          <X className="w-4 h-4"/>
        </button>)}
    </div>);
};
