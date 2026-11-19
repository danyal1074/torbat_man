import { createApp } from './app';
import { loadEnv } from './env';
import { createDb } from './db/client';
import { createLocalStorage } from './files/storage';
import { createCatalogCache } from './catalog/cache';
import { createAiGateway } from './ai/gateway';
import { cities } from './db/schema';
import { eq } from 'drizzle-orm';
import { CITY } from './seed/catalog';
async function main() {
    const env = loadEnv();
    const dbHandle = await createDb({
        databaseUrl: env.DATABASE_URL,
        pgliteDir: env.PGLITE_DIR,
    });
    // Run pending migrations
    await dbHandle.migrate();
    // Ensure default city exists
    let [city] = await dbHandle.db
        .select()
        .from(cities)
        .where(eq(cities.code, CITY.code));
    if (!city) {
        [city] = await dbHandle.db
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
    const storage = createLocalStorage(env.STORAGE_DIR, env.FILE_SIGNING_SECRET);
    const catalog = createCatalogCache(dbHandle.db, city.id);
    const ai = createAiGateway({
        apiKey: env.ANTHROPIC_API_KEY,
        model: env.ANTHROPIC_MODEL,
        timeoutMs: env.AI_TIMEOUT_MS,
        catalog,
        db: dbHandle.db,
    });
    const app = await createApp({
        db: dbHandle.db,
        env,
        storage,
        catalog,
        ai,
        cityId: city.id,
    });
    await app.listen({ host: env.HOST, port: env.PORT });
    console.log(`Torbat-e Man API running at http://${env.HOST}:${env.PORT}`);
    console.log(`OpenAPI documentation available at http://${env.HOST}:${env.PORT}/docs`);
    const shutdown = async () => {
        console.log('Shutting down server...');
        await app.close();
        await dbHandle.close();
        process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}
main().catch((err) => {
    console.error('Fatal API startup error:', err);
    process.exit(1);
});
