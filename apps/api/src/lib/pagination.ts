import { and, desc, eq, lt, or, type SQL } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import { badRequest } from './errors';
/** Opaque keyset cursor over (createdAt DESC, id DESC). */
export function encodeCursor(createdAt: Date, id: string): string {
    return Buffer.from(`${createdAt.toISOString()}|${id}`).toString('base64url');
}
export function decodeCursor(cursor: string): {
    createdAt: Date;
    id: string;
} {
    const [iso, id] = Buffer.from(cursor, 'base64url').toString().split('|');
    const createdAt = new Date(iso ?? '');
    if (!id || Number.isNaN(createdAt.getTime()) || !/^[0-9a-f-]{36}$/.test(id)) {
        throw badRequest('INVALID_CURSOR', 'نشانگر صفحه نامعتبر است.');
    }
    return { createdAt, id };
}
export function cursorWhere(cursor: string | undefined, createdAtCol: PgColumn, idCol: PgColumn): SQL | undefined {
    if (!cursor)
        return undefined;
    const c = decodeCursor(cursor);
    return or(lt(createdAtCol, c.createdAt), and(eq(createdAtCol, c.createdAt), lt(idCol, c.id)));
}
export const newestFirst = (createdAtCol: PgColumn, idCol: PgColumn) => [desc(createdAtCol), desc(idCol)];
/** Fetch limit+1 rows, then call this to build the page. */
export function toPage<T extends {
    createdAt: Date;
    id: string;
}, R>(rows: T[], limit: number, map: (row: T) => R) {
    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    const last = slice[slice.length - 1];
    return {
        items: slice.map(map),
        nextCursor: hasMore && last ? encodeCursor(last.createdAt, last.id) : null,
    };
}
