import type { Db } from '../db/client';
import { auditLogs } from '../db/schema';
export interface AuditEntry {
    actorId: string | null;
    organizationId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    metadata?: Record<string, unknown>;
}
/** Append-only audit trail. Call inside the same transaction as the change it records. */
export async function audit(db: Db, entry: AuditEntry) {
    await db.insert(auditLogs).values({
        actorId: entry.actorId,
        organizationId: entry.organizationId ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        metadata: entry.metadata ?? null,
    });
}
