import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { seedDatabase } from '../src/seed/seed-cli';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createApp } from '../src/app';
import { loadEnv } from '../src/env';
import { createDb, type DbHandle } from '../src/db/client';
import { createLocalStorage } from '../src/files/storage';
import { createCatalogCache } from '../src/catalog/cache';
import { createAiGateway } from '../src/ai/gateway';
import { cities, otpChallenges } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { CITY } from '../src/seed/catalog';
import { SESSION_COOKIE } from '../src/auth/sessions';
describe('Torbat-e Man API Integration Suite', () => {
    let app: FastifyInstance;
    let testDir: string;
    let dbHandle: DbHandle;
    let citizenCookie = '';
    let muniStaffCookie = '';
    let abfaStaffCookie = '';
    let createdRequestId = '';
    let createdTrackingCode = '';
    beforeAll(async () => {
        testDir = await mkdtemp(join(tmpdir(), 'torbat-test-'));
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
        // Clear otp challenges for fresh test run
        await dbHandle.db.delete(otpChallenges);
        let [city] = await dbHandle.db
            .select()
            .from(cities)
            .where(eq(cities.code, CITY.code));
        if (!city) {
            [city] = await dbHandle.db
                .insert(cities)
                .values({
                code: CITY.code,
                name: CITY.name,
                province: CITY.province,
                centerLat: CITY.centerLat,
                centerLng: CITY.centerLng,
            })
                .returning();
        }
        const storage = createLocalStorage(join(testDir, 'files'), env.FILE_SIGNING_SECRET);
        const catalog = createCatalogCache(dbHandle.db, city!.id);
        const ai = createAiGateway({
            model: env.ANTHROPIC_MODEL,
            timeoutMs: env.AI_TIMEOUT_MS,
            catalog,
            db: dbHandle.db,
        });
        app = await createApp({
            db: dbHandle.db,
            env,
            storage,
            catalog,
            ai,
            cityId: city!.id,
        });
        await app.ready();
    });
    afterAll(async () => {
        if (app)
            await app.close();
        if (dbHandle)
            await dbHandle.close();
        if (testDir)
            await rm(testDir, { recursive: true, force: true });
    });
    it('1. GET /health should return status ok', async () => {
        const res = await app.inject({ method: 'GET', url: '/health' });
        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.status).toBe('ok');
    });
    it('2. GET /v1/services should return all seeded services', async () => {
        const res = await app.inject({ method: 'GET', url: '/v1/services' });
        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.data.length).toBeGreaterThan(10);
        const roadReport = body.data.find((s: {slug:string;status:string}) => s.slug === 'report-road');
        expect(roadReport).toBeDefined();
        expect(roadReport.status).toBe('active_demo');
    });
    it('3. GET /v1/services/categories should return all categories', async () => {
        const res = await app.inject({ method: 'GET', url: '/v1/services/categories' });
        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.data.length).toBeGreaterThan(5);
    });
    it('4. Citizen OTP Authentication flow', async () => {
        // Step A: Request OTP
        const reqOtp = await app.inject({
            method: 'POST',
            url: '/v1/auth/request-otp',
            payload: { mobile: '۰۹۱۲۰۰۰۰۰۰۱' }, // test Persian digits input
        });
        expect(reqOtp.statusCode).toBe(200);
        const otpBody = JSON.parse(reqOtp.body);
        expect(otpBody.expiresInSec).toBeDefined();
        const code = otpBody.devCode;
        expect(code).toBeDefined();
        // Step B: Verify OTP
        const verifyRes = await app.inject({
            method: 'POST',
            url: '/v1/auth/verify-otp',
            payload: { mobile: '09120000001', code },
        });
        expect(verifyRes.statusCode).toBe(200);
        const cookieHeader = verifyRes.headers['set-cookie'];
        expect(cookieHeader).toBeDefined();
        const cookieStr = Array.isArray(cookieHeader) ? cookieHeader[0] : (cookieHeader as string);
        citizenCookie = cookieStr.split(';')[0];
        expect(citizenCookie).toContain(SESSION_COOKIE.citizen);
    });
    it('5. Create citizen request with Idempotency-Key and Tracking code', async () => {
        const idempKey = `test-idemp-${Date.now()}`;
        const payload = {
            serviceSlug: 'report-road',
            description: 'یک چاله عمیق در تقاطع خیابان فردوسی و کاشانی ایجاد شده است.',
            location: {
                lat: 35.2741,
                lng: 59.2195,
                address: 'تربت حیدریه، تقاطع فردوسی و کاشانی',
            },
        };
        const res1 = await app.inject({
            method: 'POST',
            url: '/v1/requests',
            headers: {
                cookie: citizenCookie,
                'idempotency-key': idempKey,
            },
            payload,
        });
        expect(res1.statusCode).toBe(201);
        const body1 = JSON.parse(res1.body);
        expect(body1.data.trackingCode).toMatch(/^TM-/);
        createdRequestId = body1.data.id;
        createdTrackingCode = body1.data.trackingCode;
        // Retry with same Idempotency-Key
        const res2 = await app.inject({
            method: 'POST',
            url: '/v1/requests',
            headers: {
                cookie: citizenCookie,
                'idempotency-key': idempKey,
            },
            payload,
        });
        expect(res2.statusCode).toBe(201);
        const body2 = JSON.parse(res2.body);
        expect(body2.data.id).toBe(createdRequestId);
        expect(body2.data.trackingCode).toBe(createdTrackingCode);
    });
    it('6. Track request by public tracking code', async () => {
        const res = await app.inject({
            method: 'GET',
            url: `/v1/tracking/${createdTrackingCode}`,
        });
        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.data.id).toBeUndefined();
        expect(body.data.status).toBe('submitted');
    });
    it('7. AI Triage endpoint provides smart recommendation', async () => {
        const res = await app.inject({
            method: 'POST',
            url: '/v1/ai/triage',
            payload: { text: 'آسفالت کوچه خراب است و چاله بزرگی ایجاد شده' },
        });
        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.data.serviceSlug).toBe('report-road');
        expect(body.data.confidence).toBeGreaterThan(0.7);
    });
    it('8. Staff Authentication & Cartable flow', async () => {
        // Muni staff login
        const reqOtp = await app.inject({
            method: 'POST',
            url: '/v1/admin/auth/request-otp',
            payload: { mobile: '09130000001' },
        });
        const otpCode = JSON.parse(reqOtp.body).devCode;
        const verifyRes = await app.inject({
            method: 'POST',
            url: '/v1/admin/auth/verify-otp',
            payload: { mobile: '09130000001', code: otpCode },
        });
        const cookieHeader = verifyRes.headers['set-cookie'];
        const cookieStr = Array.isArray(cookieHeader) ? cookieHeader[0] : (cookieHeader as string);
        muniStaffCookie = cookieStr.split(';')[0];
        // Staff reads cartable
        const cartableRes = await app.inject({
            method: 'GET',
            url: '/v1/admin/requests',
            headers: { cookie: muniStaffCookie },
        });
        expect(cartableRes.statusCode).toBe(200);
        const cartableBody = JSON.parse(cartableRes.body);
        const found = cartableBody.data.find((r: {id:string}) => r.id === createdRequestId);
        expect(found).toBeDefined();
        // Staff changes status to 'triaged'
        const statusRes = await app.inject({
            method: 'PATCH',
            url: `/v1/admin/requests/${createdRequestId}/status`,
            headers: { cookie: muniStaffCookie },
            payload: { status: 'triaged', reason: 'توسط کارشناس بازبینی شد.' },
        });
        expect(statusRes.statusCode).toBe(200);
        // Staff advances to 'in_progress'
        const statusRes2 = await app.inject({
            method: 'PATCH',
            url: `/v1/admin/requests/${createdRequestId}/status`,
            headers: { cookie: muniStaffCookie },
            payload: { status: 'in_progress', reason: 'اکیپ آسفالت به محل اعزام شد.' },
        });
        expect(statusRes2.statusCode).toBe(200);
    });
    it('9. Cross-organization isolation check', async () => {
        // Abfa staff login
        const reqOtp = await app.inject({
            method: 'POST',
            url: '/v1/admin/auth/request-otp',
            payload: { mobile: '09140000001' },
        });
        const otpCode = JSON.parse(reqOtp.body).devCode;
        const verifyRes = await app.inject({
            method: 'POST',
            url: '/v1/admin/auth/verify-otp',
            payload: { mobile: '09140000001', code: otpCode },
        });
        const cookieHeader = verifyRes.headers['set-cookie'];
        const cookieStr = Array.isArray(cookieHeader) ? cookieHeader[0] : (cookieHeader as string);
        abfaStaffCookie = cookieStr.split(';')[0];
        // Abfa staff tries to view Muni request detail
        const res = await app.inject({
            method: 'GET',
            url: `/v1/admin/requests/${createdRequestId}`,
            headers: { cookie: abfaStaffCookie },
        });
        expect(res.statusCode).toBe(403); // Cross-org forbidden
    });
    it('10. Resolve request and citizen satisfaction rating', async () => {
        // Muni staff marks resolved
        const resolveRes = await app.inject({
            method: 'PATCH',
            url: `/v1/admin/requests/${createdRequestId}/status`,
            headers: { cookie: muniStaffCookie },
            payload: { status: 'resolved', reason: 'لکه گیری آسفالت به پایان رسید.' },
        });
        expect(resolveRes.statusCode).toBe(200);
        // Citizen rates satisfaction
        const rateRes = await app.inject({
            method: 'POST',
            url: `/v1/requests/${createdRequestId}/rate`,
            headers: { cookie: citizenCookie },
            payload: { score: 5, comment: 'بسیار سریع رسیدگی شد. ممنون!' },
        });
        expect(rateRes.statusCode).toBe(200);
    });
    it('11. Rejects cross-organization writes without altering the request', async () => {
        for (const [method, suffix, payload] of [
            ['PATCH', 'status', { status: 'closed', reason: 'unauthorized attempt' }],
            ['PATCH', 'assign', { assigneeId: null }],
            ['POST', 'comments', { body: 'unauthorized', visibility: 'public' }],
            ['PATCH', 'transfer', { organizationId: crypto.randomUUID(), reason: 'unauthorized transfer' }],
        ] as const) {
            const res = await app.inject({ method, url: `/v1/admin/requests/${createdRequestId}/${suffix}`, headers: { cookie: abfaStaffCookie }, payload });
            expect(res.statusCode).toBe(403);
        }
        const detail = await app.inject({ method: 'GET', url: `/v1/requests/${createdRequestId}`, headers: { cookie: citizenCookie } });
        expect(detail.json().data.status).toBe('resolved');
    });
    it('12. Internal notes remain hidden from citizens and public tracking', async () => {
        const res = await app.inject({ method: 'POST', url: `/v1/admin/requests/${createdRequestId}/comments`, headers: { cookie: muniStaffCookie }, payload: { body: 'private-internal-marker', visibility: 'internal' } });
        expect(res.statusCode).toBe(201);
        const citizen = await app.inject({ method: 'GET', url: `/v1/requests/${createdRequestId}`, headers: { cookie: citizenCookie } });
        expect(citizen.body).not.toContain('private-internal-marker');
        const publicResult = await app.inject({ method: 'GET', url: `/v1/tracking/${createdTrackingCode}` });
        expect(Object.keys(publicResult.json().data).sort()).toEqual(['status', 'trackingCode', 'updatedAt']);
    });
    it('13. Unavailable services, missing dynamic fields and foreign attachments are rejected', async () => {
        for (const payload of [
            { serviceSlug: 'bill-payments', description: 'این درخواست آزمایشی پرداخت است.' },
            { serviceSlug: 'report-road', description: 'گزارش آزمایشی چاله در مسیر', attachmentIds: [crypto.randomUUID()] },
        ]) {
            const result = await app.inject({ method: 'POST', url: '/v1/requests', headers: { cookie: citizenCookie }, payload });
            expect(result.statusCode).toBe(400);
        }
        const all = await app.ctx.catalog.getServices();
        const dynamic = all.find(s => s.status === 'active_demo' && s.form?.fields.some(f => f.required));
        expect(dynamic).toBeDefined();
        const invalid = await app.inject({ method: 'POST', url: '/v1/requests', headers: { cookie: citizenCookie }, payload: { serviceSlug: dynamic!.slug, description: 'توضیح آزمایشی با فیلدهای ناقص' } });
        expect(invalid.statusCode).toBe(400);
    });
    it('14. Concurrent retries create only one request', async () => {
        const key = crypto.randomUUID();
        const responses = await Promise.all([1, 2, 3].map(() => app.inject({ method: 'POST', url: '/v1/requests', headers: { cookie: citizenCookie, 'idempotency-key': key }, payload: { serviceSlug: 'report-road', description: 'گزارش آزمایشی برای بررسی درخواست هم‌زمان' } })));
        expect(responses.map(r => r.statusCode)).toEqual([201, 201, 201]);
        expect(new Set(responses.map(r => r.json().data.id)).size).toBe(1);
    });
    it('15. Production authentication never exposes a demo code', () => {
        expect(loadEnv({ APP_ENV: 'production', OTP_DEV_ECHO: 'true' }).otpDevEcho).toBe(false);
        expect(() => loadEnv({ NODE_ENV: 'production' })).toThrow();
    });
    it('16. Rejects untrusted browser origins and malformed cursors/ids', async () => {
        const res = await app.inject({ method: 'POST', url: '/v1/auth/request-otp', headers: { origin: 'http://localhost:5173.evil.invalid' }, payload: { mobile: '09121111111' } });
        expect(res.statusCode).toBe(403);
        const malformed = await app.inject({ method: 'GET', url: '/v1/requests/not-a-uuid', headers: { cookie: citizenCookie } });
        expect(malformed.statusCode).toBe(404);
        const spec = await app.inject({ method: 'GET', url: '/openapi.json' });
        expect(spec.statusCode).toBe(200);
        expect(spec.json().paths['/v1/requests']).toBeDefined();
    });
});
