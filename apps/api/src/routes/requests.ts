import { formEntries } from '../workflows/form-entries';
import type { FastifyInstance } from 'fastify';
import { normalizePersian } from '@torbat/i18n';
import { cursorWhere, encodeCursor, newestFirst } from '../lib/pagination';
import { and, desc, eq, sql } from 'drizzle-orm';
import { createRequestBody, commentBody, reopenBody, rateBody, myRequestsQuery } from '@torbat/contracts';
import { requests, requestStatusHistory, requestComments, attachments, services, organizations } from '../db/schema';
import { route } from '../lib/route';
import { notFound } from '../lib/errors';
import { createRequest, citizenComment, reopenRequest, rateRequest } from '../workflows/requests';
export function requestsRoutes(app: FastifyInstance) {
 route(app,{method:'POST',url:'/v1/requests',summary:'ثبت درخواست شهروند',tags:['requests'],auth:'citizen',body:createRequestBody,successStatus:201,handler:async({req,body})=>{
  const row=await createRequest(app.ctx,req.citizen!,body,req.headers['idempotency-key']?.toString());
  return {data:{id:row.id,trackingCode:row.trackingCode,title:row.title,status:row.status,createdAt:row.createdAt.toISOString()}};
 }});
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
            const pattern=query.q ? '%'+normalizePersian(query.q).replace(/[\\%_]/g,'\\$&')+'%' : null;
            const rows = await app.ctx.db
                .select({
                req: requests,
                serviceTitle: services.title,
                orgName: organizations.name,
            })
                .from(requests)
                .innerJoin(services, eq(services.id, requests.serviceId))
                .innerJoin(organizations, eq(organizations.id, requests.organizationId))
                .where(and(eq(requests.citizenId,citizen.userId),eq(requests.cityId,app.ctx.cityId),statusCondition,cursorWhere(query.cursor,requests.createdAt,requests.id),query.organizationId?eq(requests.organizationId,query.organizationId):undefined,pattern?sql`(translate(${requests.title},'يك','یک') ILIKE ${pattern} OR ${requests.trackingCode} ILIKE ${pattern} OR translate(${requests.description},'يك','یک') ILIKE ${pattern})`:undefined))
                .orderBy(...newestFirst(requests.createdAt,requests.id))
                .limit(query.limit+1);
            const page=rows.slice(0,query.limit);
            const data = page.map(({ req: r, serviceTitle, orgName }) => ({
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
            const last=page.at(-1)?.req;
            return {data,meta:{nextCursor:rows.length>query.limit&&last?encodeCursor(last.createdAt,last.id):null,limit:query.limit}};
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
                    formEntries: await formEntries(app.ctx.db,row.req),
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
 route(app,{method:'POST',url:'/v1/requests/:id/comments',summary:'ثبت پیام شهروند',tags:['requests'],auth:'citizen',body:commentBody,successStatus:201,handler:async({req,params,body})=>({data:await citizenComment(app.ctx,req.citizen!,params.id,body.body)})});
 route(app,{method:'POST',url:'/v1/requests/:id/reopen',summary:'بازگشایی نتیجه حل‌شده یا ردشده',tags:['requests'],auth:'citizen',body:reopenBody,handler:async({req,params,body})=>{await reopenRequest(app.ctx,req.citizen!,params.id,body.reason);return {data:{success:true,status:'reopened'}};}});
 route(app,{method:'POST',url:'/v1/requests/:id/rate',summary:'ثبت رضایت از نتیجه رسیدگی',tags:['requests'],auth:'citizen',body:rateBody,handler:async({req,params,body})=>{await rateRequest(app.ctx,req.citizen!,params.id,body.score,body.comment);return {data:{success:true}};}});
}
