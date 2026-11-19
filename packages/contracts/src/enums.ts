export const REQUEST_STATUSES = [
  'submitted',
  'triaged',
  'assigned',
  'in_progress',
  'waiting_for_citizen',
  'resolved',
  'closed',
  'rejected',
  'reopened',
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

/** Statuses that count as "open" (still in an organization's queue). */
export const OPEN_STATUSES: readonly RequestStatus[] = [
  'submitted',
  'triaged',
  'assigned',
  'in_progress',
  'waiting_for_citizen',
  'reopened',
];

export const SERVICE_STATUSES = [
  'active_demo',
  'active_integrated',
  'informational',
  'coming_soon',
  'disabled',
] as const;
export type ServiceStatus = (typeof SERVICE_STATUSES)[number];

/** Service statuses that accept new requests. */
export const SUBMITTABLE_SERVICE_STATUSES: readonly ServiceStatus[] = ['active_demo', 'active_integrated'];

export const WORKFLOWS = ['city_report', 'admin_request', 'emergency', 'info'] as const;
export type Workflow = (typeof WORKFLOWS)[number];

export const PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const ORG_ROLES = ['org_operator', 'org_dispatcher', 'org_manager'] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

export const PLATFORM_ROLES = ['platform_admin', 'content_editor', 'support_agent'] as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export const COMMENT_VISIBILITY = ['public', 'internal'] as const;
export type CommentVisibility = (typeof COMMENT_VISIBILITY)[number];

export const NOTIFICATION_TYPES = [
  'request_submitted',
  'status_changed',
  'staff_reply',
  'request_transferred',
  'announcement',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const ANNOUNCEMENT_IMPORTANCE = ['normal', 'important'] as const;
export type AnnouncementImportance = (typeof ANNOUNCEMENT_IMPORTANCE)[number];

export const FEEDBACK_KINDS = ['bug', 'idea', 'question', 'other'] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];
