import { useEffect, useRef, useState, type ReactNode } from 'react';
import './forms.css';

export function Modal({ title, onClose, children, width = 560 }: { title: string; onClose: () => void; children: ReactNode; width?: number }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);
  return (
    <div className="ui-modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ui-modal" role="dialog" aria-modal="true" aria-label={title} style={{ ['--w' as string]: `${width}px` }}>
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

/** A short message at the bottom of the screen. */
export function useToast() {
  const [toast, setToast] = useState<{ text: string; tone: 'ok' | 'error' } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const show = (text: string, tone: 'ok' | 'error' = 'ok') => {
    setToast({ text, tone });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 3600);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const node = toast ? <div className="toast" data-tone={toast.tone} role="status">{toast.text}</div> : null;
  return { show, node };
}

export function Field({ label, required, hint, children, full }: { label: string; required?: boolean; hint?: string; children: ReactNode; full?: boolean }) {
  return (
    <label className={`f-field${full ? ' full' : ''}`}>
      <span>{label}{required && <em aria-hidden="true">*</em>}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function Chips({ options, value, onChange, multiple }: { options: readonly string[]; value: string[]; onChange: (next: string[]) => void; multiple?: boolean }) {
  const toggle = (option: string) => {
    if (multiple) onChange(value.includes(option) ? value.filter((v) => v !== option) : [...value, option]);
    else onChange([option]);
  };
  return (
    <div className="f-checks" role={multiple ? 'group' : 'radiogroup'}>
      {options.map((option) => (
        <label key={option} className="f-chip" data-on={String(value.includes(option))}>
          <input type={multiple ? 'checkbox' : 'radio'} checked={value.includes(option)} onChange={() => toggle(option)} />
          {option}
        </label>
      ))}
    </div>
  );
}

export function CopyButton({ text, label = 'Copy', className = 'btn btn-ghost btn-sm' }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* clipboard unavailable */
        }
      }}
    >
      {done ? 'Copied ✓' : label}
    </button>
  );
}

export function Avatar({ name, src }: { name: string; src?: string | null }) {
  return <span className="avatar" aria-hidden="true">{src ? <img src={src} alt="" loading="lazy" /> : (name.trim().charAt(0) || '?').toUpperCase()}</span>;
}

/** Turns a thrown Supabase/RPC error into a sentence for the screen. */
export const messageOf = (error: unknown, fallback = 'Something went wrong. Please try again.') => (error instanceof Error && error.message ? error.message : fallback);
