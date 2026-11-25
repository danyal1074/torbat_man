import { useEffect, useState } from 'react';
interface Center {
    id: string;
    name: string;
    status: string;
    isDemo: boolean;
    config: {
        category: string;
        address: string;
    };
}
export function NobatinoAdminPage() {
    const [reviews, setReviews] = useState<{
        id: string;
        rating: number;
        body: string;
        status: string;
    }[]>([]);
    const [rows, setRows] = useState<Center[]>(), [error, setError] = useState(''), [busy, setBusy] = useState(false);
    async function load() {
        setError('');
        try {
            const response = await fetch('/v1/admin/nobatino');
            if (!response.ok)
                throw new Error('دریافت مراکز مجاز یا ممکن نیست.');
            setRows((await response.json()).data);
            const reviewResponse = await fetch('/v1/admin/nobatino/reviews');
            if (!reviewResponse.ok)
                throw new Error('دریافت نظرات ممکن نیست.');
            setReviews((await reviewResponse.json()).data);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'خطا در دریافت');
        }
    }
    useEffect(() => { void load(); }, []);
    async function update(id: string, status: string) {
        const reason = window.prompt('دلیل تصمیم مدیر');
        if (!reason)
            return;
        setBusy(true);
        setError('');
        try {
            const response = await fetch('/v1/admin/nobatino/' + id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, reason }) });
            const result = await response.json();
            if (!response.ok)
                throw new Error(result.error?.message ?? 'ثبت تصمیم انجام نشد.');
            await load();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'خطای ثبت');
        }
        finally {
            setBusy(false);
        }
    }
    async function moderate(id: string, status: string) {
        const reason = window.prompt('دلیل تصمیم درباره نظر');
        if (!reason)
            return;
        setBusy(true);
        setError('');
        try {
            const response = await fetch('/v1/admin/nobatino/reviews/' + id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, reason }) });
            const result = await response.json();
            if (!response.ok)
                throw new Error(result.error?.message ?? 'ثبت نشد.');
            await load();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'ثبت نشد.');
        }
        finally {
            setBusy(false);
        }
    }
    return <section className="space-y-5"><div className="flex justify-between gap-3"><h1 className="text-xl font-bold">مدیریت مرکزی نوبتینو</h1><button className="rounded-xl border p-3" onClick={() => void load()}>تازه‌سازی</button></div><p>تصمیم‌ها در گزارش حسابرسی ثبت می‌شوند. دسته‌های سلامت و اداری نیازمند فرایند اعتبارسنجی رسمی هستند.</p>{error && <p role="alert" className="text-rose-700">{error}</p>}{!rows && !error && <p role="status">در حال دریافت مراکز…</p>}<div className="grid gap-3 sm:grid-cols-2"><article className="rounded-xl bg-purple-50 p-4">{rows?.length.toLocaleString('fa-IR')} مرکز ثبت‌شده</article><article className="rounded-xl bg-purple-50 p-4">{rows?.filter(r => r.status === 'approved').length.toLocaleString('fa-IR')} مرکز فعال</article></div>{rows?.map(row => <article className="rounded-2xl border bg-white p-5 space-y-3" key={row.id}><h2 className="font-bold">{row.name}</h2><p>{row.config.category} · {row.config.address}</p><p>{{ approved: 'فعال', pending: 'منتظر بررسی', suspended: 'تعلیق‌شده' }[row.status]}{row.isDemo ? ' · داده آزمایشی' : ''}</p><div className="flex gap-2">{row.status !== 'approved' && <button disabled={busy} className="rounded-xl bg-purple-700 text-white p-3" onClick={() => void update(row.id, 'approved')}>تأیید مرکز</button>}{row.status === 'approved' && <button disabled={busy} className="rounded-xl border p-3 text-rose-700" onClick={() => void update(row.id, 'suspended')}>تعلیق پذیرش رزرو</button>}</div></article>)}<h2 className="text-lg font-bold">نظرات و گزارش‌ها</h2>{reviews.map(r => <article className="rounded-2xl border bg-white p-5" key={r.id}><p>{r.rating.toLocaleString('fa-IR')} از ۵ · {r.body}</p><p>{{ pending: 'منتظر بررسی', reported: 'گزارش‌شده', published: 'منتشرشده', rejected: 'ردشده' }[r.status]}</p><div className="flex gap-2">{r.status !== 'published' && <button disabled={busy} className="rounded-xl border p-3" onClick={() => void moderate(r.id, 'published')}>انتشار نظر</button>}{r.status !== 'rejected' && <button disabled={busy} className="rounded-xl border p-3" onClick={() => void moderate(r.id, 'rejected')}>رد نظر</button>}</div></article>)}</section>;
}
