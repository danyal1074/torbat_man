const PERSIAN = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC = '٠١٢٣٤٥٦٧٨٩';
/** Convert Persian (۰-۹) and Arabic-Indic (٠-٩) digits to ASCII digits. */
export function toLatinDigits(input: string): string {
    let out = '';
    for (const ch of input) {
        const p = PERSIAN.indexOf(ch);
        if (p !== -1) {
            out += String(p);
            continue;
        }
        const a = ARABIC.indexOf(ch);
        out += a !== -1 ? String(a) : ch;
    }
    return out;
}
/** Convert ASCII and Arabic-Indic digits to Persian digits for display. */
export function toPersianDigits(input: string | number): string {
    return String(input).replace(/[0-9٠-٩]/g, (ch) => {
        const code = ch.charCodeAt(0);
        const n = code >= 0x0660 ? code - 0x0660 : code - 48;
        return PERSIAN[n] ?? ch;
    });
}
/** Format a number with Persian digits and Persian thousands separator. */
export function formatNumber(n: number): string {
    return new Intl.NumberFormat('fa-IR').format(n);
}
