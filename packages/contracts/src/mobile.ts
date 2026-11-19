import { toLatinDigits } from '@torbat/i18n';

/**
 * Normalize an Iranian mobile number written with Persian, Arabic or Latin digits,
 * with or without +98 / 98 / 0 prefix, spaces or dashes.
 * Returns the canonical form `09xxxxxxxxx` or `null` when invalid.
 */
export function normalizeMobile(input: string): string | null {
  let digits = toLatinDigits(input).replace(/[\s\-().]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  if (digits.startsWith('0098')) digits = digits.slice(4);
  else if (digits.startsWith('98') && digits.length === 12) digits = digits.slice(2);
  if (digits.length === 10 && digits.startsWith('9')) digits = `0${digits}`;
  return /^09\d{9}$/.test(digits) ? digits : null;
}

/** Mask a mobile for logs and staff views: 0912***0001 */
export function maskMobile(mobile: string): string {
  if (mobile.length !== 11) return '***';
  return `${mobile.slice(0, 4)}***${mobile.slice(7)}`;
}
