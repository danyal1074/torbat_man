import { sql } from 'drizzle-orm';
import { boolean, doublePrecision, index, integer, jsonb, pgEnum, pgTable, real, smallint, text, timestamp, uniqueIndex, uuid, type AnyPgColumn, } from 'drizzle-orm/pg-core';
import { ANNOUNCEMENT_IMPORTANCE, COMMENT_VISIBILITY, FEEDBACK_KINDS, NOTIFICATION_TYPES, ORG_ROLES, PLATFORM_ROLES, PRIORITIES, REQUEST_STATUSES, SERVICE_STATUSES, WORKFLOWS, type ServiceForm, } from '@torbat/contracts';
/* ─────────────── enums ─────────────── */
export const requestStatusEnum = pgEnum('request_status', REQUEST_STATUSES);
export const serviceStatusEnum = pgEnum('service_status', SERVICE_STATUSES);
export const workflowEnum = pgEnum('workflow', WORKFLOWS);
export const priorityEnum = pgEnum('priority', PRIORITIES);
export const orgRoleEnum = pgEnum('org_role', ORG_ROLES);
export const platformRoleEnum = pgEnum('platform_role', PLATFORM_ROLES);
export const commentVisibilityEnum = pgEnum('comment_visibility', COMMENT_VISIBILITY);
export const notificationTypeEnum = pgEnum('notification_type', NOTIFICATION_TYPES);
export const announcementImportanceEnum = pgEnum('announcement_importance', ANNOUNCEMENT_IMPORTANCE);
export const feedbackKindEnum = pgEnum('feedback_kind', FEEDBACK_KINDS);
export const actorKindEnum = pgEnum('actor_kind', ['citizen', 'staff', 'system']);
export const sessionKindEnum = pgEnum('session_kind', ['citizen', 'staff']);
// Millisecond precision keeps JS Date round-trips exact (keyset pagination relies on it).
const ts = () => timestamp({ withTimezone: true, mode: 'date', precision: 3 });
const createdAt = () => ts().defaultNow().notNull();
const updatedAt = () => ts()
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date());
/* ─────────────── core ─────────────── */
export const cities = pgTable('cities', {
    id: uuid().primaryKey().defaultRandom(),
    code: text().notNull().unique(),
    name: text().notNull(),
    province: text().notNull(),
    timezone: text().notNull().default('Asia/Tehran'),
    centerLat: doublePrecision().notNull(),
    centerLng: doublePrecision().notNull(),
    status: text().notNull().default('active'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
});
export const users = pgTable('users', {
    id: uuid().primaryKey().defaultRandom(),
    mobile: text().notNull().unique(),
    displayName: text(),
    status: text().notNull().default('active'),
    platformRole: platformRoleEnum(),
    verifiedAt: ts(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: ts(),
});
export const userSessions = pgTable('user_sessions', {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    kind: sessionKindEnum().notNull(),
    tokenHash: text().notNull().unique(),
    deviceInfo: text(),
    expiresAt: ts().notNull(),
    revokedAt: ts(),
    rotatedAt: ts(),
    lastUsedAt: ts(),
    createdAt: createdAt(),
}, (t) => [index().on(t.userId)]);
export const otpChallenges = pgTable('otp_challenges', {
    id: uuid().primaryKey().defaultRandom(),
    mobile: text().notNull(),
    purpose: sessionKindEnum().notNull(),
    codeHash: text().notNull(),
    attempts: integer().notNull().default(0),
    expiresAt: ts().notNull(),
    consumedAt: ts(),
    createdAt: createdAt(),
}, (t) => [index().on(t.mobile, t.createdAt)]);
export const organizations = pgTable('organizations', {
    id: uuid().primaryKey().defaultRandom(),
    cityId: uuid()
        .notNull()
        .references(() => cities.id),
    code: text().notNull().unique(),
    name: text().notNull(),
    shortName: text().notNull(),
    description: text(),
    status: text({ enum: ['active', 'pending_integration', 'disabled'] })
        .notNull()
        .default('active'),
    isDemo: boolean().notNull().default(true),
    verifiedAt: ts(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
});
export const organizationUnits = pgTable('organization_units', {
    id: uuid().primaryKey().defaultRandom(),
    organizationId: uuid()
        .notNull()
        .references(() => organizations.id, { onDelete: 'cascade' }),
    parentId: uuid().references((): AnyPgColumn => organizationUnits.id),
    name: text().notNull(),
    createdAt: createdAt(),
});
export const organizationMembers = pgTable('organization_members', {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    organizationId: uuid()
        .notNull()
        .references(() => organizations.id, { onDelete: 'cascade' }),
    unitId: uuid().references(() => organizationUnits.id),
    role: orgRoleEnum().notNull(),
    status: text({ enum: ['active', 'disabled'] })
        .notNull()
        .default('active'),
    createdAt: createdAt(),
}, (t) => [uniqueIndex().on(t.userId, t.organizationId), index().on(t.organizationId)]);
/* ─────────────── service registry ─────────────── */
export const serviceCategories = pgTable('service_categories', {
    id: uuid().primaryKey().defaultRandom(),
    cityId: uuid()
        .notNull()
        .references(() => cities.id),
    parentId: uuid().references((): AnyPgColumn => serviceCategories.id),
    slug: text().notNull(),
    title: text().notNull(),
    description: text(),
    icon: text().notNull(),
    sortOrder: integer().notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
}, (t) => [uniqueIndex().on(t.cityId, t.slug)]);
export const services = pgTable('services', {
    id: uuid().primaryKey().defaultRandom(),
    cityId: uuid()
        .notNull()
        .references(() => cities.id),
    organizationId: uuid().references(() => organizations.id),
    categoryId: uuid()
        .notNull()
        .references(() => serviceCategories.id),
    slug: text().notNull(),
    title: text().notNull(),
    shortTitle: text().notNull(),
    description: text().notNull(),
    icon: text().notNull(),
    status: serviceStatusEnum().notNull(),
    workflow: workflowEnum().notNull(),
    requirements: jsonb().$type<string[]>().notNull().default([]),
    steps: jsonb().$type<string[]>().notNull().default([]),
    keywords: jsonb().$type<string[]>().notNull().default([]),
    integrationNote: text(),
    isFeatured: boolean().notNull().default(false),
    sortOrder: integer().notNull().default(0),
    slaHours: integer(),
    formSchemaVersion: integer(),
    feesVerified: boolean().notNull().default(false),
    supportContactVerified: boolean().notNull().default(false),
    lastVerifiedAt: ts(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
}, (t) => [uniqueIndex().on(t.cityId, t.slug), index().on(t.organizationId)]);
export const serviceFormSchemas = pgTable('service_form_schemas', {
    id: uuid().primaryKey().defaultRandom(),
    serviceId: uuid()
        .notNull()
        .references(() => services.id, { onDelete: 'cascade' }),
    version: integer().notNull(),
    jsonSchema: jsonb().$type<ServiceForm>().notNull(),
    uiSchema: jsonb(),
    isActive: boolean().notNull().default(true),
    createdAt: createdAt(),
}, (t) => [uniqueIndex().on(t.serviceId, t.version)]);
/* ─────────────── requests ─────────────── */
export const requests = pgTable('requests', {
    id: uuid().primaryKey().defaultRandom(),
    cityId: uuid()
        .notNull()
        .references(() => cities.id),
    citizenId: uuid()
        .notNull()
        .references(() => users.id),
    serviceId: uuid()
        .notNull()
        .references(() => services.id),
    organizationId: uuid().references(() => organizations.id),
    unitId: uuid().references(() => organizationUnits.id),
    assigneeId: uuid().references(() => users.id),
    trackingCode: text().notNull().unique(),
    title: text().notNull(),
    description: text().notNull(),
    formData: jsonb().$type<Record<string, string>>(),
    formSchemaVersion: integer(),
    status: requestStatusEnum().notNull().default('submitted'),
    priority: priorityEnum().notNull().default('normal'),
    lat: doublePrecision(),
    lng: doublePrecision(),
    address: text(),
    neighborhood: text(),
    addressText: text(),
    publicVisibility: boolean().notNull().default(false),
    ratingScore: smallint(),
    ratingComment: text(),
    submittedAt: ts().defaultNow().notNull(),
    firstResponseAt: ts(),
    resolvedAt: ts(),
    closedAt: ts(),
    dueAt: ts(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
}, (t) => [
    index().on(t.organizationId, t.status, t.createdAt),
    index().on(t.citizenId, t.createdAt),
    index().on(t.serviceId, t.createdAt),
    index().on(t.lat, t.lng),
]);
export const requestStatusHistory = pgTable('request_status_history', {
    id: uuid().primaryKey().defaultRandom(),
    requestId: uuid()
        .notNull()
        .references(() => requests.id, { onDelete: 'cascade' }),
    fromStatus: requestStatusEnum(),
    toStatus: requestStatusEnum().notNull(),
    actorId: uuid().references(() => users.id),
    actorKind: actorKindEnum().notNull(),
    reason: text(),
    createdAt: createdAt(),
}, (t) => [index().on(t.requestId, t.createdAt)]);
export const requestAssignments = pgTable('request_assignments', {
    id: uuid().primaryKey().defaultRandom(),
    requestId: uuid()
        .notNull()
        .references(() => requests.id, { onDelete: 'cascade' }),
    kind: text({ enum: ['assign', 'transfer'] }).notNull(),
    fromOrgId: uuid().references(() => organizations.id),
    toOrgId: uuid().references(() => organizations.id),
    fromAssigneeId: uuid().references(() => users.id),
    toAssigneeId: uuid().references(() => users.id),
    actorId: uuid().references(() => users.id),
    reason: text(),
    createdAt: createdAt(),
}, (t) => [index().on(t.requestId, t.createdAt)]);
export const requestComments = pgTable('request_comments', {
    id: uuid().primaryKey().defaultRandom(),
    requestId: uuid()
        .notNull()
        .references(() => requests.id, { onDelete: 'cascade' }),
    authorId: uuid().references(() => users.id),
    authorKind: actorKindEnum().notNull(),
    body: text().notNull(),
    visibility: commentVisibilityEnum().notNull(),
    createdAt: createdAt(),
}, (t) => [index().on(t.requestId, t.createdAt)]);
export const attachments = pgTable('attachments', {
    id: uuid().primaryKey().defaultRandom(),
    ownerId: uuid()
        .notNull()
        .references(() => users.id),
    requestId: uuid().references(() => requests.id, { onDelete: 'set null' }),
    kind: text({ enum: ['citizen', 'staff_result'] })
        .notNull()
        .default('citizen'),
    objectKey: text().notNull().unique(),
    mimeType: text().notNull(),
    sizeBytes: integer().notNull(),
    checksum: text().notNull(),
    visibility: text({ enum: ['private'] })
        .notNull()
        .default('private'),
    scanStatus: text({ enum: ['not_scanned', 'clean', 'infected'] })
        .notNull()
        .default('not_scanned'),
    createdAt: createdAt(),
}, (t) => [index().on(t.requestId), index().on(t.ownerId)]);
export const notifications = pgTable('notifications', {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    type: notificationTypeEnum().notNull(),
    title: text().notNull(),
    body: text().notNull(),
    entityType: text({ enum: ['request', 'announcement'] }),
    entityId: uuid(),
    readAt: ts(),
    createdAt: createdAt(),
}, (t) => [index().on(t.userId, t.createdAt)]);
export const aiAnalyses = pgTable('ai_analyses', {
    id: uuid().primaryKey().defaultRandom(),
    requestId: uuid().references(() => requests.id, { onDelete: 'set null' }),
    userId: uuid().references(() => users.id),
    provider: text().notNull(),
    modelVersion: text().notNull(),
    inputType: text().notNull().default('text'),
    predictionJson: jsonb().notNull(),
    confidence: real().notNull(),
    latencyMs: integer(),
    reviewedBy: uuid().references(() => users.id),
    createdAt: createdAt(),
});
export const duplicateCandidates = pgTable('duplicate_candidates', {
    id: uuid().primaryKey().defaultRandom(),
    requestId: uuid()
        .notNull()
        .references(() => requests.id, { onDelete: 'cascade' }),
    candidateRequestId: uuid()
        .notNull()
        .references(() => requests.id, { onDelete: 'cascade' }),
    score: real().notNull(),
    reviewStatus: text({ enum: ['pending', 'confirmed', 'dismissed'] })
        .notNull()
        .default('pending'),
    createdAt: createdAt(),
}, (t) => [index().on(t.requestId)]);
export const idempotencyKeys = pgTable('idempotency_keys', {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    key: text().notNull(),
    scope: text().notNull(),
    resourceId: uuid(),
    createdAt: createdAt(),
}, (t) => [uniqueIndex().on(t.userId, t.scope, t.key)]);
export const auditLogs = pgTable('audit_logs', {
    id: uuid().primaryKey().defaultRandom(),
    actorId: uuid().references(() => users.id),
    organizationId: uuid().references(() => organizations.id),
    action: text().notNull(),
    entityType: text().notNull(),
    entityId: uuid(),
    metadata: jsonb().$type<Record<string, unknown>>(),
    createdAt: createdAt(),
}, (t) => [index().on(t.createdAt), index().on(t.entityType, t.entityId)]);
export const featureFlags = pgTable('feature_flags', {
    id: uuid().primaryKey().defaultRandom(),
    cityId: uuid()
        .notNull()
        .references(() => cities.id),
    organizationId: uuid().references(() => organizations.id),
    key: text().notNull(),
    enabled: boolean().notNull().default(false),
    configJson: jsonb(),
    updatedAt: updatedAt(),
}, (t) => [uniqueIndex().on(t.cityId, t.key).where(sql `${t.organizationId} is null`)]);
/* ─────────────── content ─────────────── */
export const announcements = pgTable('announcements', {
    id: uuid().primaryKey().defaultRandom(),
    cityId: uuid()
        .notNull()
        .references(() => cities.id),
    organizationId: uuid().references(() => organizations.id),
    title: text().notNull(),
    body: text().notNull(),
    sourceName: text().notNull(),
    sourceUrl: text(),
    importance: announcementImportanceEnum().notNull().default('normal'),
    isDemo: boolean().notNull().default(true),
    status: text({ enum: ['published', 'archived'] })
        .notNull()
        .default('published'),
    publishedAt: ts().defaultNow().notNull(),
    expiresAt: ts(),
    createdBy: uuid().references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
}, (t) => [index().on(t.cityId, t.status, t.publishedAt)]);
export const feedback = pgTable('feedback', {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid().references(() => users.id, { onDelete: 'set null' }),
    kind: feedbackKindEnum().notNull(),
    message: text().notNull(),
    status: text({ enum: ['new', 'seen'] })
        .notNull()
        .default('new'),
    createdAt: createdAt(),
});
