import React, { useState } from 'react';
import { ServicesHeader } from '../components/services/ServicesHeader';
import { ServiceCategorySection } from '../components/services/ServiceCategorySection';
import { ServiceCard } from '../components/services/ServiceCard';
import { CategoryDetailModal } from '../components/services/CategoryDetailModal';
import { ServiceDetailSheet } from '../components/services/ServiceDetailSheet';
import {
  SERVICES_CATALOG,
  ALL_SERVICES,
  type ServiceCategory,
  type ServiceItem,
} from '../data/servicesCatalog';

export interface ServicesPageProps {
  onSelectService?: (slug: string) => void;
  onNavigateHome?: () => void;
  onNavigateReport?: () => void;
  onNavigateAssistant?: () => void;
  onNavigateMap?: () => void;
}

export const ServicesPage: React.FC<ServicesPageProps> = ({
  onSelectService,
  onNavigateHome,
  onNavigateReport,
  onNavigateAssistant,
  onNavigateMap,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);
  const [activeSheetService, setActiveSheetService] = useState<ServiceItem | null>(null);

  // Live filtered services across all catalog
  const filteredServices = searchQuery.trim()
    ? ALL_SERVICES.filter((s) => {
        const q = searchQuery.trim().toLowerCase();
        return (
          s.title.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.categoryTitle.toLowerCase().includes(q) ||
          s.organizationName.toLowerCase().includes(q) ||
          s.slug.toLowerCase().includes(q)
        );
      })
    : [];

  const handleCardClick = (service: ServiceItem) => {
    if (service.slug === 'shahrbin' && onNavigateReport) {
      onNavigateReport();
    } else if (service.slug === 'ai-assistant' && onNavigateAssistant) {
      onNavigateAssistant();
    } else if (service.slug === 'torbat-gard' && onNavigateMap) {
      onNavigateMap();
    } else {
      setActiveSheetService(service);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF8FC] text-right pb-24 -mx-4 -mt-3">
      
      {/* 1. Purple Gradient Header from Reference Image */}
      <ServicesHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onBack={onNavigateHome || (() => {})}
      />

      {/* 2. Main Body Content */}
      <div className="px-3.5 pt-4 space-y-3.5 flex-1">
        
        {/* If Search Query Active: Show Search Results */}
        {searchQuery.trim() ? (
          <div className="space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-[#24202A]">
                نتایج جست‌وجو برای «{searchQuery}»:
              </span>
              <span className="text-[11px] font-bold text-[#64158C] bg-purple-100 px-2.5 py-0.5 rounded-full">
                {filteredServices.length} خدمت یافت شد
              </span>
            </div>

            {filteredServices.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 shadow-xs space-y-2">
                <span className="text-3xl block">🔍</span>
                <h4 className="font-bold text-sm text-[#24202A]">خدمتی یافت نشد</h4>
                <p className="text-xs text-[#77717E] max-w-xs mx-auto">
                  لطفاً کلمات کلیدی دیگری مانند «آسفالت»، «زعفران»، «اتوبوس»، یا «نظافت» را جست‌وجو کنید.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
                {filteredServices.map((service) => (
                  <div key={service.id} className="flex justify-center">
                    <ServiceCard service={service} onClick={handleCardClick} />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Default: Exact 6 Category Sections from Reference */
          SERVICES_CATALOG.map((cat) => (
            <ServiceCategorySection
              key={cat.id}
              category={cat}
              onSelectService={handleCardClick}
              onViewAll={(c) => setSelectedCategory(c)}
            />
          ))
        )}
      </div>

      {/* Category View Modal (When user clicks "مشاهده همه") */}
      <CategoryDetailModal
        category={selectedCategory}
        onClose={() => setSelectedCategory(null)}
        onSelectService={handleCardClick}
      />

      {/* Interactive Service Detail Sheet */}
      <ServiceDetailSheet
        service={activeSheetService}
        onClose={() => setActiveSheetService(null)}
        onNavigateReport={onNavigateReport || (() => {})}
        onNavigateAssistant={onNavigateAssistant || (() => {})}
        onNavigateMap={onNavigateMap || (() => {})}
      />
    </div>
  );
};

export default ServicesPage;
