import { useSyncExternalStore } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { api, json } from '../lib/backend';
import { useUser } from '../state/session';
import type { RecordRow } from '../../lib';
import type { LucideIcon } from 'lucide-react';
import { Route, Lightbulb, Trash2, Trees, Cog, Droplets, MoreHorizontal } from 'lucide-react';

export interface ProblemType { id: string; title: string; icon: LucideIcon }
export const problemTypes: ProblemType[] = [
  { id: 'roads', title: 'آسفالت و معابر', icon: Route },
  { id: 'lighting', title: 'روشنایی', icon: Lightbulb },
  { id: 'waste', title: 'زباله و نظافت', icon: Trash2 },
  { id: 'green', title: 'فضای سبز', icon: Trees },
  { id: 'equipment', title: 'خرابی تجهیزات شهری', icon: Cog },
  { id: 'flood', title: 'آب‌گرفتگی', icon: Droplets },
  { id: 'other', title: 'سایر مشکلات', icon: MoreHorizontal },
];

export type ReportStatus = 'submitted' | 'review' | 'progress' | 'done' | 'rejected';
export const statusMeta: Record<ReportStatus, { label: string; tone: 'info' | 'warn' | 'ok' | 'bad' }> = {
  submitted: { label: 'ثبت‌شده', tone: 'info' },
  review: { label: 'در حال بررسی', tone: 'warn' },
  progress: { label: 'در حال رسیدگی', tone: 'warn' },
  done: { label: 'انجام‌شده', tone: 'ok' },
  rejected: { label: 'ردشده', tone: 'bad' },
};

export interface GeoPoint { lat: number; lon: number }
export type CaseKind = 'report' | 'office' | 'order' | 'apply';
export const kindLabel: Record<CaseKind, string> = { report: 'گزارش شهری', office: 'درخواست اداری', order: 'سفارش', apply: 'درخواست شغلی' };
export interface Message { from: 'org' | 'user'; text: string; at: number }
export interface Report {
  id: string; code: string; kind: CaseKind; title: string; typeId: string; description: string; point: GeoPoint | null; landmark: string;
  photoNames: string[]; status: ReportStatus; createdAt: number; demo: true; orgName: string;
  attachments: { id: string; url: string }[]; history: { id: string; toStatus: string; createdAt: string; reason?: string }[]; rawStatus: string;
  messages: Message[]; needsDocs: boolean; docNames: string[]; rating: number | null; owner: string;
}
export interface Draft { typeId: string | null; description: string; point: GeoPoint | null; landmark: string; photos: File[] }
export const ORG_BY_TYPE: Record<string, string> = {
  roads: 'معاونت فنی و عمرانی شهرداری', lighting: 'سازمان برق و روشنایی', waste: 'سازمان مدیریت پسماند', green: 'سازمان سیما و منظر شهری',
  equipment: 'معاونت خدمات شهری', flood: 'شرکت آب و فاضلاب', other: 'مرکز ارتباطات مردمی ۱۳۷',
};
export const emptyDraft = (): Draft => ({ typeId: null, description: '', point: null, landmark: '', photos: [] });

/** City centre used by the placeholder map (Torbat-e Heydarieh). */
export const CITY_CENTER: GeoPoint = { lat: 35.274, lon: 59.219 };
export const MAP_SPAN = 0.03;
export const MAX_PHOTOS = 3;
export const MAX_PHOTO_MB = 5;
export const MAX_DESC = 200;
export const MIN_DESC = 10;

export interface DraftErrors { typeId?: string; description?: string; point?: string; photos?: string }
export function validateInfo(d: Draft): DraftErrors {
  const e: DraftErrors = {};
  if (!d.typeId) e.typeId = 'نوع مشکل را انتخاب کنید.';
  const len = d.description.trim().length;
  if (len < MIN_DESC) e.description = `توضیحات باید حداقل ${faDigits(MIN_DESC)} نویسه باشد.`;
  if (len > MAX_DESC) e.description = `توضیحات حداکثر ${faDigits(MAX_DESC)} نویسه است.`;
  return e;
}
export function validateLocation(d: Draft): DraftErrors {
  return d.point || d.landmark.trim().length >= 3 ? {} : { point: 'روی نقشه نقطه‌ای بزنید یا نشانی را دستی وارد کنید.' };
}
export function validatePhoto(f: File): string | null {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) return 'فقط تصاویر JPEG، PNG و WebP قابل ارسال‌اند.';
  if (f.size > MAX_PHOTO_MB * 1024 * 1024) return `حجم هر تصویر حداکثر ${faDigits(MAX_PHOTO_MB)} مگابایت است.`;
  return null;
}

export const DEMO_USER = 'current';
const serviceByType: Record<string, string> = {
  roads: 'report-road', lighting: 'report-lighting', waste: 'report-waste',
  green: 'report-green', equipment: 'report-furniture', flood: 'report-other', other: 'report-other',
};
const statuses: Record<string, ReportStatus> = {
  submitted: 'submitted', triaged: 'review', assigned: 'review', in_progress: 'progress',
  waiting_for_citizen: 'review', reopened: 'review', resolved: 'done', closed: 'done', rejected: 'rejected',
};
type ServerReport = RecordRow & { serviceSlug?: string; workflow?: string; lat?: number; lng?: number };
type RequestPage = { data: ServerReport[]; meta: { nextCursor: string | null } };

function asReport(row: ServerReport): Report {
  const typeId = Object.keys(serviceByType).find(key => serviceByType[key] === row.serviceSlug) ?? 'other';
  const kind = row.workflow === 'admin_request' ? 'office' : 'report';
  const point = Number.isFinite(row.lat) && Number.isFinite(row.lng) ? { lat: row.lat!, lon: row.lng! } : null;
  return {
    id: row.id, code: row.trackingCode, kind, title: row.title, typeId, description: row.description, point,
    landmark: row.address ?? '', photoNames: [], status: statuses[row.status] ?? 'submitted', rawStatus: row.status,
    createdAt: Date.parse(row.createdAt), demo: true, orgName: row.organizationName, owner: DEMO_USER,
    attachments: row.attachments ?? [], history: row.history ?? [],
    messages: (row.comments ?? []).slice().reverse().map(comment => ({
      from: comment.isStaff ? 'org' : 'user', text: comment.body, at: Date.parse(comment.createdAt),
    })),
    needsDocs: row.status === 'waiting_for_citizen', docNames: [], rating: row.satisfactionScore ?? null,
  };
}

export function useReportCollection() {
  const user = useUser();
  return useInfiniteQuery({
    queryKey: ['claude-requests', user?.phone],
    enabled: !!user,
    initialPageParam: '',
    queryFn: async ({ pageParam, signal }) =>
      api<RequestPage>('/requests?limit=50' + (pageParam ? '&cursor=' + encodeURIComponent(pageParam) : ''), { signal }),
    getNextPageParam: page => page.meta.nextCursor ?? undefined,
    select: result => ({ ...result, records: result.pages.flatMap(page => page.data.map(asReport)) }),
  });
}

export function useReports() { return useReportCollection().data?.records ?? []; }

export function useReport(id: string) {
  const user = useUser();
  return useQuery({
    queryKey: ['claude-request', user?.phone, id], enabled: !!user && !!id,
    queryFn: async ({ signal }) => asReport((await api<{ data: ServerReport }>('/requests/' + encodeURIComponent(id), { signal })).data),
  });
}

const pendingUploads = new WeakMap<File, Promise<string>>();
function upload(file: File) {
  const pending = pendingUploads.get(file);
  if (pending) return pending;
  const data = new FormData();
  data.set('file', file);
  const promise = api<{ id: string }>('/uploads', { method: 'POST', body: data }).then(result => result.id);
  pendingUploads.set(file, promise);
  void promise.catch(() => pendingUploads.delete(file));
  return promise;
}

export const reportStore = {
  async submit(draft: Draft, idempotencyKey: string) {
    const serviceSlug = serviceByType[draft.typeId ?? ''];
    if (!serviceSlug) throw new Error('خدمت قابل ثبت نیست.');
    const attachmentIds: string[] = [];
    for (const file of draft.photos) attachmentIds.push(await upload(file));
    const address = draft.landmark.trim() || 'موقعیت ثبت‌شده روی نقشه';
    const options = json({
      serviceSlug, description: draft.description.trim(), addressText: address, attachmentIds,
      ...(draft.point ? { location: { lat: draft.point.lat, lng: draft.point.lon, address } } : {}),
    });
    const result = await api<{ data: { id: string; trackingCode: string } }>('/requests', {
      ...options, headers: { 'Idempotency-Key': idempotencyKey },
    });
    return result.data;
  },
  addMessage(id: string, text: string) { return api('/requests/' + id + '/comments', json({ body: text })); },
  rate(id: string, score: number) { return api('/requests/' + id + '/rate', json({ score })); },
  reopen(id: string, reason: string) { return api('/requests/' + id + '/reopen', json({ reason })); },
};
/* ---- Drafts (DEMO, memory only) ---- */
export interface SavedDraft { id: string; typeId: string | null; description: string; landmark: string; point: GeoPoint | null; updatedAt: number }
let drafts: SavedDraft[] = [];
const dl = new Set<() => void>();
export const draftStore = {
  get: () => drafts, subscribe: (l: () => void) => { dl.add(l); return () => dl.delete(l); },
  save(d: Draft, id?: string): string { const i = id ?? `d${Date.now()}`; const e: SavedDraft = { id: i, typeId: d.typeId, description: d.description, landmark: d.landmark, point: d.point, updatedAt: Date.now() };
    drafts = [e, ...drafts.filter((x) => x.id !== i)]; dl.forEach((l) => l()); return i; },
  remove(id: string) { drafts = drafts.filter((x) => x.id !== id); dl.forEach((l) => l()); },
  find: (id: string) => drafts.find((x) => x.id === id),
};
export const useDrafts = () => useSyncExternalStore(draftStore.subscribe, draftStore.get);


export function typeOf(id: string) { return problemTypes.find((p) => p.id === id) ?? problemTypes[problemTypes.length - 1]; }
export const relTime = (t: number) => { const m = Math.max(1, Math.round((Date.now() - t) / 60000)); if (m < 60) return `${faDigits(m)} دقیقه پیش`; const h = Math.round(m / 60); if (h < 24) return `${faDigits(h)} ساعت پیش`; return `${faDigits(Math.round(h / 24))} روز پیش`; };
export function faDigits(s: string | number) { return String(s).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]); }
export const formatDate = (t: number) => new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(t);
export function pointToXY(p: GeoPoint) { return {
  x: Math.min(1, Math.max(0, (p.lon - CITY_CENTER.lon) / MAP_SPAN + 0.5)),
  y: Math.min(1, Math.max(0, 0.5 - (p.lat - CITY_CENTER.lat) / MAP_SPAN)),
}; }
export function xyToPoint(x: number, y: number): GeoPoint { return {
  lon: CITY_CENTER.lon + (x - 0.5) * MAP_SPAN, lat: CITY_CENTER.lat - (y - 0.5) * MAP_SPAN,
}; }
