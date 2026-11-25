export interface Service {
    id: string;
    title: string;
    minutes: number;
    price: number;
    capacity: number;
    buffer: number;
    resource: string;
    active: boolean;
}
export interface Config {
    offers?: {
        id: string;
        serviceId: string;
        startAt: string;
        price: number;
        expiresAt: string;
    }[];
    address: string;
    category: string;
    open: number;
    close: number;
    cancelHours: number;
    closedDates: string[];
    weekdays: number[];
    services: Service[];
    employees: {
        id: string;
        name: string;
        services: string[];
        active: boolean;
        shift?: {
            open: number;
            close: number;
            breakStart: number;
            breakEnd: number;
            closedDates: string[];
        };
    }[];
}
export interface Business {
    id: string;
    name: string;
    status: string;
    isDemo: boolean;
    role?: string;
    firstAvailable?: string | null;
    config: Config;
}
export interface Slot {
    startAt: string;
    endAt: string;
    employeeId: string;
    remaining: number;
    price: number;
}
export interface Booking {
    id: string;
    businessId: string;
    citizenId: string;
    serviceId: string;
    employeeId: string;
    startAt: string;
    endAt: string;
    status: string;
    code: string;
    paid: number;
    snapshot: {
        title: string;
        price: number;
        businessName: string;
        cancelHours: number;
    };
    events: {
        status: string;
        at: string;
        reason: string;
    }[];
}
export interface Ticket {
    id: string;
    number: number;
    status: string;
    ahead?: number;
    updatedAt: string;
}
export const statuses: Record<string, string> = {
    confirmed: 'تأییدشده', checked_in: 'پذیرش‌شده', in_service: 'در حال خدمت', completed: 'تکمیل‌شده',
    cancelled: 'لغوشده', no_show: 'عدم حضور', waiting: 'در انتظار', called: 'فراخوان‌شده',
    serving: 'در حال خدمت', skipped: 'عبور از نوبت', pending: 'در انتظار تأیید', approved: 'فعال', suspended: 'تعلیق‌شده',
};
export const fa = (n: number) => n.toLocaleString('fa-IR');
export const when = (date: string) => new Date(date).toLocaleString('fa-IR', { timeZone: 'Asia/Tehran', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
export const time = (date: string) => new Date(date).toLocaleTimeString('fa-IR', { timeZone: 'Asia/Tehran', hour: '2-digit', minute: '2-digit' });
export function isoDay(offset = 0) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() + offset * 86400000));
}
export const blank: Config = {
    address: '', category: 'کارواش و خودرو', open: 540, close: 1080, cancelHours: 2,
    closedDates: [], weekdays: [0, 1, 2, 3, 4, 5, 6],
    services: [{ id: 'main', title: 'خدمت اصلی', minutes: 30, price: 0, capacity: 1, buffer: 0, resource: 'room-1', active: true }],
    employees: [{ id: 'expert-1', name: 'متخصص اول', services: ['main'], active: true }],
};
