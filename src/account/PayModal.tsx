import { useEffect, useState, type FormEvent } from 'react';
import { BUSINESS, SITE, isSupabaseConfigured } from '../config';
import { supabase } from '../lib/supabase';
import { Document } from '../components/Clay';
import { AppleLogo, GitHubLogo, GoogleLogo } from './Brands';
import { createCheckout, CheckoutError, endsLabel, quoteCheckout, readOffers, REJECT_TEXT, saveCodes, savedCodes, type PublicOffer, type Quote } from './checkout';
import { money, percent } from '../lib/format';
import { rpc } from '../influencer/api';
import type { Account } from './useAccount';

type Provider = 'google' | 'github' | 'apple';
const LABEL: Record<Provider, string> = { google: 'Google', github: 'GitHub', apple: 'Apple' };

/** Sign in, pay once with Razorpay, then add the extension. The licence follows the account. */
export function PayModal({ account, onClose }: { account: Account; onClose: () => void }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState<{ tone: 'error' | 'info'; text: string } | null>(null);
  // Creator promo code and offer code. The server prices them; this only remembers what it accepted.
  const [quotes, setQuotes] = useState<Partial<Record<'INR' | 'USD', Quote>>>({});
  const [codeInput, setCodeInput] = useState('');
  const [codeBusy, setCodeBusy] = useState(false);
  const [codeNote, setCodeNote] = useState('');
  const [codesSupported, setCodesSupported] = useState(true);
  // "Explore offers": the offers the admin made public (creator codes are never listed).
  const [offersOpen, setOffersOpen] = useState(false);
  const [offers, setOffers] = useState<PublicOffer[] | null>(null);
  const [offersError, setOffersError] = useState('');
  const signedIn = Boolean(account.session) && account.paid === false;
  const token = account.session?.access_token;

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

  const applied = (quotes.INR ?? quotes.USD)?.applied ?? [];

  const exploreOffers = async () => {
    setOffersOpen(true);
    setOffersError('');
    try {
      setOffers(readOffers(await rpc<unknown>('list_public_offers')));
    } catch {
      setOffers([]);
      setOffersError('Could not load offers. Please try again.');
    }
  };

  const useOffer = async (code: string) => {
    setOffersOpen(false);
    await refreshQuotes([code, ...applied.map((a) => a.code).filter((c) => c !== code)]);
  };

  const refreshQuotes = async (codes: string[]) => {
    if (!token) return;
    setCodeBusy(true);
    try {
      const [inr, usd] = await Promise.all([quoteCheckout(token, 'INR', codes), quoteCheckout(token, 'USD', codes)]);
      // An older checkout function does not know about codes and answers with a payment link instead of a price.
      if (!inr?.order || !usd?.order) {
        setCodesSupported(false);
        return;
      }
      setQuotes({ INR: inr, USD: usd });
      saveCodes(inr.applied.map((a) => a.code));
      const bad = inr.rejected.filter((r) => r.reason !== 'same_kind');
      setCodeNote(bad.length ? `${bad[0]!.code}: ${REJECT_TEXT[bad[0]!.reason] ?? 'Could not apply that code.'}` : '');
      return inr;
    } catch (error) {
      setCodeNote(error instanceof CheckoutError ? error.message : 'Could not check that code.');
      setQuotes({});
    } finally {
      setCodeBusy(false);
    }
  };

  // Prices (and any code remembered from a creator's link) are fetched as soon as the payment step shows.
  useEffect(() => {
    if (signedIn && token) void refreshQuotes(savedCodes());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn, token]);

  const applyCode = async () => {
    const code = codeInput.replace(/\s+/g, '').toUpperCase();
    if (!code) return;
    const result = await refreshQuotes([code, ...applied.map((a) => a.code).filter((c) => c !== code)]);
    if (result?.applied.some((a) => a.code === code)) setCodeInput('');
  };

  const removeCode = (code: string) => void refreshQuotes(applied.map((a) => a.code).filter((c) => c !== code));

  const pay = async (currency: 'INR' | 'USD') => {
    if (!token) return;
    setBusy(`pay-${currency}`);
    setMessage(null);
    try {
      window.location.assign(await createCheckout(token, currency, applied.map((a) => a.code)));
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
            {offersOpen && (
              <div className="offers-panel">
                <button className="link-btn" onClick={() => setOffersOpen(false)}>← Back to payment</button>
                <h3>Offers for you</h3>
                <p className="offers-note"><b>Tip:</b> enter a creator's promo code too, for an additional discount on top of any offer.</p>
                {offersError && <p className="code-note" role="alert">{offersError}</p>}
                {!offers && !offersError && <p className="muted">Loading…</p>}
                {offers && offers.length === 0 && !offersError && <p className="muted">No public offers right now. Check back soon, or enter a creator's code.</p>}
                <ul className="offers-list">
                  {(offers ?? []).map((o) => (
                    <li key={o.code}>
                      <span className="offer-pct">{percent(o.discount_bps)}<small>off</small></span>
                      <span className="offer-main"><b>{o.title || 'Offer'}</b><small>{[endsLabel(o.ends_at), o.left !== null ? `${o.left} left` : ''].filter(Boolean).join(' · ') || 'No end date'}</small><code>{o.code}</code></span>
                      {applied.some((a) => a.code === o.code) ? <span className="offer-applied">Applied ✓</span> : <button className="btn btn-primary btn-sm" onClick={() => void useOffer(o.code)}>Apply</button>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {!offersOpen && <>
            <ol className="pay-steps"><li data-done="true">1. Sign in</li><li data-on="true">2. Pay</li><li>3. Add to Chrome</li></ol>
            <p className="pay-who">Signed in as <strong>{email}</strong></p>
            <div className="pay-box">
              <div><strong>Fillie, lifetime access</strong><span>One-time payment. No subscription.</span></div>
            </div>
            {codesSupported && <div className="code-box">
              <div className="code-head">
                <label htmlFor="pay-code">Have a creator code or an offer code? <span className="code-multi">(multiple coupons applicable)</span></label>
                <button className="link-btn explore" onClick={() => void exploreOffers()}>Explore offers</button>
              </div>
              <div className="code-row">
                <input id="pay-code" value={codeInput} onChange={(e) => setCodeInput(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === 'Enter' && void applyCode()} maxLength={16} placeholder="Enter code" autoComplete="off" spellCheck={false} />
                <button className="btn btn-secondary btn-sm" onClick={() => void applyCode()} disabled={codeBusy || !codeInput.trim()}>{codeBusy ? '…' : 'Apply'}</button>
              </div>
              {codeNote && <p className="code-note" data-tone="error" role="alert">{codeNote}</p>}
              {applied.length > 0 && (
                <ul className="code-applied">
                  {applied.map((a) => (
                    <li key={a.code}>
                      <span><b>{a.code}</b> · {a.kind === 'promo' ? 'creator code' : a.title}</span>
                      <em>− {a.kind === 'promo' ? `${a.discount_bps / 100}%` : `${a.discount_bps / 100}% extra`}</em>
                      <button className="link-btn" onClick={() => removeCode(a.code)} aria-label={`Remove ${a.code}`}>Remove</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>}
            <div className="pay-options">
              <button className="pay-option" data-primary="true" onClick={() => void pay('INR')} disabled={Boolean(busy)}>
                <b>{busy === 'pay-INR' ? 'Opening…' : <>Pay {quotes.INR && quotes.INR.order.finalMinor !== quotes.INR.order.listMinor ? <><s className="was">{SITE.priceInr}</s> {money(quotes.INR.order.finalMinor, 'INR')}</> : SITE.priceInr}</>}</b>
                <span>UPI · Netbanking · Cards · Wallets</span>
                <small>For payments from India</small>
              </button>
              <button className="pay-option" onClick={() => void pay('USD')} disabled={Boolean(busy)}>
                <b>{busy === 'pay-USD' ? 'Opening…' : <>Pay {quotes.USD && quotes.USD.order.finalMinor !== quotes.USD.order.listMinor ? <><s className="was">{SITE.price}</s> {money(quotes.USD.order.finalMinor, 'USD')}</> : SITE.price}</>}</b>
                <span>International debit / credit card</span>
                <small>For payments from outside India</small>
              </button>
            </div>
            <p className="pay-note">
              Payments are processed by Razorpay. By paying you agree to the <a href="/terms">Terms</a> and the{' '}
              <a href="/refund">{BUSINESS.refundDays}-day refund policy</a>.
            </p>
            </>}
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
