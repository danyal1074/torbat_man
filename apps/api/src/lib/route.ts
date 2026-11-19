import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z, type ZodType } from 'zod';
import { requireCitizen, requireStaff, optionalCitizen } from '../auth/guards';
import { notFound } from './errors';
export type Auth = 'none' | 'optional-citizen' | 'citizen' | 'staff';
type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
type Out<T> = T extends ZodType ? z.output<T> : undefined;
export interface RouteDef<B extends ZodType | undefined, Q extends ZodType | undefined> {
    method: Method;
    url: string;
    summary: string;
    tags: string[];
    auth: Auth;
    body?: B;
    query?: Q;
    /** Per-route rate limit (in addition to the global limit). */
    rateLimit?: {
        max: number;
        timeWindow: string;
    };
    /** Multipart routes skip JSON body validation. */
    multipart?: boolean;
    successStatus?: number;
    handler: (ctx: {
        req: FastifyRequest;
        reply: FastifyReply;
        body: Out<B>;
        query: Out<Q>;
        params: Record<string, string>;
    }) => Promise<unknown>;
}
export interface RouteDoc {
    method: Method;
    url: string;
    summary: string;
    tags: string[];
    auth: Auth;
    body?: ZodType;
    query?: ZodType;
    multipart?: boolean;
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Register a route with Zod validation, auth guard and OpenAPI metadata. */
export function route<B extends ZodType | undefined = undefined, Q extends ZodType | undefined = undefined>(app: FastifyInstance, def: RouteDef<B, Q>) {
    app.routeDocs.push({
        method: def.method,
        url: def.url,
        summary: def.summary,
        tags: def.tags,
        auth: def.auth,
        body: def.body,
        query: def.query,
        multipart: def.multipart,
    });
    app.route({
        method: def.method,
        url: def.url,
        config: def.rateLimit ? { rateLimit: def.rateLimit } : undefined,
        preHandler: async (req) => {
            // Reject malformed ids early (also prevents DB cast errors leaking as 500s).
            const params = req.params as Record<string, string>;
            for (const [key, value] of Object.entries(params ?? {})) {
                if ((key === 'id' || key.endsWith('Id')) && !UUID_RE.test(value))
                    throw notFound();
            }
            if (def.auth === 'citizen')
                await requireCitizen(req);
            else if (def.auth === 'optional-citizen')
                await optionalCitizen(req);
            else if (def.auth === 'staff')
                await requireStaff(req);
        },
        handler: async (req, reply) => {
            const body = (def.body && !def.multipart ? def.body.parse(req.body ?? {}) : undefined) as Out<B>;
            const query = (def.query ? def.query.parse(req.query ?? {}) : undefined) as Out<Q>;
            const result = await def.handler({
                req,
                reply,
                body,
                query,
                params: (req.params ?? {}) as Record<string, string>,
            });
            if (reply.sent)
                return reply;
            if (def.successStatus)
                reply.status(def.successStatus);
            return result ?? { ok: true };
        },
    });
}
/** Build an OpenAPI 3.1 document from the registered routes. */
export function buildOpenApi(docs: RouteDoc[]) {
    const paths: Record<string, Record<string, unknown>> = {};
    for (const d of docs) {
        const path = d.url.replace(/:([A-Za-z]+)/g, '{$1}');
        const params = [...d.url.matchAll(/:([A-Za-z]+)/g)].map((m) => ({
            name: m[1],
            in: 'path',
            required: true,
            schema: { type: 'string' },
        }));
        const queryParams: unknown[] = [];
        if (d.query) {
            const js = z.toJSONSchema(d.query, { io: 'input', unrepresentable: 'any' }) as {
                properties?: Record<string, unknown>;
                required?: string[];
            };
            for (const [name, schema] of Object.entries(js.properties ?? {})) {
                queryParams.push({ name, in: 'query', required: js.required?.includes(name) ?? false, schema });
            }
        }
        const op: Record<string, unknown> = {
            summary: d.summary,
            tags: d.tags,
            parameters: [...params, ...queryParams],
            responses: {
                '200': { description: 'موفق' },
                '400': { description: 'خطای اعتبارسنجی', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
                ...(d.auth === 'citizen' || d.auth === 'staff' ? { '401': { description: 'نیازمند ورود' } } : {}),
            },
        };
        if (d.auth === 'citizen')
            op.security = [{ citizenSession: [] }];
        if (d.auth === 'staff')
            op.security = [{ staffSession: [] }];
        if (d.multipart) {
            op.requestBody = {
                content: {
                    'multipart/form-data': {
                        schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
                    },
                },
            };
        }
        else if (d.body) {
            op.requestBody = {
                required: true,
                content: { 'application/json': { schema: z.toJSONSchema(d.body, { io: 'input', unrepresentable: 'any' }) } },
            };
        }
        paths[path] ??= {};
        paths[path][d.method.toLowerCase()] = op;
    }
    return {
        openapi: '3.1.0',
        info: {
            title: 'تربت من — API',
            version: '0.1.0',
            description: 'API سوپراپلیکیشن شهروندی تربت حیدریه. همه پاسخ‌ها هدر X-Correlation-Id دارند.',
        },
        servers: [{ url: '/' }],
        components: {
            securitySchemes: {
                citizenSession: { type: 'apiKey', in: 'cookie', name: 'tm_sid' },
                staffSession: { type: 'apiKey', in: 'cookie', name: 'tm_asid' },
            },
            schemas: {
                Error: {
                    type: 'object',
                    properties: {
                        error: {
                            type: 'object',
                            properties: {
                                code: { type: 'string' },
                                message: { type: 'string' },
                                correlationId: { type: 'string' },
                                fields: { type: 'object', additionalProperties: { type: 'string' } },
                            },
                            required: ['code', 'message'],
                        },
                    },
                },
            },
        },
        paths,
    };
}
