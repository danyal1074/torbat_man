import type { FastifyError, FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
export class AppError extends Error {
    constructor(public readonly status: number, public readonly code: string, message: string, public readonly fields?: Record<string, string>) {
        super(message);
    }
}
export const notFound = (what = 'مورد درخواستی') => new AppError(404, 'NOT_FOUND', `${what} پیدا نشد.`);
export const forbidden = (message = 'به این بخش دسترسی ندارید.') => new AppError(403, 'FORBIDDEN', message);
export const unauthorized = (message = 'برای ادامه وارد حساب خود شوید.') => new AppError(401, 'UNAUTHENTICATED', message);
export const badRequest = (code: string, message: string, fields?: Record<string, string>) => new AppError(400, code, message, fields);
export const conflict = (code: string, message: string) => new AppError(409, code, message);
export function zodFields(err: ZodError): Record<string, string> {
    const fields: Record<string, string> = {};
    for (const issue of err.issues) {
        const key = issue.path.join('.') || '_';
        if (!fields[key])
            fields[key] = issue.message;
    }
    return fields;
}
export function registerErrorHandler(app: FastifyInstance) {
    app.setErrorHandler((error: FastifyError | AppError | ZodError, req, reply) => {
        const correlationId = req.id;
        if (error instanceof AppError) {
            return reply.status(error.status).send({
                error: { code: error.code, message: error.message, correlationId, fields: error.fields },
            });
        }
        if (error instanceof ZodError) {
            return reply.status(400).send({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'اطلاعات واردشده کامل یا درست نیست.',
                    correlationId,
                    fields: zodFields(error),
                },
            });
        }
        const status = (error as FastifyError).statusCode ?? 500;
        if (status === 429) {
            return reply.status(429).send({
                error: { code: 'RATE_LIMITED', message: 'تعداد درخواست‌ها زیاد است. کمی بعد دوباره تلاش کنید.', correlationId },
            });
        }
        if (status === 413 || (error as FastifyError).code === 'FST_REQ_FILE_TOO_LARGE') {
            return reply.status(413).send({
                error: { code: 'FILE_TOO_LARGE', message: 'حجم فایل بیشتر از حد مجاز است.', correlationId },
            });
        }
        if (status >= 400 && status < 500) {
            return reply.status(status).send({
                error: { code: (error as FastifyError).code ?? 'BAD_REQUEST', message: 'درخواست نامعتبر است.', correlationId },
            });
        }
        req.log.error({ err: error }, 'unhandled error');
        return reply.status(500).send({
            error: { code: 'INTERNAL', message: 'خطای پیش‌بینی‌نشده‌ای رخ داد. دوباره تلاش کنید.', correlationId },
        });
    });
    app.setNotFoundHandler((req, reply) => {
        reply.status(404).send({ error: { code: 'ROUTE_NOT_FOUND', message: 'مسیر پیدا نشد.', correlationId: req.id } });
    });
}
