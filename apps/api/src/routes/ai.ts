import type { FastifyInstance } from 'fastify';
import { triageBody, assistantBody, duplicateCheckBody } from '@torbat/contracts';
import { route } from '../lib/route';
export function aiRoutes(app: FastifyInstance) {
    route(app, {
        method: 'POST',
        url: '/v1/ai/triage',
        summary: 'ارزیابی خودکار گزارش و پیشنهاد دسته‌بندی و سازمان با هوش مصنوعی',
        tags: ['ai'],
        auth: 'none',
        body: triageBody,
        handler: async ({ body }) => {
            const result = await app.ctx.ai.triage({ text: body.text });
            return { data: result };
        },
    });
    route(app, {
        method: 'POST',
        url: '/v1/ai/assistant',
        summary: 'دستیار هوشمند شهری جهت راهنمایی شهروندان',
        tags: ['ai'],
        auth: 'none',
        body: assistantBody,
        handler: async ({ body }) => {
            const result = await app.ctx.ai.assistant({ message: body.message });
            return { data: result };
        },
    });
    route(app, {
        method: 'POST',
        url: '/v1/ai/duplicate-check',
        summary: 'بررسی احتمال تکراری بودن گزارش در مجاورت مکانی',
        tags: ['ai'],
        auth: 'none',
        body: duplicateCheckBody,
        handler: async ({ body }) => {
            const result = await app.ctx.ai.checkDuplicates({
                serviceSlug: body.serviceSlug,
                lat: body.lat,
                lng: body.lng,
                description: body.description,
            });
            return { data: result };
        },
    });
}
