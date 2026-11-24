import type { LucideIcon } from 'lucide-react';

type Glyph = { line: string; accent?: string; color?: string };
const glyphs: Record<string, Glyph> = {
  city: { line: 'M3 21h18M5 21V10h6v11m0 0V3h6v18m0-8h4v8M7 13h2m-2 3h2m4-10h2m-2 4h2m-2 4h2m-2 4h2', accent: 'M19 17h1v4' },
  bread: { line: 'M3 19c-3-4 1-8 5-8 1-3 4-5 7-4 4-3 9 0 7 4-2 4-13 12-19 8Zm5-8c2 0 3 1 4 2m3-6c2 0 3 1 4 2', color: '#ef8a00' },
  bus: { line: 'M4 18V6c0-2 2-3 4-3h8c2 0 4 1 4 3v12H4Zm0-5h16M3 7H2v6m19-6h1v6M5 18v2h3v-2m8 0v2h3v-2M5 7h14', accent: 'M7 15.5h1m8 0h1' },
  health: { line: 'M12 21 3.7 12.7C-1 8 5.5 2.5 9 6l3 3 3-3c3.5-3.5 10 2 5.3 6.7L12 21Z', accent: 'M9.5 12h5M12 9.5v5', color: '#e70e46' },
  guilds: { line: 'M3 10h18l-3-6H6l-3 6Zm0 0c0 4 4 4 5 1 1 3 3 3 4 0 1 3 4 3 5 0 1 3 4 3 4-1M5 13v8h14v-8M10 21v-5h4v5', accent: 'M9 4l-1 6m7-6 2 6m-5-6v6' },
  digital: { line: 'M12 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h9l4 4v4m-5-8v5h5M7 10h5m-5 4h5', accent: 'm13 20 1-4 6-6 3 3-6 6-4 1Zm5-8 3 3' },
  tourism: { line: 'M12 2a5 5 0 0 0-5 5c0 4 5 8 5 8s5-4 5-8a5 5 0 0 0-5-5Z', accent: 'M7 12 4 11l-2 10 7-2 6 2 7-2-2-9-3 1M12 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z' },
  farmer: { line: 'M12 22v-9m0 3c-6 0-9-4-9-8 6-1 10 2 9 8Zm0-3c1-6 4-9 10-9 0 6-4 10-10 9ZM8 22h8', color: '#279c31' },
  education: { line: 'm2 9 10-5 10 5-10 5L2 9Zm5 3v5c2 3 8 3 10 0v-5', accent: 'M21 10v8m0 0v2' },
  'my-family': { line: 'M11 20v-2c0-3-2-5-5-5s-5 2-5 5v2M6 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm9 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z', accent: 'M23 20v-2c0-3-2-5-5-5s-5 2-5 5v2' },
  smart: { line: 'M6 7h12v11H6zM9 3v4m6-4v4M9 18v3m6-3v3m3-11h3m-3 5h3M3 10h3m-3 5h3', accent: 'M9 10h6v5H9z' },
  lighting: { line: 'M8 22V6a4 4 0 0 1 8 0v2m-5 14H5m8-12h6l-2-4h-2', color: '#f38a00', accent: 'M15 13h1' },
  roads: { line: 'M7 3h10l4 18M7 3 3 21m9-17v3m0 4v2m0 4v3', accent: 'M17 4l4 17' },
  waste: { line: 'M4 6h16M7 6l1 15h8l1-15M9 6V3h6v3', accent: 'M10 10v7m4-7v7' },
  'green-space': { line: 'M12 21v-8m-3 8h6M8 16c-5 1-7-4-4-6-1-3 2-5 4-5 0-5 8-5 8 0 3-1 6 2 4 5 4 2 1 7-3 6', color: '#289c42', accent: 'm12 15 3-3' },
  shahrbin: { line: 'M3 8h4l2-3h6l2 3h4v12H3z', accent: 'M12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z' },
  tracking: { line: 'M12 22H4V2h11l4 4v6m-5-10v5h5M7 9h5m-5 4h4', accent: 'M20 19l3 3m-1-6a4 4 0 1 0-8 0 4 4 0 0 0 8 0Z' },
};

export function ReferenceIcon({ name, fallback: Fallback, size = 29 }: { name: string; fallback: LucideIcon; size?: number }) {
  const glyph = glyphs[name];
  if (!glyph) return <Fallback className="ref-icon" size={size} strokeWidth={1.8} aria-hidden="true"/>;
  return <svg className="ref-icon" aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
    <path d={glyph.line} stroke={glyph.color ?? 'currentColor'}/>
    {glyph.accent && <path d={glyph.accent} stroke={glyph.color ?? 'var(--ref-gold, #f19a06)'}/>}
  </svg>;
}
