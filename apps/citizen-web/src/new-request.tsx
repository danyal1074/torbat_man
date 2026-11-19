import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Sparkles, Navigation, MapPin } from 'lucide-react';
import { call, useMe, useCatalog, Page, Alert } from './lib';
interface Draft {
    description: string;
    address: string;
    service: string;
    fields: Record<string, string>;
    lat: string;
    lng: string;
    key: string;
}
export function NewRequest() {
    const me = useMe();
    const nav = useNavigate();
    const [params] = useSearchParams();
    const catalog = useCatalog();
    const [step, setStep] = useState(0);
    const [draft, setDraft] = useState<Draft>(() => { try {
        const saved = JSON.parse(sessionStorage.getItem('request-draft') ?? 'null');
        return saved ?? { description: '', address: '', service: params.get('service') ?? '', fields: {}, lat: '', lng: '', key: crypto.randomUUID() };
    }
    catch {
        return { description: '', address: '', service: '', fields: {}, lat: '', lng: '', key: crypto.randomUUID() };
    } });
    const [file, setFile] = useState<File | null>(null);
    const [attachment, setAttachment] = useState<string>();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [hint, setHint] = useState('');
    const [consent, setConsent] = useState(false);
    const [result, setResult] = useState<{
        id: string;
        trackingCode: string;
    }>();
    const qc = useQueryClient();
    useEffect(() => { try {
        sessionStorage.setItem('request-draft', JSON.stringify(draft));
    }
    catch { /* Storage may be disabled by browser policy. */ } }, [draft]);
    const update = (part: Partial<Draft>) => setDraft(d => ({ ...d, ...part }));
    const candidates = catalog.data?.data.filter(s => s.status.startsWith('active') && ['city_report', 'admin_request'].includes(s.workflow)) ?? [];
    const s = candidates.find(s => s.slug === draft.service);
    async function suggest() { setBusy(true); setError(''); try {
        const r = await call<{
            data: {
                serviceSlug?: string;
            };
        }>('/ai/triage', { text: draft.description });
        const found = candidates.find(s => s.slug === r.data.serviceSlug);
        if (found) {
            setHint('پیشنهاد واژه‌محور آزمایشی: ' + found.title + '؛ انتخاب را بررسی و تأیید کنید.');
            update({ service: found.slug });
        }
        else
            setHint('پیشنهاد مطمئنی نداریم؛ خدمت را دستی انتخاب کنید.');
    }
    catch {
        setHint('پیشنهاد خودکار در دسترس نیست؛ انتخاب دستی همیشه ممکن است.');
    }
    finally {
        setBusy(false);
    } }
    async function submit(e: FormEvent) {
        e.preventDefault();
        if (step < 2) {
            setStep(step + 1);
            return;
        }
        setError('');
        setBusy(true);
        try {
            if (!s || !consent)
                throw new Error('خدمت و تأیید ارسال را بررسی کنید.');
            if (!!draft.lat !== !!draft.lng)
                throw new Error('هر دو مختصات را وارد کنید یا هر دو را خالی بگذارید.');
            let attachmentId = attachment;
            if (file && !attachmentId) {
                const form = new FormData();
                form.append('file', file);
                const res = await fetch('/v1/uploads', { method: 'POST', credentials: 'include', body: form });
                const a = await res.json();
                if (!res.ok)
                    throw new Error(a.error?.message ?? 'بارگذاری تصویر ناموفق بود.');
                attachmentId = a.id;
                setAttachment(a.id);
            }
            const r = await call<{
                data: {
                    id: string;
                    trackingCode: string;
                };
            }>('/requests', { serviceSlug: s.slug, description: draft.description, addressText: draft.address, formData: draft.fields, attachmentIds: attachmentId ? [attachmentId] : [], ...(draft.lat && draft.lng ? { location: { lat: Number(draft.lat), lng: Number(draft.lng), address: draft.address } } : {}) }, 'POST', { 'Idempotency-Key': draft.key });
            setResult(r.data);
            sessionStorage.removeItem('request-draft');
            await qc.invalidateQueries({ queryKey: ['requests'] });
        }
        catch (e) {
            setError((e as Error).message);
        }
        finally {
            setBusy(false);
        }
    }
    if (!me.data)
        return <Page title="یک قدم تا ثبت درخواست"><p>برای حفظ حریم خصوصی و پیگیری درخواست، ابتدا وارد حساب شو.</p><Link className="button" to={'/login?next=' + encodeURIComponent('/new?' + params)}>ورود و ادامه</Link></Page>;
    if (result)
        return <Page title="درخواستت ثبت شد"><div className="panel narrow success"><Check size={40}/><p>کد پیگیری را نگه دار. درخواست در کارتابل سازمان آزمایشی ثبت شده است.</p><strong className="tracking" dir="ltr">{result.trackingCode}</strong><Link className="button" to={'/requests/' + result.id}>مشاهده و پیگیری درخواست</Link></div></Page>;
    return <Page title="بگو چه کمکی از ما برمی‌آید" eyebrow="ثبت درخواست آزمایشی"><ol className="stepper">{['شرح درخواست', 'اطلاعات و مکان', 'بررسی و ارسال'].map((t, i) => <li key={t} aria-current={step === i ? 'step' : undefined} className={i <= step ? 'current' : ''}><span>{(i + 1).toLocaleString('fa-IR')}</span>{t}</li>)}</ol><form className="panel narrow" onSubmit={submit}><p className="metadata">متن پیش‌نویس در همین نشست مرورگر نگه‌داری می‌شود؛ تصویر پس از بارگذاری روی سرور ذخیره می‌شود.</p>
 {step === 0 && <><label>چه اتفاقی افتاده یا چه درخواستی داری؟<textarea required minLength={10} maxLength={2000} rows={5} value={draft.description} onChange={e => update({ description: e.target.value })} placeholder="کوتاه و روشن توضیح بده…"/></label><button type="button" disabled={busy || draft.description.length < 3} className="button outline" onClick={suggest}><Sparkles size={18}/>پیشنهاد دسته آزمایشی</button>{hint && <div className="notice">{hint}</div>}<label>خدمت و سازمان پاسخ‌گو<select required value={draft.service} onChange={e => update({ service: e.target.value, fields: {} })}><option value="">انتخاب خدمت</option>{candidates.map(s => <option key={s.id} value={s.slug}>{s.title} — {s.organization?.shortName}</option>)}</select></label>{s && <p className="metadata">{s.description}</p>}</>}
 {step === 1 && <><label>نشانی یا محله<input value={draft.address} required maxLength={300} onChange={e => update({ address: e.target.value })} placeholder="نام خیابان، کوچه و نشانه نزدیک"/></label><button type="button" className="button outline" onClick={() => { if (!navigator.geolocation) {
        setError('موقعیت‌یابی پشتیبانی نمی‌شود. نشانی را دستی وارد کنید.');
        return;
    } navigator.geolocation.getCurrentPosition(p => { update({ lat: String(p.coords.latitude), lng: String(p.coords.longitude) }); setError(''); }, () => setError('موقعیت دریافت نشد؛ نشانی یا مختصات را دستی وارد کنید.'), { timeout: 10000 }); }}><Navigation size={18}/>دریافت موقعیت با اجازه من</button><div className="two-columns"><label>عرض جغرافیایی (اختیاری)<input type="number" min="-90" max="90" step="any" value={draft.lat} onChange={e => update({ lat: e.target.value })}/></label><label>طول جغرافیایی (اختیاری)<input type="number" min="-180" max="180" step="any" value={draft.lng} onChange={e => update({ lng: e.target.value })}/></label></div>{s?.form?.fields.map(f => <label key={f.name}>{f.label}{f.type === 'select' || f.type === 'radio' ? <select required={f.required} value={draft.fields[f.name] ?? ''} onChange={e => update({ fields: { ...draft.fields, [f.name]: e.target.value } })}><option value="">انتخاب کنید</option>{f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select> : <input required={f.required} minLength={f.minLength} maxLength={f.maxLength} value={draft.fields[f.name] ?? ''} onChange={e => update({ fields: { ...draft.fields, [f.name]: e.target.value } })}/>}<small>{f.helper}</small></label>)}<label>تصویر (اختیاری؛ حداکثر ۵ مگابایت)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { const f = e.target.files?.[0]; if (f && f.size > 5 * 1024 * 1024) {
        setError('تصویر باید کوچک‌تر از ۵ مگابایت باشد.');
        e.target.value = '';
        return;
    } setFile(f ?? null); setAttachment(undefined); setError(''); }}/></label><p className="notice">پیش از انتخاب تصویر، چهره‌ها، پلاک‌ها و اسناد شخصی را حذف یا محو کنید. پیوست عمومی منتشر نمی‌شود.</p></>}
 {step === 2 && <><h2>{s?.title}</h2><p>{draft.description}</p><p><MapPin size={17}/>{draft.address}</p><p className="metadata">{s?.organization?.name} · {file?.name ?? 'بدون تصویر'}</p>{Object.entries(draft.fields).map(([k, v]) => <p key={k}>{s?.form?.fields.find(f => f.name === k)?.label}: {v}</p>)}<label className="checkbox"><input required type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}/>ارسال اطلاعات به کارتابل آزمایشی سازمان را تأیید می‌کنم.</label></>}
 {error && <Alert>{error}</Alert>}<div className="form-actions"><button className="button" disabled={busy}>{busy ? 'در حال ارسال…' : step === 2 ? 'تأیید و ثبت درخواست' : 'ادامه'}</button>{step > 0 && <button type="button" className="button outline" disabled={busy} onClick={() => setStep(step - 1)}>بازگشت</button>}<button type="button" className="text-link" disabled={busy} onClick={() => nav('/requests')}>ادامه در زمان دیگر</button></div></form></Page>;
}
