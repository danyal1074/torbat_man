import type { FastifyInstance } from 'fastify';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { createRequestBody, commentBody, reopenBody, rateBody, myRequestsQuery, generateTrackingCode, validateFormData, } from '@torbat/contracts';
import { requests, requestStatusHistory, requestComments, attachments, notifications, idempotencyKeys, services, organizations, } from '../db/schema';
import { route } from '../lib/route';
import { badRequest, notFound } from '../lib/errors';
import { audit } from '../lib/audit';
export function requestsRoutes(app: FastifyInstance) {
    // Create Request
    route(app, {
        method: 'POST',
        url: '/v1/requests',
        summary: 'ثبت درخواست جدید شهروندی',
        tags: ['requests'],
        auth: 'citizen',
        body: createRequestBody,
        successStatus: 201,
        handler: async ({ req, reply, body }) => {
            const citizen = req.citizen!;
            const idempotencyKey = req.headers['idempotency-key']?.toString();
            if (idempotencyKey && idempotencyKey.length > 128)
                throw badRequest('INVALID_KEY', 'شناسه ارسال نامعتبر است.');
            // Check idempotency if key provided
            if (idempotencyKey) {
                const [existing] = await app.ctx.db
                    .select()
                    .from(idempotencyKeys)
                    .where(and(eq(idempotencyKeys.key, idempotencyKey), eq(idempotencyKeys.userId, citizen.userId), eq(idempotencyKeys.scope, 'create_request')));
                if (existing && existing.resourceId) {
                    const [existingReq] = await app.ctx.db
                        .select()
                        .from(requests)
                        .where(eq(requests.id, existing.resourceId));
                    if (existingReq) {
                        reply.status(201);
                        return {
                            data: {
                                id: existingReq.id,
                                trackingCode: existingReq.trackingCode,
                                title: existingReq.title,
                                status: existingReq.status,
                                createdAt: existingReq.createdAt.toISOString(),
                            },
                        };
                    }
                }
            }
            if (/(?:نشت|نشتی|بوی).*گاز|برق.?گرفتگی|سیم.*لخت/.test(body.description))
                throw badRequest('POTENTIAL_EMERGENCY', 'احتمال خطر فوری وجود دارد. از محل خطر فاصله بگیرید و از مسیر رسمی امداد اقدام کنید؛ این سامانه برای رسیدگی فوری نیست.');
            // Find service
            const svc = await app.ctx.catalog.getServiceBySlug(body.serviceSlug);
            if (!svc)
                throw notFound('خدمت مورد نظر');
            if (!['active_demo', 'active_integrated'].includes(svc.status) || !['city_report', 'admin_request'].includes(svc.workflow))
                throw badRequest('SERVICE_UNAVAILABLE', 'این خدمت هنوز برای ثبت درخواست فعال نیست.');
            if (!svc.organizationId)
                throw badRequest('NO_ORGANIZATION', 'سازمان پاسخ‌گو مشخص نشده است.');
            const validated = validateFormData(svc.form ?? { version: 1, fields: [] }, body.formData ?? {});
            if (!validated.ok)
                throw badRequest('INVALID_FORM', 'اطلاعات فرم را کامل کنید.', validated.errors);
            const formData = validated.data;
            if (body.attachmentIds.length) {
                const owned = await app.ctx.db.select().from(attachments).where(and(inArray(attachments.id, body.attachmentIds), eq(attachments.ownerId, citizen.userId), sql `${attachments.requestId} IS NULL`));
                if (owned.length !== new Set(body.attachmentIds).size)
                    throw badRequest('INVALID_ATTACHMENTS', 'پیوست معتبر نیست.');
            }
            const trackingCode = generateTrackingCode();
            const title = body.title || svc.title;
            // Insert within transaction
            const result = await app.ctx.db.transaction(async (tx) => {
                if (idempotencyKey) {
                    const [reserved] = await tx.insert(idempotencyKeys).values({ key: idempotencyKey, scope: 'create_request', userId: citizen.userId }).onConflictDoNothing().returning();
                    if (!reserved) {
                        const [prior] = await tx.select().from(idempotencyKeys).where(and(eq(idempotencyKeys.key, idempotencyKey), eq(idempotencyKeys.scope, 'create_request'), eq(idempotencyKeys.userId, citizen.userId)));
                        const [saved] = await tx.select().from(requests).where(eq(requests.id, prior.resourceId!));
                        if (!saved)
                            throw badRequest('REQUEST_IN_PROGRESS', 'ثبت درخواست قبلی هنوز تمام نشده است. دوباره تلاش کنید.');
                        return saved;
                    }
                }
                const [newReq] = await tx
                    .insert(requests)
                    .values({
                    cityId: app.ctx.cityId,
                    serviceId: svc.id,
                    organizationId: svc.organizationId,
                    citizenId: citizen.userId,
                    trackingCode,
                    title,
                    description: body.description,
                    status: 'submitted',
                    priority: 'normal',
                    formData: formData,
                    lat: body.location?.lat,
                    lng: body.location?.lng,
                    address: body.location?.address ?? body.addressText,
                    neighborhood: body.location?.neighborhood,
                })
                    .returning();
                // Record status history
                await tx.insert(requestStatusHistory).values({
                    requestId: newReq.id,
                    toStatus: 'submitted',
                    actorKind: 'citizen',
                    actorId: citizen.userId,
                    reason: 'درخواست توسط شهروند ثبت شد.',
                });
                // Link attachments
                if (body.attachmentIds.length > 0) {
                    await tx
                        .update(attachments)
                        .set({ requestId: newReq.id })
                        .where(inArray(attachments.id, body.attachmentIds));
                }
                // Create welcome notification
                await tx.insert(notifications).values({
                    userId: citizen.userId,
                    type: 'request_submitted',
                    title: 'درخواست شما با موفقیت ثبت شد',
                    body: `درخواست «${title}» با کد پیگیری ${trackingCode} در سامانه ثبت گردید.`,
                    entityType: 'request',
                    entityId: newReq.id,
                });
                // Audit log
                await audit(tx, {
                    actorId: citizen.userId,
                    action: 'request.created',
                    entityType: 'request',
                    entityId: newReq.id,
                    metadata: { trackingCode, serviceSlug: body.serviceSlug },
                });
                if (idempotencyKey)
                    await tx.update(idempotencyKeys).set({ resourceId: newReq.id }).where(and(eq(idempotencyKeys.key, idempotencyKey), eq(idempotencyKeys.scope, 'create_request'), eq(idempotencyKeys.userId, citizen.userId)));
                return newReq;
            });
            const responsePayload = {
                data: {
                    id: result.id,
                    trackingCode: result.trackingCode,
                    title: result.title,
                    status: result.status,
                    createdAt: result.createdAt.toISOString(),
                },
            };
            return responsePayload;
        },
    });
    // List Citizen Requests
    route(app, {
        method: 'GET',
        url: '/v1/requests',
        summary: 'فهرست درخواست‌های شهروند جاری',
        tags: ['requests'],
        auth: 'citizen',
        query: myRequestsQuery,
        handler: async ({ req, query }) => {
            const citizen = req.citizen!;
            let statusCondition = sql `TRUE`;
            if (query.status === 'open') {
                statusCondition = sql `${requests.status} NOT IN ('resolved', 'closed', 'rejected')`;
            }
            else if (query.status === 'done') {
                statusCondition = sql `${requests.status} IN ('resolved', 'closed', 'rejected')`;
            }
            const rows = await app.ctx.db
                .select({
                req: requests,
                serviceTitle: services.title,
                orgName: organizations.name,
            })
                .from(requests)
                .innerJoin(services, eq(services.id, requests.serviceId))
                .innerJoin(organizations, eq(organizations.id, requests.organizationId))
                .where(and(eq(requests.citizenId, citizen.userId), statusCondition))
                .orderBy(desc(requests.createdAt))
                .limit(query.limit);
            const data = rows.map(({ req: r, serviceTitle, orgName }) => ({
                id: r.id,
                trackingCode: r.trackingCode,
                title: r.title,
                serviceSlug: '',
                serviceTitle,
                organizationName: orgName,
                status: r.status,
                priority: r.priority,
                description: r.description,
                address: r.address ?? undefined,
                createdAt: r.createdAt.toISOString(),
                updatedAt: r.updatedAt.toISOString(),
            }));
            return { data };
        },
    });
    // Get Request Detail
    route(app, {
        method: 'GET',
        url: '/v1/requests/:id',
        summary: 'مشاهده جزئیات کامل درخواست',
        tags: ['requests'],
        auth: 'citizen',
        handler: async ({ req, params }) => {
            const citizen = req.citizen!;
            const { id } = params;
            const [row] = await app.ctx.db
                .select({
                req: requests,
                serviceTitle: services.title,
                serviceSlug: services.slug,
                orgName: organizations.name,
            })
                .from(requests)
                .innerJoin(services, eq(services.id, requests.serviceId))
                .innerJoin(organizations, eq(organizations.id, requests.organizationId))
                .where(and(eq(requests.id, id), eq(requests.citizenId, citizen.userId)));
            if (!row)
                throw notFound('درخواست');
            // Load history
            const history = await app.ctx.db
                .select()
                .from(requestStatusHistory)
                .where(eq(requestStatusHistory.requestId, id))
                .orderBy(desc(requestStatusHistory.createdAt));
            // Load comments (public and citizen-authored)
            const comments = await app.ctx.db
                .select()
                .from(requestComments)
                .where(and(eq(requestComments.requestId, id), sql `${requestComments.visibility} = 'public' OR ${requestComments.authorId} = ${citizen.userId}`))
                .orderBy(desc(requestComments.createdAt));
            // Load attachments
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
                    organizationName: row.orgName,
                    status: row.req.status,
                    priority: row.req.priority,
                    description: row.req.description,
                    formData: row.req.formData as Record<string, unknown>,
                    lat: row.req.lat ?? undefined,
                    lng: row.req.lng ?? undefined,
                    address: row.req.address ?? undefined,
                    neighborhood: row.req.neighborhood ?? undefined,
                    satisfactionScore: row.req.ratingScore ?? undefined,
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
                    comments: comments.map((c) => ({
                        id: c.id,
                        body: c.body,
                        visibility: c.visibility,
                        isStaff: c.authorId !== citizen.userId,
                        createdAt: c.createdAt.toISOString(),
                    })),
                    attachments: signedAttachments,
                },
            };
        },
    });
    route(app, { method: 'GET', url: '/v1/tracking/:code', summary: 'پیگیری عمومی بدون اطلاعات شخصی', tags: ['requests'], auth: 'none', handler: async ({ params }) => {
            const [r] = await app.ctx.db.select({ trackingCode: requests.trackingCode, status: requests.status, updatedAt: requests.updatedAt }).from(requests).where(eq(requests.trackingCode, params.code));
            if (!r)
                throw notFound('درخواست');
            return { data: r };
        } });
    // Add Comment
    route(app, {
        method: 'POST',
        url: '/v1/requests/:id/comments',
        summary: 'ارسال پیام جدید روی پرونده',
        tags: ['requests'],
        auth: 'citizen',
        body: commentBody,
        successStatus: 201,
        handler: async ({ req, params, body }) => {
            const citizen = req.citizen!;
            const { id } = params;
            const [reqRow] = await app.ctx.db
                .select()
                .from(requests)
                .where(and(eq(requests.id, id), eq(requests.citizenId, citizen.userId)));
            if (!reqRow)
                throw notFound('درخواست');
            const [newComment] = await app.ctx.db
                .insert(requestComments)
                .values({
                requestId: id,
                authorId: citizen.userId,
                authorKind: 'citizen',
                visibility: 'public',
                body: body.body,
            })
                .returning();
            return {
                data: {
                    id: newComment.id,
                    body: newComment.body,
                    createdAt: newComment.createdAt.toISOString(),
                },
            };
        },
    });
    // Reopen Request
    route(app, {
        method: 'POST',
        url: '/v1/requests/:id/reopen',
        summary: 'بازگشایی مجدد درخواست حل‌شده توسط شهروند',
        tags: ['requests'],
        auth: 'citizen',
        body: reopenBody,
        handler: async ({ req, params, body }) => {
            const citizen = req.citizen!;
            const { id } = params;
            const [reqRow] = await app.ctx.db
                .select()
                .from(requests)
                .where(and(eq(requests.id, id), eq(requests.citizenId, citizen.userId)));
            if (!reqRow)
                throw notFound('درخواست');
            if (reqRow.status !== 'resolved') {
                throw badRequest('CANNOT_REOPEN', 'فقط درخواست‌های حل‌شده قابل بازگشایی هستند.');
            }
            await app.ctx.db.transaction(async (tx) => {
                await tx
                    .update(requests)
                    .set({ status: 'reopened', updatedAt: new Date() })
                    .where(eq(requests.id, id));
                await tx.insert(requestStatusHistory).values({
                    requestId: id,
                    fromStatus: 'resolved',
                    toStatus: 'reopened',
                    actorKind: 'citizen',
                    actorId: citizen.userId,
                    reason: `بازگشایی توسط شهروند: ${body.reason}`,
                });
            });
            return { data: { success: true, status: 'reopened' } };
        },
    });
    // Rate Request
    route(app, {
        method: 'POST',
        url: '/v1/requests/:id/rate',
        summary: 'ثبت امتیاز و نظر سنجی رضایت برای درخواست مختومه',
        tags: ['requests'],
        auth: 'citizen',
        body: rateBody,
        handler: async ({ req, params, body }) => {
            const citizen = req.citizen!;
            const { id } = params;
            const [reqRow] = await app.ctx.db
                .select()
                .from(requests)
                .where(and(eq(requests.id, id), eq(requests.citizenId, citizen.userId)));
            if (!reqRow)
                throw notFound('درخواست');
            if (reqRow.status !== 'resolved')
                throw badRequest('CANNOT_RATE', 'فقط درخواست حل‌شده قابل امتیازدهی است.');
            await app.ctx.db
                .update(requests)
                .set({
                ratingScore: body.score,
                ratingComment: body.comment,
            })
                .where(eq(requests.id, id));
            return { data: { success: true } };
        },
    });
}
