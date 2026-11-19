import { and, eq, isNull, desc } from 'drizzle-orm';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { normalizeMobile, requestOtpBody, updateProfileBody, verifyOtpBody, type MeDTO, type StaffMeDTO, } from '@torbat/contracts';
import { normalizePersian } from '@torbat/i18n';
import { organizationMembers, organizations, requests, users, notifications } from '../db/schema';
import { audit } from '../lib/audit';
import { badRequest, forbidden } from '../lib/errors';
import { route } from '../lib/route';
import { issueOtp, verifyOtp } from './otp';
import { clearSessionCookie, createSession, revokeAllSessions, revokeSession, rotateSession, setSessionCookie, SESSION_COOKIE, resolveSession, } from './sessions';
const parseMobile = (raw: string) => {
    const mobile = normalizeMobile(raw);
    if (!mobile)
        throw badRequest('INVALID_MOBILE', 'شماره موبایل درست نیست. مثال: ۰۹۱۲۳۴۵۶۷۸۹', { mobile: 'شماره موبایل درست نیست.' });
    return mobile;
};
const toMe = (u: typeof users.$inferSelect): MeDTO => ({
    id: u.id,
    mobile: u.mobile,
    displayName: u.displayName,
    createdAt: u.createdAt.toISOString(),
});
async function staffMe(app: FastifyInstance, userId: string): Promise<StaffMeDTO> {
    const { db } = app.ctx;
    const [u] = await db.select().from(users).where(eq(users.id, userId));
    const memberships = await db
        .select({
        organizationId: organizations.id,
        organizationName: organizations.name,
        organizationCode: organizations.code,
        role: organizationMembers.role,
    })
        .from(organizationMembers)
        .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
        .where(and(eq(organizationMembers.userId, userId), eq(organizationMembers.status, 'active')));
    return { ...toMe(u!), platformRole: u!.platformRole, memberships };
}
const device = (req: FastifyRequest) => req.headers['user-agent']?.toString();
export function authRoutes(app: FastifyInstance) {
    const otpLimit = { max: 5, timeWindow: '1 minute' };
    const verifyLimit = { max: 10, timeWindow: '1 minute' };
    /* ───── citizen ───── */
    route(app, {
        method: 'POST',
        url: '/v1/auth/request-otp',
        summary: 'درخواست کد ورود',
        tags: ['auth'],
        auth: 'none',
        body: requestOtpBody,
        rateLimit: otpLimit,
        handler: async ({ body, req }) => issueOtp(app.ctx, parseMobile(body.mobile), 'citizen', req.log),
    });
    route(app, {
        method: 'POST',
        url: '/v1/auth/verify-otp',
        summary: 'تأیید کد و ورود شهروند',
        tags: ['auth'],
        auth: 'none',
        body: verifyOtpBody,
        rateLimit: verifyLimit,
        handler: async ({ body, req, reply }) => {
            const { db, env } = app.ctx;
            const mobile = parseMobile(body.mobile);
            await verifyOtp(app.ctx, mobile, body.code, 'citizen');
            let [user] = await db.select().from(users).where(and(eq(users.mobile, mobile), isNull(users.deletedAt)));
            if (!user) {
                [user] = await db.insert(users).values({ mobile, verifiedAt: new Date() }).returning();
            }
            if (user!.status !== 'active')
                throw forbidden('این حساب غیرفعال شده است.');
            const s = await createSession(db, user!.id, 'citizen', device(req));
            setSessionCookie(reply, env, 'citizen', s.token, s.expiresAt);
            return { user: toMe(user!), isNew: !user!.displayName };
        },
    });
    route(app, {
        method: 'POST',
        url: '/v1/auth/refresh',
        summary: 'چرخش توکن نشست شهروند',
        tags: ['auth'],
        auth: 'citizen',
        handler: async ({ req, reply }) => {
            const s = await rotateSession(app.ctx.db, req.citizen!.sessionId, 'citizen');
            setSessionCookie(reply, app.ctx.env, 'citizen', s.token, s.expiresAt);
            return { ok: true };
        },
    });
    route(app, {
        method: 'POST',
        url: '/v1/auth/logout',
        summary: 'خروج شهروند',
        tags: ['auth'],
        auth: 'optional-citizen',
        handler: async ({ req, reply }) => {
            if (req.citizen)
                await revokeSession(app.ctx.db, req.citizen.sessionId);
            clearSessionCookie(reply, app.ctx.env, 'citizen');
            return { ok: true };
        },
    });
    route(app, {
        method: 'GET',
        url: '/v1/me',
        summary: 'اطلاعات حساب من',
        tags: ['me'],
        auth: 'citizen',
        handler: async ({ req }) => {
            const [u] = await app.ctx.db.select().from(users).where(eq(users.id, req.citizen!.userId));
            return toMe(u!);
        },
    });
    route(app, {
        method: 'PATCH',
        url: '/v1/me',
        summary: 'ویرایش نام نمایشی',
        tags: ['me'],
        auth: 'citizen',
        body: updateProfileBody,
        handler: async ({ req, body }) => {
            const [u] = await app.ctx.db
                .update(users)
                .set({ displayName: normalizePersian(body.displayName) })
                .where(eq(users.id, req.citizen!.userId))
                .returning();
            return toMe(u!);
        },
    });
    route(app, {
        method: 'GET',
        url: '/v1/me/export',
        summary: 'دریافت خروجی داده‌های من',
        tags: ['me'],
        auth: 'citizen',
        handler: async ({ req, reply }) => {
            const { db } = app.ctx;
            const userId = req.citizen!.userId;
            const [u] = await db.select().from(users).where(eq(users.id, userId));
            const myRequests = await db
                .select({
                trackingCode: requests.trackingCode,
                title: requests.title,
                description: requests.description,
                status: requests.status,
                formData: requests.formData,
                address: requests.address,
                addressText: requests.addressText,
                lat: requests.lat,
                lng: requests.lng,
                createdAt: requests.createdAt,
            })
                .from(requests)
                .where(eq(requests.citizenId, userId))
                .orderBy(desc(requests.createdAt));
            const myNotifications = await db
                .select({ title: notifications.title, body: notifications.body, createdAt: notifications.createdAt })
                .from(notifications)
                .where(eq(notifications.userId, userId));
            reply.header('Content-Disposition', 'attachment; filename="torbat-man-my-data.json"');
            return {
                exportedAt: new Date().toISOString(),
                account: toMe(u!),
                requests: myRequests,
                notifications: myNotifications,
            };
        },
    });
    route(app, {
        method: 'DELETE',
        url: '/v1/me',
        summary: 'حذف حساب (ناشناس‌سازی)',
        tags: ['me'],
        auth: 'citizen',
        handler: async ({ req, reply }) => {
            const { db, env } = app.ctx;
            const userId = req.citizen!.userId;
            await db.transaction(async (tx) => {
                // Requests stay with the organizations (they are public-service records) but lose the link to the person.
                await tx
                    .update(users)
                    .set({ mobile: `deleted:${userId}`, displayName: null, status: 'deleted', deletedAt: new Date() })
                    .where(eq(users.id, userId));
                await revokeAllSessions(tx, userId);
                await audit(tx, { actorId: userId, action: 'account.delete', entityType: 'user', entityId: userId });
            });
            clearSessionCookie(reply, env, 'citizen');
            return { ok: true };
        },
    });
    /* ───── staff ───── */
    route(app, {
        method: 'POST',
        url: '/v1/admin/auth/request-otp',
        summary: 'درخواست کد ورود کارکنان',
        tags: ['admin-auth'],
        auth: 'none',
        body: requestOtpBody,
        rateLimit: otpLimit,
        handler: async ({ body, req }) => issueOtp(app.ctx, parseMobile(body.mobile), 'staff', req.log),
    });
    route(app, {
        method: 'POST',
        url: '/v1/admin/auth/verify-otp',
        summary: 'تأیید کد و ورود کارکنان',
        tags: ['admin-auth'],
        auth: 'none',
        body: verifyOtpBody,
        rateLimit: verifyLimit,
        handler: async ({ body, req, reply }) => {
            const { db, env } = app.ctx;
            const mobile = parseMobile(body.mobile);
            await verifyOtp(app.ctx, mobile, body.code, 'staff');
            const [user] = await db.select().from(users).where(and(eq(users.mobile, mobile), isNull(users.deletedAt)));
            const memberships = user
                ? await db
                    .select({ id: organizationMembers.id })
                    .from(organizationMembers)
                    .where(and(eq(organizationMembers.userId, user.id), eq(organizationMembers.status, 'active')))
                : [];
            if (!user || user.status !== 'active' || (!user.platformRole && memberships.length === 0)) {
                throw forbidden('این شماره دسترسی کارکنان ندارد. با مدیر سامانه تماس بگیرید.');
            }
            const s = await createSession(db, user.id, 'staff', device(req));
            setSessionCookie(reply, env, 'staff', s.token, s.expiresAt);
            await audit(db, { actorId: user.id, action: 'auth.staff_login', entityType: 'user', entityId: user.id });
            return staffMe(app, user.id);
        },
    });
    route(app, {
        method: 'POST',
        url: '/v1/admin/auth/logout',
        summary: 'خروج کارکنان',
        tags: ['admin-auth'],
        auth: 'none',
        handler: async ({ req, reply }) => {
            const token = req.cookies[SESSION_COOKIE.staff];
            if (token) {
                const s = await resolveSession(app.ctx.db, token, 'staff');
                if (s)
                    await revokeSession(app.ctx.db, s.sessionId);
            }
            clearSessionCookie(reply, app.ctx.env, 'staff');
            return { ok: true };
        },
    });
    route(app, {
        method: 'GET',
        url: '/v1/admin/me',
        summary: 'اطلاعات کارمند واردشده',
        tags: ['admin-auth'],
        auth: 'staff',
        handler: async ({ req }) => staffMe(app, req.staff!.userId),
    });
}
