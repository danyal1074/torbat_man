import { loadEnv } from '../env';
import { createDb } from './client';
async function main() {
    const env = loadEnv();
    const handle = await createDb({
        databaseUrl: env.DATABASE_URL,
        pgliteDir: env.PGLITE_DIR,
    });
    console.log('Running migrations...');
    await handle.migrate();
    console.log('Migrations complete.');
    await handle.close();
}
main().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});
