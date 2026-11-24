import React, { useState, useEffect, type FormEvent } from 'react';
import { Button, Dialog, FormField } from '@torbat/ui';
import { RefreshCw } from 'lucide-react';
import { adminApi, type StaffService } from '../api/client';

export const ServicesManagementPage: React.FC = () => {
  const [services, setServices] = useState<StaffService[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [editing, setEditing] = useState<StaffService>();
  const [saving, setSaving] = useState(false);

  const loadServices = () => {
    setLoading(true);
    setError('');
    adminApi
      .getServices()
      .then((res) => setServices(res.data))
      .catch((error: Error) => setError(error.message))
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

  const saveService = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing || saving) return;
    setSaving(true);
    setSaveError('');
    try {
      await adminApi.updateService(editing.id, { title: editing.title.trim(), description: editing.description.trim() });
      setEditing(undefined);
      loadServices();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'تغییرات خدمت ذخیره نشد.');
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5 text-right">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-800">مدیریت خدمات و گردش‌کارهای شهری</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            خدمات قابل ویرایش و وضعیت اتصال آن‌ها به ادارات
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

      {error && <p role="alert" className="text-rose-700">{error}</p>}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">در حال بارگذاری خدمات...</div>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-600">خدمتی یافت نشد.</p>
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
                    گردش‌کار {s.workflow}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => { setSaveError(''); setEditing(s); }}>ویرایش</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Dialog isOpen={Boolean(editing)} title="ویرایش اطلاعات خدمت" onClose={() => { if (!saving) setEditing(undefined); }}>
        {editing && <form className="space-y-3" onSubmit={saveService}>
          {saveError && <p role="alert" className="text-rose-700">{saveError}</p>}
          <FormField label="عنوان خدمت" required>
            <input className="w-full rounded-xl border border-slate-300 p-2" required minLength={3} maxLength={140}
              value={editing.title} onChange={event => setEditing({ ...editing, title: event.target.value })} />
          </FormField>
          <FormField label="شرح خدمت" required>
            <textarea className="w-full rounded-xl border border-slate-300 p-2" required minLength={10} maxLength={2000} rows={4}
              value={editing.description} onChange={event => setEditing({ ...editing, description: event.target.value })} />
          </FormField>
          <Button type="submit" variant="primary" isLoading={saving}>ذخیره تغییرات</Button>
        </form>}
      </Dialog>
    </div>
  );
};
