
export type Fuel = 'gas' | 'electricity' | 'water';
export interface Bill { id: string; fuel: Fuel; start: string; end: string; consumption: number; amount: number; sample: boolean }
export interface Mission { day: number; title: string; status: 'pending' | 'done' | 'skipped' }
export interface Home {
  profile?: { area: number; residents: number; heating: string; consent: boolean };
  bills: Bill[];
  readings: { id: string; fuel: Fuel; value: number; date: string; reset: boolean }[];
  missions: Mission[];
  goal: number;
  points: { key: string; points: number; at: string }[];
  participating: boolean;
}
export const emptyHome = (): Home => ({ bills: [], readings: [], missions: [], goal: 10, points: [], participating: false });
export const days = (start: string, end: string) => (Date.parse(end) - Date.parse(start)) / 86400000;
export function compare(bills: Bill[], fuel: Fuel) {
  const ordered = bills.filter(b => b.fuel === fuel).sort((a,b) => a.end.localeCompare(b.end));
  const current = ordered.at(-1), previous = ordered.at(-2);
  if (!current || !previous || previous.consumption <= 0 || previous.end > current.start) return null;
  const baseline = previous.consumption / days(previous.start, previous.end);
  const actual = current.consumption / days(current.start, current.end);
  return { percent: (baseline-actual)/baseline*100, saved: (baseline-actual)*days(current.start,current.end),
    sample: current.sample || previous.sample, comparableSeason: Math.abs(new Date(current.start).getUTCMonth()-new Date(previous.start).getUTCMonth()) <= 1 };
}
const actions = [
 'مصرف و مدت دوره قبض را بررسی کنید', 'یک قرائت از کنتور ثبت کنید', 'هدف خانوادگی کوچک انتخاب کنید',
 'پرده را در ساعات آفتابی باز کنید', 'هنگام خروج چراغ‌های اضافی را خاموش کنید',
 'زمان استفاده از وسایل را یادداشت کنید', 'نتیجه هفته را با خانواده مرور کنید',
 'درز پنجره را بدون دستکاری تهویه بررسی کنید', 'از نور طبیعی استفاده کنید',
 'شیر آب بازمانده را ببندید', 'شست‌وشوی لباس با ظرفیت مناسب انجام دهید',
 'تنظیمات مجاز دستگاه را از دفترچه بخوانید', 'وسایل بدون استفاده را خاموش کنید',
 'عادت ساده این هفته را تکرار کنید',
];
export function makePlan(home: Home): Mission[] {
  return Array.from({length:30},(_,index)=>({ day:index+1,
    title: index === 0 && (!home.profile || !home.profile.consent) ? 'شناسنامه خانه را تکمیل کنید' : actions[index % actions.length]!, status:'pending' }));
}
export function report(home: Home) {
  return { comparisons: Object.fromEntries((['gas','electricity','water'] as Fuel[]).map(fuel=>[fuel,compare(home.bills,fuel)])),
    activityPoints: home.points.reduce((sum,item)=>sum+item.points,0),
    completed: home.missions.filter(m=>m.status==='done').length,
    total: home.missions.length,
    forecast: null,
    caveat: 'مقایسه خام روزانه است و با دما، فصل و تغییر شرایط خانه نرمال نشده است. انجام مأموریت، اثبات کاهش مصرف نیست.' };
}
