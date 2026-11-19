import type { FastifyInstance } from 'fastify';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { adminRequestsQuery, adminAssignBody, adminStatusBody, adminTransferBody, adminCommentBody, REASON_REQUIRED, canStaffTransition, } from '@torbat/contracts';
import { requests, requestStatusHistory, requestComments, requestAssignments, attachments, notifications, services, organizations, users, organizationMembers, } from '../db/schema';
import { route } from '../lib/route';
import { badRequest, forbidden, notFound } from '../lib/errors';
import { saveUpload } from '../files/routes';
import { audit } from '../lib/audit';
export function adminRoutes(app: FastifyInstance) {
    // Staff Cartable / List Requests
    route(app, {
        method: 'GET',
        url: '/v1/admin/requests',
        summary: 'کارتابل درخواست‌های سازمانی برای کارشناسان و مدیران',
        tags: ['admin'],
        auth: 'staff',
        query: adminRequestsQuery,
        handler: async ({ req, query }) => {
            const staff = req.staff!;
            // Check organization access: if not platform_admin, restrict to staff memberships
            const isPlatformAdmin = staff.platformRole === 'platform_admin';
            const userOrgIds = staff.memberships.map((m) => m.organizationId);
            if (!isPlatformAdmin && userOrgIds.length === 0) {
                throw forbidden('شما به هیچ سازمانی دسترسی ندارید.');
            }
            const conditions = [];
            // Org boundary
            if (!isPlatformAdmin) {
                conditions.push(inArray(requests.organizationId, userOrgIds));
            }
            // Status filter
            if (query.status) {
                if (query.status === 'open') {
                    conditions.push(sql `${requests.status} NOT IN ('resolved', 'closed', 'rejected')`);
                }
                else {
                    conditions.push(eq(requests.status, query.status));
                }
            }
            // Priority filter
            if (query.priority) {
                conditions.push(eq(requests.priority, query.priority));
            }
            // Assignee filter
            if (query.assignee === 'me') {
                conditions.push(eq(requests.assigneeId, staff.userId));
            }
            else if (query.assignee === 'unassigned') {
                conditions.push(sql `${requests.assigneeId} IS NULL`);
            }
            // Text search
            if (query.q) {
                const pattern = `%${query.q.trim()}%`;
                conditions.push(sql `(${requests.title} ILIKE ${pattern} OR ${requests.trackingCode} ILIKE ${pattern} OR ${requests.description} ILIKE ${pattern})`);
            }
            const rows = await app.ctx.db
                .select({
                req: requests,
                serviceTitle: services.title,
                serviceSlug: services.slug,
                orgName: organizations.name,
                citizenMobile: users.mobile,
                citizenName: users.displayName,
            })
                .from(requests)
                .innerJoin(services, eq(services.id, requests.serviceId))
                .innerJoin(organizations, eq(organizations.id, requests.organizationId))
                .innerJoin(users, eq(users.id, requests.citizenId))
                .where(and(...conditions))
                .orderBy(desc(requests.createdAt))
                .limit(query.limit);
            const data = rows.map(({ req: r, serviceTitle, serviceSlug, orgName, citizenMobile, citizenName }) => ({
                id: r.id,
                trackingCode: r.trackingCode,
                title: r.title,
                serviceSlug,
                serviceTitle,
                organizationName: orgName,
                status: r.status,
                priority: r.priority,
                description: r.description,
                address: r.address ?? undefined,
                citizenMobile,
                citizenName: citizenName ?? undefined,
                assigneeId: r.assigneeId ?? undefined,
                createdAt: r.createdAt.toISOString(),
                updatedAt: r.updatedAt.toISOString(),
            }));
            return { data };
        },
    });
    // Get Admin Request Detail
    route(app, {
        method: 'GET',
        url: '/v1/admin/requests/:id',
        summary: 'جزئیات کارتابل پرونده سازمانی',
        tags: ['admin'],
        auth: 'staff',
        handler: async ({ req, params }) => {
            const staff = req.staff!;
            const { id } = params;
            const [row] = await app.ctx.db
                .select({
                req: requests,
                serviceTitle: services.title,
                serviceSlug: services.slug,
                orgName: organizations.name,
                citizenMobile: users.mobile,
                citizenName: users.displayName,
            })
                .from(requests)
                .innerJoin(services, eq(services.id, requests.serviceId))
                .innerJoin(organizations, eq(organizations.id, requests.organizationId))
                .innerJoin(users, eq(users.id, requests.citizenId))
                .where(eq(requests.id, id));
            if (!row)
                throw notFound('پرونده مورد نظر');
            // Verify org access
            const isPlatformAdmin = staff.platformRole === 'platform_admin';
            const hasOrgAccess = staff.memberships.some((m) => m.organizationId === row.req.organizationId);
            if (!isPlatformAdmin && !hasOrgAccess) {
                throw forbidden('شما مجوز دسترسی به پرونده سازمان دیگر را ندارید.');
            }
            // History
            const history = await app.ctx.db
                .select()
                .from(requestStatusHistory)
                .where(eq(requestStatusHistory.requestId, id))
                .orderBy(desc(requestStatusHistory.createdAt));
            // All Comments (internal + public)
            const comments = await app.ctx.db
                .select({
                c: requestComments,
                authorName: users.displayName,
                authorMobile: users.mobile,
            })
                .from(requestComments)
                .leftJoin(users, eq(users.id, requestComments.authorId))
                .where(eq(requestComments.requestId, id))
                .orderBy(desc(requestComments.createdAt));
            // Attachments
            const attachs = await app.ctx.db
                .select()
                .from(attachments)
                .where(eq(attachments.requestId, id));
            const signedAttachments = attachs.map((a) => ({
                id: a.id,
                mimeType: a.mimeType,
                sizeBytes: a.sizeBytes,
                url: app.ctx.storage.signUrl(a.id),
            }));
            return {
                data: {
                    id: row.req.id,
                    trackingCode: row.req.trackingCode,
                    title: row.req.title,
                    serviceSlug: row.serviceSlug,
                    serviceTitle: row.serviceTitle,
                    organizationId: row.req.organizationId,
                    organizationName: row.orgName,
                    citizenMobile: row.citizenMobile,
                    citizenName: row.citizenName,
                    status: row.req.status,
                    priority: row.req.priority,
                    description: row.req.description,
                    formData: row.req.formData as Record<string, unknown>,
                    lat: row.req.lat ?? undefined,
                    lng: row.req.lng ?? undefined,
                    address: row.req.address ?? undefined,
                    neighborhood: row.req.neighborhood ?? undefined,
                    satisfactionScore: row.req.ratingScore ?? undefined,
                    satisfactionComment: row.req.ratingComment ?? undefined,
                    assigneeId: row.req.assigneeId ?? undefined,
                    createdAt: row.req.createdAt.toISOString(),
                    updatedAt: row.req.updatedAt.toISOString(),
                    resolvedAt: row.req.resolvedAt?.toISOString(),
                    closedAt: row.req.closedAt?.toISOString(),
                    history: history.map((h) => ({
                        id: h.id,
                        fromStatus: h.fromStatus ?? undefined,
                        toStatus: h.toStatus,
                        actorKind: h.actorKind,
                        reason: h.reason ?? undefined,
                        createdAt: h.createdAt.toISOString(),
                    })),
                    comments: comments.map(({ c, authorName, authorMobile }) => ({
                        id: c.id,
                        body: c.body,
                        visibility: c.visibility,
                        authorName: authorName || authorMobile,
                        createdAt: c.createdAt.toISOString(),
                    })),
                    attachments: signedAttachments,
                },
            };
        },
    });
    // Assign Request
    route(app, {
        method: 'PATCH',
        url: '/v1/admin/requests/:id/assign',
        summary: 'ارجاع پرونده به کارشناس مشخص یا لغو ارجاع',
        tags: ['admin'],
        auth: 'staff',
        body: adminAssignBody,
        handler: async ({ req, params, body }) => {
            const staff = req.staff!;
            const { id } = params;
            const [row] = await app.ctx.db
                .select()
                .from(requests)
                .where(eq(requests.id, id));
            if (!row)
                throw notFound('درخواست');
            if (staff.platformRole !== 'platform_admin' && !staff.memberships.some(m => m.organizationId === row.organizationId))
                throw forbidden('دسترسی به پرونده سازمان دیگر مجاز نیست.');
            if (body.assigneeId) {
                const [member] = await app.ctx.db.select().from(organizationMembers).where(and(eq(organizationMembers.userId, body.assigneeId), eq(organizationMembers.organizationId, row.organizationId!), eq(organizationMembers.status, 'active')));
                if (!member)
                    throw badRequest('INVALID_ASSIGNEE', 'کارشناس عضو این سازمان نیست.');
            }
            await app.ctx.db.transaction(async (tx) => {
                await tx
                    .update(requests)
                    .set({ assigneeId: body.assigneeId, updatedAt: new Date() })
                    .where(eq(requests.id, id));
                await tx.insert(requestStatusHistory).values({
                    requestId: id,
                    fromStatus: row.status,
                    toStatus: row.status,
                    actorKind: 'staff',
                    actorId: staff.userId,
                    reason: body.assigneeId ? 'پرونده به کارشناس ارجاع شد.' : 'ارجاع لغو شد.',
                });
                await audit(tx, {
                    actorId: staff.userId,
                    action: 'request.assigned',
                    entityType: 'request',
                    entityId: id,
                    metadata: { assigneeId: body.assigneeId },
                });
            });
            return { data: { success: true, assigneeId: body.assigneeId } };
        },
    });
    // Change Status
    route(app, {
        method: 'PATCH',
        url: '/v1/admin/requests/:id/status',
        summary: 'تغییر وضعیت مرحله‌ای پرونده سازمانی با ثبت تاریخچه',
        tags: ['admin'],
        auth: 'staff',
        body: adminStatusBody,
        handler: async ({ req, params, body }) => {
            const staff = req.staff!;
            const { id } = params;
            const [row] = await app.ctx.db
                .select()
                .from(requests)
                .where(eq(requests.id, id));
            if (!row)
                throw notFound('درخواست');
            if (staff.platformRole !== 'platform_admin' && !staff.memberships.some(m => m.organizationId === row.organizationId))
                throw forbidden('دسترسی به پرونده سازمان دیگر مجاز نیست.');
            if (REASON_REQUIRED.includes(body.status) && !body.reason?.trim())
                throw badRequest('REASON_REQUIRED', 'دلیل تغییر وضعیت را وارد کنید.');
            // State machine validation
            if (!canStaffTransition(row.status, body.status)) {
                throw badRequest('INVALID_STATUS_TRANSITION', `تغییر وضعیت از «${row.status}» به «${body.status}» مجاز نیست.`);
            }
            await app.ctx.db.transaction(async (tx) => {
                const now = new Date();
                const updateData: Record<string, unknown> = {
                    status: body.status,
                    updatedAt: now,
                };
                if (body.status === 'resolved')
                    updateData.resolvedAt = now;
                if (body.status === 'closed')
                    updateData.closedAt = now;
                await tx.update(requests).set(updateData).where(eq(requests.id, id));
                await tx.insert(requestStatusHistory).values({
                    requestId: id,
                    fromStatus: row.status,
                    toStatus: body.status,
                    actorKind: 'staff',
                    actorId: staff.userId,
                    reason: body.reason ?? `تغییر وضعیت به ${body.status}`,
                });
                // Notify citizen
                const statusPersianLabels: Record<string, string> = {
                    triaged: 'در حال ارزیابی',
                    assigned: 'ارجاع‌شده به کارشناس',
                    in_progress: 'در دست اقدام',
                    waiting_for_citizen: 'منتظر پاسخ یا مدارک شما',
                    resolved: 'حل‌شده',
                    closed: 'مختومه',
                    rejected: 'ردشده',
                };
                const label = statusPersianLabels[body.status] || body.status;
                await tx.insert(notifications).values({
                    userId: row.citizenId,
                    type: 'status_changed',
                    title: `وضعیت درخواست شما تغییر کرد: ${label}`,
                    body: body.reason
                        ? `توضیحات کارشناس: ${body.reason}`
                        : `درخواست با کد رهگیری ${row.trackingCode} به وضعیت «${label}» به‌روزرسانی شد.`,
                    entityType: 'request',
                    entityId: id,
                });
                await audit(tx, {
                    actorId: staff.userId,
                    action: 'request.status_changed',
                    entityType: 'request',
                    entityId: id,
                    metadata: { from: row.status, to: body.status, reason: body.reason },
                });
            });
            return { data: { success: true, status: body.status } };
        },
    });
    route(app, { method: 'POST', url: '/v1/admin/requests/:id/attachments', summary: 'ثبت تصویر نتیجه رسیدگی', tags: ['admin'], auth: 'staff', multipart: true, successStatus: 201, handler: async ({ req, params }) => {
            const [record] = await app.ctx.db.select().from(requests).where(eq(requests.id, params.id));
            if (!record)
                throw notFound('درخواست');
            if (req.staff!.platformRole !== 'platform_admin' && !req.staff!.memberships.some(m => m.organizationId === record.organizationId))
                throw forbidden();
            const uploaded = await saveUpload(req, req.staff!.userId, { kind: 'staff_result', requestId: record.id });
            await audit(app.ctx.db, { actorId: req.staff!.userId, action: 'request.result_uploaded', entityType: 'request', entityId: record.id });
            return uploaded;
        } });
    // Transfer Request to Another Org
    route(app, {
        method: 'PATCH',
        url: '/v1/admin/requests/:id/transfer',
        summary: 'انتقال پرونده به سازمان دیگر با ذکر دلیل',
        tags: ['admin'],
        auth: 'staff',
        body: adminTransferBody,
        handler: async ({ req, params, body }) => {
            const staff = req.staff!;
            const { id } = params;
            const [row] = await app.ctx.db
                .select()
                .from(requests)
                .where(eq(requests.id, id));
            if (!row)
                throw notFound('درخواست');
            if (staff.platformRole !== 'platform_admin' && !staff.memberships.some(m => m.organizationId === row.organizationId))
                throw forbidden('دسترسی به پرونده سازمان دیگر مجاز نیست.');
            const [destination] = await app.ctx.db.select().from(organizations).where(and(eq(organizations.id, body.organizationId), eq(organizations.cityId, app.ctx.cityId), eq(organizations.status, 'active')));
            if (!destination)
                throw badRequest('INVALID_DESTINATION', 'سازمان مقصد هنوز برای دریافت درخواست فعال نیست.');
            await app.ctx.db.transaction(async (tx) => {
                await tx
                    .update(requests)
                    .set({
                    organizationId: body.organizationId,
                    assigneeId: null, // Reset assignee upon org transfer
                    updatedAt: new Date(),
                })
                    .where(eq(requests.id, id));
                await tx.insert(requestAssignments).values({
                    kind: 'transfer',
                    requestId: id,
                    fromOrgId: row.organizationId,
                    toOrgId: body.organizationId,
                    actorId: staff.userId,
                    reason: body.reason,
                });
                await tx.insert(requestStatusHistory).values({
                    requestId: id,
                    fromStatus: row.status,
                    toStatus: row.status,
                    actorKind: 'staff',
                    actorId: staff.userId,
                    reason: `انتقال به ${destination.name}: ${body.reason}`,
                });
                await tx.insert(notifications).values({ userId: row.citizenId, type: 'request_transferred', title: 'سازمان پاسخ‌گو تغییر کرد', body: `پرونده به ${destination.name} منتقل شد. ${body.reason}`, entityType: 'request', entityId: id });
                await audit(tx, {
                    actorId: staff.userId,
                    action: 'request.transferred',
                    entityType: 'request',
                    entityId: id,
                    metadata: { fromOrg: row.organizationId, toOrg: body.organizationId, reason: body.reason },
                });
            });
            return { data: { success: true } };
        },
    });
    // Add Staff Comment
    route(app, {
        method: 'POST',
        url: '/v1/admin/requests/:id/comments',
        summary: 'ثبت پاسخ کارشناس (عمومی برای شهروند یا یادداشت محرمانه داخلی)',
        tags: ['admin'],
        auth: 'staff',
        body: adminCommentBody,
        successStatus: 201,
        handler: async ({ req, params, body }) => {
            const staff = req.staff!;
            const { id } = params;
            const visibility = body.visibility;
            const [row] = await app.ctx.db
                .select()
                .from(requests)
                .where(eq(requests.id, id));
            if (!row)
                throw notFound('درخواست');
            if (staff.platformRole !== 'platform_admin' && !staff.memberships.some(m => m.organizationId === row.organizationId))
                throw forbidden('دسترسی به پرونده سازمان دیگر مجاز نیست.');
            const [newComment] = await app.ctx.db.transaction(async (tx) => {
                const [comment] = await tx
                    .insert(requestComments)
                    .values({
                    requestId: id,
                    authorId: staff.userId,
                    authorKind: 'staff',
                    visibility,
                    body: body.body,
                })
                    .returning();
                // If public response, send notification to citizen
                if (visibility === 'public') {
                    await tx.insert(notifications).values({
                        userId: row.citizenId,
                        type: 'staff_reply',
                        title: 'پاسخ جدید کارشناس در پرونده شما',
                        body: body.body.slice(0, 150),
                        entityType: 'request',
                        entityId: id,
                    });
                }
                return [comment];
            });
            return {
                data: {
                    id: newComment.id,
                    body: newComment.body,
                    visibility: newComment.visibility,
                    createdAt: newComment.createdAt.toISOString(),
                },
            };
        },
    });
    // KPI Dashboard
    route(app, {
        method: 'GET',
        url: '/v1/admin/dashboard',
        summary: 'داشبورد آماری و شاخص‌های کلیدی عملکرد سازمان',
        tags: ['admin'],
        auth: 'staff',
        handler: async ({ req }) => {
            const staff = req.staff!;
            const isPlatformAdmin = staff.platformRole === 'platform_admin';
            const userOrgIds = staff.memberships.map((m) => m.organizationId);
            const orgCondition = isPlatformAdmin
                ? sql `TRUE`
                : inArray(requests.organizationId, userOrgIds.length > 0 ? userOrgIds : ['00000000-0000-0000-0000-000000000000']);
            const counts = await app.ctx.db
                .select({
                status: requests.status,
                count: sql<number> `cast(count(*) as int)`,
            })
                .from(requests)
                .where(orgCondition)
                .groupBy(requests.status);
            const statusMap: Record<string, number> = {};
            let total = 0;
            for (const c of counts) {
                statusMap[c.status] = c.count;
                total += c.count;
            }
            return {
                data: {
                    total,
                    submitted: statusMap['submitted'] ?? 0,
                    triaged: statusMap['triaged'] ?? 0,
                    inProgress: (statusMap['in_progress'] ?? 0) + (statusMap['assigned'] ?? 0),
                    waitingForCitizen: statusMap['waiting_for_citizen'] ?? 0,
                    resolved: statusMap['resolved'] ?? 0,
                    closed: statusMap['closed'] ?? 0,
                },
            };
        },
    });
}
