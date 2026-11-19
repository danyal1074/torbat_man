import type { OrgRole, PlatformRole } from '@torbat/contracts';
import type { Db } from './db/client';
import type { Env } from './env';
import type { RouteDoc } from './lib/route';
import type { FileStorage } from './files/storage';
import type { AiGateway } from './ai/gateway';
import type { CatalogCache } from './catalog/cache';
export interface AppContext {
    db: Db;
    env: Env;
    storage: FileStorage;
    ai: AiGateway;
    catalog: CatalogCache;
    /** Torbat-e Heydarieh city id (single-city deployment; multi-city ready schema). */
    cityId: string;
}
export interface CitizenAuth {
    userId: string;
    sessionId: string;
    mobile: string;
}
export interface Membership {
    organizationId: string;
    role: OrgRole;
}
export interface StaffAuth {
    userId: string;
    sessionId: string;
    mobile: string;
    displayName: string | null;
    platformRole: PlatformRole | null;
    memberships: Membership[];
}
declare module 'fastify' {
    interface FastifyInstance {
        ctx: AppContext;
        routeDocs: RouteDoc[];
    }
    interface FastifyRequest {
        citizen?: CitizenAuth;
        staff?: StaffAuth;
    }
}
