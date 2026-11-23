import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Bot, Clock, MapPin, Phone, Send, ShoppingCart, Star, Minus, Plus, Sparkles, Bus, Briefcase, List, Map as MapIcon,  } from 'lucide-react';
import { PageHeader, EmptyState, ServiceCard } from '../components/ui';
import { allServices } from '../data/services';
import { directories, CtaKind } from '../demo/directory';
import { aiAnswers, busLines, jobs, productCats, products } from '../demo/misc';
import { StatusBadge } from '../shahrbin/parts';
import { faDigits, typeOf, useReports, problemTypes, relTime } from '../shahrbin/model';
import { matchesQuery, normalizeFa } from '../lib/normalize';
import { api, json, messageOf } from '../lib/backend';

const Demo = ({ children }: { children: React.ReactNode }) => <p className="demo-note" role="note">{children}</p>;
const Sheet = ({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) => (
  <main className="page-enter"><PageHeader title={title} subtitle={sub} /><div className="sheet">{children}</div></main>
);
const Stars = ({ v }: { v: number }) => <span className="stars" aria-label={`امتیاز ${faDigits(v.toFixed(1))} از ۵`}><Star size={14} fill="currentColor" aria-hidden="true" />{faDigits(v.toFixed(1))}</span>;
const price = (n: number) => `${faDigits(n.toLocaleString('en-US'))} تومان`;

/* ================= Directory (bread, health, guilds, …) ================= */
export function DirectoryPage({ id }: { id: string }) {
  const cfg = directories[id]; const svc = allServices.find((s) => s.id === id)!;
  const [tag, setTag] = useState('همه'); const [q, setQ] = useState(''); const [view, setView] = useState<'list' | 'map'>('list');
  const items = useMemo(() => cfg.items.filter((i) => (tag === 'همه' || i.tags.includes(tag)) && (!q || matchesQuery(`${i.title} ${i.sub} ${i.tags.join(' ')}`, q))), [cfg, tag, q]);
  const [sel, setSel] = useState<string | null>(null);
  return (
    <Sheet title={cfg.heading} sub={svc.category.title}>
      <p className="field-hint">{cfg.intro}</p>
      <div className="search compact" role="search"><label htmlFor="dq" className="sr-only">جست‌وجو در {cfg.noun}‌ها</label>
        <input id="dq" type="search" placeholder={`جست‌وجوی ${cfg.noun}…`} value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="chips" role="tablist" aria-label={cfg.filterLabel}>{['همه', ...cfg.tags].map((t) => <button key={t} role="tab" aria-selected={tag === t} className={`chip${tag === t ? ' on' : ''}`} onClick={() => setTag(t)}>{t}</button>)}</div>
      <div className="seg" role="group" aria-label="نحوه نمایش">
        <button aria-pressed={view === 'list'} onClick={() => setView('list')}><List size={16} aria-hidden="true" />فهرست</button>
        <button aria-pressed={view === 'map'} onClick={() => setView('map')}><MapIcon size={16} aria-hidden="true" />نقشه</button>
      </div>
      {items.length === 0 ? <EmptyState title="موردی پیدا نشد" text="جست‌وجو یا فیلتر را تغییر دهید." /> : view === 'list' ? (
        <ul className="rlist">{items.map((i) => (
          <li key={i.id}><Link to={`/services/${id}/${i.id}`} className="rrow">
            <span className="rico"><svc.icon size={24} aria-hidden="true" /></span>
            <span className="rtxt"><strong>{i.title}</strong><small>{i.sub}</small><small><Clock size={12} aria-hidden="true" /> {i.hours}</small></span><Stars v={i.rating} /></Link></li>))}</ul>
      ) : (
        <div className="stack"><div className="map" dir="ltr"><div className="map-surface ro" role="group" aria-label="نقشه موارد">
          <MapBg />{items.map((i) => (
            <button key={i.id} className={`pin pin-btn${sel === i.id ? ' on' : ''}`} style={{ left: `${i.x * 100}%`, top: `${i.y * 100}%` }} onClick={() => setSel(i.id)} aria-label={i.title}><MapPin size={30} fill="currentColor" aria-hidden="true" /></button>))}
        </div></div>
          {sel && items.find((i) => i.id === sel) && <Link to={`/services/${id}/${sel}`} className="rrow"><span className="rtxt"><strong>{items.find((i) => i.id === sel)!.title}</strong><small>{items.find((i) => i.id === sel)!.address}</small></span></Link>}
          {!sel && <p className="field-hint">روی یک سنجاق بزنید.</p>}</div>
      )}
      <Demo>اطلاعات این فهرست نمایشی و ساختگی است.</Demo>
    </Sheet>
  );
}
function MapBg() {
  return (<svg viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="400" height="260" fill="#EEF0EA" /><path d="M0 40 C60 60 80 20 150 50 S300 110 400 70 V0 H0Z" fill="#DCE9D5" /><ellipse cx="62" cy="190" rx="52" ry="34" fill="#CFE3EE" />
    <g stroke="#fff" strokeWidth="9" fill="none" strokeLinecap="round"><path d="M0 150 L400 120" /><path d="M120 0 L170 260" /><path d="M290 0 L250 260" /></g><g stroke="#F5E3A4" strokeWidth="6" fill="none"><path d="M330 0 L210 260" /></g></svg>);
}
export function DirectoryDetailPage({ id }: { id: string }) {
  const { itemId } = useParams(); const cfg = directories[id]; const item = cfg?.items.find((i) => i.id === itemId);
  const [done, setDone] = useState(false);
  if (!item) return <Sheet title="پیدا نشد" sub=""><EmptyState title="مورد پیدا نشد" text="ممکن است حذف شده باشد." action={<Link className="btn" to={`/services/${id}`}>بازگشت</Link>} /></Sheet>;
  const kind: CtaKind = cfg.cta.kind;
  return (
    <Sheet title={item.title} sub={item.sub}>
      <div className="detail-top"><Stars v={item.rating} /><span className="field-hint">{item.tags.join('، ')}</span></div>
      <p style={{ margin: 0 }}>{item.desc}</p>
      <dl className="summary">
        <div><dt>ساعت کار</dt><dd>{item.hours}</dd></div><div><dt>نشانی</dt><dd>{item.address}</dd></div><div><dt>تلفن (نمایشی)</dt><dd dir="ltr" style={{ textAlign: 'right' }}>{item.phone}</dd></div>
        {item.extra.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
      </dl>
      <div className="map" dir="ltr"><div className="map-surface ro" role="img" aria-label="موقعیت"><MapBg /><span className="pin" style={{ left: `${item.x * 100}%`, top: `${item.y * 100}%` }}><MapPin size={34} fill="currentColor" aria-hidden="true" /></span></div></div>
      {kind === 'office' ? <Link className="btn-main" to="/services/digital">مشاهده درخواست‌های اداری قابل ثبت</Link>
        : kind === 'contact' ? done
          ? <p className="demo-note" role="status"><Phone size={18} aria-hidden="true"/>شماره نمونه: <bdi dir="ltr">{item.phone}</bdi></p>
          : <button className="btn-main" onClick={() => setDone(true)}>نمایش شماره نمونه</button>
        : <p className="demo-note">ثبت سفارش برای این مورد فعال نیست.</p>}
      <Demo>این یک نسخه نمایشی است؛ سفارش یا درخواست به‌جایی ارسال نمی‌شود.</Demo>
    </Sheet>
  );
}

/* ================= City services (green, lighting, roads, waste) ================= */
const cityTypeMap: Record<string, string> = { 'green-space': 'green', lighting: 'lighting', roads: 'roads', waste: 'waste' };
export function CityServicePage({ id }: { id: string }) {
  const svc = allServices.find((s) => s.id === id)!; const typeId = cityTypeMap[id]; const t = typeOf(typeId); const reports = useReports();
  const mine = reports.filter((r) => r.typeId === typeId); const done = mine.filter((r) => r.status === 'done').length;
  const tips: Record<string, string[]> = {
    'green-space': ['درخت شکسته یا خطرناک را با موقعیت دقیق گزارش دهید.', 'آبیاری و هرس بوستان‌ها طبق برنامه فصلی انجام می‌شود.'],
    lighting: ['شماره یا نشانه تیر چراغ را در توضیحات بنویسید.', 'خاموشی چند چراغ پشت‌سرهم را یک گزارش ثبت کنید.'],
    roads: ['چاله‌ها و ترک‌ها را با یک تصویر گزارش دهید.', 'موارد پرخطر در اولویت ترمیم‌اند.'],
    waste: ['زمان‌بندی جمع‌آوری پسماند هر محله متفاوت است.', 'پسماند حجیم را با گزارش شهربین اطلاع دهید.'],
  };
  return (
    <Sheet title={svc.title} sub={svc.category.title}>
      <div className="stats3"><div><strong>{faDigits(mine.length)}</strong><small>گزارش ثبت‌شده</small></div><div><strong>{faDigits(done)}</strong><small>رسیدگی‌شده</small></div><div><strong>{faDigits(mine.length - done)}</strong><small>در جریان</small></div></div>
      <h2 className="sec-title sm">راهنمای سریع</h2><ul className="prose">{tips[id].map((x) => <li key={x}>{x}</li>)}</ul>
      <Link className="btn-main" to={`/shahrbin/new?type=${typeId}`}>گزارش «{t.title}»</Link>
      <h2 className="sec-title sm">آخرین گزارش‌ها</h2>
      {mine.length === 0 ? <p className="field-hint">هنوز گزارشی نیست.</p> : <ul className="rlist">{mine.slice(0, 4).map((r) => <li key={r.code}><Link className="rrow" to={`/shahrbin/reports/${r.id}`}><span className="rtxt"><strong>{r.description.slice(0, 50)}</strong><small>{relTime(r.createdAt)}</small></span><StatusBadge status={r.status} /></Link></li>)}</ul>}
      <Demo>آمار بر اساس گزارش‌های قابل مشاهده در حساب شماست.</Demo>
    </Sheet>
  );
}

/* ================= Bus ================= */
export function BusPage() {
  const [line, setLine] = useState(busLines[0].id); const l = busLines.find((x) => x.id === line)!; const [stop, setStop] = useState(l.stops[0]);
  useEffect(() => { setStop(l.stops[0]); }, [line]); // eslint-disable-line
  const idx = l.stops.indexOf(stop);
  const base = ((new Date().getMinutes() * 7 + idx * 3) % l.every) + 2;
  const etas = [base, base + l.every, base + 2 * l.every];
  return (
    <Sheet title="اتوبوس من" sub="خطوط و ایستگاه‌ها">
      <div className="chips" role="tablist" aria-label="خط">{busLines.map((x) => <button key={x.id} role="tab" aria-selected={line === x.id} className={`chip${line === x.id ? ' on' : ''}`} onClick={() => setLine(x.id)}>{x.name}</button>)}</div>
      <div className="loc-card"><strong>{l.from} ← {l.to}</strong><small>{`هر ${faDigits(l.every)} دقیقه · ${l.first} تا ${l.last} · کرایه ${l.fare}`}</small></div>
      <ol className="timeline stops" aria-label="ایستگاه‌ها">{l.stops.map((s, i) => <li key={s} className={i <= idx ? 'done' : 'todo'}><span className="tl-dot" /><button className={`stop${s === stop ? ' on' : ''}`} onClick={() => setStop(s)} aria-pressed={s === stop}>{s}</button></li>)}</ol>
      <div className="loc-card"><span className="field-label"><Bus size={16} aria-hidden="true" /> رسیدن بعدی به «{stop}»</span>
        <strong>{etas.map((m) => `${faDigits(m)} دقیقه`).join('  ·  ')}</strong></div>
      <Demo>زمان‌های رسیدن فقط برای نمایش و بر پایه برنامه ساختگی محاسبه می‌شوند؛ موقعیت زنده اتوبوس وجود ندارد.</Demo>
    </Sheet>
  );
}

/* ================= Shop (cart + checkout) ================= */
export function ShopPage() {
  const [cat, setCat] = useState('همه'); const [cart, setCart] = useState<Record<string, number>>({});
  const list = products.filter((p) => cat === 'همه' || p.cat === cat);
  const lines = products.filter((p) => cart[p.id]); const total = lines.reduce((a, p) => a + p.price * cart[p.id], 0);
  const set = (id: string, d: number) => setCart((c) => { const n = Math.max(0, (c[id] ?? 0) + d); const { [id]: _, ...rest } = c; return n ? { ...rest, [id]: n } : rest; });
  return (
    <Sheet title="خرید من" sub="محصولات محلی">
      <div className="chips" role="tablist" aria-label="دسته">{productCats.map((c) => <button key={c} role="tab" aria-selected={cat === c} className={`chip${cat === c ? ' on' : ''}`} onClick={() => setCat(c)}>{c}</button>)}</div>
      <ul className="rlist">{list.map((p) => (
        <li key={p.id} className="rrow"><span className="rtxt"><strong>{p.title}</strong><small>{p.seller}</small><small>{price(p.price)}</small></span>
          <span className="qty">{cart[p.id] ? (<><button aria-label={`کم‌کردن ${p.title}`} onClick={() => set(p.id, -1)}><Minus size={16} /></button><b aria-live="polite">{faDigits(cart[p.id])}</b></>) : null}
            <button aria-label={`افزودن ${p.title}`} onClick={() => set(p.id, 1)}><Plus size={16} /></button></span></li>))}</ul>
      <div className="cart-bar" role="region" aria-label="سبد خرید"><ShoppingCart size={20} aria-hidden="true" /><span>{lines.length ? `${faDigits(lines.reduce((a, p) => a + cart[p.id], 0))} کالا — ${price(total)}` : 'سبد خالی است'}</span>
        <span className="badge soon">ثبت سفارش غیرفعال</span></div>
      <Demo>سبد خرید نمونه است. پرداخت و ارسال سفارش فعال نیست.</Demo>
    </Sheet>
  );
}

/* ================= Jobs ================= */
export function JobsPage() {
  const [q, setQ] = useState(''); const list = jobs.filter((j) => !q || matchesQuery(`${j.title} ${j.employer}`, q));
  return (
    <Sheet title="تربت کار" sub="فرصت‌های شغلی">
      <div className="search compact"><label htmlFor="jq" className="sr-only">جست‌وجوی شغل</label><input id="jq" type="search" placeholder="جست‌وجوی شغل…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      {list.length === 0 ? <EmptyState title="شغلی پیدا نشد" text="عبارت دیگری را امتحان کنید." /> :
        <ul className="rlist">{list.map((j) => <li key={j.id}><Link className="rrow" to={`/services/jobs/${j.id}`}><span className="rico"><Briefcase size={24} aria-hidden="true" /></span><span className="rtxt"><strong>{j.title}</strong><small>{j.employer} · {j.type}</small></span></Link></li>)}</ul>}
      <Demo>آگهی‌ها نمایشی هستند.</Demo>
    </Sheet>
  );
}
export function JobDetailPage() {
  const { itemId } = useParams(); const j = jobs.find((x) => x.id === itemId);
  if (!j) return <Sheet title="پیدا نشد" sub=""><EmptyState title="آگهی پیدا نشد" text="" /></Sheet>;
  return (
    <Sheet title={j.title} sub={j.employer}>
      <dl className="summary"><div><dt>نوع همکاری</dt><dd>{j.type}</dd></div><div><dt>محل</dt><dd>{j.city}</dd></div><div><dt>حقوق</dt><dd>{j.salary}</dd></div></dl>
      <p style={{ margin: 0 }}>{j.desc}</p><h2 className="sec-title sm">شرایط</h2><ul className="prose">{j.req.map((r) => <li key={r}>{r}</li>)}</ul>
      <Demo>این آگهی نمونه است و ارسال درخواست فعال نیست.</Demo>
    </Sheet>
  );
}

/* ================= Analytics ================= */
export function AnalyticsPage() {
  const reports = useReports().filter((r) => r.kind === 'report'); const total = reports.length; const done = reports.filter((r) => r.status === 'done').length;
  const byType = problemTypes.map((t) => ({ t, n: reports.filter((r) => r.typeId === t.id).length })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n); const max = Math.max(1, ...byType.map((x) => x.n));
  return (
    <Sheet title="تحلیل و آمار" sub="وضعیت شهر در یک نگاه">
      <div className="stats3"><div><strong>{faDigits(total)}</strong><small>گزارش</small></div><div><strong>{faDigits(done)}</strong><small>انجام‌شده</small></div><div><strong>{faDigits(total ? Math.round((done / total) * 100) : 0)}٪</strong><small>نرخ رسیدگی</small></div></div>
      <h2 className="sec-title sm">گزارش‌ها بر اساس نوع</h2>
      <ul className="bars">{byType.map(({ t, n }) => <li key={t.id}><span>{t.title}</span><span className="bar" role="img" aria-label={`${faDigits(n)} گزارش`}><i style={{ width: `${(n / max) * 100}%` }} /></span><b>{faDigits(n)}</b></li>)}</ul>
      <Demo>این آمار مربوط به گزارش‌های قابل مشاهده در حساب شماست.</Demo>
    </Sheet>
  );
}

/* ================= Assistant (scripted) ================= */
export function AssistantPage() {
  const [msgs, setMsgs] = useState<{ from: 'bot' | 'me'; text: string; link?: [string, string] }[]>([{ from: 'bot', text: 'سلام! از من درباره خدمات تربت‌نو بپرسید؛ مثلاً «نانوایی کجاست؟».' }]);
  const [v, setV] = useState(''); const [busy, setBusy] = useState(false); const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [msgs]);
  const send = async (text: string) => {
    const message = text.trim();
    if (message.length < 2 || busy) return;
    setBusy(true); setV(''); setMsgs(current => [...current, { from: 'me', text: message }]);
    try {
      const { data } = await api<{ data: { reply: string; suggestedServices: { slug: string; title: string }[] } }>('/ai/assistant', json({ message }));
      const first = data.suggestedServices[0];
      setMsgs(current => [...current, { from: 'bot', text: data.reply, link: first ? ['/catalog/' + first.slug, first.title] : undefined }]);
    } catch (error) { setMsgs(current => [...current, { from: 'bot', text: messageOf(error) }]); }
    finally { setBusy(false); }
  };
  const sub = (e: FormEvent) => { e.preventDefault(); send(v); };
  return (
    <Sheet title="دستیار هوشمند" sub="پاسخ‌های نمایشی">
      <div className="chat" role="log" aria-live="polite">{msgs.map((m, i) => <div key={i} className={`bubble ${m.from}`}>{m.from === 'bot' && <Bot size={16} aria-hidden="true" />}<p>{m.text}</p>{m.link && <Link to={m.link[0]} className="see-all">{m.link[1]}</Link>}</div>)}<div ref={end} /></div>
      <div className="chips">{['نانوایی کجاست؟', 'چطور چاله را گزارش کنم؟', 'اتوبوس ترمینال'].map((x) => <button key={x} className="chip" onClick={() => send(x)}>{x}</button>)}</div>
      <form className="chatbar" onSubmit={sub}><label htmlFor="ai" className="sr-only">پیام</label><input id="ai" className="input" placeholder="پیام خود را بنویسید…" value={v} maxLength={500} onChange={(e) => setV(e.target.value)} /><button className="btn-main sq" aria-label="ارسال" disabled={busy}><Send size={18} /></button></form>
      <Demo>این دستیار مدل هوش مصنوعی واقعی نیست؛ بر پایه چند قاعده ساده کلیدواژه‌ای پاسخ می‌دهد.</Demo>
    </Sheet>
  );
}

/* ================= Smart search ================= */
export function SmartSearchPage() {
  const [q, setQ] = useState(''); const n = normalizeFa(q);
  const svcs = n ? allServices.filter((s) => matchesQuery(`${s.title} ${s.provider} ${s.category.title}`, n)) : [];
  const items = n ? Object.entries(directories).flatMap(([sid, d]) => d.items.filter((i) => matchesQuery(`${i.title} ${i.sub} ${i.tags.join(' ')} ${i.desc}`, n)).map((i) => ({ sid, i }))).slice(0, 12) : [];
  const ai = n ? aiAnswers.find((a) => a.keys.some((k) => n.includes(normalizeFa(k)))) : undefined;
  return (
    <Sheet title="جست‌وجوی هوشمند" sub="در خدمات و مکان‌ها">
      <div className="search compact" role="search"><Sparkles size={18} aria-hidden="true" /><label htmlFor="sq" className="sr-only">جست‌وجو</label><input id="sq" type="search" placeholder="مثلاً: سنگک، لوله‌کش، گواهی…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      {!n ? <EmptyState title="هرچه می‌خواهید بنویسید" text="در نام خدمت‌ها، نانوایی‌ها، استادکارها و مراکز می‌گردیم." /> : (
        <div className="stack" aria-live="polite">{ai && <p className="demo-note"><Bot size={18} aria-hidden="true" />{ai.answer}</p>}
          {svcs.length > 0 && <div><h2 className="sec-title sm">خدمات</h2><div className="grid">{svcs.map((s) => <ServiceCard key={s.id} service={s} />)}</div></div>}
          {items.length > 0 && <div><h2 className="sec-title sm">مکان‌ها و ارائه‌دهندگان</h2><ul className="rlist">{items.map(({ sid, i }) => <li key={i.id}><Link className="rrow" to={`/services/${sid}/${i.id}`}><span className="rtxt"><strong>{i.title}</strong><small>{i.sub}</small></span></Link></li>)}</ul></div>}
          {!svcs.length && !items.length && !ai && <EmptyState title="نتیجه‌ای پیدا نشد" text="عبارت دیگری امتحان کنید." />}</div>)}
      <Demo>جست‌وجو فقط بر پایه داده‌های نمایشی همین برنامه است.</Demo>
    </Sheet>
  );
}
