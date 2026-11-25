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
export interface Employee {
    shift?: {
        open: number;
        close: number;
        breakStart: number;
        breakEnd: number;
        closedDates: string[];
    };
    id: string;
    name: string;
    services: string[];
    active: boolean;
}
export interface BusinessConfig {
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
    closedDates: string[];
    weekdays: number[];
    cancelHours: number;
    services: Service[];
    employees: Employee[];
}
export interface Allocation {
    id: string;
    serviceId: string;
    employeeId: string;
    resource: string;
    startAt: Date;
    endAt: Date;
    buffer: number;
    capacity: number;
    status: string;
}
export const ACTIVE = ['confirmed', 'checked_in', 'in_service'];
export const CATEGORIES = ['آرایشگاه و زیبایی', 'کارواش و خودرو', 'ورزش', 'تعمیرات', 'آموزش و مشاوره', 'خدمات منزل', 'سلامت', 'اداری', 'دامپزشکی', 'گردشگری'];
export function localDate(date = new Date()) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
export function interval(date: string, minute: number) {
    const midnight = Date.parse(date + 'T00:00:00+03:30');
    return new Date(midnight + minute * 60000);
}
export function overlap(start: number, end: number, otherStart: number, otherEnd: number) {
    return start < otherEnd && otherStart < end;
}
export function availability(config: BusinessConfig, serviceId: string, date: string, allocations: Allocation[], now = new Date()) {
    const service = config.services.find(s => s.id === serviceId && s.active);
    if (!service || config.closedDates.includes(date) || !config.weekdays.includes(new Date(date + 'T12:00:00Z').getUTCDay()))
        return [];
    const result: {
        startAt: string;
        endAt: string;
        employeeId: string;
        remaining: number;
        price: number;
    }[] = [];
    for (const employee of config.employees.filter(e => e.active && e.services.includes(serviceId))) {
        if (employee.shift?.closedDates.includes(date))
            continue;
        const open = Math.max(config.open, employee.shift?.open ?? config.open);
        const close = Math.min(config.close, employee.shift?.close ?? config.close);
        for (let minute = open; minute + service.minutes + service.buffer <= close; minute += 15) {
            if (employee.shift && overlap(minute, minute + service.minutes + service.buffer, employee.shift.breakStart, employee.shift.breakEnd))
                continue;
            const start = interval(date, minute), end = new Date(start.getTime() + service.minutes * 60000);
            if (start <= now)
                continue;
            const occupied = allocations.filter(a => ACTIVE.includes(a.status) && overlap(start.getTime(), end.getTime() + service.buffer * 60000, a.startAt.getTime(), a.endAt.getTime() + a.buffer * 60000));
            const employeeLoad = occupied.filter(a => a.employeeId === employee.id).length;
            const resourceLoad = occupied.filter(a => a.resource === service.resource).length;
            const sharedCapacity = Math.min(service.capacity, ...occupied.filter(a => a.resource === service.resource).map(a => a.capacity));
            const remaining = Math.min(service.capacity - employeeLoad, sharedCapacity - resourceLoad);
            const offer = config.offers?.find(o => o.serviceId === serviceId && o.startAt === start.toISOString() && new Date(o.expiresAt) > now);
            if (remaining > 0)
                result.push({ startAt: start.toISOString(), endAt: end.toISOString(), employeeId: employee.id, remaining, price: offer?.price ?? service.price });
        }
    }
    return result.sort((a, b) => a.startAt.localeCompare(b.startAt) || a.employeeId.localeCompare(b.employeeId));
}
export const TRANSITIONS: Record<string, string[]> = {
    confirmed: ['checked_in', 'cancelled', 'no_show'],
    checked_in: ['in_service', 'cancelled'],
    in_service: ['completed'],
    completed: [], cancelled: [], no_show: [],
};
