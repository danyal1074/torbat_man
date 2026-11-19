import { eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Db } from '../db/client';
import { attachments } from '../db/schema';
import { sha256 } from '../lib/crypto';
import { badRequest, notFound } from '../lib/errors';
import { route } from '../lib/route';
import { normalizeUpload } from './normalize';
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
/** Read one multipart file, validate it by content, strip metadata and store it privately. */
export async function saveUpload(req: FastifyRequest, ownerId: string, opts: {
    kind: 'citizen' | 'staff_result';
    requestId?: string | null;
    db?: Db;
}) {
    const { storage } = req.server.ctx;
    const db = opts.db ?? req.server.ctx.db;
    const file = await req.file({ limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } });
    if (!file)
        throw badRequest('FILE_REQUIRED', 'فایلی انتخاب نشده است.');
    const raw = await file.toBuffer();
    if (file.file.truncated)
        throw badRequest('FILE_TOO_LARGE', 'حجم تصویر باید کمتر از ۵ مگابایت باشد.');
    const {data,mimeType:mime}=await normalizeUpload(raw);
    const key=storage.newKey('webp');
    await storage.put(key, data);
    let row;
    try{
    [row] = await db
        .insert(attachments)
        .values({
        ownerId,
        requestId: opts.requestId ?? null,
        kind: opts.kind,
        objectKey: key,
        mimeType: mime,
        sizeBytes: data.length,
        checksum: sha256(data),
    })
        .returning();
    }catch(error){await storage.delete(key).catch(()=>req.log.warn('upload cleanup failed'));throw error;}
    return {
        id: row!.id,
        mimeType: row!.mimeType,
        sizeBytes: row!.sizeBytes,
        url: storage.signUrl(row!.id),
    };
}
export function fileRoutes(app: FastifyInstance) {
    route(app, {
        method: 'POST',
        url: '/v1/uploads',
        summary: 'بارگذاری تصویر پیوست (خصوصی)',
        tags: ['files'],
        auth: 'citizen',
        multipart: true,
        rateLimit: { max: 20, timeWindow: '1 minute' },
        successStatus: 201,
        handler: async ({ req }) => saveUpload(req, req.citizen!.userId, { kind: 'citizen' }),
    });
    route(app, {
        method: 'GET',
        url: '/v1/files/:id',
        summary: 'دریافت فایل با نشانی امضاشده کوتاه‌عمر',
        tags: ['files'],
        auth: 'none',
        handler: async ({ req, reply, params }) => {
            const { exp, sig } = req.query as {
                exp?: string;
                sig?: string;
            };
            const { db, storage } = app.ctx;
            if (!exp || !sig || !storage.verifySignature(params.id!, exp, sig))
                throw notFound('فایل');
            const [row] = await db.select().from(attachments).where(eq(attachments.id, params.id!));
            if (!row)
                throw notFound('فایل');
            const data = await storage.get(row.objectKey);
            if (!data)
                throw notFound('فایل');
            reply
                .header('Content-Type', row.mimeType)
                .header('Cache-Control', 'private, max-age=600')
                .header('X-Content-Type-Options', 'nosniff')
                .header('Content-Disposition', 'inline')
                .header('Cross-Origin-Resource-Policy', 'same-origin');
            return reply.send(data);
        },
    });
}
