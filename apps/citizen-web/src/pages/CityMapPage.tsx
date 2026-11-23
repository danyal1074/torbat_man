import React, { useState, useEffect } from 'react';
import { Button, StatusChip } from '@torbat/ui';
import {
  MapPin,
  Navigation,
  ExternalLink,
  Building,
  Landmark,
  Trees,
  Cross,
  Phone,
  Search,
  Layers,
  Sparkles,
} from 'lucide-react';
import { api } from '../api/client';

export interface Place {
  id: string;
  title: string;
  category: 'landmark' | 'administrative' | 'service' | 'park' | 'health';
  lat: number;
  lng: number;
  address: string;
  description?: string;
  phone?: string;
}

const DEFAULT_PLACES: Place[] = [
  {
    id: 'plc-qotb',
    title: 'آرامگاه قطب‌الدین حیدر',
    category: 'landmark',
    lat: 35.2755,
    lng: 59.2198,
    address: 'انتهای خیابان قائم، محله تاریخی قطب‌الدین حیدر',
    description: 'آرامگاه عارف نامدار قرن ششم هجری با گنبد و مقرنس‌های آجری و ایوان تاریخی ایلخانی و صفوی؛ نماد هویتی تربتینو.',
  },
  {
    id: 'plc-robat-tabasi',
    title: 'رباط طبسی و موزه مردم‌شناسی',
    category: 'landmark',
    lat: 35.2758,
    lng: 59.2202,
    address: 'مجاور مزار قطب‌الدین حیدر',
    description: 'کاروانسرای تاریخی دوره قاجار شامل موزه مردم‌شناسی و کارگاه‌های زنده صنایع دستی و ابریشم‌بافی.',
  },
  {
    id: 'plc-muni',
    title: 'شهرداری مرکزی تربت حیدریه',
    category: 'administrative',
    lat: 35.2740,
    lng: 59.2185,
    address: 'میدان شهدا، بلوار امام رضا',
    description: 'ستاد مرکزی مدیریت شهری، پیگیری مطالبات و امور شهروندی تربت حیدریه.',
    phone: '05152220137',
  },
  {
    id: 'plc-abfa',
    title: 'شرکت آب و فاضلاب تربت حیدریه',
    category: 'administrative',
    lat: 35.2790,
    lng: 59.2250,
    address: 'بلوار مدرس، جنب پارک ملت',
    description: 'اداره آبفا شهرستان، خدمات مشترکین، پاسخگویی به حوادث شبکه و انشعابات.',
    phone: '122',
  },
  {
    id: 'plc-bargh',
    title: 'مدیریت توزیع نیروی برق تربت حیدریه',
    category: 'administrative',
    lat: 35.2710,
    lng: 59.2140,
    address: 'میدان امام علی (ع)، بلوار وحدت',
    description: 'مدیریت شبکه توزیع برق، رفع خاموشی‌های معابر، روشنایی پارک‌ها و کنتور مشترکین.',
    phone: '121',
  },
  {
    id: 'plc-gas',
    title: 'ناحیه گازرسانی تربت حیدریه',
    category: 'administrative',
    lat: 35.2815,
    lng: 59.2310,
    address: 'خیابان فردوسی شمالی، نبش مدرس',
    description: 'اداره گاز و امور مشترکین شهری و روستایی شهرستان تربت حیدریه.',
    phone: '194',
  },
  {
    id: 'plc-pishkooh',
    title: 'پارک کوهستانی پیشکوه',
    category: 'park',
    lat: 35.2950,
    lng: 59.2080,
    address: 'دامنه‌های شمالی تربت حیدریه، بزرگراه آسیایی',
    description: 'بزرگترین بوستان کوهستانی منطقه، تفرجگاه بام شهر، پیست سلامت و آبشار مصنوعی.',
  },
  {
    id: 'plc-hospital',
    title: 'بیمارستان آموزشی درمانی امام حسین (ع)',
    category: 'health',
    lat: 35.2650,
    lng: 59.2290,
    address: 'بلوار باهنر، شهرک ولی‌عصر',
    description: 'مرکز آموزشی پژوهشی و درمانی پیشرفته با بخش‌های تخصصی، اورژانس و آزمایشگاه مرکزی.',
    phone: '05152288000',
  },
];

export const CityMapPage: React.FC = () => {
  const [places, setPlaces] = useState<Place[]>(DEFAULT_PLACES);
  const [selectedPlace, setSelectedPlace] = useState<Place>(DEFAULT_PLACES[0]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    api.getPlaces()
      .then((res: any) => {
        if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
          setPlaces(res.data);
          setSelectedPlace(res.data[0]);
        }
      })
      .catch(() => {
        // Fallback to DEFAULT_PLACES
      });
  }, []);

  const filteredPlaces = places.filter((p) => {
    const matchesCat = activeCategory === 'all' || p.category === activeCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      p.title.includes(searchQuery.trim()) ||
      p.address.includes(searchQuery.trim()) ||
      (p.description && p.description.includes(searchQuery.trim()));
    return matchesCat && matchesSearch;
  });

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'landmark':
        return { label: 'اثر تاریخی', icon: Landmark, color: 'text-amber-700 bg-amber-50 border-amber-200' };
      case 'administrative':
        return { label: 'اداره و خدمت‌رسان', icon: Building, color: 'text-purple-700 bg-purple-50 border-purple-200' };
      case 'park':
        return { label: 'بوستان و تفرجگاه', icon: Trees, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
      case 'health':
        return { label: 'درمانی و سلامت', icon: Cross, color: 'text-rose-700 bg-rose-50 border-rose-200' };
      default:
        return { label: 'خدمت شهری', icon: MapPin, color: 'text-blue-700 bg-blue-50 border-blue-200' };
    }
  };

  const openNavigation = (lat: number, lng: number) => {
    // Open in Neshan / Balad or Google Maps
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
  };

  const badge = getCategoryBadge(selectedPlace.category);
  const BadgeIcon = badge.icon;

  return (
    <div className="flex flex-col gap-4 pb-24 text-right">
      {/* Header */}
      <div className="px-1 pt-1">
        <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
          <MapPin size={22} className="text-purple-600" />
          نقشه اماکن و خدمات تربت حیدریه
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          جست‌وجو و مسیریابی ادارات، جاذبه‌های گردشگری و مراکز خدماتی شهر
        </p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="جست‌وجوی نام اداره، مکان تاریخی، بوستان..."
          className="w-full bg-white border border-slate-200 rounded-2xl py-3 pr-10 pl-4 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
        />
        <Search size={18} className="absolute right-3.5 top-3.5 text-slate-400" />
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-3 py-1.5 rounded-full font-semibold transition-colors shrink-0 ${
            activeCategory === 'all'
              ? 'bg-purple-700 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          همه اماکن ({places.length})
        </button>
        <button
          onClick={() => setActiveCategory('landmark')}
          className={`px-3 py-1.5 rounded-full font-semibold transition-colors shrink-0 ${
            activeCategory === 'landmark'
              ? 'bg-purple-700 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          آثار تاریخی
        </button>
        <button
          onClick={() => setActiveCategory('administrative')}
          className={`px-3 py-1.5 rounded-full font-semibold transition-colors shrink-0 ${
            activeCategory === 'administrative'
              ? 'bg-purple-700 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          ادارات دولتی
        </button>
        <button
          onClick={() => setActiveCategory('park')}
          className={`px-3 py-1.5 rounded-full font-semibold transition-colors shrink-0 ${
            activeCategory === 'park'
              ? 'bg-purple-700 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          بوستان‌ها
        </button>
        <button
          onClick={() => setActiveCategory('health')}
          className={`px-3 py-1.5 rounded-full font-semibold transition-colors shrink-0 ${
            activeCategory === 'health'
              ? 'bg-purple-700 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          مراکز درمانی
        </button>
      </div>

      {/* Interactive Map View */}
      <div className="relative w-full h-64 bg-slate-100 rounded-3xl overflow-hidden border border-slate-200 shadow-sm">
        <iframe
          title={`نقشه ${selectedPlace.title}`}
          width="100%"
          height="100%"
          frameBorder="0"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${selectedPlace.lng - 0.015}%2C${selectedPlace.lat - 0.01}%2C${selectedPlace.lng + 0.015}%2C${selectedPlace.lat + 0.01}&layer=mapnik&marker=${selectedPlace.lat}%2C${selectedPlace.lng}`}
          className="w-full h-full border-0"
        />
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl text-[11px] font-mono text-purple-900 border border-purple-100 shadow-sm flex items-center gap-1.5">
          <MapPin size={12} className="text-purple-600" />
          <span>{selectedPlace.lat.toFixed(4)}, {selectedPlace.lng.toFixed(4)}</span>
        </div>
      </div>

      {/* Selected Place Details Card */}
      <div className="bg-white rounded-2xl p-4 border border-purple-100 shadow-sm space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${badge.color}`}>
                <BadgeIcon size={12} />
                {badge.label}
              </span>
            </div>
            <h3 className="font-extrabold text-base text-slate-900 mt-1.5">
              {selectedPlace.title}
            </h3>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => openNavigation(selectedPlace.lat, selectedPlace.lng)}
            className="flex items-center gap-1.5 shrink-0"
          >
            <Navigation size={14} />
            <span>مسیریابی</span>
          </Button>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          {selectedPlace.description}
        </p>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <MapPin size={14} className="text-purple-600 shrink-0" />
            <span className="line-clamp-1">{selectedPlace.address}</span>
          </span>
          {selectedPlace.phone && (
            <a
              href={`tel:${selectedPlace.phone}`}
              className="text-purple-700 font-mono font-bold flex items-center gap-1 hover:underline shrink-0 mr-2"
            >
              <Phone size={12} />
              <span>{selectedPlace.phone}</span>
            </a>
          )}
        </div>
      </div>

      {/* Places List */}
      <div className="space-y-2">
        <h4 className="font-bold text-xs text-slate-700 px-1">اماکن برگزیده</h4>
        {filteredPlaces.map((p) => {
          const isSelected = selectedPlace.id === p.id;
          const pBadge = getCategoryBadge(p.category);
          const Icon = pBadge.icon;
          return (
            <button
              key={p.id}
              onClick={() => setSelectedPlace(p)}
              className={`w-full text-right p-3 rounded-2xl border transition-all flex items-center justify-between ${
                isSelected
                  ? 'bg-purple-50/80 border-purple-400 shadow-xs'
                  : 'bg-white border-slate-150 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${pBadge.color}`}>
                  <Icon size={16} />
                </div>
                <div>
                  <h5 className={`font-bold text-xs ${isSelected ? 'text-purple-900' : 'text-slate-800'}`}>
                    {p.title}
                  </h5>
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                    {p.address}
                  </p>
                </div>
              </div>
              <span className="text-xs text-purple-700 font-bold shrink-0 mr-2">
                {isSelected ? 'انتخاب شده' : 'مشاهده'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
