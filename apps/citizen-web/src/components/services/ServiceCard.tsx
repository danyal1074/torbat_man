import React from 'react';
import { ServiceIcon } from './ServiceIcons';
import type { ServiceItem } from '../../data/servicesCatalog';

interface ServiceCardProps {
  service: ServiceItem;
  onClick: (service: ServiceItem) => void;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ service, onClick }) => {
  return (
    <button
      type="button"
      onClick={() => onClick(service)}
      className="flex flex-col items-center justify-between w-[80px] sm:w-[88px] h-[86px] sm:h-[92px] bg-white rounded-2xl p-2.5 border border-[#EDE8F2] shadow-xs hover:shadow-md hover:border-purple-200 active:scale-95 transition-all duration-150 shrink-0 cursor-pointer select-none group text-center"
      aria-label={service.title}
    >
      {/* Icon Area */}
      <div className="flex-1 flex items-center justify-center w-full transition-transform duration-200 group-hover:scale-110">
        <ServiceIcon name={service.iconName} size={26} />
      </div>

      {/* Service Title */}
      <span className="text-[11px] font-bold text-[#24202A] tracking-tight line-clamp-1 w-full mt-1">
        {service.title}
      </span>
    </button>
  );
};
