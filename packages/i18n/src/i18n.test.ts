import { describe, expect, it } from 'vitest';
import { toLatinDigits, toPersianDigits, normalizePersian, normalizeForSearch, tokenize, formatRelative } from './index';
describe('digits', () => {
    it('converts Persian and Arabic digits to Latin', () => {
        expect(toLatinDigits('۰۹۱۲۳۴۵۶۷۸۹')).toBe('09123456789');
        expect(toLatinDigits('٠٩١٢٣٤٥٦٧٨٩')).toBe('09123456789');
        expect(toLatinDigits('abc ۱۲3')).toBe('abc 123');
    });
    it('converts Latin digits to Persian', () => {
        expect(toPersianDigits('TM-1234')).toBe('TM-۱۲۳۴');
        expect(toPersianDigits(2026)).toBe('۲۰۲۶');
    });
});
describe('normalize', () => {
    it('unifies Arabic ye/kaf', () => {
        expect(normalizePersian('كوچه علي')).toBe('کوچه علی');
    });
    it('search normalization strips punctuation and ZWNJ', () => {
        expect(normalizeForSearch('فشار‌آب، ضعيفه!')).toBe('فشار آب ضعیفه');
    });
    it('tokenizes', () => {
        expect(tokenize('آب خونه ضعیفه')).toEqual(['آب', 'خونه', 'ضعیفه']);
    });
});
describe('relative time', () => {
    it('formats minutes ago', () => {
        const now = new Date('2026-11-19T10:00:00Z');
        expect(formatRelative(new Date('2026-11-19T09:55:00Z'), now)).toBe('۵ دقیقه پیش');
        expect(formatRelative(new Date('2026-11-19T09:59:30Z'), now)).toBe('همین الان');
    });
});
