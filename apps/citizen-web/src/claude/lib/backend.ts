const loginRequired = 'برای ادامه، وارد حساب شوید.';

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) { super(message); }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch('/v1' + path, {
    ...options,
    credentials: 'same-origin',
    headers: {
      ...(typeof options.body === 'string' ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => undefined);
  if (!response.ok) {
    const fields = data?.error?.fields;
    throw new ApiError(fields ? Object.values(fields).join('؛ ') : data?.error?.message
      ?? (response.status === 401 ? loginRequired : 'ارتباط با سامانه برقرار نشد.'), response.status);
  }
  return data as T;
}

export const json = (body: unknown, method = 'POST'): RequestInit => ({ method, body: JSON.stringify(body) });
export const messageOf = (error: unknown): string => error instanceof Error ? error.message : 'انجام عملیات ممکن نشد. دوباره تلاش کنید.';
