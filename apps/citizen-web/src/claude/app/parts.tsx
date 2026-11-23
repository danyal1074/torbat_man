import { ReactNode, useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { ChevronLeft, Lock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { EmptyState } from '../components/ui';

export function Dialog({ open, title, children, onClose }: { open: boolean; title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('button')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && ref.current) { // keep focus inside
        const f = ref.current.querySelectorAll<HTMLElement>('button, a[href], input');
        if (!f.length) return; const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); prev?.focus(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} className="dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-title">
        <h2 id="dlg-title" className="sec-title">{title}</h2>{children}
      </div>
    </div>
  );
}

export function Toggle({ id, label, hint, checked, onChange, disabled }: { id: string; label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="toggle-row">
      <div><label htmlFor={id} className="field-label">{label}</label>{hint && <p className="field-hint">{hint}</p>}</div>
      <input id={id} type="checkbox" role="switch" className="switch" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
    </div>
  );
}

export function MenuItem({ to, icon: Icon, title, hint, tone }: { to: string; icon: LucideIcon; title: string; hint?: string; tone?: 'danger' }) {
  return (
    <Link to={to} reloadDocument={to.startsWith("/admin")} className={`menu-item${tone ? ' danger' : ''}`}>
      <span className="rico"><Icon size={24} aria-hidden="true" /></span>
      <span className="rtxt"><strong>{title}</strong>{hint && <small>{hint}</small>}</span>
      <ChevronLeft size={18} aria-hidden="true" />
    </Link>
  );
}

export function Unauthorized() {
  return (
    <div className="state" role="status">
      <span className="ico-wrap"><Lock size={30} aria-hidden="true" /></span>
      <h2>ابتدا وارد شوید</h2><p>برای دیدن این بخش باید با شماره موبایل وارد حساب خود شوید.</p>
      <Link className="btn" to="/login">ورود با شماره موبایل</Link>
    </div>
  );
}
export { EmptyState };
