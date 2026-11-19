import fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import type { AppContext } from './context';
import { authRoutes } from './auth/routes';
import { fileRoutes, MAX_UPLOAD_BYTES } from './files/routes';
import { servicesRoutes } from './routes/services';
import { requestsRoutes } from './routes/requests';
import { adminRoutes } from './routes/admin';
import { aiRoutes } from './routes/ai';
import { announcementsRoutes } from './routes/announcements';
import { notificationsRoutes } from './routes/notifications';
import { placesRoutes } from './routes/places';
import { registerErrorHandler } from './lib/errors';
import { managementRoutes } from './routes/management';
import { buildOpenApi } from './lib/route';
export async function createApp(ctx: AppContext): Promise<FastifyInstance> {
    const app = fastify({
        logger: {
            level: ctx.env.LOG_LEVEL,
            serializers: {
                req(req) {
                    return { method: req.method, url: req.url.split('?')[0], hostname: req.hostname, remoteAddress: req.ip };
                },
            },
        },
        trustProxy: false,
    });
    // Attach AppContext
    app.decorate('ctx', ctx);
    app.decorate('routeDocs', []);
    // Plugins
    await app.register(cors, {
        origin: (origin, cb) => {
            if (!origin)
                return cb(null, true);
            const isAllowed = ctx.env.origins.some((o) => origin === o);
            cb(null, isAllowed);
        },
        credentials: true,
        methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
    });
    await app.register(helmet, {
        contentSecurityPolicy: false, // relaxed for development & Swagger UI
    });
    await app.register(cookie, {
        secret: ctx.env.SESSION_SECRET,
    });
    await app.register(multipart, {
        limits: {
            fileSize: MAX_UPLOAD_BYTES,
            files: 1,
        },
    });
    await app.register(rateLimit, {
        max: ctx.env.NODE_ENV === 'test' ? 1000 : 100,
        timeWindow: '1 minute',
    });
    // Global Error Handler
    registerErrorHandler(app);
    // Health Endpoint
    app.get('/health', async () => ({
        status: 'ok',
        appEnv: ctx.env.APP_ENV,
        timestamp: new Date().toISOString(),
    }));
    // Register Routes
    authRoutes(app);
    fileRoutes(app);
    servicesRoutes(app);
    requestsRoutes(app);
    adminRoutes(app);
    aiRoutes(app);
    announcementsRoutes(app);
    notificationsRoutes(app);
    placesRoutes(app);
    managementRoutes(app);
    app.get('/openapi.json', async () => buildOpenApi(app.routeDocs));
    app.get('/docs', async () => buildOpenApi(app.routeDocs));
    app.addHook('onRequest', async (req, reply) => {
        reply.header('X-Correlation-Id', req.id);
        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin && !ctx.env.origins.includes(req.headers.origin)) {
            return reply.status(403).send({ error: { code: 'ORIGIN_FORBIDDEN', message: 'مبدأ درخواست مجاز نیست.' } });
        }
    });
    return app;
}
