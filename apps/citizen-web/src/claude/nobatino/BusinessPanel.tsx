import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { api, messageOf } from '../lib/backend';
import { useUser } from '../state/session';
import { BookingQr } from './BookingQr';
import { blank, fa, isoDay, statuses, when, type Booking, type Business, type Config, type Ticket } from './types';

interface Props {
  busy: boolean;
  send: <T>(path: string, body?: unknown, method?: string) => Promise<T | null>;
}
export function BusinessPanel({ busy, send }: Props) {
  const user = useUser();
  const [managed, setManaged] = useState(''), [draft, setDraft] = useState<Config>(blank);
  const [name, setName] = useState(''), [day, setDay] = useState(isoDay()), [mode, setMode] = useState('day');
  const [manualKey, setManualKey] = useState(() => crypto.randomUUID());
  const [grant, setGrant] = useState({ mobile: '', role: 'reception', employeeId: '' });
  const [offer, setOffer] = useState({ serviceId: 'main', startAt: '', price: 0 });
  const [manual, setManual] = useState({ citizenId: '', serviceId: 'main', employeeId: 'expert-1', startAt: '' });
  const businesses = useQuery({ queryKey: ['nob-manage', user?.phone], queryFn: () => api<{ data: Business[] }>('/nobatino/manage') });
  const role = businesses.data?.data.find(b => b.id === managed)?.role ?? 'owner';
  const canConfigure = role === 'owner' || role === 'manager';
  const canReceive = role !== 'specialist';
  const categories = useQuery({ queryKey: ['nob-categories'], queryFn: () => api<{ data: string[] }>('/nobatino/categories') });
  const calendar = useQuery({
    queryKey: ['nob-calendar', managed],
    queryFn: () => api<{ data: Booking[]; report: { bookings: number; completed: number; cancelled: number; noShow: number; collectedToman: number } }>('/nobatino/manage/' + managed + '/calendar'),
    enabled: Boolean(managed),
  });
  const queue = useQuery({ queryKey: ['nob-queue', managed], queryFn: () => api<{ data: Ticket[] }>('/nobatino/manage/' + managed + '/queue'), enabled: Boolean(managed) && canReceive, refetchInterval: 15000 });
  const errors = [businesses, categories, calendar, queue].filter(q => q.isError);
  const filtered = calendar.data?.data.filter(b => {
    const value = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(b.startAt));
    if (mode === 'month') {
      const month = (date:string)=>new Date(date+'T12:00:00Z').toLocaleDateString('fa-IR',{year:'numeric',month:'numeric'});
      return month(value) === month(day);
    }
    return value >= day && Date.parse(value) < Date.parse(day) + (mode === 'week' ? 7 : 1) * 86400000;
  }) ?? [];
  function changeService(index: number, field: string, value: string | number | boolean) {
    setDraft({ ...draft, services: draft.services.map((item, i) => i === index ? { ...item, [field]: value } : item) });
  }
  function changeShift(index:number,field:'open'|'close'|'breakStart'|'breakEnd'|'closedDates',value:number|string[]){
    setDraft({...draft,employees:draft.employees.map((e,i)=>i===index?{...e,shift:{open:draft.open,close:draft.close,breakStart:0,breakEnd:0,closedDates:[],...e.shift,[field]:value}}:e)});
  }
  return <>
    {errors.map((q, i) => <p key={i} role="alert" className="nb-error">{messageOf(q.error)}<button onClick={() => void q.refetch()}>تلاش دوباره</button></p>)}
    <section className="nb-card"><h2>میز کار کسب‌وکار</h2><p>مالک مراکز نمونه، حساب شهروند آزمایشی دوم است.</p><label>مرکز من<select value={managed} onChange={e => {
      setManaged(e.target.value);
      const b = businesses.data?.data.find(b => b.id === e.target.value);
      setDraft(b?.config ?? blank); setName(b?.name ?? '');
    }}><option value="">ثبت مرکز جدید</option>{businesses.data?.data.map(b => <option key={b.id} value={b.id}>{b.name} · {statuses[b.status]}</option>)}</select></label></section>
    {managed && <>
      <div className="nb-metrics"><div><strong>{fa(calendar.data?.report.bookings ?? 0)}</strong><span>کل نوبت‌ها</span></div><div><strong>{fa(calendar.data?.report.completed ?? 0)}</strong><span>تکمیل‌شده</span></div><div><strong>{fa(calendar.data?.report.collectedToman ?? 0)}</strong><span>تومان وصول‌شده</span></div></div>
      <section className="nb-card"><div className="nb-section-head"><h2>تقویم پذیرش</h2><select aria-label="نمای تقویم" value={mode} onChange={e => setMode(e.target.value)}><option value="day">روزانه</option><option value="week">هفتگی از روز انتخابی</option><option value="month">ماه شمسی انتخابی</option></select></div>
        <label>روز تقویم<input type="date" value={day} onChange={e => { if (e.target.value) setDay(e.target.value); }} /></label><p>{new Date(day + 'T12:00:00Z').toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        {calendar.isPending && <p role="status">در حال دریافت تقویم…</p>}
        {filtered.length === 0 && <p>در این بازه نوبتی ثبت نشده است.</p>}
        {filtered.map(b => <article className="nb-calendar-row" key={b.id}><strong>{when(b.startAt)}</strong><h3>{b.snapshot.title}</h3><p>{statuses[b.status]} · <bdi>{b.code}</bdi></p><small>{draft.employees.find(e => e.id === b.employeeId)?.name}</small>
          <div className="nb-actions">{({ confirmed: ['checked_in', 'cancelled', 'no_show'], checked_in: ['in_service', 'cancelled'], in_service: ['completed'] } as Record<string, string[]>)[b.status]?.filter(status => canReceive || ['in_service', 'completed'].includes(status)).map(status => <button disabled={busy} key={status} onClick={() => {
            const reason = window.prompt('دلیل تغییر وضعیت');
            if (!reason) return;
            const amount = status === 'completed' && canReceive ? window.prompt('مبلغ وصول‌شده به تومان؛ صفر در صورت عدم وصول', '0') : null;
            if (status === 'completed' && canReceive && amount === null) return;
            void send('/manage/bookings/' + b.id, { status, reason, ...(amount === null ? {} : { paid: Number(amount) }) }, 'PATCH');
          }}>{statuses[status]}</button>)}</div>
        </article>)}
      </section>
      {canReceive && <form className="nb-card" onSubmit={async e => {
        e.preventDefault();
        const result = await send('/manage/' + managed + '/manual', { ...manual, startAt: new Date(manual.startAt + ':00+03:30').toISOString(), key: manualKey });
        if (result) setManualKey(crypto.randomUUID());
      }}><h3>ثبت نوبت تلفنی یا حضوری</h3><p className="nb-note">شناسه حساب تربتینو با رضایت مشتری دریافت شود. زمان به ساعت تهران وارد می‌شود.</p>
        <label>شناسه حساب مشتری<input required value={manual.citizenId} onChange={e => setManual({ ...manual, citizenId: e.target.value })} /></label>
        <label>خدمت<select value={manual.serviceId} onChange={e => setManual({ ...manual, serviceId: e.target.value })}>{draft.services.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}</select></label>
        <label>همکار<select value={manual.employeeId} onChange={e => setManual({ ...manual, employeeId: e.target.value })}>{draft.employees.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <label>زمان محلی تهران<input type="datetime-local" required value={manual.startAt} onChange={e => setManual({ ...manual, startAt: e.target.value })} /></label><button className="nb-primary" disabled={busy}>ثبت با بررسی ظرفیت</button>
      </form>}
      {canReceive && <section className="nb-card"><h2>پذیرش صف امروز</h2><button disabled={busy} onClick={() => void send('/manage/' + managed + '/call', { key: crypto.randomUUID() })}>فراخوان نفر بعد</button>{queue.data?.data.map(t => <div className="nb-row" key={t.id}><span>شماره {fa(t.number)} · {statuses[t.status]}</span>{({ called: ['checked_in', 'skipped'], checked_in: ['serving'], serving: ['completed'] } as Record<string, string[]>)[t.status]?.map(status => <button key={status} disabled={busy} onClick={() => void send('/manage/tickets/' + t.id, { status }, 'PATCH')}>{statuses[status]}</button>)}</div>)}</section>}
      <section className="nb-card"><h3>لینک عمومی رزرو</h3><Link to={'/nobatino/center/' + managed}>باز کردن صفحه رزرو</Link><input aria-label="نشانی عمومی رزرو" readOnly value={window.location.origin + '/nobatino/center/' + managed} /><BookingQr url={window.location.origin + '/nobatino/center/' + managed}/></section>
    </>}
    {canConfigure && <form className="nb-card" onSubmit={async e => { e.preventDefault(); await send(managed ? '/manage/' + managed : '/manage', managed ? draft : { name, config: draft }, managed ? 'PUT' : 'POST'); }}>
      <h2>{managed ? 'خدمات و ساعات مرکز' : 'ثبت کسب‌وکار جدید'}</h2>
      {!managed && <label>نام مرکز<input required minLength={3} maxLength={100} value={name} onChange={e => setName(e.target.value)} /></label>}
      <label>دسته<select value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })}>{categories.data?.data.map(c => <option key={c}>{c}</option>)}</select></label>
      <label>نشانی عمومی<input value={draft.address} required minLength={3} maxLength={300} onChange={e => setDraft({ ...draft, address: e.target.value })} /></label>
      <div className="nb-form-grid">{(['open', 'close'] as const).map(field => <label key={field}>{field === 'open' ? 'ساعت شروع' : 'ساعت پایان'}<input required type="time" value={String(Math.floor(draft[field] / 60)).padStart(2, '0') + ':' + String(draft[field] % 60).padStart(2, '0')} onChange={e => {
        const [h, m] = e.target.value.split(':').map(Number); setDraft({ ...draft, [field]: h! * 60 + m! });
      }} /></label>)}</div>
      <fieldset><legend>روزهای کاری</legend>{['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'].map((label, day) => <label className="nb-check" key={day}><input type="checkbox" checked={draft.weekdays.includes(day)} onChange={e => setDraft({ ...draft, weekdays: e.target.checked ? [...draft.weekdays, day] : draft.weekdays.filter(d => d !== day) })} />{label}</label>)}</fieldset>
      {draft.services.map((s, index) => <fieldset key={s.id}><legend>خدمت {fa(index + 1)}</legend>{(['title', 'minutes', 'price', 'capacity', 'buffer', 'resource'] as const).map(field => <label key={field}>{{ title: 'نام خدمت', minutes: 'مدت، دقیقه', price: 'قیمت، تومان', capacity: 'ظرفیت همزمان', buffer: 'فاصله پس از خدمت، دقیقه', resource: 'شناسه منبع مشترک' }[field]}<input required type={['title', 'resource'].includes(field) ? 'text' : 'number'} min={field === 'minutes' ? 15 : field === 'capacity' ? 1 : 0} value={s[field]} onChange={e => changeService(index, field, ['title', 'resource'].includes(field) ? e.target.value : Number(e.target.value))} /></label>)}<label className="nb-check"><input type="checkbox" checked={s.active} onChange={e => changeService(index, 'active', e.target.checked)} />خدمت فعال است</label></fieldset>)}
      <button type="button" onClick={() => setDraft({ ...draft, services: [...draft.services, { ...blank.services[0]!, id: crypto.randomUUID(), title: 'خدمت جدید' }] })}>افزودن خدمت</button>
      {draft.employees.map((emp, index) => <fieldset key={emp.id}><legend>همکار {fa(index + 1)}</legend><label>نام<input required minLength={2} value={emp.name} onChange={e => setDraft({ ...draft, employees: draft.employees.map((x, i) => i === index ? { ...x, name: e.target.value } : x) })} /></label>{draft.services.map(s => <label className="nb-check" key={s.id}><input type="checkbox" checked={emp.services.includes(s.id)} onChange={e => setDraft({ ...draft, employees: draft.employees.map((x, i) => i === index ? { ...x, services: e.target.checked ? [...x.services, s.id] : x.services.filter(id => id !== s.id) } : x) })} />{s.title}</label>)}
        <div className="nb-form-grid">{(['open','close','breakStart','breakEnd'] as const).map(field=>{
          const minutes=emp.shift?.[field]??(field==='open'?draft.open:field==='close'?draft.close:0);
          return <label key={field}>{{open:'شروع شیفت',close:'پایان شیفت',breakStart:'شروع استراحت',breakEnd:'پایان استراحت'}[field]}<input type="time" value={String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0')} onChange={e=>{const [h,m]=e.target.value.split(':').map(Number);changeShift(index,field,h!*60+m!);}}/></label>;
        })}</div>
        <label>روزهای مرخصی، تاریخ میلادی با ویرگول<input value={emp.shift?.closedDates.join(',')??''} onChange={e=>changeShift(index,'closedDates',e.target.value?e.target.value.split(','):[])}/></label>
        <label className="nb-check"><input type="checkbox" checked={emp.active} onChange={e=>setDraft({...draft,employees:draft.employees.map((x,i)=>i===index?{...x,active:e.target.checked}:x)})}/>همکار فعال است</label>
      </fieldset>)}
      <button type="button" onClick={() => setDraft({ ...draft, employees: [...draft.employees, { id: crypto.randomUUID(), name: 'همکار جدید', services: [], active: true }] })}>افزودن همکار</button>
      <label>مهلت لغو، ساعت قبل از نوبت<input type="number" min="0" max="168" value={draft.cancelHours} onChange={e => setDraft({ ...draft, cancelHours: Number(e.target.value) })} /></label>
      <label>تعطیلی‌های استثنایی، تاریخ میلادی جداشده با ویرگول<input value={draft.closedDates.join(',')} placeholder="2026-12-01,2026-12-02" onChange={e => setDraft({ ...draft, closedDates: e.target.value ? e.target.value.split(',') : [] })} /></label>
      <p className="nb-note">مرکز جدید پس از تأیید مدیر منتشر می‌شود. تغییر ساختار تقویم با وجود نوبت فعال مسدود است.</p><button disabled={busy} className="nb-primary">{managed ? 'ذخیره تنظیمات' : 'ارسال برای تأیید'}</button>
    </form>}
    {managed && canConfigure && <section className="nb-card"><h2>وقت آزاد با قیمت ویژه</h2><form onSubmit={e=>{e.preventDefault();void send('/manage/'+managed+'/offers',{...offer,startAt:new Date(offer.startAt+':00+03:30').toISOString()});}}>
      <label>خدمت پیشنهاد<select value={offer.serviceId} onChange={e=>setOffer({...offer,serviceId:e.target.value})}>{draft.services.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select></label>
      <label>زمان آزاد به ساعت تهران<input type="datetime-local" required value={offer.startAt} onChange={e=>setOffer({...offer,startAt:e.target.value})}/></label>
      <label>قیمت پیشنهادی تومان<input type="number" min="0" max="100000000" required value={offer.price} onChange={e=>setOffer({...offer,price:Number(e.target.value)})}/></label>
      <button className="nb-primary" disabled={busy}>انتشار پیشنهاد واقعی</button>
    </form>{businesses.data?.data.find(b=>b.id===managed)?.config.offers?.filter(o=>new Date(o.expiresAt)>new Date()).map(o=><div className="nb-row" key={o.id}><span>{when(o.startAt)} · {fa(o.price)} تومان</span><button disabled={busy} onClick={()=>void send('/manage/'+managed+'/offers/'+o.id,undefined,'DELETE')}>حذف پیشنهاد</button></div>)}</section>}
    {managed && role === 'owner' && <form className="nb-card" onSubmit={e => { e.preventDefault(); void send('/manage/' + managed + '/members', grant); }}>
      <h2>دسترسی همکاران</h2>
      <label>شماره حساب فعال همکار<input type="tel" required pattern="09[0-9]{9}" value={grant.mobile} onChange={e => setGrant({ ...grant, mobile: e.target.value })} /></label>
      <label>نقش<select value={grant.role} onChange={e => setGrant({ ...grant, role: e.target.value })}><option value="reception">پذیرش</option><option value="manager">مدیر مرکز</option><option value="specialist">متخصص</option></select></label>
      {grant.role === 'specialist' && <label>متخصص مرتبط<select required value={grant.employeeId} onChange={e => setGrant({ ...grant, employeeId: e.target.value })}><option value="">انتخاب متخصص</option>{draft.employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label>}
      <button disabled={busy} className="nb-primary">ثبت دسترسی همکار</button>
    </form>}
  </>;
}
