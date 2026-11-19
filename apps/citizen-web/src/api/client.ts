import type { ServiceDTO, CategoryDTO, OrganizationDTO, MeDTO, CreateRequestInput } from '@torbat/contracts';
import type { RecordRow } from '../lib';
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
        const errorMsg = data?.error?.message || 'خطا در برقراری ارتباط با سرور';
        throw new Error(errorMsg);
    }
    return data as T;
}
export const api = {
    // Services & Catalog
    getServices: async () => request<{
        data: ServiceDTO[];
    }>('/services'),
    getCategories: async () => request<{
        data: CategoryDTO[];
    }>('/services/categories'),
    getOrganizations: async () => request<{
        data: OrganizationDTO[];
    }>('/organizations'),
    getServiceBySlug: async (slug: string) => request<{
        data: ServiceDTO;
    }>(`/services/${slug}`),
    getFeatureFlags: async () => request<{
        data: Record<string, boolean>;
    }>('/feature-flags'),
    // Requests
    createRequest: async (payload: CreateRequestInput, idempotencyKey?: string) => {
        return request<{
            data: {
                id: string;
                trackingCode: string;
                title: string;
                status: string;
            };
        }>('/requests', {
            method: 'POST',
            headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
            body: JSON.stringify(payload),
        });
    },
    getMyRequests: async (status: 'open' | 'done' | 'all' = 'all') => {
        return request<{
            data: RecordRow[];
        }>(`/requests?status=${status}`);
    },
    getRequestDetail: async (id: string) => request<{
        data: RecordRow;
    }>(`/requests/${id}`),
    trackRequest: async (code: string) => request<{
        data: RecordRow;
    }>(`/tracking/${code}`),
    addComment: async (requestId: string, body: string) => {
        return request<{
            data: RecordRow;
        }>(`/requests/${requestId}/comments`, {
            method: 'POST',
            body: JSON.stringify({ body }),
        });
    },
    reopenRequest: async (requestId: string, reason: string) => {
        return request<{
            data: unknown;
        }>(`/requests/${requestId}/reopen`, {
            method: 'POST',
            body: JSON.stringify({ reason }),
        });
    },
    rateRequest: async (requestId: string, score: number, comment?: string) => {
        return request<{
            data: unknown;
        }>(`/requests/${requestId}/rate`, {
            method: 'POST',
            body: JSON.stringify({ score, comment }),
        });
    },
    // AI
    aiTriage: async (text: string) => {
        return request<{
            data: {
                title: string;
                summary: string;
                categoryId?: string;
                organizationId?: string;
                serviceSlug?: string;
                confidence: number;
                needsConfirmation: boolean;
            };
        }>('/ai/triage', {
            method: 'POST',
            body: JSON.stringify({ text }),
        });
    },
    aiAssistant: async (message: string) => {
        return request<{
            data: {
                reply: string;
                suggestedServices: Array<{
                    slug: string;
                    title: string;
                }>;
                confidence: number;
            };
        }>('/ai/assistant', {
            method: 'POST',
            body: JSON.stringify({ message }),
        });
    },
    aiDuplicateCheck: async (payload: {
        serviceSlug: string;
        lat: number;
        lng: number;
        description: string;
    }) => {
        return request<{
            data: {
                duplicates: {id:string;title:string;status:string;distanceMeters:number}[];
            };
        }>('/ai/duplicate-check', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },
    // Announcements & Notifications
    getAnnouncements: async () => request<{
        data: unknown[];
    }>('/announcements'),
    getNotifications: async () => request<{
        data: unknown[];
        meta: {
            unreadCount: number;
        };
    }>('/notifications'),
    markNotificationRead: async (id: string) => {
        return request<{
            data: unknown;
        }>(`/notifications/${id}/read`, { method: 'PATCH' });
    },
    markAllNotificationsRead: async () => {
        return request<{
            data: unknown;
        }>('/notifications/read-all', { method: 'PATCH' });
    },
    // Map & Places
    getPlaces: async () => request<{
        data: unknown[];
    }>('/map/places'),
    // Auth
    requestOtp: async (mobile: string) => {
        return request<{
            ok: boolean;
            expiresInSec: number;
            resendInSec: number;
            devCode?: string;
        }>('/auth/request-otp', {
            method: 'POST',
            body: JSON.stringify({ mobile }),
        });
    },
    verifyOtp: async (mobile: string, code: string) => {
        return request<{
            user: MeDTO;
            isNew: boolean;
        }>('/auth/verify-otp', {
            method: 'POST',
            body: JSON.stringify({ mobile, code }),
        });
    },
    getMe: async () => request<import('@torbat/contracts').MeDTO>('/me'),
    logout: async () => request<{
        ok: boolean;
    }>('/auth/logout', { method: 'POST' }),
    // File Upload
    uploadFile: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${API_BASE}/uploads`, {
            method: 'POST',
            credentials: 'include',
            body: formData,
        });
        const data = await res.json();
        if (!res.ok)
            throw new Error(data?.error?.message || 'خطا در بارگذاری فایل');
        return data;
    },
};
