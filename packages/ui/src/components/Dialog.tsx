import React, { useEffect } from 'react';
import { X } from 'lucide-react';
export interface DialogProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    className?: string;
}
export const Dialog: React.FC<DialogProps> = ({ isOpen, onClose, title, children, className = '', }) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        }
        else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);
    if (!isOpen)
        return null;
    return (<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs transition-opacity">
      <div className={`w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200 text-right ${className}`} style={{ maxHeight: '90vh' }}>
        {title && (<div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="text-base font-bold text-[#20212A]">{title}</h3>
            <button type="button" onClick={onClose} className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
              <X className="w-5 h-5"/>
            </button>
          </div>)}
        <div className="p-5 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 65px)' }}>
          {children}
        </div>
      </div>
    </div>);
};
