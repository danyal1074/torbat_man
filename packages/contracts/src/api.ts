import { z } from 'zod';
import {
  ANNOUNCEMENT_IMPORTANCE,
  COMMENT_VISIBILITY,
  FEEDBACK_KINDS,
  PRIORITIES,
  REQUEST_STATUSES,
  SERVICE_STATUSES,
  type AnnouncementImportance,
  type CommentVisibility,
  type NotificationType,
  type OrgRole,
  type PlatformRole,
  type Priority,
  type RequestStatus,
  type ServiceStatus,
  type Workflow,
} from './enums';
import type { ServiceForm } from './forms';

/* ───────────── Inputs (validated on the server, reused by clients) ───────────── */

const text = (min: number, max: number, label: string) =>
  z
    .string({ error: `${label} را وارد کنید.` })
    .trim()
    .min(min, `${label} حداقل ${min} نویسه باشد.`)
    .max(max, `${label} حداکثر ${max} نویسه باشد.`);

export const requestOtpBody = z.object({ mobile: z.string().min(10).max(20) });
export const verifyOtpBody = z.object({
  mobile: z.string().min(10).max(20),
  code: z.string().min(4).max(8),
});

export const updateProfileBody = z.object({ displayName: text(2, 60, 'نام') });

export const locationInput = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().trim().max(300).optional(),
  neighborhood: z.string().trim().max(100).optional(),
});

export const createRequestBody = z.object({
  serviceSlug: z.string().min(2).max(80),
  description: text(10, 2000, 'توضیح'),
  title: z.string().trim().max(120).optional(),
  formData: z.record(z.string(), z.unknown()).optional(),
  location: locationInput.optional(),
  /** Free-text address when the user does not share coordinates. */
  addressText: z.string().trim().max(300).optional(),
  attachmentIds: z.array(z.uuid()).max(3).default([]),
  aiAnalysisId: z.uuid().optional(),
});
export type CreateRequestInput = z.infer<typeof createRequestBody>;

export const commentBody = z.object({ body: text(1, 2000, 'پیام') });
export const reopenBody = z.object({ reason: text(5, 500, 'دلیل') });
export const rateBody = z.object({
  score: z.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional(),
});

export const triageBody = z.object({ text: text(3, 2000, 'متن') });
export const assistantBody = z.object({ message: text(2, 500, 'پیام') });

export const duplicateCheckBody = z.object({
  serviceSlug: z.string().min(2).max(80),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  description: z.string().max(2000).default(''),
});

export const paginationQuery = z.object({
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const myRequestsQuery = paginationQuery.extend({
  status: z.enum(['open', 'done', 'all']).default('all'),
  q: z.string().trim().max(100).optional(),
  organizationId: z.uuid().optional(),
});

/* ─── Admin ─── */
export const adminRequestsQuery = paginationQuery.extend({
  status: z.enum([...REQUEST_STATUSES, 'open']).optional(),
  serviceId: z.uuid().optional(),
  priority: z.enum(PRIORITIES).optional(),
  assignee: z.enum(['me', 'unassigned', 'any']).default('any'),
  overdue: z.enum(['true','false']).transform(v=>v==='true').optional(),
  organizationId: z.uuid().optional(),
  neighborhood: z.string().trim().max(100).optional(),
  q: z.string().trim().max(100).optional(),
});

export const adminAssignBody = z.object({ assigneeId: z.uuid().nullable() });
export const adminTransferBody = z.object({
  organizationId: z.uuid(),
  reason: text(5, 500, 'دلیل انتقال'),
});
export const adminStatusBody = z.object({
  status: z.enum(REQUEST_STATUSES),
  reason: z.string().trim().max(1000).optional(),
});
export const adminPriorityBody = z.object({ priority: z.enum(PRIORITIES) });
export const adminCommentBody = z.object({
  body: text(1, 2000, 'متن'),
  visibility: z.enum(COMMENT_VISIBILITY),
});
export const adminServiceUpdateBody = z.object({
  status: z.enum(SERVICE_STATUSES).optional(),
  slaHours: z.number().int().min(1).max(24 * 90).nullable().optional(),
  isFeatured: z.boolean().optional(),
});
export const announcementBody = z.object({
  title: text(5, 140, 'عنوان'),
  body: text(10, 4000, 'متن'),
  sourceName: text(2, 120, 'منبع'),
  sourceUrl: z.url().max(500).optional().or(z.literal('').transform(() => undefined)),
  importance: z.enum(ANNOUNCEMENT_IMPORTANCE).default('normal'),
  expiresAt: z.iso.datetime().optional(),
  organizationId: z.uuid().optional(),
  isDemo: z.boolean().default(true),
});
export const feedbackBody = z.object({
  kind: z.enum(FEEDBACK_KINDS),
  message: text(5, 2000, 'متن'),
});

/* ───────────── DTOs (API responses) ───────────── */

export interface ErrorBody {
  error: { code: string; message: string; correlationId?: string; fields?: Record<string, string> };
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface MeDTO {
  id: string;
  mobile: string;
  displayName: string | null;
  createdAt: string;
}

export interface StaffMeDTO extends MeDTO {
  platformRole: PlatformRole | null;
  memberships: { organizationId: string; organizationName: string; organizationCode: string; role: OrgRole }[];
}

export interface OtpRequestedDTO {
  ok: true;
  expiresInSec: number;
  resendInSec: number;
  /** Present only in non-production environments with OTP_DEV_ECHO enabled. */
  devCode?: string;
}

export interface OrganizationDTO {
  id: string;
  code: string;
  name: string;
  shortName: string;
  isDemo: boolean;
  status: 'active' | 'pending_integration' | 'disabled';
  description: string | null;
}

export interface CategoryDTO {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  icon: string;
  sortOrder: number;
}

export interface ServiceDTO {
  id: string;
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  icon: string;
  categorySlug: string;
  status: ServiceStatus;
  workflow: Workflow;
  organization: Pick<OrganizationDTO, 'id' | 'code' | 'name' | 'shortName' | 'isDemo'> | null;
  requirements: string[];
  steps: string[];
  keywords: string[];
  form: ServiceForm | null;
  isFeatured: boolean;
  integrationNote: string | null;
  feesVerified: boolean;
  supportContactVerified: boolean;
  lastVerifiedAt: string | null;
  slaHours: number | null;
  sortOrder: number;
}

export interface CatalogDTO {
  categories: CategoryDTO[];
  services: ServiceDTO[];
  organizations: OrganizationDTO[];
}

export interface AttachmentDTO {
  id: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
}

export interface RequestSummaryDTO {
  id: string;
  trackingCode: string;
  title: string;
  status: RequestStatus;
  workflow: Workflow;
  service: { slug: string; title: string; icon: string };
  organization: { id: string; name: string; shortName: string } | null;
  createdAt: string;
  updatedAt: string;
}

export type TimelineEntryDTO =
  | {
      id: string;
      kind: 'status';
      at: string;
      from: RequestStatus | null;
      to: RequestStatus;
      reason: string | null;
      actor: 'citizen' | 'staff' | 'system';
    }
  | {
      id: string;
      kind: 'comment';
      at: string;
      body: string;
      author: 'citizen' | 'staff';
      authorName: string | null;
      visibility: CommentVisibility;
    }
  | {
      id: string;
      kind: 'transfer';
      at: string;
      fromOrganization: string | null;
      toOrganization: string;
      reason: string | null;
    };

export interface RequestDetailDTO extends RequestSummaryDTO {
  description: string;
  formEntries: { label: string; value: string }[];
  location: { lat: number; lng: number; address: string | null; neighborhood: string | null } | null;
  addressText: string | null;
  attachments: AttachmentDTO[];
  timeline: TimelineEntryDTO[];
  rating: { score: number; comment: string | null } | null;
  dueAt: string | null;
  actions: { canComment: boolean; canReopen: boolean; canRate: boolean };
}

export interface NotificationDTO {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  entityType: 'request' | 'announcement' | null;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface AnnouncementDTO {
  id: string;
  title: string;
  body: string;
  sourceName: string;
  sourceUrl: string | null;
  importance: AnnouncementImportance;
  isDemo: boolean;
  organization: { id: string; name: string } | null;
  publishedAt: string;
  expiresAt: string | null;
}

export interface TriageResultDTO {
  analysisId: string | null;
  provider: 'rules' | 'anthropic';
  serviceSlug: string | null;
  title: string | null;
  summary: string | null;
  confidence: number;
  requiresConfirmation: boolean;
  safetyFlags: ('gas_leak' | 'electrical_hazard' | 'life_threat')[];
  alternatives: { serviceSlug: string; confidence: number }[];
}

export interface AssistantReplyDTO {
  provider: 'rules' | 'anthropic';
  reply: string;
  suggestions: { serviceSlug: string; confidence: number }[];
  safetyFlags: TriageResultDTO['safetyFlags'];
  grounded: boolean;
}

export interface DuplicateCandidateDTO {
  id: string;
  title: string;
  status: RequestStatus;
  distanceMeters: number;
  createdAt: string;
  similarity: number;
}

export interface PublicConfigDTO {
  city: { id: string; name: string; province: string };
  environment: 'development' | 'demo' | 'production';
  features: Record<string, boolean>;
  ai: { provider: 'rules' | 'anthropic' };
  map: { center: [number, number]; zoom: number };
  emergencyContacts: { label: string; number: string; note: string }[];
}

/* ─── Admin DTOs ─── */

export interface AdminRequestRowDTO extends RequestSummaryDTO {
  priority: Priority;
  assignee: { id: string; name: string } | null;
  dueAt: string | null;
  overdue: boolean;
  neighborhood: string | null;
  hasAttachments: boolean;
}

export interface AdminRequestDetailDTO extends AdminRequestRowDTO {
  description: string;
  formEntries: { label: string; value: string }[];
  location: RequestDetailDTO['location'];
  addressText: string | null;
  citizen: { name: string | null; mobileMasked: string };
  attachments: AttachmentDTO[];
  timeline: (TimelineEntryDTO & { actorName?: string | null })[];
  rating: RequestDetailDTO['rating'];
  ai: { provider: string; serviceSlug: string | null; confidence: number } | null;
  duplicates: { id: string; trackingCode: string; title: string; status: RequestStatus; score: number }[];
  allowedTransitions: RequestStatus[];
  permissions: { canAssign: boolean; canTransfer: boolean; canChangeStatus: boolean; canComment: boolean };
}

export interface AdminDashboardDTO {
  totals: { new: number; inProgress: number; waiting: number; resolved: number; closed: number; overdue: number };
  avgFirstResponseHours: number | null;
  avgResolutionHours: number | null;
  satisfaction: { average: number | null; count: number };
  byService: { serviceTitle: string; count: number }[];
  last7Days: { date: string; created: number; resolved: number }[];
}

export interface MemberDTO {
  id: string;
  userId: string;
  name: string | null;
  mobileMasked: string;
  role: OrgRole;
  organizationId: string;
  organizationName: string;
}

export interface AuditLogDTO {
  id: string;
  action: string;
  actorName: string | null;
  organizationName: string | null;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}
