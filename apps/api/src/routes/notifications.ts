import type { FastifyInstance } from 'fastify';
import { desc, eq, and, sql } from 'drizzle-orm';
import { notifications } from '../db/schema';
import { route } from '../lib/route';
import type { NotificationDTO } from '@torbat/contracts';
export function notificationsRoutes(app: FastifyInstance) {
    route(app, {
        method: 'GET',
        url: '/v1/notifications',
        summary: 'فهرست اعلان‌های شهروند جاری',
        tags: ['notifications'],
        auth: 'citizen',
        handler: async ({ req }) => {
            const citizen = req.citizen!;
            const rows = await app.ctx.db
                .select()
                .from(notifications)
                .where(eq(notifications.userId, citizen.userId))
                .orderBy(desc(notifications.createdAt))
                .limit(30);
            const data: NotificationDTO[] = rows.map((n) => ({
                id: n.id,
                type: n.type,
                title: n.title,
                body: n.body,
                readAt: n.readAt?.toISOString() ?? null,
                entityType: n.entityType ?? null,
                entityId: n.entityId ?? null,
                createdAt: n.createdAt.toISOString(),
            }));
            const unreadCount = data.filter((n) => !n.readAt).length;
            return { data, meta: { unreadCount } };
        },
    });
    route(app, {
        method: 'PATCH',
        url: '/v1/notifications/:id/read',
        summary: 'علامت‌گذاری اعلان به عنوان خوانده‌شده',
        tags: ['notifications'],
        auth: 'citizen',
        handler: async ({ req, params }) => {
            const citizen = req.citizen!;
            const { id } = params;
            await app.ctx.db
                .update(notifications)
                .set({ readAt: new Date() })
                .where(and(eq(notifications.id, id), eq(notifications.userId, citizen.userId)));
            return { data: { success: true } };
        },
    });
    route(app, {
        method: 'PATCH',
        url: '/v1/notifications/read-all',
        summary: 'علامت‌گذاری همه اعلان‌ها به عنوان خوانده‌شده',
        tags: ['notifications'],
        auth: 'citizen',
        handler: async ({ req }) => {
            const citizen = req.citizen!;
            await app.ctx.db
                .update(notifications)
                .set({ readAt: new Date() })
                .where(and(eq(notifications.userId, citizen.userId), sql `${notifications.readAt} IS NULL`));
            return { data: { success: true } };
        },
    });
}
