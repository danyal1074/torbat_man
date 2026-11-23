const FA = '۰۱۲۳۴۵۶۷۸۹';
const AR = '٠١٢٣٤٥٦٧٨٩';
/** Normalises Persian/Arabic variants so search is forgiving. */
export function normalizeFa(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String(FA.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(AR.indexOf(d)))
    .replace(/ي/g, 'ی').replace(/ك/g, 'ک')
    .replace(/[‌‏‎]/g, ' ')
    .replace(/[ً-ٟـ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Every query word must be the start of a word in the text ("نان" matches "نان من" but not "جوانان"). */
export function matchesQuery(text: string, query: string): boolean {
  const q = normalizeFa(query);
  if (!q) return false;
  const words = normalizeFa(text).split(' ');
  return q.split(' ').every((t) => words.some((w) => w.startsWith(t)));
}
