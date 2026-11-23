import React, { useState, useEffect } from 'react';
import { Button, StatusChip } from '@torbat/ui';
import { LayoutGrid, CheckCircle, AlertTriangle, RefreshCw, Search } from 'lucide-react';
import { adminApi } from '../api/client';

export const ServicesManagementPage: React.FC = () => {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadServices = () => {
    setLoading(true);
    adminApi
      .getServices()
      .then((res) => setServices(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadServices();
  }, []);

  const filtered = services.filter(
    (s) =>
      !search.trim() ||
      s.title.includes(search.trim()) ||
      s.slug.includes(search.trim()) ||
      (s.description && s.description.includes(search.trim()))
  );

  return (
    <div className="space-y-5 text-right">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-800">مدیریت خدمات و گردش‌کارهای شهری</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            کاتالوگ ۴۴ خدمت سامانه تربتینو و وضعیت اتصال آن‌ها به ادارات
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={loadServices} isLoading={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>بروزرسانی</span>
        </Button>
      </div>

      <div className="bg-white p-3 rounded-2xl border border-slate-200">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="جست‌وجو در عنوان خدمت، شناسه یا توضیحات..."
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600"
        />
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">در حال بارگذاری خدمات...</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((s) => (
              <div key={s.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">{s.title}</span>
                    <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                      {s.slug}
                    </span>
                    {s.status === 'active_demo' ? (
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                        فعال آزمایشی
                      </span>
                    ) : (
                      <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-bold border border-amber-200">
                        نیازمند اتصال رسمی اداره
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-1">{s.description}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-slate-400">
                    گردش‌کار: <strong>{s.workflow}</strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
