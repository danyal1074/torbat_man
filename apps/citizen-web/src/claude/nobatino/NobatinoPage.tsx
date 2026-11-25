import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { CalendarDays, Clock3, MapPin, ArrowUpLeft, Scissors, CarFront, Dumbbell, Users, Sparkles } from 'lucide-react';
import { PageHeader } from '../components/ui';
import { api, json, messageOf } from '../lib/backend';
import { useUser } from '../state/session';
import { BusinessPanel } from './BusinessPanel';
import { statuses, fa, when, time, isoDay, type Business, type Booking, type Slot, type Ticket } from './types';
import './nobatino.css';

const tabs = [['', 'نوبت بگیر'], ['bookings', 'نوبت‌های من'], ['queue', 'صف من'], ['assistant', 'نوبت‌یار'], ['manage', 'کسب‌وکار من']];

export default function NobatinoPage() {
  const user = useUser(), location = useLocation(), navigate = useNavigate(), cache = useQueryClient();
  const [params] = useSearchParams();
  const section = location.pathname.split('/')[2] ?? '';
  const centerId = location.pathname.split('/')[3];
  const [q, setQ] = useState(''), [category, setCategory] = useState(''), [day, setDay] = useState(isoDay(1));
  const [serviceId, setServiceId] = useState(''), [employee, setEmployee] = useState('');
  const [selected, setSelected] = useState<Slot | null>(null), [step, setStep] = useState(1);
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false);
  const [key, setKey] = useState(() => crypto.randomUUID());
  const [assistant, setAssistant] = useState('');
  const [options, setOptions] = useState<{ businessId: string; businessName: string; title: string; price: number; startAt: string }[]>([]);
  const centers = useQuery({ queryKey: ['nob-centers', q, category], queryFn: () => api<{ data: Business[] }>('/nobatino/businesses?' + new URLSearchParams({ q, category })) });
  const categories = useQuery({ queryKey: ['nob-categories'], queryFn: () => api<{ data: string[] }>('/nobatino/categories') });
  const profile = useQuery({ queryKey: ['nob-center', centerId], queryFn: () => api<{ data: Business }>('/nobatino/businesses/' + centerId), enabled: section === 'center' && Boolean(centerId) });
  const center = profile.data?.data;
  const service = center?.config.services.find(s => s.id === (serviceId || center.config.services.find(s => s.active)?.id));
  const reviews = useQuery({queryKey:['nob-reviews',centerId],queryFn:()=>api<{data:{id:string;rating:number;body:string}[]}>('/nobatino/businesses/'+centerId+'/reviews'),enabled:Boolean(center)});
  const slots = useQuery({
    queryKey: ['nob-slots', centerId, service?.id, day],
    queryFn: () => api<{ data: Slot[] }>('/nobatino/businesses/' + centerId + '/availability?' + new URLSearchParams({ serviceId: service!.id, date: day })),
    enabled: Boolean(center && service), refetchInterval: 30000,
  });
  const bookings = useQuery({ queryKey: ['nob-bookings', user?.phone], queryFn: () => api<{ data: Booking[] }>('/nobatino/bookings/me'), enabled: Boolean(user) });
  const waiting = useQuery({queryKey:['nob-waitlist',user?.phone],queryFn:()=>api<{data:{id:string;businessId:string;day:string;status:string;slot:{startAt:string;employeeId:string}|null;expiresAt:string|null}[]}>('/nobatino/waitlist/me'),enabled:Boolean(user)&&section==='bookings',refetchInterval:30000});
  const tickets = useQuery({ queryKey: ['nob-tickets', user?.phone], queryFn: () => api<{ data: Ticket[] }>('/nobatino/queue-tickets/me'), enabled: Boolean(user) && section === 'queue', refetchInterval: 15000 });
  useEffect(() => { setSelected(null); setStep(1); setKey(crypto.randomUUID()); }, [centerId, serviceId, day, employee]);

  async function send<T>(path: string, body?: unknown, method = 'POST'): Promise<T | null> {
    setError(''); setNotice(''); setBusy(true);
    try {
      const result = await api<T>('/nobatino' + path, body === undefined ? { method } : json(body, method));
      await Promise.all(['nob-centers', 'nob-center', 'nob-waitlist', 'nob-bookings', 'nob-slots', 'nob-tickets', 'nob-calendar', 'nob-queue', 'nob-manage'].map(k => cache.invalidateQueries({ queryKey: [k] })));
      setNotice('تغییرات ثبت شد.');
      return result;
    } catch (e) { setError(messageOf(e)); return null; }
    finally { setBusy(false); }
  }
  async function book() {
    if (!center || !selected || !service) return;
    const move = params.get('reschedule');
    const result = await send(move ? '/bookings/' + move + '/reschedule' : '/bookings', move
      ? { startAt: selected.startAt, employeeId: selected.employeeId, reason: 'درخواست جابه‌جایی شهروند' }
      : { businessId: center.id, serviceId: service.id, employeeId: selected.employeeId, startAt: selected.startAt, expectedPrice: selected.price, key });
    if (result) navigate('/nobatino/bookings');
    else void slots.refetch();
  }
  function downloadCalendar(b: Booking) {
    const format = (s: string) => s.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const file = new Blob(['BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:' + b.id + '@torbatino\r\nDTSTAMP:' + format(new Date().toISOString()) + '\r\nDTSTART:' + format(b.startAt) + '\r\nDTEND:' + format(b.endAt) + '\r\nSUMMARY:Torbatino appointment\r\nEND:VEVENT\r\nEND:VCALENDAR'], { type: 'text/calendar' });
    const url = URL.createObjectURL(file), a = document.createElement('a');
    a.href = url; a.download = 'nobatino.ics'; a.click(); URL.revokeObjectURL(url);
  }
  const problems = [centers, profile, slots, bookings, tickets, waiting, reviews].filter(query => query.isError);
  const next = bookings.data?.data.find(b => b.status === 'confirmed' && new Date(b.startAt) > new Date());
  const daySelector = <div className="nb-date-picker"><label>تاریخ مراجعه<input type="date" value={day} min={isoDay()} max={isoDay(90)} onChange={e => { if (e.target.value) setDay(e.target.value); }} /></label><strong>{new Date(day + 'T12:00:00+03:30').toLocaleDateString('fa-IR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong></div>;
  return <main className="nobatino page-enter">
    <PageHeader title="نوبتینو" subtitle="وقتت ارزش داره!" />
    <nav aria-label="بخش‌های نوبتینو" className="nb-nav">{tabs.map(([path, title]) => <Link key={path} to={'/nobatino/' + path} aria-current={section === path ? 'page' : undefined}>{title}</Link>)}</nav>
    <div className="nb-content">
      <p className="nb-note">نسخه آزمایشی · پرداخت حضوری · ساعت تهران · پیامک و پرداخت آنلاین غیرفعال</p>
      {error && <p role="alert" className="nb-error">{error}</p>}
      {notice && <p role="status" className="nb-success">{notice}</p>}
      {problems.length > 0 && <div role="alert" className="nb-error"><p>{messageOf(problems[0]?.error)}</p><button onClick={() => problems.forEach(p => void p.refetch())}>تلاش دوباره</button></div>}
      {!user && ['bookings', 'queue', 'manage'].includes(section) && <section className="nb-card"><h2>همه نوبت‌ها، در یک جا</h2><p>برای پیگیری و مدیریت نوبت وارد حساب تربتینو شوید.</p><Link className="nb-primary" to={'/login?next=' + encodeURIComponent(location.pathname)}>ورود</Link></section>}
      {section === '' && <>
        <section className="nb-hero"><span className="nb-kicker"><Clock3 size={16} />از انتظار، به وقت زندگی</span><h2>وقت برای خودت.<br /><em>نوبتش با نوبتینو.</em></h2><p>خدمتت را پیدا کن، زمانت را انتخاب کن و با خیال راحت برنامه بریز.</p><a className="nb-primary" href="#nb-results">نوبت بگیر <ArrowUpLeft size={20} /></a><CalendarDays className="nb-hero-icon" size={120} aria-hidden="true" /></section>
        {next && <Link to="/nobatino/bookings" className="nb-next"><CalendarDays /><span><strong>نوبت بعدی تو</strong><small>{next.snapshot.businessName} · {when(next.startAt)}</small></span></Link>}
        <section className="nb-search"><label>خدمت یا نام مرکز<input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="مثلاً کارواش، اصلاح مو…" /></label><label>دسته<select value={category} onChange={e => setCategory(e.target.value)}><option value="">همه دسته‌ها</option>{categories.data?.data.map(c => <option key={c}>{c}</option>)}</select></label></section>
        <div className="nb-section-head" id="nb-results"><h2>برای وقت‌های باارزش تو</h2><span>{fa(centers.data?.data.length ?? 0)} مرکز</span></div>
        {centers.isPending && <p role="status">در حال یافتن مرکزها…</p>}
        {centers.data?.data.length === 0 && <section className="nb-card"><h3>مرکزی با این مشخصات پیدا نشد</h3><p>نام کوتاه‌تر یا دسته دیگری انتخاب کنید.</p></section>}
        <div className="nb-businesses">{centers.data?.data.map(b => {
          const Icon = b.config.category.includes('خودرو') ? CarFront : b.config.category.includes('ورزش') ? Dumbbell : Scissors;
          const prices = b.config.services.filter(s => s.active).map(s => s.price);
          return <Link to={'/nobatino/center/' + b.id} className="nb-business" key={b.id}><div className="nb-business-visual"><Icon size={48} strokeWidth={1.3} /><span>{b.isDemo ? 'مرکز نمونه' : 'مرکز فعال'}</span></div><div className="nb-business-body"><small>{b.config.category}</small><h3>{b.name}</h3><p><MapPin size={14} />{b.config.address}</p><p className="nb-first">{b.firstAvailable?'اولین زمان آزاد '+when(b.firstAvailable):'تا هفت روز آینده زمان خالی پیدا نشد'}</p><div className="nb-section-head"><strong>{prices.length ? 'از ' + fa(Math.min(...prices)) + ' تومان' : 'خدمت فعال ندارد'}</strong><span>زمان‌های آزاد <ArrowUpLeft size={17} /></span></div></div></Link>;
        })}</div>
        <Link className="nb-coach" to="/nobatino/assistant"><Sparkles /><span><strong>هنوز نمی‌دونی کجا نوبت بگیری؟</strong><small>با نوبت‌یار، گزینه‌های آزاد را پیدا کن</small></span></Link>
      </>}
      {section === 'center' && profile.isPending && <p role="status">در حال دریافت مرکز…</p>}
      {section === 'center' && center && <>
        <section className="nb-card"><span className="nb-badge">{center.isDemo ? 'داده کاملاً آزمایشی' : 'فعال در نوبتینو'}</span><h2>{center.name}</h2><p><MapPin size={16} />{center.config.address}</p><p>امکان لغو تا {fa(center.config.cancelHours)} ساعت قبل · پرداخت در محل</p><div className="nb-steps"><span aria-current={step === 1 ? 'step' : undefined}>۱. زمان مناسب</span><span aria-current={step === 2 ? 'step' : undefined}>۲. مرور و تأیید</span></div></section>
        {step === 1 ? <section className="nb-card"><h2>چه وقتی برات مناسبه؟</h2>
          <label>خدمت<select value={service?.id ?? ''} onChange={e => setServiceId(e.target.value)}>{center.config.services.filter(s => s.active).map(s => <option value={s.id} key={s.id}>{s.title} · {fa(s.minutes)} دقیقه · {fa(s.price)} تومان</option>)}</select></label>
          <label>متخصص<select value={employee} onChange={e => setEmployee(e.target.value)}><option value="">اولین متخصص آزاد</option>{center.config.employees.filter(e => e.active && e.services.includes(service?.id ?? '')).map(e => <option value={e.id} key={e.id}>{e.name}</option>)}</select></label>
          {daySelector}
          <div className="nb-days">{Array.from({ length: 7 }, (_, i) => { const date = isoDay(i); return <button key={date} aria-pressed={day === date} onClick={() => setDay(date)}>{new Date(date + 'T12:00:00Z').toLocaleDateString('fa-IR', { weekday: 'short', day: 'numeric' })}</button>; })}</div>
          {slots.isPending && <p role="status">در حال بررسی ظرفیت…</p>}
          {slots.data?.data.length === 0 && <p>این روز زمان آزاد ندارد. روز دیگری انتخاب کنید.</p>}
          <div className="nb-slots">{slots.data?.data.filter(s => !employee || s.employeeId === employee).map(s => <button key={s.startAt + s.employeeId} aria-pressed={selected?.startAt === s.startAt && selected.employeeId === s.employeeId} onClick={() => setSelected(s)}><strong>{time(s.startAt)}</strong><small>{center.config.employees.find(e => e.id === s.employeeId)?.name}</small><small>{fa(s.price)} تومان</small></button>)}</div>
          <p className="nb-note">ظرفیت هنگام تأیید دوباره بررسی می‌شود.</p>
          {user && service && <button disabled={busy} onClick={()=>void send('/waitlist',{businessId:center.id,serviceId:service.id,day})}>عضویت در لیست انتظار این روز</button>}<button className="nb-primary" disabled={!selected} onClick={() => setStep(2)}>مرور نوبت</button>
        </section> : selected && service && <section className="nb-card"><span className="nb-badge">فقط یک قدم مانده</span><h2>همه چیز درسته؟</h2><dl className="nb-summary"><dt>مرکز</dt><dd>{center.name}</dd><dt>خدمت</dt><dd>{service.title}</dd><dt>زمان تهران</dt><dd>{when(selected.startAt)}</dd><dt>مدت</dt><dd>{fa(service.minutes)} دقیقه</dd><dt>مبلغ حضوری</dt><dd>{fa(selected.price)} تومان</dd><dt>لغو</dt><dd>تا {fa(center.config.cancelHours)} ساعت قبل</dd></dl>
          {user ? <button className="nb-primary" disabled={busy} onClick={() => void book()}>{params.get('reschedule') ? 'تأیید جابه‌جایی نوبت' : 'تأیید و ثبت نوبت'}</button> : <Link className="nb-primary" to={'/login?next=' + encodeURIComponent(location.pathname)}>ورود برای تأیید نوبت</Link>}<button onClick={() => setStep(1)}>ویرایش زمان</button>
        </section>}
        <section className="nb-card"><h3>تجربه مراجعه‌کنندگان</h3>{reviews.data?.data.length===0&&<p>هنوز نظر تأییدشده‌ای ثبت نشده است.</p>}{reviews.data?.data.map(r=><article className="nb-row" key={r.id}><span>{fa(r.rating)} از ۵ · {r.body}</span>{user&&<button disabled={busy} onClick={()=>{const reason=window.prompt('دلیل گزارش نظر');if(reason)void send('/reviews/'+r.id+'/report',{reason});}}>گزارش نظر</button>}</article>)}</section>
        <section className="nb-card"><Users /><h3>وقت مشخص نمی‌خواهی؟</h3><p>صف مجازی، شماره انتظار امروز است و ساعت قطعی ندارد.</p><button disabled={busy || !user} onClick={async () => { const result = await send('/queues/' + center.id + '/join'); if (result) navigate('/nobatino/queue'); }}>گرفتن شماره صف آزمایشی</button></section>
      </>}
      {section === 'bookings' && user && <><div className="nb-section-head"><h2>وقت‌هایی که برای خودت گذاشتی</h2><button onClick={() => void bookings.refetch()}>تازه‌سازی</button></div>
        {bookings.isPending && <p>در حال دریافت…</p>}
        {bookings.data?.data.length === 0 && <section className="nb-card"><CalendarDays size={36} /><h3>هنوز نوبتی نداری</h3><Link to="/nobatino">اولین نوبتت را پیدا کن</Link></section>}
        {bookings.data?.data.map(b => <article className="nb-card nb-ticket" key={b.id}><span className="nb-badge">{statuses[b.status]}</span><h3>{b.snapshot.title}</h3><p>{b.snapshot.businessName}</p><strong>{when(b.startAt)}</strong><p>{fa(b.snapshot.price)} تومان · پرداخت حضوری</p><code dir="ltr">{b.code}</code><div className="nb-actions">{b.status==='completed'&&<button disabled={busy} onClick={()=>{const rating=window.prompt('امتیاز تجربه از ۱ تا ۵');if(rating===null)return;const body=window.prompt('توضیح تجربه شما، بدون اطلاعات حساس');if(body)void send('/bookings/'+b.id+'/review',{rating:Number(rating),body});}}>ثبت نظر پس از خدمت</button>}<button onClick={() => downloadCalendar(b)}>افزودن به تقویم</button><Link to={'/nobatino/center/' + b.businessId}>رزرو مجدد</Link>{['confirmed', 'checked_in'].includes(b.status) && <><button disabled={busy} onClick={() => { if (window.confirm('لغو این نوبت را تأیید می‌کنید؟')) void send('/bookings/' + b.id + '/cancel', { reason: 'لغو به درخواست شهروند' }); }}>لغو نوبت</button><Link to={'/nobatino/center/' + b.businessId + '?reschedule=' + b.id}>تغییر زمان</Link></>}</div><details><summary>تاریخچه نوبت</summary>{b.events.map((e, i) => <p key={i}>{when(e.at)} · {statuses[e.status]} · {e.reason}</p>)}</details></article>)}
      </>}
      {section === 'bookings' && user && <section className="nb-card"><h2>لیست انتظار من</h2><p>پیشنهاد پنج دقیقه فرصت پذیرش دارد. تا تأیید شما رزروی ثبت نمی‌شود و ظرفیت دوباره بررسی می‌شود.</p>{waiting.data?.data.length===0&&<p>هنوز در لیست انتظاری عضو نیستید.</p>}{waiting.data?.data.map(w=><article className="nb-row" key={w.id}><span>{new Date(w.day+'T12:00:00Z').toLocaleDateString('fa-IR')} · {{waiting:'در انتظار',offered:'پیشنهاد زمان آزاد',accepted:'پذیرفته‌شده',declined:'ردشده',expired:'منقضی‌شده'}[w.status]}</span>{w.slot&&w.status==='offered'&&<><strong>{when(w.slot.startAt)}</strong><small>مهلت تا {w.expiresAt?time(w.expiresAt):''}</small><button disabled={busy} onClick={()=>void send('/waitlist-offers/'+w.id+'/accept')}>تأیید و رزرو پیشنهاد</button></>}{['waiting','offered'].includes(w.status)&&<button disabled={busy} onClick={()=>void send('/waitlist-offers/'+w.id+'/decline')}>خروج از لیست انتظار</button>}</article>)}</section>}
      {section === 'queue' && user && <section className="nb-card"><h2>صف من، بدون انتظار در محل</h2><p>هر ۱۵ ثانیه به‌روز می‌شود. زمان انتظار بدون سابقه کافی محاسبه نمی‌شود.</p>{tickets.data?.data.length === 0 && <p>امروز در صفی نیستید.</p>}{tickets.data?.data.map(t => <article className="nb-queue-ticket" key={t.id}><span>شماره امروز</span><strong>{fa(t.number)}</strong><p>{statuses[t.status]} · {fa(t.ahead ?? 0)} نفر پیش‌رو</p><small>آخرین تغییر {when(t.updatedAt)}</small>{['waiting', 'called', 'checked_in'].includes(t.status) && <button disabled={busy} onClick={() => void send('/queue-tickets/' + t.id + '/cancel')}>خروج از صف</button>}</article>)}</section>}
      {section === 'assistant' && <><section className="nb-coach"><Sparkles /><div><h2>نوبت‌یار، همراه انتخابت</h2><p>جست‌وجوی قواعدمحور در زمان‌های واقعی؛ رزرو فقط پس از تأیید تو.</p></div></section><form className="nb-card" onSubmit={async e => { e.preventDefault(); const result = await send<{ data: typeof options; question: string | null }>('/assistant', { message: assistant, date: day }); if (result) { setOptions(result.data); if (result.question) setNotice(result.question); } }}><label>چه خدمتی لازم داری؟<input value={assistant} maxLength={500} required minLength={2} placeholder="مثلاً کارواش" onChange={e => setAssistant(e.target.value)} /></label>{daySelector}<button className="nb-primary" disabled={busy}>پیدا کردن زمان آزاد</button></form>{options.map((o, i) => <Link key={i} className="nb-card" to={'/nobatino/center/' + o.businessId}><h3>{o.businessName}</h3><p>{o.title} · {when(o.startAt)} · {fa(o.price)} تومان</p><span>انتخاب و تأیید زمان ←</span></Link>)}</>}
      {section === 'manage' && user && <BusinessPanel busy={busy} send={send} />}
    </div>
  </main>;
}
