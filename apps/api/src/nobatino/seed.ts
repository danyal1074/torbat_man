import { eq } from 'drizzle-orm';
import type { Db } from '../db/client';
import { nobBusinesses, users } from '../db/schema';
import type { BusinessConfig } from './engine';
export async function seedNobatino(db: Db) {
    const [owner] = await db.select().from(users).where(eq(users.mobile, '09120000002'));
    if (!owner)
        return;
    const samples = [
        { id: 'a1111111-1111-4111-8111-111111111111', name: 'کارواش سپید · نمونه', category: 'کارواش و خودرو', title: 'شست‌وشوی خودرو', price: 180000, minutes: 30 },
        { id: 'a2222222-2222-4222-8222-222222222222', name: 'آرایشگاه نارون · نمونه', category: 'آرایشگاه و زیبایی', title: 'اصلاح مو', price: 220000, minutes: 45 },
        { id: 'a3333333-3333-4333-8333-333333333333', name: 'باشگاه آفتاب · نمونه', category: 'ورزش', title: 'جلسه تمرین', price: 150000, minutes: 60 },
    ];
    for (const item of samples) {
        const config: BusinessConfig = { address: 'تربت حیدریه؛ نشانی ساختگی برای ارائه', category: item.category, open: 540, close: 1200,
            closedDates: [], weekdays: [0, 1, 2, 3, 4, 5, 6], cancelHours: 0,
            services: [{ id: 'main', title: item.title, price: item.price, minutes: item.minutes, buffer: 0, capacity: 1, resource: 'room-1', active: true }],
            employees: [{ id: 'expert-1', name: 'متخصص نمونه اول', services: ['main'], active: true }, { id: 'expert-2', name: 'متخصص نمونه دوم', services: ['main'], active: true }] };
        await db.insert(nobBusinesses).values({ id: item.id, name: item.name, ownerId: owner.id, status: 'approved', isDemo: true, config }).onConflictDoNothing();
    }
}
