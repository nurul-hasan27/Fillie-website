import { useEffect, useRef, useState } from 'react';
import { displayName, type Account } from './useAccount';

/** Nav bar: "Sign in" when signed out, otherwise the user's name with a small menu. */
export function AccountMenu({ account, onSignIn }: { account: Account; onSignIn: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!account.ready) return <span className="nav-account-skeleton" aria-hidden="true" />;

  if (!account.session) {
    return <button className="btn btn-primary btn-sm" onClick={onSignIn}>Sign in</button>;
  }

  const name = displayName(account.session);
  const email = account.session.user.email ?? '';
  return (
    <div className="account-menu" ref={ref}>
      <button className="account-chip" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="menu" title={email}>
        <span className="account-avatar" aria-hidden="true">{name.charAt(0).toUpperCase()}</span>
        <span className="account-name">{name}</span>
      </button>
      {open && (
        <div className="account-pop" role="menu">
          <strong>{name}</strong>
          <span className="account-email">{email}</span>
          <span className="account-plan" data-paid={String(account.paid === true)}>
            {account.paid === null ? 'Checking plan…' : account.paid ? 'Unlimited access' : 'Free plan'}
          </span>
          <button role="menuitem" className="btn btn-ghost btn-sm" onClick={() => void account.signOut().then(() => setOpen(false))}>Sign out</button>
        </div>
      )}
    </div>
  );
}
