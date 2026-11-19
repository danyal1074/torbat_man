import { normalizePersian } from '@torbat/i18n';
import { cursorWhere, encodeCursor, newestFirst } from '../lib/pagination';
import { requireOrganization } from '../workflows/requests';
import { z } from 'zod';
import { formEntries } from '../workflows/form-entries';
import type { FastifyInstance } from 'fastify';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { adminRequestsQuery, adminAssignBody, adminStatusBody, adminTransferBody, adminCommentBody, STAFF_TRANSITIONS, maskMobile } from '@torbat/contracts';
import { requests, requestStatusHistory, requestComments, attachments, services, organizations, users, organizationMembers } from '../db/schema';
import { route } from '../lib/route';
import { forbidden, notFound } from '../lib/errors';
import { saveUpload } from '../files/routes';
import { audit } from '../lib/audit';
import { assignRequest, changeRequestStatus, transferRequest, staffComment, lockedStaffRequest, canDispatch } from '../workflows/requests';
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
            const conditions = [eq(requests.cityId,app.ctx.cityId),cursorWhere(query.cursor,requests.createdAt,requests.id)];
            if(query.organizationId){requireOrganization(staff,query.organizationId,'read');conditions.push(eq(requests.organizationId,query.organizationId));}
            if(query.serviceId)conditions.push(eq(requests.serviceId,query.serviceId));
            if(query.neighborhood)conditions.push(eq(requests.neighborhood,query.neighborhood));
            if(query.overdue)conditions.push(sql`${requests.dueAt} < NOW() AND ${requests.status} NOT IN ('resolved','closed','rejected')`);
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
                const pattern = '%'+normalizePersian(query.q).replace(/[\\%_]/g,'\\$&')+'%';
                conditions.push(sql `(translate(${requests.title},'يك','یک') ILIKE ${pattern} OR ${requests.trackingCode} ILIKE ${pattern} OR translate(${requests.description},'يك','یک') ILIKE ${pattern})`);
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
                .orderBy(...newestFirst(requests.createdAt,requests.id))
                .limit(query.limit+1);
            const page=rows.slice(0,query.limit);
            const data = page.map(({ req: r, serviceTitle, serviceSlug, orgName, citizenMobile, citizenName }) => ({
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
                dueAt:r.dueAt?.toISOString()??null,
                overdue:!!r.dueAt&&r.dueAt<new Date()&&!'resolved closed rejected'.split(' ').includes(r.status),
                citizenMobile: maskMobile(citizenMobile),
                citizenName: citizenName ?? undefined,
                assigneeId: r.assigneeId ?? undefined,
                createdAt: r.createdAt.toISOString(),
                updatedAt: r.updatedAt.toISOString(),
            }));
            const last=page.at(-1)?.req;
            return {data,meta:{nextCursor:rows.length>query.limit&&last?encodeCursor(last.createdAt,last.id):null,limit:query.limit}};
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
                    citizenMobile: maskMobile(row.citizenMobile),
                    citizenName: row.citizenName,
                    status: row.req.status,
                    priority: row.req.priority,
                    description: row.req.description,
                    formEntries: await formEntries(app.ctx.db,row.req,row.req.assigneeId!==staff.userId&&!canDispatch(staff,row.req.organizationId)),
                    lat: row.req.lat ?? undefined,
                    lng: row.req.lng ?? undefined,
                    address: row.req.address ?? undefined,
                    neighborhood: row.req.neighborhood ?? undefined,
                    satisfactionScore: row.req.ratingScore ?? undefined,
                    allowedTransitions: STAFF_TRANSITIONS[row.req.status],
                    permissions: {canTransfer: canDispatch(staff,row.req.organizationId),canAssign:canDispatch(staff,row.req.organizationId),canComment:true,canChangeStatus:true},
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
                        authorName: authorName || (authorMobile?maskMobile(authorMobile):'کاربر سامانه'),
                        createdAt: c.createdAt.toISOString(),
                    })),
                    attachments: signedAttachments,
                },
            };
        },
    });
 route(app,{method:'PATCH',url:'/v1/admin/requests/:id/assign',summary:'تخصیص پرونده به کارشناس',tags:['admin'],auth:'staff',body:adminAssignBody,handler:async({req,params,body})=>{await assignRequest(app.ctx,req.staff!,params.id,body);return {data:{success:true,assigneeId:body.assigneeId}};}});
 route(app,{method:'PATCH',url:'/v1/admin/requests/:id/status',summary:'تغییر وضعیت تراکنشی پرونده',tags:['admin'],auth:'staff',body:adminStatusBody,handler:async({req,params,body})=>{await changeRequestStatus(app.ctx,req.staff!,params.id,body);return {data:{success:true,status:body.status}};}});
 route(app,{method:'PATCH',url:'/v1/admin/requests/:id/transfer',summary:'انتقال سازمانی با نقش مسئول ارجاع',tags:['admin'],auth:'staff',body:adminTransferBody,handler:async({req,params,body})=>{await transferRequest(app.ctx,req.staff!,params.id,body);return {data:{success:true}};}});
 route(app,{method:'POST',url:'/v1/admin/requests/:id/comments',summary:'پاسخ عمومی یا یادداشت داخلی کارشناس',tags:['admin'],auth:'staff',body:adminCommentBody,successStatus:201,handler:async({req,params,body})=>({data:await staffComment(app.ctx,req.staff!,params.id,body)})});
 route(app,{method:'POST',url:'/v1/admin/requests/:id/attachments',summary:'تصویر نتیجه رسیدگی',tags:['admin'],auth:'staff',multipart:true,successStatus:201,handler:async({req,params})=>app.ctx.db.transaction(async tx=>{
  const record=await lockedStaffRequest(tx,app.ctx,req.staff!,params.id);
  const uploaded=await saveUpload(req,req.staff!.userId,{kind:'staff_result',requestId:record.id,db:tx});
  await audit(tx,{actorId:req.staff!.userId,organizationId:record.organizationId,action:'request.result_uploaded',entityType:'request',entityId:record.id});
  return uploaded;
 })});
 route(app,{method:'GET',url:'/v1/admin/members',summary:'اعضای فعال سازمان برای ارجاع',tags:['admin'],auth:'staff',query:z.object({organizationId:z.uuid()}),handler:async({req,query})=>{
  requireOrganization(req.staff!,query.organizationId,'read');
  const rows=await app.ctx.db.select({userId:users.id,name:users.displayName,mobile:users.mobile,role:organizationMembers.role}).from(organizationMembers).innerJoin(users,eq(users.id,organizationMembers.userId)).where(and(eq(organizationMembers.organizationId,query.organizationId),eq(organizationMembers.status,'active'),eq(users.status,'active')));
  return {data:rows.map(r=>({...r,mobile:maskMobile(r.mobile)}))};
 }});
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
