import { useSyncExternalStore } from 'react';
import { api, json, ApiError } from '../lib/backend';

export interface User { phone: string; name: string }
type ServerUser = { mobile: string; displayName?: string | null };
let user: User | null = null;
let favorites: string[] = [];
const ls = new Set<() => void>();
const emit = () => ls.forEach((l) => l());
const sub = (l: () => void) => { ls.add(l); return () => ls.delete(l); };
function showUser(account: ServerUser | null) {
  user = account ? { phone: account.mobile, name: account.displayName ?? '' } : null;
  emit();
}

export const session = {
  get: () => user,
  async restore(signal: AbortSignal) {
    try {
      const account = await api<ServerUser>('/me', { signal });
      if (!signal.aborted) showUser(account);
    } catch (error) {
      if (!signal.aborted && error instanceof ApiError && error.status === 401) showUser(null);
    }
  },
  requestOtp(phone: string) { return api<{ devCode?: string }>('/auth/request-otp', json({ mobile: phone })); },
  async signInDemo(mobile: string) {
    const result = await api<{ user: ServerUser }>('/demo/session', json({ mobile, kind: 'citizen' }));
    showUser(result.user);
  },
  async signIn(phone: string, code: string) {
    const result = await api<{ user: ServerUser; isNew: boolean }>('/auth/verify-otp', json({ mobile: phone, code }));
    showUser(result.user);
    return result.isNew;
  },
  async setName(name: string) {
    const account = await api<ServerUser>('/me', json({ displayName: name }, 'PATCH'));
    showUser(account);
  },
  async signOut() {
    await api('/auth/logout', { method: 'POST' });
    favorites = [];
    showUser(null);
  },
};
export const useUser = () => useSyncExternalStore(sub, session.get);

export const favStore = {
  get: () => favorites,
  toggle(id: string) { favorites = favorites.includes(id) ? favorites.filter((x) => x !== id) : [...favorites, id]; emit(); },
};
export const useFavorites = () => useSyncExternalStore(sub, favStore.get);

/** Iranian mobile: 09xxxxxxxxx, accepts Persian/Arabic digits and +98 / 0098. */
export function normalizePhone(raw: string): string | null {
  const d = raw.replace(/[۰-۹]/g, (c) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/[٠-٩]/g, (c) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/[\s-]/g, '');
  const m = d.replace(/^(\+98|0098)/, '0');
  return /^09\d{9}$/.test(m) ? m : null;
}
export const maskPhone = (p: string) => `${p.slice(0, 4)}•••${p.slice(7)}`;
export const OTP_LEN = 5;

/* UI preferences (not private) */
export interface Prefs { bigText: boolean; calm: boolean }
const KEY = 'tn.prefs';
export function loadPrefs(): Prefs {
  try { return { bigText: false, calm: false, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { bigText: false, calm: false }; }
}
export function applyPrefs(p: Prefs) {
  document.documentElement.classList.toggle('big-text', p.bigText);
  document.documentElement.classList.toggle('calm', p.calm);
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* storage blocked */ }
}
