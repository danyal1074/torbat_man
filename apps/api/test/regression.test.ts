import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { createApp } from '../src/app';
import { createAiGateway } from '../src/ai/gateway';
import { SESSION_COOKIE } from '../src/auth/sessions';
import { createCatalogCache } from '../src/catalog/cache';
import { createDb, type DbHandle } from '../src/db/client';
import { cities, otpChallenges } from '../src/db/schema';
import { loadEnv } from '../src/env';
import { createLocalStorage } from '../src/files/storage';
import { CITY } from '../src/seed/catalog';
import { seedDatabase } from '../src/seed/seed-cli';

describe('Nobatino and Energy Regression Suite', () => {
    let app: FastifyInstance;
    let testDir: string;
    let dbHandle: DbHandle;
    let citizenCookie = '';
    let ownerCookie = '';

    async function signIn(mobile: string) {
        const otpRes = await app.inject({ method: 'POST', url: '/v1/auth/request-otp', payload: { mobile } });
        const { devCode } = otpRes.json();
        const verifyRes = await app.inject({ method: 'POST', url: '/v1/auth/verify-otp', payload: { mobile, code: devCode } });
        const cookie = verifyRes.cookies.find(c => c.name === SESSION_COOKIE.citizen);
        return `${SESSION_COOKIE.citizen}=${cookie!.value}`;
    }

    beforeAll(async () => {
        testDir = await mkdtemp(join(tmpdir(), 'torbat-reg-'));
        const env = loadEnv({
            NODE_ENV: 'test',
            APP_ENV: 'development',
            PGLITE_DIR: join(testDir, 'db'),
            OTP_DEV_ECHO: 'true',
            LOG_LEVEL: 'silent',
        });
        dbHandle = await createDb({ pgliteDir: env.PGLITE_DIR });
        await dbHandle.migrate();
        await seedDatabase(dbHandle.db);
        await dbHandle.db.delete(otpChallenges);
        const [city] = await dbHandle.db.select().from(cities).where(eq(cities.code, CITY.code));
        const storage = createLocalStorage(join(testDir, 'files'), env.FILE_SIGNING_SECRET);
        const catalog = createCatalogCache(dbHandle.db, city!.id);
        const ai = createAiGateway({ model: env.ANTHROPIC_MODEL, timeoutMs: env.AI_TIMEOUT_MS, catalog, db: dbHandle.db });
        app = await createApp({ db: dbHandle.db, env, storage, catalog, ai, cityId: city!.id });
        await app.ready();
        citizenCookie = await signIn('09120000001');
        ownerCookie = await signIn('09120000002');
    });

    afterAll(async () => {
        if (app) await app.close();
        if (dbHandle) await dbHandle.close();
        if (testDir) await rm(testDir, { recursive: true, force: true });
    });

    it('normalizes timezone offset in reschedule and preserves booking on conflict', async () => {
        const tomorrow = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() + 86400000));
        const carwash = 'a1111111-1111-4111-8111-111111111111';
        const availRes = await app.inject({ method: 'GET', url: `/v1/nobatino/businesses/${carwash}/availability?serviceId=main&date=${tomorrow}` });
        const slots = availRes.json().data as { startAt: string; employeeId: string; price: number }[];
        expect(slots.length).toBeGreaterThan(2);

        const bookRes = await app.inject({
            method: 'POST', url: '/v1/nobatino/bookings', headers: { cookie: citizenCookie },
            payload: { businessId: carwash, serviceId: 'main', employeeId: slots[0]!.employeeId, startAt: slots[0]!.startAt, key: randomUUID(), expectedPrice: slots[0]!.price },
        });
        expect(bookRes.statusCode).toBe(200);
        const bookingId = bookRes.json().data.id as string;

        // Invalid target slot preserves original booking
        const failMove = await app.inject({
            method: 'POST', url: `/v1/nobatino/bookings/${bookingId}/reschedule`, headers: { cookie: citizenCookie },
            payload: { startAt: `${tomorrow}T03:00:00+03:30`, employeeId: slots[0]!.employeeId, reason: 'تلاش ناموفق' },
        });
        expect(failMove.statusCode).toBe(409);

        // Valid target slot with +03:30 offset succeeds
        const target = slots[2]!;
        const tehranOffset = new Date(target.startAt).toLocaleString('sv-SE', { timeZone: 'Asia/Tehran' }).replace(' ', 'T') + '+03:30';
        const okMove = await app.inject({
            method: 'POST', url: `/v1/nobatino/bookings/${bookingId}/reschedule`, headers: { cookie: citizenCookie },
            payload: { startAt: tehranOffset, employeeId: target.employeeId, reason: 'تغییر زمان معتبر' },
        });
        expect(okMove.statusCode).toBe(200);
        expect(okMove.json().data.startAt).toBe(target.startAt);
    });

    it('returns 404 for unknown citizenId in manual booking instead of 500', async () => {
        const carwash = 'a1111111-1111-4111-8111-111111111111';
        const res = await app.inject({
            method: 'POST', url: `/v1/nobatino/manage/${carwash}/manual`, headers: { cookie: ownerCookie },
            payload: { citizenId: randomUUID(), serviceId: 'main', employeeId: 'expert-1', startAt: new Date(Date.now() + 86400000).toISOString(), key: randomUUID() },
        });
        expect(res.statusCode).toBe(404);
    });

    it('returns offered status immediately when joining waitlist with available capacity', async () => {
        const tomorrow = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() + 86400000));
        const gym = 'a3333333-3333-4333-8333-333333333333';
        const res = await app.inject({
            method: 'POST', url: '/v1/nobatino/waitlist', headers: { cookie: citizenCookie },
            payload: { businessId: gym, serviceId: 'main', day: tomorrow },
        });
        expect(res.statusCode).toBe(200);
        expect(res.json().data.status).toBe('offered');
        expect(res.json().data.slot).toBeTruthy();
    });

    it('improves Nobat-Yar assistant natural sentence matching and clarifying question', async () => {
        const tomorrow = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() + 86400000));
        const sentence = await app.inject({
            method: 'POST', url: '/v1/nobatino/assistant',
            payload: { message: 'فردا عصر اصلاح مو زیر ۳۰۰ هزار تومان می‌خوام', date: tomorrow },
        });
        expect(sentence.statusCode).toBe(200);
        expect(sentence.json().data.length).toBeGreaterThan(0);
        expect(sentence.json().data[0].title).toBe('اصلاح مو');

        const vague = await app.inject({
            method: 'POST', url: '/v1/nobatino/assistant',
            payload: { message: 'فردا عصر', date: tomorrow },
        });
        expect(vague.statusCode).toBe(200);
        expect(vague.json().data).toEqual([]);
        expect(vague.json().question).toContain('کدام خدمت');
    });

    it('summarizes electricity bills in Energy AI chat and cuts off urgent safety messages', async () => {
        const b1 = await app.inject({
            method: 'POST', url: '/v1/energy/bills', headers: { cookie: citizenCookie },
            payload: { fuel: 'electricity', start: '2025-11-01', end: '2025-12-01', consumption: 200, amount: 100000, sample: true },
        });
        expect(b1.statusCode).toBe(200);
        const b2 = await app.inject({
            method: 'POST', url: '/v1/energy/bills', headers: { cookie: citizenCookie },
            payload: { fuel: 'electricity', start: '2025-12-01', end: '2025-12-31', consumption: 160, amount: 80000, sample: true },
        });
        expect(b2.statusCode).toBe(200);

        const chatRes = await app.inject({
            method: 'POST', url: '/v1/energy/ai/chat', headers: { cookie: citizenCookie },
            payload: { message: 'قبض برقم چطوره؟' },
        });
        expect(chatRes.statusCode).toBe(200);
        expect(chatRes.json().summary).toContain('برق');
        expect(chatRes.json().summary).toContain('۲۰');

        const dangerRes = await app.inject({
            method: 'POST', url: '/v1/energy/ai/chat', headers: { cookie: citizenCookie },
            payload: { message: 'بوی گاز میاد چیکار کنم؟' },
        });
        expect(dangerRes.statusCode).toBe(200);
        expect(dangerRes.json().safety_flags).toContain('urgent');
        expect(dangerRes.json().proposed_actions).toEqual([]);
    });
});
