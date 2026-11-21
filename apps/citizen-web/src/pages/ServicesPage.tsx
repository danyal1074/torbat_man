import React, { useState, useEffect } from 'react';
import { SearchInput, ServiceTile, EmptyState } from '@torbat/ui';
import { ChevronDown, ChevronUp, Layers, CheckCircle } from 'lucide-react';
import { api } from '../api/client';

export interface ServicesPageProps {
  onSelectService: (slug: string) => void;
}

export const ServicesPage: React.FC<ServicesPageProps> = ({ onSelectService }) => {
  const [categories, setCategories] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [statusFilter, setStatusFilter] = useState<'all' | 'active_demo' | 'informational'>('all');

  useEffect(() => {
    Promise.all([api.getCategories(), api.getServices()]).then(([catsRes, svcsRes]) => {
      setCategories(catsRes.data);
      setServices(svcsRes.data);
    }).catch(console.error);
  }, []);

  const toggleCategory = (slug: string) => {
    setCollapsed((prev) => ({ ...prev, [slug]: !prev[slug] }));
  };

  // Filtered services
  const filtered = services.filter((s) => {
    const matchesSearch =
      !search.trim() ||
      s.title.includes(search.trim()) ||
      s.description.includes(search.trim()) ||
      s.slug.includes(search.trim());

    const matchesStatus =
      statusFilter === 'all' || s.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex flex-col gap-5 pb-24 text-right">
      {/* Title */}
      <div className="flex flex-col gap-1 px-1">
        <h2 className="text-xl font-extrabold text-[#33313A] tracking-tight">خدمات شهر و ادارات</h2>
        <p className="text-xs text-[#667085]">
          درگاه یکپارچه خدمات شهری و اداری تربت حیدریه در «تربت نو»
        </p>
      </div>

      {/* Search Bar */}
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="جستجو در بین ۴۴ خدمت اداری و شهری..."
      />

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            statusFilter === 'all'
              ? 'bg-[#7541A5] text-white shadow-2xs'
              : 'bg-white border border-[#E9E6EE] text-[#667085]'
          }`}
        >
          همه خدمات
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('active_demo')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            statusFilter === 'active_demo'
              ? 'bg-[#7541A5] text-white shadow-2xs'
              : 'bg-white border border-[#E9E6EE] text-[#667085]'
          }`}
        >
          فعال و آزمایشی
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('informational')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            statusFilter === 'informational'
              ? 'bg-[#7541A5] text-white shadow-2xs'
              : 'bg-white border border-[#E9E6EE] text-[#667085]'
          }`}
        >
          نیازمند اتصال رسمی
        </button>
      </div>

      {/* Category Groups with Service Grid */}
      <div className="flex flex-col gap-4">
        {categories.map((cat) => {
          const catServices = filtered.filter((s) => s.categoryId === cat.id || s.category === cat.slug);
          if (catServices.length === 0) return null;

          const isClosed = !!collapsed[cat.slug];

          return (
            <div
              key={cat.slug}
              className="bg-white rounded-3xl border border-[#E9E6EE] overflow-hidden shadow-2xs"
            >
              {/* Category Header */}
              <button
                type="button"
                onClick={() => toggleCategory(cat.slug)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors cursor-pointer text-right"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#F5F3F8] text-[#7541A5] flex items-center justify-center font-bold text-xs">
                    {catServices.length}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-extrabold text-[#33313A]">{cat.title}</span>
                    <span className="text-[11px] text-[#667085] line-clamp-1">{cat.description}</span>
                  </div>
                </div>

                <div className="text-slate-400">
                  {isClosed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </div>
              </button>

              {/* Service Tiles Grid */}
              {!isClosed && (
                <div className="p-3 pt-0 grid grid-cols-2 sm:grid-cols-3 gap-2.5 border-t border-slate-100/60 mt-1">
                  {catServices.map((svc) => (
                    <ServiceTile
                      key={svc.slug}
                      id={svc.id}
                      slug={svc.slug}
                      title={svc.title}
                      shortTitle={svc.shortTitle}
                      icon={svc.icon}
                      status={svc.status}
                      onClick={() => onSelectService(svc.slug)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <EmptyState
            title="خدمتی با مشخصات واردشده پیدا نشد"
            description="لطفاً عبارت دیگری را جستجو کنید یا فیلتر را تغییر دهید."
          />
        )}
      </div>
    </div>
  );
};
