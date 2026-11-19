import { eq } from 'drizzle-orm';
import { loadEnv } from '../env';
import { type Db, createDb } from '../db/client';
import { cities, organizations, serviceCategories, serviceFormSchemas, services, users, organizationMembers, announcements, } from '../db/schema';
import { CITY, ORGANIZATIONS, CATEGORIES, SERVICES, DEMO_USERS, } from './catalog';
async function seed() {
    const env = loadEnv();
    if (env.APP_ENV === 'production')
        throw new Error('Demo seed is disabled for production.');
    const handle = await createDb({
        databaseUrl: env.DATABASE_URL,
        pgliteDir: env.PGLITE_DIR,
    });
    console.log('Migrating database...');
    try {
        await handle.migrate();
    }
    catch (e) {
        console.warn('Migration warning:', e);
    }
    await seedDatabase(handle.db);
    await handle.close();
}
export async function seedDatabase(db: Db) {
    // 1. City
    console.log('Seeding city...');
    let [city] = await db.select().from(cities).where(eq(cities.code, CITY.code));
    if (!city) {
        [city] = await db
            .insert(cities)
            .values({
            code: CITY.code,
            name: CITY.name,
            province: CITY.province,
            centerLat: CITY.centerLat,
            centerLng: CITY.centerLng,
        })
            .returning();
    }
    // 2. Organizations
    console.log('Seeding organizations...');
    const orgMap = new Map<string, string>();
    for (const org of ORGANIZATIONS) {
        let [row] = await db.select().from(organizations).where(eq(organizations.code, org.code));
        if (!row) {
            [row] = await db
                .insert(organizations)
                .values({
                cityId: city.id,
                code: org.code,
                name: org.name,
                shortName: org.shortName,
                description: org.description,
                status: org.status,
                isDemo: org.isDemo,
            })
                .returning();
        }
        orgMap.set(org.code, row.id);
    }
    // 3. Service Categories
    console.log('Seeding service categories...');
    const catMap = new Map<string, string>();
    let catOrder = 1;
    for (const cat of CATEGORIES) {
        let [row] = await db
            .select()
            .from(serviceCategories)
            .where(eq(serviceCategories.slug, cat.slug));
        if (!row) {
            [row] = await db
                .insert(serviceCategories)
                .values({
                cityId: city.id,
                slug: cat.slug,
                title: cat.title,
                icon: cat.icon,
                description: cat.description,
                sortOrder: catOrder++,
            })
                .returning();
        }
        catMap.set(cat.slug, row.id);
    }
    // 4. Services
    console.log(`Seeding ${SERVICES.length} services...`);
    let svcOrder = 1;
    for (const svc of SERVICES) {
        const orgId = svc.org ? orgMap.get(svc.org) ?? null : null;
        const catId = catMap.get(svc.category);
        if (!catId)
            continue;
        const [existing] = await db
            .select()
            .from(services)
            .where(eq(services.slug, svc.slug));
        // Repair metadata missing from the initial scaffold without replacing managed content.
        if (existing && existing.requirements.length === 0 && existing.keywords.length === 0) {
            await db.update(services).set({ requirements: svc.requirements ?? [], steps: svc.steps ?? [], keywords: svc.keywords ?? [], isFeatured: !!svc.isFeatured, integrationNote: svc.integrationNote ?? null, slaHours: svc.slaHours ?? null }).where(eq(services.id, existing.id));
        }
        if (!existing) {
            const [created] = await db.insert(services).values({
                cityId: city.id,
                categoryId: catId,
                organizationId: orgId,
                slug: svc.slug,
                title: svc.title,
                shortTitle: svc.shortTitle,
                description: svc.description,
                icon: svc.icon,
                status: svc.status,
                workflow: svc.workflow,
                formSchemaVersion: svc.form?.version,
                requirements: svc.requirements ?? [],
                steps: svc.steps ?? [],
                keywords: svc.keywords,
                integrationNote: svc.integrationNote,
                sortOrder: svcOrder++,
                slaHours: svc.slaHours,
                isFeatured: !!svc.isFeatured,
                supportContactVerified: false,
                feesVerified: false,
            }).returning();
            if (svc.form)
                await db.insert(serviceFormSchemas).values({ serviceId: created.id, version: svc.form.version, jsonSchema: svc.form });
        }
    }
    // Recover versioned forms omitted by early scaffold seeds; never replace a stored version.
    for (const svc of SERVICES) {
        if (!svc.form)
            continue;
        const [target] = await db.select().from(services).where(eq(services.slug, svc.slug));
        if (!target)
            continue;
        await db.insert(serviceFormSchemas).values({ serviceId: target.id, version: svc.form.version, jsonSchema: svc.form }).onConflictDoNothing();
        if (target.formSchemaVersion === null)
            await db.update(services).set({ formSchemaVersion: svc.form.version }).where(eq(services.id, target.id));
    }
    // 5. Demo Users & Memberships
    console.log('Seeding demo users and staff memberships...');
    for (const u of DEMO_USERS) {
        let [userRow] = await db.select().from(users).where(eq(users.mobile, u.mobile));
        if (!userRow) {
            [userRow] = await db
                .insert(users)
                .values({
                mobile: u.mobile,
                displayName: u.displayName,
                platformRole: u.platformRole,
                status: 'active',
                verifiedAt: new Date(),
            })
                .returning();
        }
        if (u.memberships) {
            for (const m of u.memberships) {
                const orgId = orgMap.get(m.org);
                if (!orgId)
                    continue;
                const [existingMember] = await db
                    .select()
                    .from(organizationMembers)
                    .where(eq(organizationMembers.userId, userRow.id));
                if (!existingMember) {
                    await db.insert(organizationMembers).values({
                        userId: userRow.id,
                        organizationId: orgId,
                        role: m.role,
                        status: 'active',
                    });
                }
            }
        }
    }
    // 6. Announcements
    console.log('Seeding official announcements...');
    const initialAnnouncements = [
        {
            title: 'رونمایی از نسخه آزمایشی سوپراپلیکیشن شهروندی «تربت من»',
            body: 'به سامانه یکپارچه خدمات شهری و شهروندی تربت حیدریه خوش آمدید. شهروندان گرامی می‌توانند گزارش‌های شهری و خرابی معابر را از طریق شهر‌بین ثبت و با کد رهگیری پیگیری نمایند.',
            sourceName: 'روابط عمومی شهرداری تربت حیدریه',
            importance: 'important' as const,
            orgCode: 'MUNI',
        },
        {
            title: 'اطلاعیه شستشو و پایش شبکه آب در محله‌های شمالی',
            body: 'به اطلاع شهروندان گرامی می‌رساند جهت بهبود کیفیت آبرسانی، عملیات شستشوی شبکه توزیع آب در روز دوشنبه انجام خواهد شد.',
            sourceName: 'امور آب و فاضلاب شهرستان تربت حیدریه',
            importance: 'normal' as const,
            orgCode: 'ABFA',
        },
        {
            title: 'پایش و اصلاح روشنایی بلوارها و معابر اصلی',
            body: 'عملیات بهسازی روشنایی معابر با استفاده از لامپ‌های کم‌مصرف LED در بلوارهای اصلی آغاز گردید.',
            sourceName: 'مدیریت توزیع برق تربت حیدریه',
            importance: 'normal' as const,
            orgCode: 'BARGH',
        },
    ];
    for (const ann of initialAnnouncements) {
        const orgId = orgMap.get(ann.orgCode);
        const [existing] = await db
            .select()
            .from(announcements)
            .where(eq(announcements.title, ann.title));
        if (!existing) {
            await db.insert(announcements).values({
                cityId: city.id,
                organizationId: orgId,
                title: ann.title,
                body: ann.body,
                sourceName: ann.sourceName,
                importance: ann.importance,
                status: 'published',
                isDemo: true,
                publishedAt: new Date(),
            });
        }
    }
    console.log('Database seeded successfully!');
}
if (process.argv[1]?.replaceAll('\\', '/').match(/\/seed-cli\.(ts|js)$/))
    seed().catch((err) => {
        console.error('Seed error:', err);
        process.exit(1);
    });
