import { useEffect, useState } from 'react';
import { adminApi, type StaffFeedback } from '../api/client';

const kinds: Record<string, string> = { question: 'پرسش', idea: 'پیشنهاد', bug: 'گزارش خطا', other: 'سایر' };

export function FeedbackInboxPage() {
  const [items, setItems] = useState<StaffFeedback[]>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string>();
  const read = async () => {
    setError('');
    try { setItems((await adminApi.getFeedback()).data); }
    catch (error) { setError(error instanceof Error ? error.message : 'دریافت پیام‌ها ممکن نشد.'); }
  };
  useEffect(() => { void read(); }, []);
  const mark = async (id: string) => {
    setError(''); setBusy(id);
    try {
      const result = await adminApi.reviewFeedback(id);
      setItems(current => current?.map(item => item.id === id ? result.data : item));
    } catch (error) { setError(error instanceof Error ? error.message : 'ثبت بررسی ممکن نشد.'); }
    finally { setBusy(undefined); }
  };

  return <section className="space-y-4" aria-labelledby="feedback-heading">
    <div className="flex items-center justify-between gap-3">
      <h1 id="feedback-heading" className="text-xl font-black text-slate-900">صندوق پشتیبانی</h1>
      <button className="rounded-xl bg-purple-50 px-3 py-2 text-sm font-bold text-purple-800" onClick={() => void read()}>تازه‌سازی</button>
    </div>
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-rose-800">{error}</p>}
    {!items && !error && <p role="status">در حال دریافت پیام‌ها…</p>}
    {items?.length === 0 && <p className="rounded-xl bg-white p-5 text-slate-600">هنوز پیامی در صندوق نیست.</p>}
    <ul className="space-y-3">{items?.map(item => <li key={item.id} className="rounded-xl bg-white border border-slate-200 p-4">
      <div className="flex justify-between gap-3 text-xs text-slate-600">
        <strong>{kinds[item.kind] ?? 'پیام شهروند'}</strong><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleDateString('fa-IR')}</time>
      </div>
      <p className="my-3 break-words whitespace-pre-wrap">{item.message}</p>
      {item.status === 'new' ? <button className="rounded-xl bg-purple-700 px-3 py-2 text-sm text-white disabled:opacity-60"
        disabled={busy === item.id} onClick={() => void mark(item.id)}>ثبت بررسی</button>
        : <span className="text-sm font-bold text-emerald-700">بررسی‌شده</span>}
    </li>)}</ul>
  </section>;
}
