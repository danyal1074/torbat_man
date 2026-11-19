import type { FastifyInstance } from 'fastify';
import { route } from '../lib/route';
import { FEATURE_FLAGS } from '../seed/catalog';
import { notFound } from '../lib/errors';
export function servicesRoutes(app: FastifyInstance) {
    route(app, {
        method: 'GET',
        url: '/v1/services',
        summary: 'فهرست کامل خدمات کاتالوگ',
        tags: ['services'],
        auth: 'none',
        handler: async () => {
            const services = await app.ctx.catalog.getServices();
            return { data: services };
        },
    });
    route(app, {
        method: 'GET',
        url: '/v1/services/categories',
        summary: 'فهرست دسته‌بندی‌های خدمات',
        tags: ['services'],
        auth: 'none',
        handler: async () => {
            const categories = await app.ctx.catalog.getCategories();
            return { data: categories };
        },
    });
    route(app, {
        method: 'GET',
        url: '/v1/services/:slug',
        summary: 'مشخصات کامل یک خدمت بر اساس شناسه متنی',
        tags: ['services'],
        auth: 'none',
        handler: async ({ params }) => {
            const service = await app.ctx.catalog.getServiceBySlug(params.slug);
            if (!service)
                throw notFound('خدمت مورد نظر');
            return { data: service };
        },
    });
    route(app, {
        method: 'GET',
        url: '/v1/organizations',
        summary: 'فهرست سازمان‌های متصل و آزمایشی',
        tags: ['services'],
        auth: 'none',
        handler: async () => {
            const orgs = await app.ctx.catalog.getOrganizations();
            return { data: orgs };
        },
    });
    route(app, {
        method: 'GET',
        url: '/v1/feature-flags',
        summary: 'وضعیت قابلیت‌های سامانه (Feature Flags)',
        tags: ['services'],
        auth: 'none',
        handler: async () => {
            return { data: FEATURE_FLAGS };
        },
    });
}
