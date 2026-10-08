import { useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { displayName } from '../account/useAccount';
import { BUSINESS } from '../config';
import { messageOf } from '../ui/ui';
import { apply, FORM_DEFAULTS, type FormState, type Me } from './api';
import { PAYOUT_DEFAULTS, PayoutForm, ProfileForm, profilePayload, validatePayout, validateProfile, type PayoutState } from './forms';

const AGREEMENTS = [
  { key: 'agree_accurate', text: 'I confirm the information I have provided is accurate.' },
  { key: 'agree_terms', text: 'I agree to the influencer commission terms.' },
  { key: 'agree_withdrawal', text: 'I agree to the withdrawal and payment policy.' },
  { key: 'agree_fraud', text: 'I understand that fraudulent or self-referral orders may result in commission cancellation.' },
] as const;

/** The "become an influencer" form: basics, socials, creator info, promotion, payment (skippable) and agreements. */
export function Onboarding({ session, onJoined }: { session: Session; onJoined: (me: Me) => void }) {
  const userId = session.user.id;
  const [form, setForm] = useState<FormState>(() => ({ ...FORM_DEFAULTS, email: session.user.email ?? '', full_name: displayName(session) === (session.user.email ?? '').split('@')[0] ? '' : displayName(session) }));
  const [photo, setPhoto] = useState<string | null>(null);
  const [payNow, setPayNow] = useState(false);
  const [payout, setPayout] = useState<PayoutState>(PAYOUT_DEFAULTS);
  const [agreed, setAgreed] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const allAgreed = useMemo(() => AGREEMENTS.every((a) => agreed[a.key]), [agreed]);

  const submit = async () => {
    setError('');
    const problem = validateProfile(form) ?? (payNow ? validatePayout(payout) : null) ?? (allAgreed ? null : 'Please accept all four agreements to join.');
    if (problem) {
      setError(problem);
      return window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
    setBusy(true);
    try {
      const me = await apply({
        ...profilePayload(form, photo),
        promo_code: form.promo_code.trim(),
        ...Object.fromEntries(AGREEMENTS.map((a) => [a.key, true])),
        ...(payNow ? { payout: { ...payout, proof_path: payout.proof_path } } : {}),
      });
      onJoined(me);
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="inf-onboard">
      <header className="inf-intro">
        <h1>Join the creator programme</h1>
        <p>Tell us about you. It takes about five minutes, and you get your promo code the moment you finish.</p>
      </header>

      <ProfileForm value={form} onChange={setForm} userId={userId} photoPath={photo} onPhoto={setPhoto} withPromo />

      <section className="inf-section" data-tone="ink">
        <h3><i>5</i>Payment details</h3>
        {payNow ? (
          <>
            <PayoutForm value={payout} onChange={setPayout} userId={userId} />
            <button type="button" className="link-btn" style={{ marginTop: 10 }} onClick={() => setPayNow(false)}>Skip for now</button>
          </>
        ) : (
          <div className="inf-skip">
            <p>You can add your bank details now, or skip and add them later in <b>Settings</b>.</p>
            <p className="f-warn">You must add your bank details and PAN before your first withdrawal.</p>
            <div className="f-actions">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPayNow(true)}>Add payment details now</button>
              <span className="muted-p">or just continue, nothing is lost</span>
            </div>
          </div>
        )}
      </section>

      <section className="inf-section" data-tone="sand">
        <h3><i>6</i>Verification &amp; agreement</h3>
        <p className="inf-hint">Government ID is not needed to join. We verify your PAN and bank account when you ask for your first payout, and may ask for an ID if the law requires it.</p>
        <details className="inf-terms">
          <summary>Read the commission terms</summary>
          <ul>
            <li>Every customer who pays with your code gets <b>10% off</b> Fillie, and you earn <b>10% of the amount they actually pay</b> (after any discounts), per order.</li>
            <li>A commission is <b>pending</b> for the refund window (7 days), then becomes <b>approved</b> and can be withdrawn. Refunded orders are reversed.</li>
            <li>You can withdraw your full available balance once it passes the minimum. Income-tax (TDS) and any transfer fee are shown to you <b>before</b> you confirm.</li>
            <li>Buying with your own code, using fake accounts, or any other abuse cancels the commission and may end your participation.</li>
            <li>You may leave at any time after withdrawing what is owed to you. Questions: {BUSINESS.email.includes('YOUR-DOMAIN') ? 'use the Support tab' : BUSINESS.email}.</li>
          </ul>
        </details>
        <div className="inf-agree">
          {AGREEMENTS.map((a) => (
            <label key={a.key} className="f-agree">
              <input type="checkbox" checked={Boolean(agreed[a.key])} onChange={(e) => setAgreed({ ...agreed, [a.key]: e.target.checked })} />
              <span>{a.text} <em style={{ color: 'var(--coral)', fontStyle: 'normal' }}>*</em></span>
            </label>
          ))}
        </div>
      </section>

      {error && <p className="f-error" role="alert">{error}</p>}
      <div className="inf-submit">
        <button className="btn btn-primary btn-lg" onClick={() => void submit()} disabled={busy}>{busy ? 'Creating your account…' : 'Join and get my promo code'}</button>
        <span className="muted-p">Signed in as {session.user.email}</span>
      </div>
    </div>
  );
}
