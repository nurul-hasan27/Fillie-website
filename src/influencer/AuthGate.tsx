import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { isSupabaseConfigured } from '../config';
import { AppleLogo, GitHubLogo, GoogleLogo } from '../account/Brands';
import { Heart, Sparkle, Hand } from '../components/Clay';

type Provider = 'google' | 'github' | 'apple';
const LABEL: Record<Provider, string> = { google: 'Google', github: 'GitHub', apple: 'Apple' };

/** Sign in or create an account (Google, GitHub, Apple, or email and password), then come back to /influencer. */
export function AuthGate() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState<{ tone: 'error' | 'info'; text: string } | null>(null);
  const back = `${location.origin}/influencer`;

  const oauth = async (provider: Provider) => {
    setBusy(provider);
    setMessage(null);
    const { error } = (await supabase()?.auth.signInWithOAuth({ provider, options: { redirectTo: back } })) ?? {};
    if (error) {
      setMessage({ tone: 'error', text: error.message });
      setBusy('');
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');
    const sb = supabase();
    if (!sb) return;
    setBusy('email');
    setMessage(null);
    const result = mode === 'signup' ? await sb.auth.signUp({ email, password, options: { emailRedirectTo: back } }) : await sb.auth.signInWithPassword({ email, password });
    setBusy('');
    if (result.error) setMessage({ tone: 'error', text: result.error.message });
    else if (mode === 'signup' && !result.data.session) setMessage({ tone: 'info', text: 'Check your email and confirm your address, then come back and sign in.' });
  };

  return (
    <div className="inf-gate">
      <section className="inf-hero">
        <span className="pill">Fillie creator programme</span>
        <h1>Share Fillie. <em>Get paid.</em></h1>
        <p>Give your audience 10% off Fillie with your own promo code, and earn 10% of every payment made with it. No cap, no minimum audience.</p>
        <ul className="inf-points">
          <li><b>10% off</b><span>for everyone who uses your code</span></li>
          <li><b>10% back</b><span>of what they pay goes to you</span></li>
          <li><b>Live dashboard</b><span>orders, earnings and payouts</span></li>
        </ul>
        <div className="inf-hero-art" aria-hidden="true">
          <Heart size={110} />
          <Sparkle size={120} />
          <Hand size={100} />
        </div>
      </section>

      <section className="inf-card">
        <h2>{mode === 'signup' ? 'Create your account' : 'Sign in'}</h2>
        <p className="muted-p">{mode === 'signup' ? 'Then fill in a short form to become a creator partner.' : 'New here? Sign in or create an account, then join the programme.'}</p>
        {message && <p className="pay-msg" data-tone={message.tone} role="alert">{message.text}</p>}
        {!isSupabaseConfigured ? (
          <p className="pay-msg" data-tone="info">Sign-in is not available yet.</p>
        ) : (
          <>
            <div className="oauth-list" role="group" aria-label="Sign in with">
              {(['google', 'github', 'apple'] as const).map((provider) => (
                <button key={provider} className={`oauth-btn oauth-${provider}`} onClick={() => void oauth(provider)} disabled={Boolean(busy)}>
                  <span className="oauth-logo">{provider === 'google' ? <GoogleLogo /> : provider === 'github' ? <GitHubLogo /> : <AppleLogo />}</span>
                  <span className="oauth-label">{mode === 'signup' ? 'Sign up' : 'Continue'} with {LABEL[provider]}</span>
                </button>
              ))}
            </div>
            <div className="or-divider"><span>or use your email</span></div>
            <form className="auth-form" onSubmit={submit}>
              <label>Email<input name="email" type="email" autoComplete="email" required /></label>
              <label>Password<input name="password" type="password" minLength={8} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required /></label>
              <div className="auth-actions">
                <button className="btn btn-primary" type="submit" disabled={Boolean(busy)}>{busy === 'email' ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}</button>
                <button className="btn btn-ghost" type="button" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>{mode === 'signin' ? 'Create an account' : 'I already have an account'}</button>
              </div>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
