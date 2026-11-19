import { and, eq, gt, isNull } from 'drizzle-orm';
import type { FastifyReply } from 'fastify';
import type { Db } from '../db/client';
import { userSessions, users } from '../db/schema';
import type { Env } from '../env';
import { randomToken, sha256 } from '../lib/crypto';
export type SessionKind = 'citizen' | 'staff';
export const SESSION_COOKIE: Record<SessionKind, string> = { citizen: 'tm_sid', staff: 'tm_asid' };
const TTL_MS: Record<SessionKind, number> = {
    citizen: 30 * 24 * 3600 * 1000,
    staff: 12 * 3600 * 1000,
};
export async function createSession(db: Db, userId: string, kind: SessionKind, deviceInfo?: string) {
    const token = randomToken();
    const expiresAt = new Date(Date.now() + TTL_MS[kind]);
    const [row] = await db
        .insert(userSessions)
        .values({ userId, kind, tokenHash: sha256(token), expiresAt, deviceInfo: deviceInfo?.slice(0, 200) })
        .returning({ id: userSessions.id });
    return { token, sessionId: row!.id, expiresAt };
}
export async function resolveSession(db: Db, token: string, kind: SessionKind) {
    const [row] = await db
        .select({
        sessionId: userSessions.id,
        userId: users.id,
        mobile: users.mobile,
        displayName: users.displayName,
        platformRole: users.platformRole,
        status: users.status,
        lastUsedAt: userSessions.lastUsedAt,
    })
        .from(userSessions)
        .innerJoin(users, eq(users.id, userSessions.userId))
        .where(and(eq(userSessions.tokenHash, sha256(token)), eq(userSessions.kind, kind), isNull(userSessions.revokedAt), gt(userSessions.expiresAt, new Date()), isNull(users.deletedAt)))
        .limit(1);
    if (!row || row.status !== 'active')
        return null;
    // Touch at most once per 5 minutes to avoid a write per request.
    if (!row.lastUsedAt || Date.now() - row.lastUsedAt.getTime() > 5 * 60 * 1000) {
        await db.update(userSessions).set({ lastUsedAt: new Date() }).where(eq(userSessions.id, row.sessionId));
    }
    return row;
}
/** Issue a fresh token for an existing session (refresh rotation) and extend its lifetime. */
export async function rotateSession(db: Db, sessionId: string, kind: SessionKind) {
    const token = randomToken();
    const expiresAt = new Date(Date.now() + TTL_MS[kind]);
    await db
        .update(userSessions)
        .set({ tokenHash: sha256(token), expiresAt, rotatedAt: new Date() })
        .where(eq(userSessions.id, sessionId));
    return { token, expiresAt };
}
export async function revokeSession(db: Db, sessionId: string) {
    await db.update(userSessions).set({ revokedAt: new Date() }).where(eq(userSessions.id, sessionId));
}
export async function revokeAllSessions(db: Db, userId: string) {
    await db
        .update(userSessions)
        .set({ revokedAt: new Date() })
        .where(and(eq(userSessions.userId, userId), isNull(userSessions.revokedAt)));
}
export function setSessionCookie(reply: FastifyReply, env: Env, kind: SessionKind, token: string, expiresAt: Date) {
    reply.setCookie(SESSION_COOKIE[kind], token, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: env.cookieSecure,
        expires: expiresAt,
    });
}
export function clearSessionCookie(reply: FastifyReply, env: Env, kind: SessionKind) {
    reply.clearCookie(SESSION_COOKIE[kind], { path: '/', httpOnly: true, sameSite: 'lax', secure: env.cookieSecure });
}
