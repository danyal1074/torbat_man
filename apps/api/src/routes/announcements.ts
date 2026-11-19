import type { FastifyInstance } from 'fastify';
import { and, sql, desc, eq } from 'drizzle-orm';
import { announcements, organizations } from '../db/schema';
import { route } from '../lib/route';
import type { AnnouncementDTO } from '@torbat/contracts';
export function announcementsRoutes(app: FastifyInstance) {
    route(app, {
        method: 'GET',
        url: '/v1/announcements',
        summary: 'فهرست اطلاعیه‌های رسمی معتبر شهر',
        tags: ['announcements'],
        auth: 'none',
        handler: async () => {
            const rows = await app.ctx.db
                .select({
                ann: announcements,
                orgName: organizations.name,
            })
                .from(announcements)
                .leftJoin(organizations, eq(organizations.id, announcements.organizationId))
                .where(and(eq(announcements.status, 'published'), sql `(${announcements.expiresAt} IS NULL OR ${announcements.expiresAt} > NOW())`))
                .orderBy(desc(announcements.publishedAt));
            const data: AnnouncementDTO[] = rows.map(({ ann: a, orgName }) => ({
                id: a.id,
                title: a.title,
                body: a.body,
                sourceName: a.sourceName,
                sourceUrl: a.sourceUrl ?? null,
                organization: orgName ? { id: a.organizationId!, name: orgName } : null,
                importance: a.importance,
                publishedAt: a.publishedAt.toISOString(),
                expiresAt: a.expiresAt?.toISOString() ?? null,
                isDemo: a.isDemo,
            }));
            return { data };
        },
    });
}
