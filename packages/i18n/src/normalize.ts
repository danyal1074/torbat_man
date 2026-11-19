import { toLatinDigits } from './digits';
/**
 * Normalize Persian text for storage and search:
 * Arabic ي/ى → ی, ك → ک, ۀ/ة → ه, removes tatweel and diacritics,
 * unifies zero-width non-joiner variants, collapses whitespace.
 */
export function normalizePersian(input: string): string {
    return input
        .replace(/[يى]/g, 'ی')
        .replace(/ك/g, 'ک')
        .replace(/[ۀة]/g, 'ه')
        .replace(/ـ/g, '')
        .replace(/[ً-ْٰ]/g, '')
        .replace(/(?:\u200c|\u200d|\u00ad)+/g, '‌')
        .replace(/\s+/g, ' ')
        .trim();
}
/**
 * Aggressive normalization for search matching:
 * normalizePersian + latin digits + lower-case + ZWNJ → space.
 */
export function normalizeForSearch(input: string): string {
    return toLatinDigits(normalizePersian(input))
        .replace(/‌/g, ' ')
        .replace(/[.,،؛;:!?؟«»"'()[\]{}\-_/\\]+/g, ' ')
        .replace(/\s+/g, ' ')
        .toLowerCase()
        .trim();
}
/** Split normalized text into search tokens (length ≥ 2). */
export function tokenize(input: string): string[] {
    return normalizeForSearch(input)
        .split(' ')
        .filter((t) => t.length >= 2);
}
