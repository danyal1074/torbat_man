import { toPersianDigits } from './digits';
const TZ = 'Asia/Tehran';
const dateFmt = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    timeZone: TZ,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
});
const shortDateFmt = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
});
const timeFmt = new Intl.DateTimeFormat('fa-IR', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
});
type DateInput = string | number | Date;
const toDate = (d: DateInput) => (d instanceof Date ? d : new Date(d));
/** «۲۸ آبان ۱۴۰۵» */
export function formatJalaliDate(d: DateInput): string {
    return dateFmt.format(toDate(d));
}
/** «۱۴۰۵/۰۸/۲۸» */
export function formatJalaliShort(d: DateInput): string {
    return shortDateFmt.format(toDate(d));
}
/** «۲۸ آبان ۱۴۰۵، ساعت ۱۴:۳۰» */
export function formatJalaliDateTime(d: DateInput): string {
    const date = toDate(d);
    return `${dateFmt.format(date)}، ساعت ${timeFmt.format(date)}`;
}
/** Relative time in Persian: «همین الان»، «۵ دقیقه پیش»، «دیروز» … falls back to date. */
export function formatRelative(d: DateInput, now: Date = new Date()): string {
    const date = toDate(d);
    const diffSec = Math.round((now.getTime() - date.getTime()) / 1000);
    if (diffSec < 0)
        return formatJalaliDate(date);
    if (diffSec < 60)
        return 'همین الان';
    const min = Math.floor(diffSec / 60);
    if (min < 60)
        return `${toPersianDigits(min)} دقیقه پیش`;
    const hours = Math.floor(min / 60);
    if (hours < 24)
        return `${toPersianDigits(hours)} ساعت پیش`;
    const days = Math.floor(hours / 24);
    if (days === 1)
        return 'دیروز';
    if (days < 7)
        return `${toPersianDigits(days)} روز پیش`;
    return formatJalaliDate(date);
}
/** Time-of-day greeting in Persian (Tehran time). */
export function greeting(now: Date = new Date()): string {
    const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', hour12: false }).format(now));
    if (hour >= 4 && hour < 12)
        return 'صبح بخیر';
    if (hour >= 12 && hour < 17)
        return 'ظهر بخیر';
    if (hour >= 17 && hour < 21)
        return 'عصر بخیر';
    return 'شب بخیر';
}
