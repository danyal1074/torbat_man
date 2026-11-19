import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import * as schema from './schema';
export type Schema = typeof schema;
/** Common base type of the node-postgres and PGlite drizzle databases (and their transactions). */
export type Db = PgDatabase<PgQueryResultHKT, Schema>;
export interface DbHandle {
    db: Db;
    kind: 'postgres' | 'pglite';
    migrate: () => Promise<void>;
    close: () => Promise<void>;
}
const here = dirname(fileURLToPath(import.meta.url));
/** Works from both `src/db` (tsx) and `dist` (bundled). */
export const migrationsFolder = resolve(here, here.endsWith('dist') ? '../drizzle' : '../../drizzle');
export async function createDb(opts: {
    databaseUrl?: string;
    pgliteDir?: string;
}): Promise<DbHandle> {
    if (opts.databaseUrl) {
        const { Pool } = await import('pg');
        const { drizzle } = await import('drizzle-orm/node-postgres');
        const { migrate } = await import('drizzle-orm/node-postgres/migrator');
        const pool = new Pool({ connectionString: opts.databaseUrl, max: 10 });
        const db = drizzle({ client: pool, schema, casing: 'snake_case' });
        return {
            db: db as unknown as Db,
            kind: 'postgres',
            migrate: () => migrate(db, { migrationsFolder }),
            close: () => pool.end(),
        };
    }
    const { PGlite } = await import('@electric-sql/pglite');
    const { drizzle } = await import('drizzle-orm/pglite');
    const { migrate } = await import('drizzle-orm/pglite/migrator');
    const dir = opts.pgliteDir ?? 'memory://';
    if (!dir.startsWith('memory://'))
        mkdirSync(dir, { recursive: true });
    const client = new PGlite(dir);
    const db = drizzle({ client, schema, casing: 'snake_case' });
    return {
        db: db as unknown as Db,
        kind: 'pglite',
        migrate: () => migrate(db, { migrationsFolder }),
        close: () => client.close(),
    };
}
