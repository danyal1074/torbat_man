import { type ReactNode } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, Construction, Lamp, Lightbulb, Gauge, Waves, Wallet, Megaphone, Landmark, Bus, Wifi, Flame, Wheat, Map, CalendarDays, Users, Droplets, Zap, TreePine, Trash2, Building2, FileText, MapPin, Camera, type LucideIcon } from 'lucide-react';
import type { ServiceDTO, StaffMeDTO, RequestStatus } from '@torbat/contracts';
export const statusLabels: Record<string, string> = { submitted: 'ثبت شد', triaged: 'در حال بررسی', assigned: 'ارجاع به کارشناس', in_progress: 'در دست اقدام', waiting_for_citizen: 'منتظر پاسخ شما', resolved: 'رسیدگی شد', closed: 'بسته شد', rejected: 'رد شد', reopened: 'بازگشایی شد' };
export const serviceStatus: Record<string, string> = { active_demo: 'آزمایشی', active_integrated: 'متصل', informational: 'راهنما', coming_soon: 'به‌زودی', disabled: 'غیرفعال' };
const icons: Record<string, LucideIcon> = { 'construction': Construction, 'lamp': Lamp, 'lightbulb': Lightbulb, 'gauge': Gauge, 'waves': Waves, 'wallet': Wallet, 'megaphone': Megaphone, 'landmark': Landmark, 'bus': Bus, 'wifi': Wifi, 'flame': Flame, 'wheat': Wheat, 'map': Map, 'calendar-days': CalendarDays, 'users': Users, 'droplet': Droplets, 'droplets': Droplets, 'zap': Zap, 'trees': TreePine, 'tree-pine': TreePine, 'trash-2': Trash2, 'building-2': Building2, 'file-text': FileText, 'map-pin': MapPin, 'camera': Camera };
export interface RecordRow {
    id: string;
    title: string;
    trackingCode: string;
    status: RequestStatus;
    organizationName: string;
    createdAt: string;
    description: string;
    address?: string;
    assigneeId?: string;
    satisfactionScore?: number;
    history?: {
        id: string;
        toStatus: string;
        reason?: string;
        createdAt: string;
    }[];
    comments?: {
        id: string;
        body: string;
        isStaff?: boolean;
        visibility: string;
        createdAt: string;
    }[];
    attachments?: {
        id: string;
        url: string;
    }[];
}
export async function call<T>(path: string, body?: unknown, method = body === undefined ? 'GET' : 'POST', headers: Record<string, string> = {}): Promise<T> { const res = await fetch('/v1' + path, { method, credentials: 'include', headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers }, body: body === undefined ? undefined : JSON.stringify(body) }); const data = await res.json(); if (!res.ok)
    throw new Error(data.error?.fields ? Object.values(data.error.fields).join('؛ ') : data.error?.message ?? 'ارتباط با سرور برقرار نشد. دوباره تلاش کنید.'); return data; }
export const date = (v: string) => new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));
export function Alert({ children }: {
    children: ReactNode;
}) { return <div className="alert" role="alert">{children}</div>; }
export function Empty({ children }: {
    children: ReactNode;
}) { return <div className="empty"><ClipboardList size={30}/><p>{children}</p></div>; }
export function Status({ status }: {
    status: string;
}) { return <span className={'chip status-' + status}>{statusLabels[status] ?? serviceStatus[status] ?? status}</span>; }
export function useMe(admin = false) { return useQuery({ queryKey: ['me', admin], queryFn: () => call<StaffMeDTO>(admin ? '/admin/me' : '/me'), retry: false }); }
export function useCatalog() { return useQuery({ queryKey: ['services'], queryFn: () => call<{
        data: ServiceDTO[];
    }>('/services') }); }
export function Card({ r, admin = false }: {
    r: RecordRow;
    admin?: boolean;
}) { return <Link className="request-card" to={(admin ? '/admin/requests/' : '/requests/') + r.id}><div className="spread"><strong>{r.title}</strong><Status status={r.status}/></div><p>{r.organizationName}</p><div className="spread metadata"><bdi>{r.trackingCode}</bdi><span>{date(r.createdAt)}</span></div></Link>; }
export function Tile({ s }: {
    s: ServiceDTO;
}) { const Icon = icons[s.icon] ?? FileText; return <Link className="service-tile" to={'/services/' + s.slug}><Icon size={25} strokeWidth={1.7}/><strong>{s.shortTitle || s.title}</strong><small>{serviceStatus[s.status]}</small></Link>; }
export function Page({ title, children, eyebrow }: {
    title: string;
    children: ReactNode;
    eyebrow?: string;
}) { return <><div className="page-heading">{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1></div>{children}</>; }
