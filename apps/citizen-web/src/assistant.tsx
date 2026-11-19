import { useState } from 'react';
import { Link } from 'react-router';
import { Sparkles } from 'lucide-react';
import { call, Page, Alert } from './lib';
export function Assistant() {
    const [text, setText] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [answer, setAnswer] = useState<{
        reply: string;
        suggestedServices: {
            slug: string;
            title: string;
        }[];
    }>();
    return <Page title="پیدا کردن خدمت مناسب" eyebrow="دستیار فارسی آزمایشی"><div className="panel narrow"><Sparkles className="purple" size={28}/><p>نیازت را به زبان ساده بنویس؛ پیشنهادها را بررسی کن و خدمت مناسب را خودت انتخاب کن.</p><p className="notice">این نسخه از جست‌وجوی واژه‌محور استفاده می‌کند؛ مدل زبانی و دانش‌نامه رسمی به آن متصل نیست. برای مدارک، هزینه یا مهلت رسیدگی فقط اطلاعات تأییدشده معتبر است.</p><form onSubmit={async (e) => { e.preventDefault(); setBusy(true); setError(''); try {
        const r = await call<{
            data: {
                reply: string;
                suggestedServices: {
                    slug: string;
                    title: string;
                }[];
            };
        }>('/ai/assistant', { message: text });
        setAnswer(r.data);
    }
    catch (e) {
        setError((e as Error).message);
    }
    finally {
        setBusy(false);
    } }}><label>چه کاری می‌خواهی انجام بدهی؟<textarea minLength={2} maxLength={500} required value={text} onChange={e => setText(e.target.value)} placeholder="مثلاً فشار آب خونه کم شده"/></label><button className="button" disabled={busy}>{busy ? 'در حال جست‌وجو…' : 'پیدا کردن خدمات'}</button></form>{error && <Alert>{error}</Alert>}{answer && <div className="assistant-answer" role="status"><p>{answer.reply}</p><div className="filters">{answer.suggestedServices.map(s => <Link key={s.slug} className="button outline" to={'/services/' + s.slug}>{s.title}</Link>)}</div></div>}<Link className="text-link" to="/services">انتخاب دستی از همه خدمات</Link></div></Page>;
}
