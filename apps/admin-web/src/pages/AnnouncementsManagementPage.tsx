import React, { useState, useEffect } from 'react';
import { Button, Dialog, FormField } from '@torbat/ui';
import { Plus, RefreshCw } from 'lucide-react';
import { formatRelative } from '@torbat/i18n';
import { adminApi, type StaffAnnouncement } from '../api/client';
import { useStaffAuth } from '../context/StaffAuthContext';

export const AnnouncementsManagementPage: React.FC = () => {
  const { staff } = useStaffAuth();
  const manager = staff?.platformRole ? undefined : staff?.memberships.find(member => member.role === 'org_manager');
  const [announcements, setAnnouncements] = useState<StaffAnnouncement[]>([]);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState('');
  const [updating, setUpdating] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [importance, setImportance] = useState<'normal' | 'important'>('normal');
  const [submitting, setSubmitting] = useState(false);

  const loadAnnouncements = () => {
    setLoading(true);
    setLoadError('');
    adminApi
      .getAnnouncements()
      .then((res) => setAnnouncements(res.data))
      .catch((error: Error) => setLoadError(error.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim() || submitting) return;
    setSubmitting(true);
    setFormError('');
    try {
      await adminApi.createAnnouncement({
        title: title.trim(),
        body: body.trim(),
        importance,
        sourceName: manager?.orgName ?? 'تربتینو',
        organizationId: manager?.organizationId,
      });
      setShowCreateModal(false);
      setTitle('');
      setBody('');
      loadAnnouncements();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'خطا در ثبت اطلاعیه');
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (id: string, status: StaffAnnouncement['status']) => {
    setUpdating(id);
    setFormError('');
    try {
      const { data } = await adminApi.updateAnnouncementStatus(id, status);
      setAnnouncements(current => current.map(item => item.id === id ? data : item));
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'تغییر وضعیت انجام نشد.');
    } finally { setUpdating(undefined); }
  };

  return (
    <div className="space-y-5 text-right">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-800">مدیریت اخبار و اطلاعیه‌های شهری</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            انتشار اطلاعیه‌های فوریتی، قطعی آب یا برق، و رویدادهای شهرستان تربت حیدریه
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadAnnouncements} isLoading={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>بروزرسانی</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => { setFormError(''); setShowCreateModal(true); }}
            className="flex items-center gap-1.5 bg-[#592582] hover:bg-[#7541A5]"
          >
            <Plus size={16} />
            <span>اطلاعیه جدید</span>
          </Button>
        </div>
      </div>

      {loadError && <p role="alert" className="text-rose-700">{loadError}</p>}
      {!showCreateModal && formError && <p role="alert" className="text-rose-700">{formError}</p>}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">در حال بارگذاری اطلاعیه‌ها...</div>
        ) : announcements.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">اطلاعیه‌ای یافت نشد.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {announcements.map((a) => (
              <div key={a.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-50">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">{a.title}</span>
                    {a.importance === 'important' && (
                      <span className="text-[10px] bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded-full">
                        مهم / فوری
                      </span>
                    )}
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                      {{ published: 'منتشرشده', draft: 'پیش‌نویس', archived: 'بایگانی‌شده' }[a.status]}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{a.body}</p>
                </div>

                <div className="flex items-center gap-2">
                  <time className="text-[11px] text-slate-500" dateTime={a.createdAt}>{formatRelative(new Date(a.createdAt))}</time>
                  {a.status === 'draft' && <Button variant="primary" size="sm" disabled={Boolean(updating)}
                    onClick={() => void updateStatus(a.id, 'published')}>انتشار آزمایشی</Button>}
                  {a.status === 'published' && <Button variant="outline" size="sm" disabled={Boolean(updating)}
                    onClick={() => void updateStatus(a.id, 'archived')}>بایگانی</Button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="ثبت اطلاعیه جدید شهری"
      >
        <form onSubmit={handleCreate} className="space-y-4 pt-2 text-xs">
          {formError && <p role="alert" className="text-rose-700">{formError}</p>}
          <FormField label="عنوان اطلاعیه" required>
            <input
              type="text"
              required minLength={5} maxLength={140}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثلاً: اطلاعیه قطعی موقت آب در محله باغسلطانی..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs focus:outline-none focus:ring-2 focus:ring-purple-600"
            />
          </FormField>

          <FormField label="اهمیت اطلاعیه">
            <select
              value={importance}
              onChange={(e) => setImportance(e.target.value === 'important' ? 'important' : 'normal')}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-600"
            >
              <option value="normal">عادی</option>
              <option value="important">مهم و فوری</option>
            </select>
          </FormField>

          <FormField label="متن کامل اطلاعیه" required>
            <textarea
              rows={4}
              required minLength={10} maxLength={4000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="شرح کامل اطلاعیه..."
              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-purple-600"
            />
          </FormField>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setShowCreateModal(false)}>
              انصراف
            </Button>
            <Button
              variant="primary"
              type="submit"
              isLoading={submitting}
              className="bg-[#592582] hover:bg-[#7541A5]"
            >
              ذخیره پیش‌نویس
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
