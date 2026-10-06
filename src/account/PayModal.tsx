import { useEffect, useState, type FormEvent } from 'react';
import { BUSINESS, SITE, isSupabaseConfigured } from '../config';
import { supabase } from '../lib/supabase';
import { Document } from '../components/Clay';
import { AppleLogo, GitHubLogo, GoogleLogo } from './Brands';
import { createCheckout, CheckoutError } from './checkout';
import type { Account } from './useAccount';

type Provider = 'google' | 'github' | 'apple';
const LABEL: Record<Provider, string> = { google: 'Google', github: 'GitHub', apple: 'Apple' };

/** Sign in, pay once with Razorpay, then add the extension. The licence follows the account. */
export function PayModal({ account, onClose }: { account: Account; onClose: () => void }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState<{ tone: 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const oauth = async (provider: Provider) => {
    setBusy(provider);
    setMessage(null);
    // Back to this page afterwards, with the payment window ready to continue.
    const { error } = (await supabase()?.auth.signInWithOAuth({ provider, options: { redirectTo: `${location.origin}/?pay=1` } })) ?? {};
    if (error) {
      setMessage({ tone: 'error', text: error.message });
      setBusy('');
    }
  };

  const submitEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');
    const sb = supabase();
    if (!sb) return;
    setBusy('email');
    setMessage(null);
    const result =
      mode === 'signup'
        ? await sb.auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}/?pay=1` } })
        : await sb.auth.signInWithPassword({ email, password });
    setBusy('');
    if (result.error) setMessage({ tone: 'error', text: result.error.message });
    else if (mode === 'signup' && !result.data.session) setMessage({ tone: 'info', text: 'Check your email and confirm your address, then come back and sign in.' });
  };

  const pay = async (currency: 'INR' | 'USD') => {
    const token = account.session?.access_token;
    if (!token) return;
    setBusy(`pay-${currency}`);
    setMessage(null);
    try {
      window.location.assign(await createCheckout(token, currency));
    } catch (error) {
      setMessage({ tone: 'error', text: error instanceof CheckoutError ? error.message : 'Could not start checkout.' });
      setBusy('');
    }
  };

  const email = account.session?.user.email;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal pay" role="dialog" aria-modal="true" aria-labelledby="pay-title" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        <div className="modal-head">
          <Document size={84} />
          <div>
            <h2 id="pay-title">{account.paid ? 'Fillie is unlocked' : 'Unlock Fillie'}</h2>
            <p>{account.paid ? 'Unlimited form filling, forever.' : `${SITE.priceInr} or ${SITE.price}, once. Unlimited form filling, forever.`}</p>
          </div>
        </div>

        {message && <p className="pay-msg" data-tone={message.tone} role="alert">{message.text}</p>}

        {!isSupabaseConfigured ? (
          <p className="pay-msg" data-tone="info">Checkout is not available yet. Please check back soon.</p>
        ) : !account.ready ? (
          <p className="muted">Loading…</p>
        ) : !account.session ? (
          <>
            <ol className="pay-steps"><li data-on="true">1. Sign in</li><li>2. Pay</li><li>3. Add to Chrome</li></ol>
            <div className="oauth-list" role="group" aria-label="Sign in with">
              {(['google', 'github', 'apple'] as const).map((provider) => (
                <button key={provider} className={`oauth-btn oauth-${provider}`} onClick={() => void oauth(provider)} disabled={Boolean(busy)}>
                  <span className="oauth-logo">{provider === 'google' ? <GoogleLogo /> : provider === 'github' ? <GitHubLogo /> : <AppleLogo />}</span>
                  <span className="oauth-label">{mode === 'signup' ? 'Sign up' : 'Continue'} with {LABEL[provider]}</span>
                </button>
              ))}
            </div>
            <div className="or-divider"><span>or use your email</span></div>
            <form className="auth-form" onSubmit={submitEmail}>
              <label>Email<input name="email" type="email" autoComplete="email" required /></label>
              <label>Password<input name="password" type="password" minLength={8} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required /></label>
              <div className="auth-actions">
                <button className="btn btn-primary" type="submit" disabled={Boolean(busy)}>{busy === 'email' ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}</button>
                <button className="btn btn-ghost" type="button" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
                  {mode === 'signin' ? 'Create an account' : 'I already have an account'}
                </button>
              </div>
            </form>
          </>
        ) : account.paid ? (
          <>
            <p className="pay-who">Signed in as <strong>{email}</strong></p>
            <a className="btn btn-primary btn-lg btn-block" href={SITE.storeUrl} target="_blank" rel="noreferrer">Add to Chrome</a>
            <p className="pay-note">Open the extension and sign in with <strong>{email}</strong>. It unlocks automatically, with no payment needed there.</p>
          </>
        ) : (
          <>
            <ol className="pay-steps"><li data-done="true">1. Sign in</li><li data-on="true">2. Pay</li><li>3. Add to Chrome</li></ol>
            <p className="pay-who">Signed in as <strong>{email}</strong></p>
            <div className="pay-box">
              <div><strong>Fillie, lifetime access</strong><span>One-time payment. No subscription.</span></div>
            </div>
            <div className="pay-options">
              <button className="pay-option" data-primary="true" onClick={() => void pay('INR')} disabled={Boolean(busy)}>
                <b>{busy === 'pay-INR' ? 'Opening…' : `Pay ${SITE.priceInr}`}</b>
                <span>UPI · Netbanking · Cards · Wallets</span>
                <small>For payments from India</small>
              </button>
              <button className="pay-option" onClick={() => void pay('USD')} disabled={Boolean(busy)}>
                <b>{busy === 'pay-USD' ? 'Opening…' : `Pay ${SITE.price}`}</b>
                <span>International debit / credit card</span>
                <small>For payments from outside India</small>
              </button>
            </div>
            <p className="pay-note">
              Payments are processed by Razorpay. By paying you agree to the <a href="/terms">Terms</a> and the{' '}
              <a href="/refund">{BUSINESS.refundDays}-day refund policy</a>.
            </p>
          </>
        )}

        {account.session && (
          <p className="pay-switch">
            <button className="link-btn" onClick={() => void account.signOut()}>Not you? Sign out</button>
          </p>
        )}
      </div>
    </div>
  );
}
