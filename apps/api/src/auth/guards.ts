import { and, eq } from 'drizzle-orm';
import type { FastifyRequest } from 'fastify';
import { organizationMembers } from '../db/schema';
import { forbidden, unauthorized } from '../lib/errors';
import { resolveSession, SESSION_COOKIE } from './sessions';
export async function optionalCitizen(req: FastifyRequest) {
    const token = req.cookies[SESSION_COOKIE.citizen];
    if (!token)
        return;
    const s = await resolveSession(req.server.ctx.db, token, 'citizen');
    if (s)
        req.citizen = { userId: s.userId, sessionId: s.sessionId, mobile: s.mobile };
}
export async function requireCitizen(req: FastifyRequest) {
    const token = req.cookies[SESSION_COOKIE.citizen];
    if (!token)
        throw unauthorized();
    const s = await resolveSession(req.server.ctx.db, token, 'citizen');
    if (!s)
        throw unauthorized('نشست شما به پایان رسیده است. دوباره وارد شوید.');
    req.citizen = { userId: s.userId, sessionId: s.sessionId, mobile: s.mobile };
}
export async function loadMemberships(req: FastifyRequest, userId: string) {
    return req.server.ctx.db
        .select({ organizationId: organizationMembers.organizationId, role: organizationMembers.role })
        .from(organizationMembers)
        .where(and(eq(organizationMembers.userId, userId), eq(organizationMembers.status, 'active')));
}
export async function requireStaff(req: FastifyRequest) {
    const token = req.cookies[SESSION_COOKIE.staff];
    if (!token)
        throw unauthorized();
    const s = await resolveSession(req.server.ctx.db, token, 'staff');
    if (!s)
        throw unauthorized('نشست شما به پایان رسیده است. دوباره وارد شوید.');
    const memberships = await loadMemberships(req, s.userId);
    if (!s.platformRole && memberships.length === 0)
        throw forbidden('این حساب به پنل سازمانی دسترسی ندارد.');
    req.staff = {
        userId: s.userId,
        sessionId: s.sessionId,
        mobile: s.mobile,
        displayName: s.displayName,
        platformRole: s.platformRole,
        memberships,
    };
}
