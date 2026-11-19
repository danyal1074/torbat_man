import { normalizePersian, toLatinDigits } from '@torbat/i18n';

/**
 * Declarative form schema for dynamic service forms (Service Registry).
 * Kept deliberately small: it is rendered by the citizen app and validated
 * identically on the server.
 */
export type FormFieldType = 'text' | 'textarea' | 'select' | 'radio' | 'number' | 'tel';

export interface FormFieldOption {
  value: string;
  label: string;
}

export interface FormField {
  name: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  helper?: string;
  placeholder?: string;
  options?: FormFieldOption[];
  minLength?: number;
  maxLength?: number;
  /** Regex applied after digit normalization. */
  pattern?: string;
  patternMessage?: string;
  /** Mark fields that may contain personal data (masked for non-assigned staff in future phases). */
  sensitive?: boolean;
}

export interface ServiceForm {
  version: number;
  fields: FormField[];
}

export type FormValidationResult =
  | { ok: true; data: Record<string, string> }
  | { ok: false; errors: Record<string, string> };

export function validateFormData(form: ServiceForm, input: Record<string, unknown>): FormValidationResult {
  const errors: Record<string, string> = {};
  const data: Record<string, string> = {};

  for (const field of form.fields) {
    const rawValue = input[field.name];
    let value = typeof rawValue === 'string' ? normalizePersian(rawValue) : rawValue == null ? '' : String(rawValue);
    if (field.type === 'number' || field.type === 'tel') value = toLatinDigits(value);

    if (!value) {
      if (field.required) errors[field.name] = `«${field.label}» را وارد کنید.`;
      continue;
    }
    if ((field.type === 'select' || field.type === 'radio') && field.options) {
      if (!field.options.some((o) => o.value === value)) {
        errors[field.name] = `یکی از گزینه‌های «${field.label}» را انتخاب کنید.`;
        continue;
      }
    }
    if (field.type === 'number' && !/^\d+$/.test(value)) {
      errors[field.name] = `«${field.label}» باید فقط عدد باشد.`;
      continue;
    }
    if (field.minLength && value.length < field.minLength) {
      errors[field.name] = `«${field.label}» حداقل ${field.minLength} نویسه باشد.`;
      continue;
    }
    if (field.maxLength && value.length > field.maxLength) {
      errors[field.name] = `«${field.label}» حداکثر ${field.maxLength} نویسه باشد.`;
      continue;
    }
    if (field.pattern && !new RegExp(field.pattern).test(value)) {
      errors[field.name] = field.patternMessage ?? `قالب «${field.label}» درست نیست.`;
      continue;
    }
    data[field.name] = value;
  }

  // Unknown keys are dropped silently: the schema is the source of truth.
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, data };
}

/** Human-readable label for a stored value (for select/radio fields). */
export function displayFormValue(field: FormField, value: string): string {
  return field.options?.find((o) => o.value === value)?.label ?? value;
}
