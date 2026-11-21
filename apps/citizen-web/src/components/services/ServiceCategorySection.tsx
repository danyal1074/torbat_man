import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { ServiceCard } from './ServiceCard';
import { ServiceIcon } from './ServiceIcons';
import type { ServiceCategory, ServiceItem } from '../../data/servicesCatalog';

interface ServiceCategorySectionProps {
  category: ServiceCategory;
  onSelectService: (service: ServiceItem) => void;
  onViewAll: (category: ServiceCategory) => void;
}

export const ServiceCategorySection: React.FC<ServiceCategorySectionProps> = ({
  category,
  onSelectService,
  onViewAll,
}) => {
  return (
    <div
      className="rounded-3xl p-3.5 border transition-all duration-200"
      style={{
        backgroundColor: category.cardBg || '#FFFFFF',
        borderColor: category.id.includes('urban') ? '#EFEAF4' : category.id.includes('daily') || category.id.includes('county') || category.id.includes('smart') ? '#FDEED3' : '#EFEAF4',
      }}
    >
      {/* Category Header Row */}
      <div className="flex items-center justify-between pb-3 px-1">
        
        {/* Right: Icon + Title + Description */}
        <div className="flex items-center gap-2.5 text-right">
          {/* Category Icon Badge */}
          <div
            className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs"
            style={{
              backgroundColor: category.badgeBg,
              color: category.accentColor,
            }}
          >
            <ServiceIcon name={category.iconName} size={20} color={category.accentColor} />
          </div>

          <div>
            <h3 className="text-sm font-black text-[#24202A] tracking-tight">
              {category.title}
            </h3>
            <p className="text-[10px] text-[#77717E] font-medium leading-tight mt-0.5">
              {category.description}
            </p>
          </div>
        </div>

        {/* Left: "مشاهده همه >" Button */}
        <button
          type="button"
          onClick={() => onViewAll(category)}
          className="flex items-center gap-0.5 text-xs font-bold text-[#64158C] hover:text-[#42105F] active:scale-95 transition-all shrink-0 cursor-pointer py-1 px-1.5 rounded-lg"
          aria-label={`مشاهده همه خدمات ${category.title}`}
        >
          <span>مشاهده همه</span>
          <ChevronLeft size={14} className="stroke-[2.5]" />
        </button>
      </div>

      {/* Horizontal Scrollable Service Cards Row */}
      <div className="flex items-center gap-2.5 overflow-x-auto pt-1 pb-1 px-0.5 no-scrollbar scroll-smooth">
        {category.services.map((service) => (
          <ServiceCard
            key={service.id}
            service={service}
            onClick={onSelectService}
          />
        ))}
      </div>
    </div>
  );
};
