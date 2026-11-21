import React, { useState } from 'react';
import { ArrowRight, Search, X, ChevronLeft, ShieldCheck, Clock, Building2 } from 'lucide-react';
import { ServiceIcon } from './ServiceIcons';
import type { ServiceCategory, ServiceItem } from '../../data/servicesCatalog';

interface CategoryDetailModalProps {
  category: ServiceCategory | null;
  onClose: () => void;
  onSelectService: (service: ServiceItem) => void;
}

export const CategoryDetailModal: React.FC<CategoryDetailModalProps> = ({
  category,
  onClose,
  onSelectService,
}) => {
  const [filterQuery, setFilterQuery] = useState('');

  if (!category) return null;

  const filteredServices = category.services.filter(
    (s) =>
      !filterQuery.trim() ||
      s.title.includes(filterQuery.trim()) ||
      s.description.includes(filterQuery.trim()) ||
      s.organizationName.includes(filterQuery.trim())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 text-right animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-[#FAF8FC] rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="bg-white p-4 border-b border-slate-150 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-xs shrink-0"
              style={{
                backgroundColor: category.badgeBg,
                color: category.accentColor,
              }}
            >
              <ServiceIcon name={category.iconName} size={22} color={category.accentColor} />
            </div>
            <div>
              <h2 className="text-base font-black text-[#24202A]">{category.title}</h2>
              <p className="text-xs text-[#77717E]">{category.description}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Filter input */}
        <div className="p-3 bg-white border-b border-slate-100">
          <div className="relative">
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder={`جست‌وجو در خدمات ${category.title}...`}
              className="w-full bg-[#F5F3F8] text-xs py-2.5 pr-9 pl-3 rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-[#64158C]"
            />
            <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* Services List / Grid */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredServices.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              خدمتی با این عبارت در این دسته پیدا نشد.
            </div>
          ) : (
            filteredServices.map((service) => (
              <div
                key={service.id}
                onClick={() => {
                  onClose();
                  onSelectService(service);
                }}
                className="bg-white p-3.5 rounded-2xl border border-[#EDE8F2] shadow-2xs hover:shadow-md hover:border-purple-300 transition-all cursor-pointer flex items-start justify-between gap-3 group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-[#F5F3F8] flex items-center justify-center shrink-0 border border-purple-100 mt-0.5 group-hover:scale-105 transition-transform">
                    <ServiceIcon name={service.iconName} size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-xs text-[#24202A] group-hover:text-[#64158C] transition-colors">
                        {service.title}
                      </h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        service.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {service.statusLabel}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#77717E] mt-1 line-clamp-2 leading-relaxed">
                      {service.description}
                    </p>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-2">
                      <span className="flex items-center gap-1">
                        <Building2 size={11} />
                        {service.organizationName}
                      </span>
                      {service.sla && (
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          {service.sla}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <ChevronLeft size={16} className="text-slate-400 group-hover:text-purple-700 group-hover:-translate-x-1 transition-all shrink-0 mt-3" />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
