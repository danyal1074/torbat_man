export type Tone = 'neutral' | 'info' | 'primary' | 'warning' | 'success' | 'danger';
export const requestStatusLabels = {
    submitted: { citizen: 'ثبت‌شده', staff: 'جدید', tone: 'info' },
    triaged: { citizen: 'بررسی اولیه', staff: 'بررسی اولیه', tone: 'info' },
    assigned: { citizen: 'ارجاع به کارشناس', staff: 'ارجاع‌شده', tone: 'primary' },
    in_progress: { citizen: 'در حال رسیدگی', staff: 'در حال رسیدگی', tone: 'primary' },
    waiting_for_citizen: { citizen: 'منتظر پاسخ شما', staff: 'منتظر شهروند', tone: 'warning' },
    resolved: { citizen: 'رسیدگی‌شده', staff: 'رسیدگی‌شده', tone: 'success' },
    closed: { citizen: 'بسته‌شده', staff: 'مختومه', tone: 'neutral' },
    rejected: { citizen: 'ردشده', staff: 'ردشده', tone: 'danger' },
    reopened: { citizen: 'بازگشایی‌شده', staff: 'بازگشایی‌شده', tone: 'warning' },
} as const satisfies Record<string, {
    citizen: string;
    staff: string;
    tone: Tone;
}>;
export const serviceStatusLabels = {
    active_demo: { label: 'آزمایشی', tone: 'warning', hint: 'فعال در محیط آزمایشی؛ هنوز به سامانه رسمی اداره وصل نیست.' },
    active_integrated: { label: 'فعال', tone: 'success', hint: 'به سامانه رسمی اداره متصل است.' },
    informational: { label: 'راهنما', tone: 'info', hint: 'فعلاً فقط راهنما و اطلاعات؛ ثبت آنلاین نیازمند اتصال سازمان است.' },
    coming_soon: { label: 'به‌زودی', tone: 'neutral', hint: 'این خدمت در حال آماده‌سازی است.' },
    disabled: { label: 'غیرفعال', tone: 'neutral', hint: 'این خدمت فعلاً در دسترس نیست.' },
} as const satisfies Record<string, {
    label: string;
    tone: Tone;
    hint: string;
}>;
export const priorityLabels = {
    low: 'کم',
    normal: 'عادی',
    high: 'زیاد',
    urgent: 'فوری',
} as const;
export const roleLabels = {
    org_operator: 'کارشناس',
    org_dispatcher: 'مسئول ارجاع',
    org_manager: 'مدیر سازمان',
    platform_admin: 'مدیر سامانه',
    content_editor: 'ویراستار محتوا',
    support_agent: 'پشتیبان',
    citizen: 'شهروند',
} as const;
export const workflowLabels = {
    city_report: 'گزارش شهری',
    admin_request: 'درخواست اداری',
    emergency: 'اضطراری',
    info: 'اطلاع‌رسانی',
} as const;
