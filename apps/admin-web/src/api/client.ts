const API_BASE = '/v1';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const errorMsg = data?.error?.message || data?.message || 'خطا در برقراری ارتباط با سرور کارتابل سازمانی';
    throw new Error(errorMsg);
  }

  return data as T;
}

export interface StaffMe {
  userId: string;
  mobile: string;
  displayName: string;
  platformRole?: 'platform_admin' | 'content_editor' | 'support_agent';
  memberships: Array<{
    organizationId: string;
    orgCode: string;
    orgName: string;
    role: 'org_operator' | 'org_dispatcher' | 'org_manager';
  }>;
}

export interface AdminRequestSummary {
  id: string;
  trackingCode: string;
  title: string;
  serviceSlug: string;
  serviceTitle: string;
  organizationName: string;
  status: string;
  priority: string;
  description: string;
  address?: string;
  dueAt: string | null;
  overdue: boolean;
  citizenMobile: string;
  citizenName?: string;
  assigneeId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminRequestDetail {
  id: string;
  trackingCode: string;
  title: string;
  serviceSlug: string;
  serviceTitle: string;
  organizationId: string;
  organizationName: string;
  citizenMobile: string;
  citizenName?: string;
  status: string;
  priority: string;
  description: string;
  formEntries?: Array<{ label: string; value: string }>;
  lat?: number;
  lng?: number;
  address?: string;
  neighborhood?: string;
  satisfactionScore?: number;
  satisfactionComment?: string;
  assigneeId?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  closedAt?: string;
  allowedTransitions: string[];
  permissions: {
    canTransfer: boolean;
    canAssign: boolean;
    canComment: boolean;
    canChangeStatus: boolean;
  };
  history: Array<{
    id: string;
    fromStatus?: string;
    toStatus: string;
    actorKind: string;
    reason?: string;
    createdAt: string;
  }>;
  comments: Array<{
    id: string;
    body: string;
    visibility: 'internal' | 'public_to_citizen';
    authorName: string;
    createdAt: string;
  }>;
  attachments: Array<{
    id: string;
    mimeType: string;
    sizeBytes: number;
    url: string;
  }>;
}

export interface DashboardKPIs {
  total: number;
  submitted: number;
  triaged: number;
  inProgress: number;
  waitingForCitizen: number;
  resolved: number;
  closed: number;
}

export const adminApi = {
  // Staff Auth
  requestOtp: async (mobile: string) => {
    return request<{
      ok: boolean;
      expiresInSec: number;
      resendInSec: number;
      devCode?: string;
    }>('/admin/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify({ mobile }),
    });
  },

  verifyOtp: async (mobile: string, code: string) => {
    return request<StaffMe>('/admin/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ mobile, code }),
    });
  },

  getMe: async () => {
    return request<StaffMe>('/admin/me');
  },

  logout: async () => {
    return request<{ ok: boolean }>('/admin/auth/logout', { method: 'POST' });
  },

  // Dashboard KPIs
  getDashboard: async () => {
    return request<{ data: DashboardKPIs }>('/admin/dashboard');
  },

  // Requests Cartable
  getRequests: async (params: {
    status?: string;
    priority?: string;
    assignee?: 'me' | 'unassigned' | 'all';
    organizationId?: string;
    q?: string;
    limit?: number;
    cursor?: string;
  } = {}) => {
    const qp = new URLSearchParams();
    if (params.status && params.status !== 'all') qp.append('status', params.status);
    if (params.priority && params.priority !== 'all') qp.append('priority', params.priority);
    if (params.assignee && params.assignee !== 'all') qp.append('assignee', params.assignee);
    if (params.organizationId && params.organizationId !== 'all') qp.append('organizationId', params.organizationId);
    if (params.q) qp.append('q', params.q);
    if (params.limit) qp.append('limit', params.limit.toString());
    if (params.cursor) qp.append('cursor', params.cursor);

    return request<{
      data: AdminRequestSummary[];
      meta: { nextCursor: string | null; limit: number };
    }>(`/admin/requests?${qp.toString()}`);
  },

  getRequestDetail: async (id: string) => {
    return request<{ data: AdminRequestDetail }>(`/admin/requests/${id}`);
  },

  // Status Change
  changeStatus: async (id: string, payload: { status: string; reason?: string; note?: string }) => {
    return request<{ data: { success: boolean; status: string } }>(`/admin/requests/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  // Assign
  assignRequest: async (id: string, payload: { assigneeId: string; note?: string }) => {
    return request<{ data: { success: boolean; assigneeId: string } }>(`/admin/requests/${id}/assign`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  // Transfer Inter-organization
  transferRequest: async (id: string, payload: { targetOrgId: string; reason: string }) => {
    return request<{ data: { success: boolean } }>(`/admin/requests/${id}/transfer`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  // Add Comment (Internal / Public)
  addComment: async (id: string, payload: { body: string; visibility: 'internal' | 'public_to_citizen' }) => {
    return request<{ data: any }>(`/admin/requests/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Members for assignment
  getOrgMembers: async (organizationId: string) => {
    return request<{
      data: Array<{ userId: string; name: string; mobile: string; role: string }>;
    }>(`/admin/members?organizationId=${organizationId}`);
  },

  // Organizations
  getOrganizations: async () => {
    return request<{
      data: Array<{ id: string; code: string; name: string; shortName: string; isDemo: boolean }>;
    }>('/organizations');
  },

  // Services
  getServices: async () => {
    return request<{ data: any[] }>('/admin/services');
  },

  // Announcements
  getAnnouncements: async () => {
    return request<{ data: any[] }>('/admin/announcements');
  },

  createAnnouncement: async (payload: any) => {
    return request<{ data: any }>('/admin/announcements', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
