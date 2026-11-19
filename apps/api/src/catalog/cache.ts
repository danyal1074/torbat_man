import { eq } from 'drizzle-orm';
import type { Db } from '../db/client';
import { serviceCategories, services, organizations, serviceFormSchemas } from '../db/schema';
import type { ServiceDTO, CategoryDTO, OrganizationDTO } from '@torbat/contracts';
export type CatalogService = ServiceDTO & {
    categoryId: string;
    organizationId: string | null;
};
export interface CatalogCache {
    getServices(): Promise<CatalogService[]>;
    getCategories(): Promise<CategoryDTO[]>;
    getOrganizations(): Promise<OrganizationDTO[]>;
    getServiceBySlug(slug: string): Promise<CatalogService | null>;
    invalidate(): void;
}
export function createCatalogCache(db: Db, cityId: string): CatalogCache {
    let cached: CatalogService[] | null = null;
    return {
        async getServices() {
            if (cached)
                return cached;
            const rows = await db.select().from(services).where(eq(services.cityId, cityId));
            const forms = await db.select().from(serviceFormSchemas);
            const cats = await this.getCategories();
            const orgs = await this.getOrganizations();
            const result = rows.map(r => ({ ...r, form: forms.find(f => f.serviceId === r.id && f.isActive)?.jsonSchema ?? null, categorySlug: cats.find(c => c.id === r.categoryId)?.slug ?? '', organization: orgs.find(o => o.id === r.organizationId) ?? null, lastVerifiedAt: r.lastVerifiedAt?.toISOString() ?? null }));
            result.sort((a, b) => a.sortOrder - b.sortOrder);
            cached = result;
            return result;
        },
        async getCategories() { return db.select().from(serviceCategories).where(eq(serviceCategories.cityId, cityId)); },
        async getOrganizations() { return db.select().from(organizations).where(eq(organizations.cityId, cityId)); },
        async getServiceBySlug(slug) { return (await this.getServices()).find(s => s.slug === slug) ?? null; },
        invalidate() { cached = null; }
    };
}
