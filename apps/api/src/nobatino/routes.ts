import { randomUUID, randomBytes } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { nobBusinesses, nobBookings, nobTickets, nobReviews, nobWaitlist, nobMembers, users, notifications } from '../db/schema';
import type { Db } from '../db/client';
import { route } from '../lib/route';
import { audit } from '../lib/audit';
import { badRequest, conflict, forbidden, notFound } from '../lib/errors';
import { availability, localDate, CATEGORIES, TRANSITIONS } from './engine';
const uuid = z.uuid();
const service = z.object({
    id: z.string().min(1).max(60), title: z.string().trim().min(2).max(100),
    minutes: z.number().int().min(15).max(480), price: z.number().int().min(0).max(100000000),
    capacity: z.number().int().min(1).max(20), buffer: z.number().int().min(0).max(120),
    resource: z.string().min(1).max(60), active: z.boolean(),
});
const configSchema = z.object({
    address: z.string().trim().min(3).max(300), category: z.enum(CATEGORIES as [
        string,
        ...string[]
    ]),
    open: z.number().int().min(0).max(1425), close: z.number().int().min(15).max(1440),
    cancelHours: z.number().int().min(0).max(168), closedDates: z.array(z.iso.date()).max(100),
    weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
    services: z.array(service).min(1).max(30),
    employees: z.array(z.object({ id: z.string().min(1).max(60), name: z.string().min(2).max(60), services: z.array(z.string()).max(30), active: z.boolean(), shift: z.object({ open: z.number().int().min(0).max(1439), close: z.number().int().min(1).max(1440), breakStart: z.number().int().min(0).max(1440), breakEnd: z.number().int().min(0).max(1440), closedDates: z.array(z.iso.date()).max(100) }).optional() })).min(1).max(30),
}).superRefine((c, ctx) => {
    if (c.employees.some(e => e.shift && (e.shift.open >= e.shift.close || e.shift.breakEnd < e.shift.breakStart)))
        ctx.addIssue({ code: 'custom', message: 'بازه شیفت یا استراحت معتبر نیست.' });
    if (c.close <= c.open)
        ctx.addIssue({ code: 'custom', message: 'ساعت پایان باید بعد از شروع باشد.' });
    if (new Set(c.services.map(s => s.id)).size !== c.services.length || new Set(c.employees.map(e => e.id)).size !== c.employees.length)
        ctx.addIssue({ code: 'custom', message: 'شناسه تکراری است.' });
    if (c.employees.some(e => e.services.some(id => !c.services.some(s => s.id === id))))
        ctx.addIssue({ code: 'custom', message: 'خدمت کارمند نامعتبر است.' });
});
const bookingBody = z.object({ businessId: uuid, serviceId: z.string().max(60), employeeId: z.string().max(60), startAt: z.iso.datetime(), key: uuid, expectedPrice: z.number().int().nonnegative().optional() });
export function nobatinoRoutes(app: FastifyInstance) {
    if (!app.ctx.env.NOBATINO_ENABLED)
        return;
    async function business(db: Db, id: string, lock = false) {
        const query = db.select().from(nobBusinesses).where(eq(nobBusinesses.id, id));
        const [row] = await (lock ? query.for('update') : query);
        if (!row)
            throw notFound('مرکز');
        return row;
    }
    async function access(db: Db, row: typeof nobBusinesses.$inferSelect, userId: string, roles = ['owner', 'manager', 'reception']) {
        if (row.ownerId === userId)
            return { role: 'owner', employeeId: null };
        const [member] = await db.select().from(nobMembers).where(and(eq(nobMembers.businessId, row.id), eq(nobMembers.userId, userId)));
        if (!member || !roles.includes(member.role))
            throw forbidden();
        return member;
    }
    function visible(row: typeof nobBusinesses.$inferSelect) {
        if (row.status !== 'approved')
            throw notFound('مرکز فعال');
    }
    async function notify(db: Db, userId: string, title: string) {
        await db.insert(notifications).values({ userId, type: 'status_changed', title, body: 'وضعیت نوبت در بخش نوبت‌های من به‌روز شد.' });
    }
    async function offerWaiting(db: Db, center: typeof nobBusinesses.$inferSelect) {
        const now = new Date();
        const entries = await db.select().from(nobWaitlist).where(eq(nobWaitlist.businessId, center.id)).orderBy(nobWaitlist.createdAt, nobWaitlist.id);
        for (const entry of entries.filter(e => e.status === 'offered' && e.expiresAt && e.expiresAt <= now)) {
            await db.update(nobWaitlist).set({ status: 'expired' }).where(eq(nobWaitlist.id, entry.id));
            entry.status = 'expired';
        }
        if (center.status !== 'approved')
            return;
        const bookings = await db.select().from(nobBookings).where(eq(nobBookings.businessId, center.id));
        const reservedServices = new Set(entries.filter(e => e.status === 'offered').map(e => e.serviceId + e.day));
        for (const entry of entries.filter(e => e.status === 'waiting')) {
            if (entry.day < localDate()) {
                await db.update(nobWaitlist).set({ status: 'expired' }).where(eq(nobWaitlist.id, entry.id));
                continue;
            }
            if (reservedServices.has(entry.serviceId + entry.day))
                continue;
            const slot = availability(center.config, entry.serviceId, entry.day, bookings)[0];
            if (!slot)
                continue;
            await db.update(nobWaitlist).set({ status: 'offered', slot: { startAt: slot.startAt, employeeId: slot.employeeId }, expiresAt: new Date(now.getTime() + 5 * 60000) }).where(eq(nobWaitlist.id, entry.id));
            reservedServices.add(entry.serviceId + entry.day);
            await notify(db, entry.citizenId, 'یک زمان آزاد برای شما پیشنهاد شد');
        }
    }
    async function record(db: Db, row: typeof nobBookings.$inferSelect, userId: string, status: string, reason: string, patch: Partial<typeof nobBookings.$inferInsert> = {}) {
        const events = [...row.events, { status, at: new Date().toISOString(), actor: userId, reason }];
        const [saved] = await db.update(nobBookings).set({ ...patch, status, events }).where(eq(nobBookings.id, row.id)).returning();
        await notify(db, row.citizenId, 'به‌روزرسانی نوبتینو');
        await audit(db, { actorId: userId, action: 'nobatino.' + status, entityType: 'booking', entityId: row.id });
        return saved!;
    }
    async function reserve(db: Db, userId: string, body: z.infer<typeof bookingBody>, source = 'app') {
        const row = await business(db, body.businessId, true);
        visible(row);
        const [prior] = await db.select().from(nobBookings).where(and(eq(nobBookings.citizenId, userId), eq(nobBookings.key, body.key)));
        if (prior) {
            if (prior.businessId !== body.businessId || prior.serviceId !== body.serviceId || prior.employeeId !== body.employeeId || prior.startAt.toISOString() !== body.startAt)
                throw conflict('IDEMPOTENCY_MISMATCH', 'این کلید برای درخواست دیگری استفاده شده است.');
            return prior;
        }
        const date = localDate(new Date(body.startAt));
        if (date > localDate(new Date(Date.now() + 90 * 86400000)))
            throw badRequest('DATE_RANGE', 'تا ۹۰ روز آینده قابل رزرو است.');
        const all = await db.select().from(nobBookings).where(eq(nobBookings.businessId, row.id));
        const slot = availability(row.config, body.serviceId, date, all).find(s => s.startAt === new Date(body.startAt).toISOString() && s.employeeId === body.employeeId);
        if (!slot)
            throw conflict('SLOT_TAKEN', 'این زمان دیگر آزاد نیست. زمان دیگری انتخاب کنید.');
        if (body.expectedPrice !== undefined && body.expectedPrice !== slot.price)
            throw conflict('QUOTE_CHANGED', 'قیمت تغییر کرده است. جزئیات را دوباره مرور کنید.');
        const selected = row.config.services.find(s => s.id === body.serviceId)!;
        const [saved] = await db.insert(nobBookings).values({
            businessId: row.id, citizenId: userId, serviceId: body.serviceId, employeeId: body.employeeId,
            resource: selected.resource, startAt: new Date(slot.startAt), endAt: new Date(slot.endAt),
            buffer: selected.buffer, capacity: selected.capacity, key: body.key, code: 'NB-' + randomBytes(7).toString('hex').toUpperCase(),
            snapshot: { title: selected.title, price: slot.price, cancelHours: row.config.cancelHours, source, businessName: row.name },
            events: [{ status: 'confirmed', at: new Date().toISOString(), actor: userId, reason: 'تأیید صریح رزرو؛ پرداخت حضوری' }],
        }).returning();
        await notify(db, userId, 'نوبت شما ثبت شد');
        await audit(db, { actorId: userId, action: 'nobatino.booked', entityType: 'booking', entityId: saved!.id });
        return saved!;
    }
    route(app, { method: 'GET', url: '/v1/nobatino/categories', summary: 'دسته‌های نوبتینو', tags: ['nobatino'], auth: 'none', handler: async () => ({ data: CATEGORIES }) });
    route(app, { method: 'GET', url: '/v1/nobatino/businesses', summary: 'جست‌وجوی مراکز فعال', tags: ['nobatino'], auth: 'none',
        query: z.object({ q: z.string().max(100).default(''), category: z.string().max(60).default(''), page: z.coerce.number().int().min(1).max(1000).default(1) }), handler: async ({ query }) => {
            const rows = await app.ctx.db.select().from(nobBusinesses).where(eq(nobBusinesses.status, 'approved'));
            const normalized = (s: string) => s.replace(/ي/g, 'ی').replace(/ك/g, 'ک');
            const filtered = rows.filter(r => (!query.category || r.config.category === query.category) && normalized(r.name + ' ' + r.config.services.map(s => s.title).join(' ')).includes(normalized(query.q)));
            const data = [];
            for (const row of filtered.slice((query.page - 1) * 20, query.page * 20)) {
                const bookings = await app.ctx.db.select().from(nobBookings).where(eq(nobBookings.businessId, row.id));
                let firstAvailable: string | null = null;
                for (let offset = 0; offset < 7 && !firstAvailable; offset++) {
                    const day = localDate(new Date(Date.now() + offset * 86400000));
                    const options = row.config.services.filter(s => s.active).flatMap(s => availability(row.config, s.id, day, bookings));
                    firstAvailable = options.sort((a, b) => a.startAt.localeCompare(b.startAt))[0]?.startAt ?? null;
                }
                const { ownerId: _ownerId, ...publicRow } = row;
                data.push({ ...publicRow, firstAvailable });
            }
            return { data, total: filtered.length };
        } });
    route(app, { method: 'GET', url: '/v1/nobatino/businesses/:id', summary: 'پروفایل مرکز', tags: ['nobatino'], auth: 'none', handler: async ({ params }) => {
            const row = await business(app.ctx.db, params.id!);
            visible(row);
            const { ownerId: _ownerId, ...data } = row;
            return { data };
        } });
    route(app, { method: 'GET', url: '/v1/nobatino/businesses/:id/availability', summary: 'زمان آزاد واقعی', tags: ['nobatino'], auth: 'none',
        query: z.object({ date: z.iso.date(), serviceId: z.string().min(1).max(60) }), handler: async ({ params, query }) => {
            const row = await business(app.ctx.db, params.id!);
            visible(row);
            if (query.date > localDate(new Date(Date.now() + 90 * 86400000)))
                throw badRequest('DATE_RANGE', 'بازه رزرو حداکثر ۹۰ روز است.');
            const all = await app.ctx.db.select().from(nobBookings).where(eq(nobBookings.businessId, row.id));
            return { data: availability(row.config, query.serviceId, query.date, all), timezone: 'Asia/Tehran' };
        } });
    route(app, { method: 'POST', url: '/v1/nobatino/bookings', summary: 'رزرو اتمیک زمان', tags: ['nobatino'], auth: 'citizen', body: bookingBody,
        handler: async ({ req, body }) => ({ data: await app.ctx.db.transaction(tx => reserve(tx, req.citizen!.userId, body)) }) });
    route(app, { method: 'GET', url: '/v1/nobatino/bookings/me', summary: 'نوبت‌های من', tags: ['nobatino'], auth: 'citizen', handler: async ({ req }) => ({
            data: await app.ctx.db.select().from(nobBookings).where(eq(nobBookings.citizenId, req.citizen!.userId)).orderBy(nobBookings.startAt),
        }) });
    for (const action of ['cancel', 'reschedule'] as const)
        route(app, { method: 'POST', url: '/v1/nobatino/bookings/:id/' + action, summary: 'لغو یا جابه‌جایی اتمیک', tags: ['nobatino'], auth: 'citizen',
            body: z.object({ startAt: z.iso.datetime().optional(), employeeId: z.string().max(60).optional(), reason: z.string().trim().min(2).max(300) }),
            handler: async ({ req, params, body }) => ({ data: await app.ctx.db.transaction(async (tx) => {
                    const [initial] = await tx.select().from(nobBookings).where(eq(nobBookings.id, params.id!));
                    if (!initial || initial.citizenId !== req.citizen!.userId)
                        throw notFound('نوبت');
                    const center = await business(tx, initial.businessId, true);
                    const [row] = await tx.select().from(nobBookings).where(eq(nobBookings.id, initial.id));
                    if (action === 'cancel' && row!.status === 'cancelled')
                        return row;
                    if (!['confirmed', 'checked_in'].includes(row!.status))
                        throw conflict('STATUS', 'این نوبت قابل تغییر نیست.');
                    if (row!.startAt.getTime() - Date.now() < row!.snapshot.cancelHours * 3600000)
                        throw conflict('POLICY', 'مهلت تغییر طبق قوانین مرکز گذشته است.');
                    if (action === 'cancel') {
                        const saved = await record(tx, row!, req.citizen!.userId, 'cancelled', body.reason);
                        await offerWaiting(tx, center);
                        return saved;
                    }
                    if (!body.startAt || !body.employeeId)
                        throw badRequest('TIME', 'زمان و متخصص را انتخاب کنید.');
                    const date = localDate(new Date(body.startAt));
                    if (date > localDate(new Date(Date.now() + 90 * 86400000)))
                        throw badRequest('DATE_RANGE', 'بازه رزرو حداکثر ۹۰ روز است.');
                    const all = await tx.select().from(nobBookings).where(eq(nobBookings.businessId, center.id));
                    const slot = availability(center.config, row!.serviceId, date, all.filter(a => a.id !== row!.id)).find(s => s.startAt === body.startAt && s.employeeId === body.employeeId);
                    if (!slot)
                        throw conflict('SLOT_TAKEN', 'زمان جدید پر شده است. نوبت قبلی حفظ شد.');
                    return record(tx, row!, req.citizen!.userId, 'confirmed', body.reason, { startAt: new Date(slot.startAt), endAt: new Date(slot.endAt), employeeId: slot.employeeId });
                }) }) });
    route(app, { method: 'GET', url: '/v1/nobatino/manage', summary: 'مراکز کسب‌وکار من', tags: ['nobatino'], auth: 'citizen', handler: async ({ req }) => {
            const rows = await app.ctx.db.select().from(nobBusinesses);
            const memberships = await app.ctx.db.select().from(nobMembers).where(eq(nobMembers.userId, req.citizen!.userId));
            return { data: rows.filter(r => r.ownerId === req.citizen!.userId || memberships.some(m => m.businessId === r.id)).map(r => ({ ...r, role: r.ownerId === req.citizen!.userId ? 'owner' : memberships.find(m => m.businessId === r.id)!.role })) };
        } });
    route(app, { method: 'POST', url: '/v1/nobatino/manage', summary: 'ثبت مرکز برای تأیید مدیر', tags: ['nobatino'], auth: 'citizen', body: z.object({ name: z.string().trim().min(3).max(100), config: configSchema }), handler: async ({ req, body }) => {
            const [data] = await app.ctx.db.insert(nobBusinesses).values({ ...body, ownerId: req.citizen!.userId }).returning();
            return { data };
        } });
    route(app, { method: 'PUT', url: '/v1/nobatino/manage/:id', summary: 'خدمات، منابع و ساعات مرکز', tags: ['nobatino'], auth: 'citizen', body: configSchema, handler: async ({ req, params, body }) => app.ctx.db.transaction(async (tx) => {
            const row = await business(tx, params.id!, true);
            await access(tx, row, req.citizen!.userId, ['owner', 'manager']);
            const bookings = await tx.select().from(nobBookings).where(eq(nobBookings.businessId, row.id));
            if (bookings.some(b => ['confirmed', 'checked_in', 'in_service'].includes(b.status) && b.endAt > new Date()))
                throw conflict('ACTIVE_BOOKINGS', 'تا پایان نوبت‌های فعال، تغییر ساختار تقویم مجاز نیست.');
            const [data] = await tx.update(nobBusinesses).set({ config: { ...body, offers: row.config.offers } }).where(eq(nobBusinesses.id, row.id)).returning();
            await audit(tx, { actorId: req.citizen!.userId, action: 'nobatino.config', entityType: 'business', entityId: row.id });
            return { data };
        }) });
    route(app, { method: 'POST', url: '/v1/nobatino/manage/:id/offers', summary: 'انتشار وقت آزاد با قیمت واقعی', tags: ['nobatino'], auth: 'citizen',
        body: z.object({ serviceId: z.string().max(60), startAt: z.iso.datetime(), price: z.number().int().min(0).max(100000000) }), handler: async ({ req, params, body }) => app.ctx.db.transaction(async (tx) => {
            const center = await business(tx, params.id!, true);
            await access(tx, center, req.citizen!.userId, ['owner', 'manager']);
            const service = center.config.services.find(s => s.id === body.serviceId && s.active);
            if (!service || body.price > service.price)
                throw badRequest('PRICE', 'قیمت پیشنهاد باید حداکثر برابر قیمت اصلی باشد.');
            const all = await tx.select().from(nobBookings).where(eq(nobBookings.businessId, center.id));
            if (!availability(center.config, service.id, localDate(new Date(body.startAt)), all).some(s => s.startAt === body.startAt))
                throw conflict('SLOT_TAKEN', 'زمان پیشنهادی آزاد نیست.');
            const offers = (center.config.offers ?? []).filter(o => new Date(o.expiresAt) > new Date() && !(o.serviceId === body.serviceId && o.startAt === body.startAt));
            if (offers.length >= 20)
                throw badRequest('LIMIT', 'حداکثر ۲۰ پیشنهاد همزمان مجاز است.');
            const offer = { ...body, id: randomUUID(), expiresAt: body.startAt };
            offers.push(offer);
            await tx.update(nobBusinesses).set({ config: { ...center.config, offers } }).where(eq(nobBusinesses.id, center.id));
            await audit(tx, { actorId: req.citizen!.userId, action: 'nobatino.offer', entityType: 'business', entityId: center.id });
            return { data: offer };
        }) });
    route(app, { method: 'DELETE', url: '/v1/nobatino/manage/:id/offers/:offerId', summary: 'حذف پیشنهاد وقت آزاد بدون تغییر رزرو قبلی', tags: ['nobatino'], auth: 'citizen', handler: async ({ req, params }) => app.ctx.db.transaction(async (tx) => {
            const center = await business(tx, params.id!, true);
            await access(tx, center, req.citizen!.userId, ['owner', 'manager']);
            await tx.update(nobBusinesses).set({ config: { ...center.config, offers: center.config.offers?.filter(o => o.id !== params.offerId) } }).where(eq(nobBusinesses.id, center.id));
            return { ok: true };
        }) });
    route(app, { method: 'POST', url: '/v1/nobatino/manage/:id/members', summary: 'دسترسی محدود همکار با حساب موجود', tags: ['nobatino'], auth: 'citizen',
        body: z.object({ mobile: z.string().regex(/^09\d{9}$/), role: z.enum(['manager', 'reception', 'specialist']), employeeId: z.string().max(60).optional() }), handler: async ({ req, params, body }) => app.ctx.db.transaction(async (tx) => {
            const row = await business(tx, params.id!, true);
            await access(tx, row, req.citizen!.userId, ['owner']);
            const [user] = await tx.select().from(users).where(eq(users.mobile, body.mobile));
            if (!user || user.status !== 'active')
                throw notFound('حساب فعال همکار');
            if (user.id === row.ownerId)
                throw badRequest('OWNER', 'نقش مالک قابل تغییر نیست.');
            if (body.role === 'specialist' && !row.config.employees.some(e => e.id === body.employeeId))
                throw badRequest('EMPLOYEE', 'متخصص مجاز را انتخاب کنید.');
            const [data] = await tx.insert(nobMembers).values({ businessId: row.id, userId: user.id, role: body.role, employeeId: body.role === 'specialist' ? body.employeeId : null }).onConflictDoUpdate({ target: [nobMembers.businessId, nobMembers.userId], set: { role: body.role, employeeId: body.role === 'specialist' ? body.employeeId : null } }).returning();
            await audit(tx, { actorId: req.citizen!.userId, action: 'nobatino.member', entityType: 'business', entityId: row.id, metadata: { role: body.role } });
            return { data };
        }) });
    route(app, { method: 'GET', url: '/v1/nobatino/manage/:id/calendar', summary: 'تقویم و گزارش مرکز', tags: ['nobatino'], auth: 'citizen', handler: async ({ req, params }) => {
            const row = await business(app.ctx.db, params.id!);
            const actor = await access(app.ctx.db, row, req.citizen!.userId, ['owner', 'manager', 'reception', 'specialist']);
            const all = await app.ctx.db.select().from(nobBookings).where(eq(nobBookings.businessId, row.id)).orderBy(nobBookings.startAt);
            const data = actor.role === 'specialist' ? all.filter(b => b.employeeId === actor.employeeId) : all;
            return { data, report: { bookings: data.length, completed: data.filter(b => b.status === 'completed').length, cancelled: data.filter(b => b.status === 'cancelled').length,
                    noShow: data.filter(b => b.status === 'no_show').length, collectedToman: data.reduce((sum, b) => sum + b.paid, 0) } };
        } });
    route(app, { method: 'POST', url: '/v1/nobatino/manage/:id/manual', summary: 'ثبت نوبت حضوری در همان موتور ظرفیت', tags: ['nobatino'], auth: 'citizen',
        body: bookingBody.omit({ businessId: true }).extend({ citizenId: uuid }), handler: async ({ req, params, body }) => ({ data: await app.ctx.db.transaction(async (tx) => {
                const row = await business(tx, params.id!, true);
                await access(tx, row, req.citizen!.userId);
                return reserve(tx, body.citizenId, { ...body, businessId: row.id }, 'reception');
            }) }) });
    route(app, { method: 'PATCH', url: '/v1/nobatino/manage/bookings/:id', summary: 'پذیرش و تغییر وضعیت نوبت', tags: ['nobatino'], auth: 'citizen',
        body: z.object({ status: z.enum(['checked_in', 'in_service', 'completed', 'cancelled', 'no_show']), reason: z.string().trim().min(2).max(300), paid: z.number().int().min(0).max(100000000).optional() }),
        handler: async ({ req, params, body }) => ({ data: await app.ctx.db.transaction(async (tx) => {
                const [initial] = await tx.select().from(nobBookings).where(eq(nobBookings.id, params.id!));
                if (!initial)
                    throw notFound();
                const center = await business(tx, initial.businessId, true);
                const actor = await access(tx, center, req.citizen!.userId, ['owner', 'manager', 'reception', 'specialist']);
                const [row] = await tx.select().from(nobBookings).where(eq(nobBookings.id, initial.id));
                if (actor.role === 'specialist' && (row!.employeeId !== actor.employeeId || !['in_service', 'completed'].includes(body.status) || body.paid !== undefined))
                    throw forbidden();
                if (row!.status === body.status)
                    return row;
                if (!TRANSITIONS[row!.status]?.includes(body.status))
                    throw conflict('STATUS', 'گذار وضعیت مجاز نیست.');
                if (body.status === 'no_show' && row!.startAt > new Date())
                    throw conflict('EARLY', 'زمان مراجعه هنوز نرسیده است.');
                if (body.paid !== undefined && (body.status !== 'completed' || body.paid > row!.snapshot.price))
                    throw badRequest('PAYMENT', 'مبلغ وصولی در پایان و حداکثر برابر قیمت رزرو قابل ثبت است.');
                const saved = await record(tx, row!, req.citizen!.userId, body.status, body.reason, body.paid === undefined ? {} : { paid: body.paid });
                if (body.status === 'cancelled')
                    await offerWaiting(tx, center);
                return saved;
            }) }) });
    route(app, { method: 'POST', url: '/v1/nobatino/queues/:id/join', summary: 'دریافت شماره صف امروز', tags: ['nobatino'], auth: 'citizen', handler: async ({ req, params }) => app.ctx.db.transaction(async (tx) => {
            const row = await business(tx, params.id!, true);
            visible(row);
            const day = localDate();
            const all = await tx.select().from(nobTickets).where(and(eq(nobTickets.businessId, row.id), eq(nobTickets.day, day)));
            const existing = all.find(t => t.citizenId === req.citizen!.userId && ['waiting', 'called', 'checked_in', 'serving'].includes(t.status));
            if (existing)
                return { data: existing };
            const [data] = await tx.insert(nobTickets).values({ businessId: row.id, citizenId: req.citizen!.userId, day, number: Math.max(0, ...all.map(t => t.number)) + 1 }).returning();
            return { data };
        }) });
    route(app, { method: 'GET', url: '/v1/nobatino/queue-tickets/me', summary: 'وضعیت خصوصی صف من', tags: ['nobatino'], auth: 'citizen', handler: async ({ req }) => {
            const data = await app.ctx.db.select().from(nobTickets).where(and(eq(nobTickets.citizenId, req.citizen!.userId), eq(nobTickets.day, localDate())));
            const result = [];
            for (const t of data) {
                const all = await app.ctx.db.select().from(nobTickets).where(and(eq(nobTickets.businessId, t.businessId), eq(nobTickets.day, t.day)));
                result.push({ ...t, ahead: all.filter(x => x.number < t.number && ['waiting', 'called', 'checked_in', 'serving'].includes(x.status)).length, estimate: null });
            }
            return { data: result, updatedAt: new Date().toISOString() };
        } });
    route(app, { method: 'POST', url: '/v1/nobatino/queue-tickets/:id/cancel', summary: 'خروج از صف', tags: ['nobatino'], auth: 'citizen', handler: async ({ req, params }) => app.ctx.db.transaction(async (tx) => {
            const [initial] = await tx.select().from(nobTickets).where(eq(nobTickets.id, params.id!));
            if (!initial || initial.citizenId !== req.citizen!.userId)
                throw notFound();
            await business(tx, initial.businessId, true);
            const [row] = await tx.select().from(nobTickets).where(eq(nobTickets.id, initial.id));
            if (!['waiting', 'called', 'checked_in', 'cancelled'].includes(row!.status))
                throw conflict('STATUS', 'این شماره قابل لغو نیست.');
            const [data] = await tx.update(nobTickets).set({ status: 'cancelled', updatedAt: new Date() }).where(eq(nobTickets.id, initial.id)).returning();
            return { data };
        }) });
    route(app, { method: 'GET', url: '/v1/nobatino/manage/:id/queue', summary: 'صف پذیرش امروز', tags: ['nobatino'], auth: 'citizen', handler: async ({ req, params }) => {
            const row = await business(app.ctx.db, params.id!);
            await access(app.ctx.db, row, req.citizen!.userId);
            return { data: await app.ctx.db.select().from(nobTickets).where(and(eq(nobTickets.businessId, row.id), eq(nobTickets.day, localDate()))).orderBy(nobTickets.number) };
        } });
    route(app, { method: 'POST', url: '/v1/nobatino/manage/:id/call', summary: 'فراخوان اتمیک نفر بعد صف', tags: ['nobatino'], auth: 'citizen', body: z.object({ key: uuid }), handler: async ({ req, params, body }) => app.ctx.db.transaction(async (tx) => {
            const row = await business(tx, params.id!, true);
            await access(tx, row, req.citizen!.userId);
            const [priorCall] = await tx.select().from(nobTickets).where(and(eq(nobTickets.businessId, row.id), eq(nobTickets.callKey, body.key)));
            if (priorCall)
                return { data: priorCall };
            const existing = await tx.select().from(nobTickets).where(and(eq(nobTickets.businessId, row.id), eq(nobTickets.day, localDate())));
            const called = existing.find(t => t.status === 'called');
            if (called)
                return { data: called };
            const next = existing.filter(t => t.status === 'waiting').sort((a, b) => a.number - b.number)[0];
            if (!next)
                throw conflict('EMPTY', 'صف انتظار خالی است.');
            const [data] = await tx.update(nobTickets).set({ status: 'called', callKey: body.key, updatedAt: new Date() }).where(eq(nobTickets.id, next.id)).returning();
            await notify(tx, next.citizenId, 'نوبت صف شما فراخوان شد');
            await audit(tx, { actorId: req.citizen!.userId, action: 'nobatino.queue_call', entityType: 'ticket', entityId: next.id, metadata: { key: body.key } });
            return { data };
        }) });
    route(app, { method: 'PATCH', url: '/v1/nobatino/manage/tickets/:id', summary: 'پذیرش و پایان صف', tags: ['nobatino'], auth: 'citizen', body: z.object({ status: z.enum(['checked_in', 'serving', 'completed', 'skipped']) }), handler: async ({ req, params, body }) => app.ctx.db.transaction(async (tx) => {
            const [first] = await tx.select().from(nobTickets).where(eq(nobTickets.id, params.id!));
            if (!first)
                throw notFound();
            const center = await business(tx, first.businessId, true);
            await access(tx, center, req.citizen!.userId);
            const [ticket] = await tx.select().from(nobTickets).where(eq(nobTickets.id, first.id));
            const transitions: Record<string, string[]> = { called: ['checked_in', 'skipped'], checked_in: ['serving'], serving: ['completed'] };
            if (ticket!.status !== body.status && !transitions[ticket!.status]?.includes(body.status))
                throw conflict('STATUS', 'گذار صف مجاز نیست.');
            const [data] = await tx.update(nobTickets).set({ status: body.status, updatedAt: new Date() }).where(eq(nobTickets.id, first.id)).returning();
            return { data };
        }) });
    route(app, { method: 'POST', url: '/v1/nobatino/waitlist', summary: 'عضویت داوطلبانه لیست انتظار یک روز', tags: ['nobatino'], auth: 'citizen',
        body: z.object({ businessId: uuid, serviceId: z.string().max(60), day: z.iso.date() }), handler: async ({ req, body }) => app.ctx.db.transaction(async (tx) => {
            const center = await business(tx, body.businessId, true);
            visible(center);
            if (body.day < localDate() || body.day > localDate(new Date(Date.now() + 90 * 86400000)))
                throw badRequest('DATE_RANGE', 'روز نامعتبر است.');
            if (!center.config.services.some(s => s.id === body.serviceId && s.active))
                throw notFound('خدمت فعال');
            const own = await tx.select().from(nobWaitlist).where(and(eq(nobWaitlist.businessId, center.id), eq(nobWaitlist.citizenId, req.citizen!.userId)));
            const prior = own.find(e => e.serviceId === body.serviceId && e.day === body.day && ['waiting', 'offered'].includes(e.status));
            if (prior)
                return { data: prior };
            const [data] = await tx.insert(nobWaitlist).values({ ...body, citizenId: req.citizen!.userId }).returning();
            await offerWaiting(tx, center);
            return { data };
        }) });
    route(app, { method: 'GET', url: '/v1/nobatino/waitlist/me', summary: 'پیشنهاد زمان با مهلت پذیرش', tags: ['nobatino'], auth: 'citizen', handler: async ({ req }) => {
            const entries = await app.ctx.db.select().from(nobWaitlist).where(eq(nobWaitlist.citizenId, req.citizen!.userId));
            for (const id of [...new Set(entries.filter(e => ['waiting', 'offered'].includes(e.status)).map(e => e.businessId))].sort()) {
                await app.ctx.db.transaction(async (tx) => { const center = await business(tx, id, true); await offerWaiting(tx, center); });
            }
            return { data: await app.ctx.db.select().from(nobWaitlist).where(eq(nobWaitlist.citizenId, req.citizen!.userId)), updatedAt: new Date().toISOString() };
        } });
    for (const action of ['accept', 'decline'] as const)
        route(app, { method: 'POST', url: '/v1/nobatino/waitlist-offers/:id/' + action, summary: 'تأیید صریح یا رد پیشنهاد انتظار', tags: ['nobatino'], auth: 'citizen', handler: async ({ req, params }) => app.ctx.db.transaction(async (tx) => {
                const [first] = await tx.select().from(nobWaitlist).where(eq(nobWaitlist.id, params.id!));
                if (!first || first.citizenId !== req.citizen!.userId)
                    throw notFound();
                const center = await business(tx, first.businessId, true);
                const [entry] = await tx.select().from(nobWaitlist).where(eq(nobWaitlist.id, first.id));
                if (action === 'accept') {
                    if (entry!.status === 'accepted') {
                        const [booking] = await tx.select().from(nobBookings).where(and(eq(nobBookings.citizenId, req.citizen!.userId), eq(nobBookings.key, entry!.id)));
                        return { data: booking };
                    }
                    if (entry!.status !== 'offered' || !entry!.slot || !entry!.expiresAt || entry!.expiresAt <= new Date())
                        throw conflict('OFFER_EXPIRED', 'مهلت پیشنهاد گذشته است.');
                    const saved = await reserve(tx, req.citizen!.userId, { businessId: center.id, serviceId: entry!.serviceId, ...entry!.slot, key: entry!.id }, 'waitlist');
                    await tx.update(nobWaitlist).set({ status: 'accepted' }).where(eq(nobWaitlist.id, entry!.id));
                    return { data: saved };
                }
                if (!['waiting', 'offered', 'declined'].includes(entry!.status))
                    throw conflict('STATUS', 'این درخواست قابل رد نیست.');
                await tx.update(nobWaitlist).set({ status: 'declined' }).where(eq(nobWaitlist.id, entry!.id));
                await offerWaiting(tx, center);
                return { ok: true };
            }) });
    route(app, { method: 'GET', url: '/v1/admin/nobatino', summary: 'مدیریت مرکزی مراکز', tags: ['nobatino'], auth: 'staff', handler: async ({ req }) => {
            if (req.staff!.platformRole !== 'platform_admin')
                throw forbidden();
            const data = await app.ctx.db.select().from(nobBusinesses);
            return { data };
        } });
    route(app, { method: 'PATCH', url: '/v1/admin/nobatino/:id', summary: 'تأیید یا تعلیق مرکز با حسابرسی', tags: ['nobatino'], auth: 'staff', body: z.object({ status: z.enum(['approved', 'suspended']), reason: z.string().trim().min(3).max(300) }), handler: async ({ req, params, body }) => app.ctx.db.transaction(async (tx) => {
            if (req.staff!.platformRole !== 'platform_admin')
                throw forbidden();
            const row = await business(tx, params.id!, true);
            if (body.status === 'approved' && ['سلامت', 'اداری'].includes(row.config.category))
                throw forbidden('فعال‌سازی این دسته نیازمند فرایند اعتبارسنجی رسمی است.');
            const [data] = await tx.update(nobBusinesses).set({ status: body.status }).where(eq(nobBusinesses.id, row.id)).returning();
            await audit(tx, { actorId: req.staff!.userId, action: 'nobatino.verification', entityType: 'business', entityId: row.id, metadata: body });
            return { data };
        }) });
    route(app, { method: 'POST', url: '/v1/nobatino/bookings/:id/review', summary: 'نظر پس از خدمت تکمیل‌شده', tags: ['nobatino'], auth: 'citizen',
        body: z.object({ rating: z.number().int().min(1).max(5), body: z.string().trim().min(5).max(1000) }), handler: async ({ req, params, body }) => app.ctx.db.transaction(async (tx) => {
            const [booking] = await tx.select().from(nobBookings).where(eq(nobBookings.id, params.id!));
            if (!booking || booking.citizenId !== req.citizen!.userId)
                throw notFound();
            if (booking.status !== 'completed')
                throw conflict('NOT_COMPLETED', 'نظر فقط پس از تکمیل خدمت ثبت می‌شود.');
            const [data] = await tx.insert(nobReviews).values({ ...body, bookingId: booking.id, businessId: booking.businessId, citizenId: req.citizen!.userId }).onConflictDoNothing().returning();
            if (!data)
                throw conflict('DUPLICATE', 'نظر این نوبت قبلاً ثبت شده است.');
            return { data };
        }) });
    route(app, { method: 'GET', url: '/v1/nobatino/businesses/:id/reviews', summary: 'نظرات تأییدشده بدون شناسه مشتری', tags: ['nobatino'], auth: 'none', handler: async ({ params }) => {
            const center = await business(app.ctx.db, params.id!);
            visible(center);
            const rows = await app.ctx.db.select({ id: nobReviews.id, rating: nobReviews.rating, body: nobReviews.body, createdAt: nobReviews.createdAt }).from(nobReviews).where(and(eq(nobReviews.businessId, center.id), eq(nobReviews.status, 'published'))).limit(50);
            return { data: rows };
        } });
    route(app, { method: 'POST', url: '/v1/nobatino/reviews/:id/report', summary: 'گزارش نظر برای بازبینی', tags: ['nobatino'], auth: 'citizen', body: z.object({ reason: z.string().trim().min(5).max(300) }), handler: async ({ req, params, body }) => app.ctx.db.transaction(async (tx) => {
            const [review] = await tx.select().from(nobReviews).where(eq(nobReviews.id, params.id!));
            if (!review)
                throw notFound();
            await tx.update(nobReviews).set({ status: 'reported' }).where(eq(nobReviews.id, review.id));
            await audit(tx, { actorId: req.citizen!.userId, action: 'nobatino.review_report', entityType: 'review', entityId: review.id, metadata: body });
            return { ok: true };
        }) });
    route(app, { method: 'GET', url: '/v1/admin/nobatino/reviews', summary: 'مدیریت نظرها و گزارش‌ها', tags: ['nobatino'], auth: 'staff', handler: async ({ req }) => {
            if (req.staff!.platformRole !== 'platform_admin')
                throw forbidden();
            return { data: await app.ctx.db.select({ id: nobReviews.id, businessId: nobReviews.businessId, rating: nobReviews.rating, body: nobReviews.body, status: nobReviews.status }).from(nobReviews).limit(100) };
        } });
    route(app, { method: 'PATCH', url: '/v1/admin/nobatino/reviews/:id', summary: 'تصمیم حسابرسی‌شده درباره نظر', tags: ['nobatino'], auth: 'staff', body: z.object({ status: z.enum(['published', 'rejected']), reason: z.string().trim().min(3).max(300) }), handler: async ({ req, params, body }) => app.ctx.db.transaction(async (tx) => {
            if (req.staff!.platformRole !== 'platform_admin')
                throw forbidden();
            const [data] = await tx.update(nobReviews).set({ status: body.status }).where(eq(nobReviews.id, params.id!)).returning();
            if (!data)
                throw notFound();
            await audit(tx, { actorId: req.staff!.userId, action: 'nobatino.review_moderated', entityType: 'review', entityId: data.id, metadata: body });
            return { data };
        }) });
    route(app, { method: 'POST', url: '/v1/nobatino/assistant', summary: 'نوبت‌یار جست‌وجوی قواعدمحور', tags: ['nobatino'], auth: 'none', body: z.object({ message: z.string().trim().min(2).max(500), date: z.iso.date() }), rateLimit: { max: 20, timeWindow: '1 minute' }, handler: async ({ body }) => {
            const all = await app.ctx.db.select().from(nobBusinesses).where(eq(nobBusinesses.status, 'approved'));
            const matches = all.filter(b => (b.name + ' ' + b.config.category + ' ' + b.config.services.map(s => s.title).join(' ')).includes(body.message) || body.message.includes(b.config.category.split(' ')[0]!));
            const normalized = body.message.replace(/[۰-۹]/g, c => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c)));
            const budgetText = normalized.match(/(?:زیر|تا|حداکثر)\s*([0-9]+)\s*(هزار)?\s*تومان/);
            const budget = budgetText ? Number(budgetText[1]) * (budgetText[2] ? 1000 : 1) : null;
            const chosenDate = body.message.includes('پس فردا') ? localDate(new Date(Date.now() + 2 * 86400000)) : body.message.includes('فردا') ? localDate(new Date(Date.now() + 86400000)) : body.message.includes('امروز') ? localDate() : body.date;
            const minimum = body.message.includes('عصر') ? 15 : body.message.includes('شب') ? 18 : body.message.includes('ظهر') ? 12 : 0;
            const maximum = body.message.includes('صبح') ? 12 : body.message.includes('ظهر') ? 15 : 24;
            const options = [];
            for (const b of matches.slice(0, 10)) {
                const bookings = await app.ctx.db.select().from(nobBookings).where(eq(nobBookings.businessId, b.id));
                for (const s of b.config.services) {
                    const slot = availability(b.config, s.id, chosenDate, bookings).find(slot => {
                        const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tehran', hour: '2-digit', hourCycle: 'h23' }).format(new Date(slot.startAt)));
                        return hour >= minimum && hour < maximum && (budget === null || slot.price <= budget);
                    });
                    if (slot)
                        options.push({ businessId: b.id, businessName: b.name, serviceId: s.id, title: s.title, ...slot });
                }
            }
            return { mode: 'rules', locationAvailable: false, date: chosenDate, data: options, question: options.length ? null : 'نام خدمت یا دسته را کوتاه وارد کنید و تاریخ را انتخاب کنید. مکان و بودجه از متن استخراج نمی‌شوند.' };
        } });
}
