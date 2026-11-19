import type { CatalogCache } from '../catalog/cache';
import type { Db } from '../db/client';
import { requests, services } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { normalizeForSearch, tokenize } from '@torbat/i18n';
export interface AiGateway {
    triage(input: {
        text: string;
    }): Promise<{
        title: string;
        summary: string;
        serviceSlug?: string;
        confidence: number;
        needsConfirmation: boolean;
        provider: 'rules';
        safetyFlags: string[];
    }>;
    assistant(input: {
        message: string;
    }): Promise<{
        reply: string;
        suggestedServices: {
            slug: string;
            title: string;
        }[];
        confidence: number;
        provider: 'rules';
    }>;
    checkDuplicates(input: {
        serviceSlug: string;
        lat: number;
        lng: number;
        description: string;
    }): Promise<{
        duplicates: {
            id: string;
            title: string;
            status: string;
            distanceMeters: number;
        }[];
    }>;
}
export function createAiGateway(opts: {
    catalog: CatalogCache;
    db: Db;
    apiKey?: string;
    model: string;
    timeoutMs: number;
}): AiGateway {
    async function rank(text: string) {
        const clean = normalizeForSearch(text);
        const words = tokenize(text);
        return (await opts.catalog.getServices()).filter(s => s.status !== 'disabled').map(s => {
            const title = normalizeForSearch(s.title + ' ' + s.shortTitle);
            const keywordScore = Math.max(0, ...s.keywords.map(k => clean.includes(normalizeForSearch(k)) ? normalizeForSearch(k).length : 0));
            const overlap = words.filter(w => title.includes(w)).length;
            return { service: s, score: keywordScore + overlap * 2 };
        }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);
    }
    const safety = (text: string) => /(?:نشت|نشتی|بوی).*گاز|برق.?گرفتگی|سیم.*لخت/.test(text) ? ['potential_emergency'] : [];
    return {
        async triage({ text }) { const found = (await rank(text)).find(s => s.service.workflow === 'city_report'); return { title: found?.service.title ?? 'انتخاب دستی موضوع', summary: text.slice(0, 100), serviceSlug: found?.service.slug, confidence: found ? 0.8 : 0, needsConfirmation: true, provider: 'rules', safetyFlags: safety(text) }; },
        async assistant({ message }) { const flags = safety(message); const found = await rank(message); return { provider: 'rules', reply: flags.length ? 'این موضوع ممکن است خطر فوری داشته باشد. از محل خطر فاصله بگیرید و از مسیر رسمی امداد کمک بگیرید؛ سامانه رسیدگی فوری را تضمین نمی‌کند.' : found.length ? 'این خدمات ممکن است به نیاز شما مرتبط باشند. پیشنهاد واژه‌محور است؛ جزئیات و وضعیت اتصال را بررسی کنید. اطلاعات اداری تأییدشده بیشتری در دسترس نیست.' : 'اطلاعات تأییدشده‌ای در دسترس نیست. از فهرست خدمات، موضوع را دستی انتخاب کنید.', suggestedServices: flags.length ? [] : found.slice(0, 3).map(x => ({ slug: x.service.slug, title: x.service.title })), confidence: found.length ? 0.8 : 0 }; },
        async checkDuplicates(input) {
            const records = await opts.db.select({ id: requests.id, title: requests.title, status: requests.status, lat: requests.lat, lng: requests.lng }).from(requests).innerJoin(services, eq(services.id, requests.serviceId)).where(and(eq(services.slug, input.serviceSlug), eq(requests.publicVisibility, true), sql `${requests.createdAt} > NOW() - INTERVAL '30 days'`, sql `${requests.status} NOT IN ('closed','rejected')`)).limit(100);
            const words = tokenize(input.description);
            return { duplicates: records.flatMap(r => { if (r.lat === null || r.lng === null)
                    return []; const distance = Math.round(Math.hypot((r.lat - input.lat) * 111320, (r.lng - input.lng) * 111320 * Math.cos(input.lat * Math.PI / 180))); const similar = words.length === 0 || words.some(w => normalizeForSearch(r.title).includes(w)); return distance < 150 && similar ? [{ id: r.id, title: r.title, status: r.status, distanceMeters: distance }] : []; }).slice(0, 5) };
        }
    };
}
