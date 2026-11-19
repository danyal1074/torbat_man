import { describe, expect, it } from 'vitest';
import {
  canStaffTransition,
  generateTrackingCode,
  maskMobile,
  normalizeMobile,
  normalizeTrackingCode,
  validateFormData,
  TRACKING_ALPHABET,
  type ServiceForm,
} from './index';

describe('normalizeMobile', () => {
  it.each([
    ['09123456789', '09123456789'],
    ['۰۹۱۲۳۴۵۶۷۸۹', '09123456789'],
    ['٠٩١٢٣٤٥٦٧٨٩', '09123456789'],
    ['+98 912 345 6789', '09123456789'],
    ['989123456789', '09123456789'],
    ['9123456789', '09123456789'],
    ['0912-345-6789', '09123456789'],
  ])('%s → %s', (input, expected) => {
    expect(normalizeMobile(input)).toBe(expected);
  });

  it.each(['0812345678', '12345', '091234567890', 'abc', ''])('rejects %s', (input) => {
    expect(normalizeMobile(input)).toBeNull();
  });

  it('masks', () => {
    expect(maskMobile('09120000001')).toBe('0912***0001');
  });
});

describe('tracking code', () => {
  it('has the expected shape and alphabet', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateTrackingCode();
      expect(code).toMatch(/^TM-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
      for (const ch of code.slice(3).replace('-', '')) expect(TRACKING_ALPHABET).toContain(ch);
    }
  });

  it('is practically unique', () => {
    const set = new Set(Array.from({ length: 5000 }, () => generateTrackingCode()));
    expect(set.size).toBe(5000);
  });

  it('normalizes user input', () => {
    expect(normalizeTrackingCode('tm 4k7p 9xq2')).toBe('TM-4K7P-9XQ2');
    expect(normalizeTrackingCode('4K7P9XQ2')).toBe('TM-4K7P-9XQ2');
    expect(normalizeTrackingCode('TM-۴K۷P-۹XQ۲')).toBe('TM-4K7P-9XQ2');
    expect(normalizeTrackingCode('TM-0000-1111')).toBeNull();
  });
});

describe('state machine', () => {
  it('allows the main path', () => {
    expect(canStaffTransition('submitted', 'assigned')).toBe(true);
    expect(canStaffTransition('assigned', 'in_progress')).toBe(true);
    expect(canStaffTransition('in_progress', 'resolved')).toBe(true);
    expect(canStaffTransition('resolved', 'closed')).toBe(true);
  });

  it('blocks invalid jumps', () => {
    expect(canStaffTransition('submitted', 'closed')).toBe(false);
    expect(canStaffTransition('closed', 'in_progress')).toBe(false);
    expect(canStaffTransition('rejected', 'resolved')).toBe(false);
    expect(canStaffTransition('submitted', 'reopened')).toBe(false);
  });
});

describe('validateFormData', () => {
  const form: ServiceForm = {
    version: 1,
    fields: [
      { name: 'kind', label: 'نوع درخواست', type: 'select', required: true, options: [{ value: 'a', label: 'الف' }] },
      { name: 'account', label: 'شناسه اشتراک', type: 'number', pattern: '^\\d{6,13}$', patternMessage: 'شناسه نامعتبر' },
      { name: 'note', label: 'یادداشت', type: 'textarea', maxLength: 5 },
    ],
  };

  it('accepts valid data and normalizes digits', () => {
    const r = validateFormData(form, { kind: 'a', account: '۱۲۳۴۵۶۷', extra: 'x' });
    expect(r).toEqual({ ok: true, data: { kind: 'a', account: '1234567' } });
  });

  it('reports errors per field', () => {
    const r = validateFormData(form, { kind: 'zzz', account: '12', note: 'خیلی طولانی' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(Object.keys(r.errors).sort()).toEqual(['account', 'kind', 'note']);
      expect(r.errors.account).toBe('شناسه نامعتبر');
    }
  });

  it('requires required fields', () => {
    const r = validateFormData(form, {});
    expect(r.ok).toBe(false);
  });
});
