
import { useEffect, useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router';
import { Flame, Zap, Droplets, Leaf, Sparkles, ArrowUpLeft, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '../components/ui';
import { api, json, messageOf } from '../lib/backend';
import { useUser } from '../state/session';
import './energy.css';
type Fuel = 'gas' | 'electricity' | 'water';
type Bill = {id:string;fuel:Fuel;start:string;end:string;consumption:number;amount:number;sample:boolean};
type Mission = {day:number;title:string;status:string};
type Home = {profile?:{area:number;residents:number;heating:string;consent:boolean};bills:Bill[];readings:{id:string;fuel:Fuel;value:number;date:string;reset:boolean}[];missions:Mission[];goal:number;points:{key:string;points:number;at:string}[];participating:boolean};
type Data = {data:Home;report:{comparisons:Record<Fuel,{percent:number;saved:number;sample:boolean}|null>;activityPoints:number;completed:number;total:number;caveat:string}};
const fuels = {gas:{label:'گاز',unit:'مترمکعب',icon:Flame},electricity:{label:'برق',unit:'کیلووات‌ساعت',icon:Zap},water:{label:'آب',unit:'مترمکعب',icon:Droplets}};
const numbers=(value:number)=>new Intl.NumberFormat('fa-IR',{maximumFractionDigits:1}).format(value);
const tabs=[['','خانه انرژی'],['assistant','انرژی‌یار'],['bills','قبض‌ها'],['readings','کنتور'],['profile','خانه من'],['missions','برنامه ۳۰ روزه'],['report','کارنامه'],['calculator','ماشین‌حساب'],['community','مواسات'],['learn','آموزش']] as const;
export default function EnergyPage(){
 const user=useUser(),location=useLocation(),cache=useQueryClient();
 const section=location.pathname.split('/')[2]??'';
 const query=useQuery({queryKey:['energy',user?.phone],queryFn:()=>api<Data>('/energy'),enabled:Boolean(user)});
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[fuel,setFuel]=useState<Fuel>('gas');
 const [chat,setChat]=useState(''),[answer,setAnswer]=useState<{summary:string;mode:string;safety_flags:string[];recommendations:{title:string}[]}|null>(null);
 const [watts,setWatts]=useState(1000),[hours,setHours]=useState(2),[count,setCount]=useState(1),[rate,setRate]=useState(0);
 useEffect(()=>{if(section in fuels)setFuel(section as Fuel);},[section]);
 const home=query.data?.data,summary=query.data?.report;
 async function mutate(path:string,body?:unknown,method='POST'){
  setBusy(true);setError('');setNotice('');
  try{await api('/energy'+path,body===undefined?{method}:json(body,method));await cache.invalidateQueries({queryKey:['energy']});setNotice('اطلاعات ذخیره شد.');}
  catch(e){setError(messageOf(e));}finally{setBusy(false);}
 }
 function submit(event:FormEvent<HTMLFormElement>,path:string,method='POST'){
  event.preventDefault();const data=Object.fromEntries(new FormData(event.currentTarget));
  if(path==='/profile') Object.assign(data,{consent:data.consent==='on'});
  if(path==='/readings') Object.assign(data,{reset:data.reset==='on'});
  if(path==='/bills') Object.assign(data,{sample:data.sample==='on'});
  void mutate(path,data,method);
 }
 async function ask(text:string){
  setBusy(true);setError('');try{setAnswer(await api('/energy/ai/chat',json({message:text})));}catch(e){setError(messageOf(e));}finally{setBusy(false);}
 }
 const fuelSelect=<label>نوع انرژی<select value={fuel} onChange={e=>setFuel(e.target.value as Fuel)}>{Object.entries(fuels).map(([id,f])=><option key={id} value={id}>{f.label}</option>)}</select></label>;
 return <main className="energy page-enter">
  <PageHeader title="انرژی من" subtitle="هر خانه، سهمی از گرمای شهر"/>
  <nav className="energy-tabs" aria-label="بخش‌های انرژی">{tabs.map(([path,title])=><Link key={path} aria-current={section===path?'page':undefined} to={'/energy/'+path}>{title}</Link>)}</nav>
  <div className="energy-content">
  <p className="energy-muted">ثبت داده خوداظهاری · تحلیل قواعدمحور · اتصال رسمی، OCR و صوت به‌زودی</p>
  {!user&&<section className="energy-card"><h2>از یک قدم کوچک شروع کنیم</h2><p>برای ثبت قبض و برنامه شخصی، وارد حساب شوید. ماشین‌حساب و آموزش بدون ورود قابل استفاده‌اند.</p><Link className="btn-main" to={'/login?next='+encodeURIComponent(location.pathname)}>ورود به خانه من</Link></section>}
  {error&&<p role="alert" className="field-err">{error}</p>}{notice&&<p role="status" className="energy-success">{notice}</p>}
  {query.isError&&<section className="energy-card" role="alert"><p>{messageOf(query.error)}</p><button onClick={()=>void query.refetch()}>تلاش دوباره</button></section>}
  {query.isPending&&user&&<p role="status">در حال دریافت اطلاعات خانه…</p>}
  {section===''&&<>
   <section className="energy-coach"><div className="energy-orbit"><Leaf size={48} aria-hidden="true"/></div><span className="energy-eyebrow">انرژی‌یار هوشمند</span><h2>کمتر مصرف کن،<br/>بیشتر به دست بیار</h2><p>یک همراه برای عادت‌های کوچک و حال بهتر خانه</p><Link className="energy-cta" to="/energy/assistant">برنامه صرفه‌جویی من <ArrowUpLeft size={20}/></Link><small>مشاور هر خانه، همراه صرفه‌جویی هر خانواده</small></section>
   <div className="energy-fuels">{Object.entries(fuels).map(([key,f])=>{const Icon=f.icon;return <Link key={key} to={'/energy/'+key} className={'energy-card '+key}><Icon aria-hidden="true"/><strong>{f.label} من</strong><span>{home?.bills.filter(b=>b.fuel===key).length?numbers(home.bills.filter(b=>b.fuel===key).at(-1)!.consumption)+' '+f.unit:'اولین قبض را ثبت کنید'}</span></Link>;})}</div>
   <section className="energy-card"><span className="energy-eyebrow">قدم امروز</span><h2>{home?.missions.find(m=>m.status==='pending')?.title??'خانه‌ات را بهتر بشناس'}</h2><p>پیشرفت از یک اقدام ساده شروع می‌شود.</p><Link to="/energy/missions">دیدن مأموریت‌ها ←</Link></section>
   <section className="energy-card"><h2>داستان پیشرفت من</h2><p>{numbers(summary?.activityPoints??0)} امتیاز فعالیت · {numbers(summary?.completed??0)} مأموریت انجام‌شده</p><Link to="/energy/report">مشاهده کارنامه</Link></section>
   <Link className="energy-card energy-link" to="/energy/community">مواسات انرژی؛ با هم برای شهرمان <Leaf/></Link>
  </>}
  {section==='profile'&&home&&<section className="energy-card"><h2>شناسنامه انرژی خانه</h2><form onSubmit={e=>submit(e,'/profile','PUT')}>
   <label>متراژ خانه<input name="area" inputMode="decimal" required defaultValue={home.profile?.area}/></label>
   <label>تعداد ساکنان<input name="residents" inputMode="numeric" required defaultValue={home.profile?.residents}/></label>
   <label>نوع گرمایش<select name="heating" defaultValue={home.profile?.heating}>{['بخاری','پکیج','مرکزی','سایر'].map(x=><option key={x}>{x}</option>)}</select></label>
   <label className="energy-check"><input type="checkbox" name="consent" defaultChecked={home.profile?.consent}/>برای استفاده از اطلاعات خانه در پیشنهادهای شخصی رضایت دارم.</label>
   <button className="btn-main" disabled={busy}>ذخیره شناسنامه</button></form>
   <button className="energy-danger" disabled={busy} onClick={()=>{if(window.confirm('تمام اطلاعات و حافظه انرژی این حساب حذف شود؟'))void mutate('',undefined,'DELETE');}}>حذف تمام داده‌ها و حافظه انرژی</button></section>}
  {(section==='bills'||section in fuels)&&home&&<><section className="energy-card"><h2>ثبت و تأیید قبض</h2><button disabled={busy} onClick={()=>void mutate('/demo')}>افزودن دو قبض کاملاً آزمایشی برای ارائه</button><p>اطلاعات قبض را دستی وارد کنید. مبلغ به تومان ذخیره می‌شود. عکس و PDF در این نسخه پردازش نمی‌شوند.</p>
   <form onSubmit={e=>submit(e,'/bills')}>{fuelSelect}<input type="hidden" name="fuel" value={fuel}/>
    <label>آغاز دوره<input type="date" name="start" required/></label><label>پایان دوره<input type="date" name="end" required/></label>
    <label>مصرف ({fuels[fuel].unit})<input name="consumption" inputMode="decimal" required/></label><label>مبلغ کل (تومان)<input name="amount" inputMode="numeric" required/></label>
    <label className="energy-check"><input type="checkbox" name="sample"/>این قبض دادهٔ آزمایشی است.</label>
    <button className="btn-main" disabled={busy}>تأیید و ثبت قبض</button></form></section>
   <section className="energy-card"><h2>تاریخچه قبض‌ها</h2>{!home.bills.length&&<p>هنوز قبضی ثبت نکرده‌اید.</p>}{home.bills.map(b=><article key={b.id} className="energy-row"><div><strong>{fuels[b.fuel].label} · {numbers(b.consumption)} {fuels[b.fuel].unit}</strong><p>{new Date(b.start).toLocaleDateString('fa-IR')} تا {new Date(b.end).toLocaleDateString('fa-IR')}</p><small>{numbers(b.amount)} تومان · {b.sample?'داده آزمایشی':'ورود دستی تأییدشده توسط کاربر'}</small></div><button disabled={busy} onClick={()=>void mutate('/bills/'+b.id,undefined,'DELETE')}>حذف</button></article>)}</section></>}
  {section==='readings'&&home&&<section className="energy-card"><h2>قرائت کنتور</h2><form onSubmit={e=>submit(e,'/readings')}>{fuelSelect}<input type="hidden" name="fuel" value={fuel}/><label>تاریخ قرائت<input name="date" type="date" required/></label><label>عدد کنتور ({fuels[fuel].unit})<input name="value" inputMode="decimal" required/></label><label className="energy-check"><input type="checkbox" name="reset"/>کنتور تعویض یا بازنشانی شده است.</label><button className="btn-main" disabled={busy}>ثبت قرائت</button></form>{home.readings.map((r,i)=>{const prior=home.readings.slice(0,i).filter(p=>p.fuel===r.fuel).at(-1);return <div className="energy-row" key={r.id}><strong>{fuels[r.fuel].label} · {numbers(r.value)}</strong><span>{new Date(r.date).toLocaleDateString('fa-IR')}{prior&&!r.reset?' · مصرف '+numbers(r.value-prior.value)+' '+fuels[r.fuel].unit:''}</span></div>;})}</section>}
  {section==='assistant'&&<><section className="energy-coach"><Sparkles size={30}/><h2>امروز برای خانه‌ات چه کنیم؟</h2><p>تحلیل بر پایه داده‌های ثبت‌شده و موتور قواعد؛ بدون مدل ابری. برای توصیه‌های فنی منبع تأییدشده کافی در دسترس نیست.</p></section><div className="energy-quick">{['قبضم رو تحلیل کن','برنامه ۳۰ روزه بده','امروز چه کاری انجام بدم؟'].map(t=><button disabled={busy||!user} key={t} onClick={()=>void ask(t)}>{t}</button>)}</div>
   <form className="energy-card" onSubmit={e=>{e.preventDefault();void ask(chat);}}><label>پیام به انرژی‌یار<textarea value={chat} maxLength={1500} required onChange={e=>setChat(e.target.value)}/></label><button className="btn-main" disabled={busy||!user}>بررسی پیام</button></form>
   {answer&&<section className="energy-card" aria-live="polite"><h2>{answer.safety_flags.length?'راهنمای خطر فوری':'پیشنهاد انرژی‌یار'}</h2><p>{answer.summary}</p>{answer.recommendations.map((r,i)=><p key={i}>{r.title}</p>)}{!answer.safety_flags.length&&<><Link to="/energy/report">مشاهده تحلیل مصرف خانه</Link><button disabled={busy} onClick={()=>void mutate('/plans')}>تأیید و افزودن برنامه به مأموریت‌های من</button><Link to="/energy/missions">مشاهده برنامه</Link></>}</section>}</>}
  {section==='missions'&&home&&<><section className="energy-card"><h2>۳۰ روز، قدم به قدم</h2><p>هفته اول شناخت، هفته دوم کاهش اتلاف، هفته سوم بهینه‌سازی عادت‌ها و هفته چهارم ارزیابی. ثبت نتیجه خوداظهاری است.</p><p>{numbers(summary?.completed??0)} از {numbers(home.missions.length)} اقدام · سقف امتیاز روزانه ۳۰</p>{!home.missions.length&&<button className="btn-main" disabled={busy} onClick={()=>void mutate('/plans')}>تأیید و ساخت برنامه ۳۰ روزه</button>}</section>
   {home.missions.map(m=><article className="energy-card" key={m.day}><span className="energy-eyebrow">روز {numbers(m.day)} · هفته {numbers(Math.ceil(m.day/7))}</span><h3>{m.title}</h3><p>{m.status==='done'?'انجام شد':m.status==='skipped'?'فعلاً رد شد':'آماده یک قدم کوچک؟'}</p><div className="energy-quick"><button disabled={busy||m.status==='done'} onClick={()=>void mutate('/missions',{day:m.day,status:'done'},'PATCH')}><CheckCircle2 size={18}/>انجام دادم</button><button disabled={busy||m.status==='skipped'} onClick={()=>void mutate('/missions',{day:m.day,status:'skipped'},'PATCH')}>فعلاً رد می‌کنم</button><button disabled={busy||m.status==='pending'} onClick={()=>void mutate('/missions',{day:m.day,status:'pending'},'PATCH')}>بازگشت به برنامه</button></div></article>)}</>}
  {section==='report'&&home&&summary&&<><section className="energy-card"><h2>کارنامه خانه من</h2><p>{numbers(summary.activityPoints)} امتیاز فعالیت · {numbers(summary.completed)} مأموریت</p><p>امتیاز فعالیت، معادل صرفه‌جویی اندازه‌گیری‌شده نیست.</p>{Object.entries(fuels).map(([key,f])=>{const result=summary.comparisons[key as Fuel];const bills=home.bills.filter(b=>b.fuel===key);const max=Math.max(1,...bills.map(b=>b.consumption));return <section key={key}><h3>{f.label}</h3>{bills.map(b=><div className="energy-bar" key={b.id}><span style={{width:(b.consumption/max*100)+'%'}}/><strong>{numbers(b.consumption)} {f.unit}{b.sample?' · آزمایشی':''}</strong></div>)}<p>{result?numbers(result.percent)+'٪ تغییر کاهشی خام؛ '+numbers(result.saved)+' '+f.unit+(result.sample?' · داده آزمایشی':''):'برای مقایسه، دو قبض غیرهمپوشان لازم است.'}</p></section>;})}<p>{summary.caveat}</p><p>پیش‌بینی، انتشار کربن و صرفه‌جویی مالی تأییدشده به داده و ضریب معتبر نیاز دارند.</p></section>
   <form className="energy-card" onSubmit={e=>{e.preventDefault();const percent=Number(new FormData(e.currentTarget).get('percent'));void mutate('/goal',{percent},'PUT');}}><h2>هدف کوچک خانوادگی</h2><label>هدف کاهش مصرف، درصد<input type="number" name="percent" min="1" max="20" defaultValue={home.goal} required/></label><button disabled={busy}>ذخیره هدف</button></form>
   <section className="energy-card"><h2>دفتر امتیاز فعالیت</h2>{home.points.map(p=><p key={p.key}>{numbers(p.points)} امتیاز · {new Date(p.at).toLocaleDateString('fa-IR')} · مأموریت {numbers(Number(p.key.split(':')[1]))}</p>)}<p>پاداش تجاری و امتیاز کاهش تأییدشده به‌زودی</p></section></>}
  {section==='calculator'&&<section className="energy-card"><h2>هر وسیله، چقدر انرژی؟</h2><label>توان وسیله، وات<input type="number" min="0" max="100000" value={watts} onChange={e=>setWatts(Math.max(0,Number(e.target.value)))}/></label><label>ساعت استفاده روزانه<input type="number" min="0" max="24" value={hours} onChange={e=>setHours(Math.min(24,Math.max(0,Number(e.target.value))))}/></label><label>تعداد<input type="number" min="0" max="100" value={count} onChange={e=>setCount(Math.min(100,Math.max(0,Number(e.target.value))))}/></label><label>نرخ فرضی هر کیلووات‌ساعت، تومان<input type="number" min="0" max="1000000" value={rate} onChange={e=>setRate(Math.max(0,Number(e.target.value)))}/></label><output className="energy-result">{numbers(watts/1000*hours*count)} کیلووات‌ساعت در روز<br/>{numbers(Math.round(watts/1000*hours*count*30*rate))} تومان در ۳۰ روز</output><p>سناریوی ساده با نرخ واردشده شما، بدون مالیات و پلکان تعرفه. قبض رسمی نیست.</p></section>}
  {section==='community'&&<section className="energy-card"><Leaf size={40}/><h2>هر خانه، سهمی از گرمای شهر</h2><p>چالش داوطلبانهٔ خانواده بدون اسراف. مشارکت با حفظ آسایش و ایمنی.</p>{home&&<button disabled={busy} className="btn-main" onClick={()=>void mutate('/challenge',{join:!home.participating})}>{home.participating?'خروج از چالش':'پیوستن به چالش'}</button>}<p>رتبه محلات، کاهش تأییدشده و معادل گرمای خانه‌ها به داده معتبر و رضایت جمعی نیاز دارند؛ هنوز منتشر نشده‌اند.</p><Link to="/energy/missions">اقدام‌های خانوادگی</Link></section>}
  {section==='learn'&&<section className="energy-card"><h2>آگاهانه و ایمن</h2><p>هرگز مسیر تهویه را مسدود نکنید یا تجهیزات گاز و برق را دستکاری نکنید. تنظیم دستگاه طبق دفترچه سازنده و تعمیر با متخصص مجاز انجام شود.</p><p>محتوای آموزشی منبع‌دار و آزمون‌ها در انتظار بازبینی تخصصی هستند.</p><Link to="/services/guilds">راهنمای اصناف؛ اعتبار متخصص نیازمند بررسی</Link><Link to="/city-news">اطلاعیه‌های شهر با برچسب آزمایشی</Link></section>}
  <section className="energy-footer"><Link to="/shahrbin/new">گزارش هدررفت غیراضطراری در شهربین</Link><p>خطر فوری را در صف گزارش عادی ثبت نکنید. برای خطر گاز یا برق از محل امن با امداد رسمی تماس بگیرید.</p></section>
  </div></main>;
}
