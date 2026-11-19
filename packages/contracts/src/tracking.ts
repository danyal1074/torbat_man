import { toLatinDigits } from '@torbat/i18n';

/** Crockford-like alphabet without easily confused characters (0/O, 1/I/L, U). */
export const TRACKING_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
const BODY_LENGTH = 8;

/** Generate a random, human-readable tracking code such as `TM-4K7P-9XQ2`. */
export function generateTrackingCode(random: (n: number) => Uint8Array = defaultRandom): string {
  const bytes = random(BODY_LENGTH * 2);
  let body = '';
  // Rejection sampling avoids modulo bias.
  const limit = 256 - (256 % TRACKING_ALPHABET.length);
  let i = 0;
  while (body.length < BODY_LENGTH) {
    if (i >= bytes.length) return generateTrackingCode(random);
    const b = bytes[i++]!;
    if (b < limit) body += TRACKING_ALPHABET[b % TRACKING_ALPHABET.length];
  }
  return `TM-${body.slice(0, 4)}-${body.slice(4)}`;
}

/** Normalize user input (Persian digits, lowercase, missing dashes) to canonical `TM-XXXX-XXXX` or null. */
export function normalizeTrackingCode(input: string): string | null {
  const raw = toLatinDigits(input).toUpperCase().replace(/[^0-9A-Z]/g, '');
  const body = raw.startsWith('TM') ? raw.slice(2) : raw;
  if (body.length !== BODY_LENGTH) return null;
  for (const ch of body) if (!TRACKING_ALPHABET.includes(ch)) return null;
  return `TM-${body.slice(0, 4)}-${body.slice(4)}`;
}

function defaultRandom(n: number): Uint8Array {
  const arr = new Uint8Array(n);
  globalThis.crypto.getRandomValues(arr);
  return arr;
}
