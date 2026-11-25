/* DEMO DATA — fictional. Bus ETAs are illustrative only. */
export interface BusLine { id: string; name: string; from: string; to: string; stops: string[]; first: string; last: string; every: number; fare: string }
export const busLines: BusLine[] = [
  { id: 'l1', name: 'خط ۱', from: 'ترمینال', to: 'میدان شهرداری', stops: ['ترمینال', 'بلوار آزادی', 'بیمارستان', 'میدان امام', 'میدان شهرداری'], first: '۶:۰۰', last: '۲۱:۰۰', every: 12, fare: '۱۵٬۰۰۰ تومان' },
  { id: 'l2', name: 'خط ۲', from: 'دانشگاه', to: 'بازار', stops: ['دانشگاه', 'بوستان ملت', 'خیابان مطهری', 'پارک ملی', 'بازار'], first: '۶:۳۰', last: '۲۰:۳۰', every: 15, fare: '۱۵٬۰۰۰ تومان' },
  { id: 'l3', name: 'خط ۳', from: 'شهرک مهرگان', to: 'ترمینال', stops: ['شهرک مهرگان', 'خیابان فردوسی', 'میدان امام', 'ترمینال'], first: '۷:۰۰', last: '۲۰:۰۰', every: 20, fare: '۱۰٬۰۰۰ تومان' },
];
export interface Product { id: string; title: string; unit: string; price: number; seller: string; cat: string }
export const productCats = ['همه', 'خشکبار', 'زعفران', 'لبنیات', 'صنایع‌دستی'];
export const products: Product[] = [
  { id: 'p1', title: 'کشمش پلویی ۵۰۰ گرم', unit: 'بسته', price: 180000, seller: 'تعاونی خشکبار تربت', cat: 'خشکبار' },
  { id: 'p2', title: 'زعفران سرگل ۱ گرم', unit: 'بسته', price: 220000, seller: 'زعفران‌کاران ترب', cat: 'زعفران' },
  { id: 'p3', title: 'کشک محلی ۱ کیلو', unit: 'بسته', price: 260000, seller: 'لبنیات سنتی روستایی', cat: 'لبنیات' },
  { id: 'p4', title: 'گلیم دستباف کوچک', unit: 'عدد', price: 950000, seller: 'صنایع‌دستی پیروزه', cat: 'صنایع‌دستی' },
  { id: 'p5', title: 'مغز گردو ۵۰۰ گرم', unit: 'بسته', price: 340000, seller: 'خشکبار کوهستان', cat: 'خشکبار' },
  { id: 'p6', title: 'عرق بهارنارنج ۱ لیتر', unit: 'بطری', price: 140000, seller: 'گلاب و عرقیات بهار', cat: 'صنایع‌دستی' },
  { id: 'p7', title: 'ماست سنتی ۱ کیلو', unit: 'ظرف', price: 90000, seller: 'لبنیات سنتی روستایی', cat: 'لبنیات' },
];
export interface Job { id: string; title: string; employer: string; type: string; city: string; salary: string; desc: string; req: string[] }
export const jobs: Job[] = [
  { id: 'j1', title: 'فروشنده فروشگاه زعفران', employer: 'سرای زعفران نگین', type: 'تمام‌وقت', city: 'تربت حیدریه', salary: 'توافقی', desc: 'پاسخ‌گویی به مشتری و بسته‌بندی سفارش‌ها.', req: ['روابط عمومی خوب', 'ترجیحاً سابقه فروش'] },
  { id: 'j2', title: 'کارشناس پشتیبانی تلفنی', employer: 'مرکز ارتباطات مردمی', type: 'پاره‌وقت', city: 'تربت حیدریه', salary: 'ماهانه ۲۵ میلیون تومان', desc: 'ثبت و پیگیری درخواست‌های شهروندان.', req: ['تسلط به رایانه', 'صبوری'] },
  { id: 'j3', title: 'راننده خط اتوبوس', employer: 'سازمان حمل‌ونقل', type: 'تمام‌وقت', city: 'تربت حیدریه', salary: 'طبق قرارداد', desc: 'رانندگی خطوط شهری.', req: ['گواهینامه پایه ۲', 'سلامت جسمی'] },
  { id: 'j4', title: 'کمک‌مربی ورزشی', employer: 'استخر شهرداری', type: 'پاره‌وقت', city: 'تربت حیدریه', salary: 'ساعتی', desc: 'همراهی با مربی در کلاس‌های کودکان.', req: ['ورزشکار', 'روحیه کار تیمی'] },
  { id: 'j5', title: 'کارگر ماهر بسته‌بندی', employer: 'بسته‌بندی ثمین', type: 'تمام‌وقت', city: 'تربت حیدریه', salary: 'توافقی', desc: 'بسته‌بندی زعفران و خشکبار.', req: ['دقت بالا'] },
];
export const aiAnswers: { keys: string[]; answer: string; link?: [string, string] }[] = [
  { keys: ['گزارش', 'چاله', 'زباله', 'روشنایی', 'خیابان', 'مطالبه شهری'], answer: 'برای گزارش مشکل شهری از بخش مطالبه شهری استفاده کنید؛ نوع مشکل را انتخاب و موقعیت را روی نقشه مشخص کنید.', link: ['/services/shahrbin', 'رفتن به مطالبه شهری'] },
  { keys: ['نان', 'نانوایی', 'سنگک', 'بربری'], answer: 'نانوایی‌های اطراف را در «نان من» ببینید؛ می‌توانید نان داغ رزرو کنید (نمایشی).', link: ['/services/bread', 'نان من'] },
  { keys: ['اتوبوس', 'خط', 'ایستگاه', 'ترمینال'], answer: 'خطوط و ایستگاه‌ها در «اتوبوس من» هستند؛ زمان‌ها نمایشی‌اند.', link: ['/services/bus', 'اتوبوس من'] },
  { keys: ['زعفران', 'مثقال', 'نرخ'], answer: 'نرخ و مراکز خرید زعفران در «زعفران من» آمده است؛ اعداد نمایشی‌اند.', link: ['/services/saffron', 'زعفران من'] },
  { keys: ['دارو', 'داروخانه', 'درمانگاه', 'اورژانس', 'پزشک'], answer: 'داروخانه و درمانگاه نزدیک را در «سلامت من» ببینید. در اورژانس با ۱۱۵ تماس بگیرید.', link: ['/services/health', 'سلامت من'] },
  { keys: ['کار', 'شغل', 'استخدام'], answer: 'فرصت‌های شغلی در «تربت کار» است و می‌توانید درخواست ثبت کنید.', link: ['/services/jobs', 'تربت کار'] },
  { keys: ['گواهی', 'مجوز', 'استعلام', 'اداری'], answer: 'درخواست‌های اداری در «خدمات دیجیتال» ثبت می‌شود.', link: ['/services/digital', 'خدمات دیجیتال'] },
];
