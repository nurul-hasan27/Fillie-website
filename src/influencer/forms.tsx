import { useState, type ChangeEvent } from 'react';
import { Avatar, Chips, Field, messageOf } from '../ui/ui';
import {
  AUDIENCE_SIZES, COLLAB_TYPES, NICHES, PLATFORMS, PROMOTE_ON, SOCIAL_KEYS, photoUrl, suggestCode, uploadFile,
  type FormState,
} from './api';

const todayMinus18 = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d.toISOString().slice(0, 10);
};

/** Mirrors the checks the database makes, so people see the problem before they press the button. */
export function validateProfile(f: FormState): string | null {
  if (f.full_name.trim().length < 2) return 'Enter your full name.';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) return 'Enter a valid email address.';
  if (f.phone.replace(/\D/g, '').length < 10) return 'Enter a valid mobile number.';
  if (!f.dob) return 'Enter your date of birth.';
  if (f.dob > todayMinus18()) return 'You must be at least 18 to join the programme.';
  if (!f.primary_platform) return 'Choose your primary platform.';
  for (const { key, label } of SOCIAL_KEYS) {
    const url = f.socials[key]?.url?.trim();
    if (url && !/^https?:\/\//i.test(url)) return `The ${label} link must start with https://`;
  }
  if (!f.niche) return 'Choose your content category.';
  if (!f.audience_location.trim()) return 'Tell us where your audience is.';
  if (!f.audience_size) return 'Choose your approximate audience size.';
  if (f.promote_on.length === 0) return 'Choose at least one place where you will promote Fillie.';
  return null;
}

export function profilePayload(f: FormState, photoPath: string | null | undefined): Record<string, unknown> {
  const socials: Record<string, unknown> = {};
  for (const { key } of SOCIAL_KEYS) {
    const s = f.socials[key];
    if (s && (s.username.trim() || s.url.trim())) socials[key] = { username: s.username.trim(), url: s.url.trim() };
  }
  return {
    full_name: f.full_name.trim(), display_name: f.display_name.trim(), email: f.email.trim(), phone: f.phone.trim(), dob: f.dob,
    city: f.city.trim(), state: f.state.trim(), socials, total_followers: Number(f.total_followers) || 0, primary_platform: f.primary_platform,
    niche: f.niche, niche_other: f.niche_other.trim(), audience_location: f.audience_location.trim(), audience_size: f.audience_size,
    description: f.description.trim(), monthly_reach: f.monthly_reach.trim(), collab_type: f.collab_type, promote_on: f.promote_on,
    photo_path: photoPath ?? '',
  };
}

interface ProfileFormProps {
  value: FormState;
  onChange: (next: FormState) => void;
  userId: string;
  photoPath: string | null;
  onPhoto: (path: string | null) => void;
  /** Show the promo code section (joining only; codes are managed on their own page afterwards). */
  withPromo?: boolean;
}

export function ProfileForm({ value, onChange, userId, photoPath, onPhoto, withPromo }: ProfileFormProps) {
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const set = <K extends keyof FormState>(key: K, next: FormState[K]) => onChange({ ...value, [key]: next });
  const text = (key: keyof FormState) => ({ value: value[key] as string, onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => set(key, e.target.value as never) });
  const setSocial = (key: string, part: 'username' | 'url', next: string) =>
    onChange({ ...value, socials: { ...value.socials, [key]: { ...(value.socials[key] ?? { username: '', url: '' }), [part]: next } } });

  const pickPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return setPhotoError('Please choose a photo under 2 MB.');
    setPhotoBusy(true);
    setPhotoError('');
    try {
      onPhoto(await uploadFile('influencer-photos', userId, file));
    } catch (error) {
      setPhotoError(messageOf(error, 'Could not upload the photo.'));
    } finally {
      setPhotoBusy(false);
    }
  };

  return (
    <div className="inf-sections">
      <section className="inf-section" data-tone="sky">
        <h3><i>1</i>Basic information</h3>
        <div className="f-grid">
          <Field label="Full name" required><input {...text('full_name')} autoComplete="name" maxLength={120} /></Field>
          <Field label="Display / creator name" hint="Shown to us instead of your full name if you add one."><input {...text('display_name')} maxLength={80} /></Field>
          <Field label="Email" required><input {...text('email')} type="email" autoComplete="email" /></Field>
          <Field label="Mobile number" required><input {...text('phone')} type="tel" autoComplete="tel" placeholder="+91 98765 43210" /></Field>
          <Field label="Date of birth" required><input {...text('dob')} type="date" max={todayMinus18()} autoComplete="bday" /></Field>
          <div className="f-field">
            <span>Profile photo</span>
            <div className="photo-pick">
              <Avatar name={value.display_name || value.full_name || '?'} src={photoUrl(photoPath)} />
              <label className="btn btn-ghost btn-sm">
                {photoBusy ? 'Uploading…' : photoPath ? 'Change photo' : 'Upload photo'}
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={pickPhoto} hidden disabled={photoBusy} />
              </label>
              {photoPath && <button type="button" className="link-btn" onClick={() => onPhoto(null)}>Remove</button>}
            </div>
            {photoError && <small style={{ color: '#b3261e' }}>{photoError}</small>}
          </div>
          <Field label="City"><input {...text('city')} autoComplete="address-level2" /></Field>
          <Field label="State"><input {...text('state')} autoComplete="address-level1" /></Field>
        </div>
      </section>

      <section className="inf-section" data-tone="marigold">
        <h3><i>2</i>Social media</h3>
        <p className="inf-hint">Add the platforms you use. Leave the rest empty.</p>
        <div className="social-rows">
          {SOCIAL_KEYS.map(({ key, label, userHint, urlHint }) => (
            <div key={key} className="social-row">
              <b>{label}</b>
              <input aria-label={`${label} username`} placeholder={userHint} value={value.socials[key]?.username ?? ''} onChange={(e) => setSocial(key, 'username', e.target.value)} maxLength={80} />
              <input aria-label={`${label} link`} placeholder={urlHint} value={value.socials[key]?.url ?? ''} onChange={(e) => setSocial(key, 'url', e.target.value)} inputMode="url" maxLength={300} />
            </div>
          ))}
        </div>
        <div className="f-grid" style={{ marginTop: 14 }}>
          <Field label="Total followers (all platforms)"><input {...text('total_followers')} inputMode="numeric" pattern="[0-9]*" placeholder="e.g. 52000" /></Field>
          <Field label="Primary platform" required>
            <select {...text('primary_platform')}><option value="">Choose…</option>{PLATFORMS.map((p) => <option key={p}>{p}</option>)}</select>
          </Field>
        </div>
      </section>

      <section className="inf-section" data-tone="coral">
        <h3><i>3</i>Creator information</h3>
        <div className="f-grid">
          <div className="f-field full">
            <span className="f-label">Content category / niche <em>*</em></span>
            <Chips options={NICHES} value={value.niche ? [value.niche] : []} onChange={(v) => set('niche', v[0] ?? '')} />
          </div>
          {value.niche === 'Other' && <Field label="Tell us your niche" full><input {...text('niche_other')} maxLength={80} /></Field>}
          <Field label="Audience location" required hint="Country or cities your followers are mostly in."><input {...text('audience_location')} placeholder="e.g. India, mostly Tier-1 cities" /></Field>
          <Field label="Approximate audience size" required>
            <select {...text('audience_size')}><option value="">Choose…</option>{AUDIENCE_SIZES.map((s) => <option key={s}>{s}</option>)}</select>
          </Field>
          <Field label="Typical monthly reach / views"><input {...text('monthly_reach')} placeholder="e.g. 200k views a month" /></Field>
          <Field label="Preferred collaboration type">
            <select {...text('collab_type')}><option value="">Choose…</option>{COLLAB_TYPES.map((c) => <option key={c}>{c}</option>)}</select>
          </Field>
          <Field label="Short description about your content" full><textarea {...text('description')} maxLength={1000} placeholder="What do you make, and who is it for?" /></Field>
        </div>
      </section>

      <section className="inf-section" data-tone="green">
        <h3><i>4</i>Promotion details</h3>
        <div className="f-grid">
          {withPromo && (
            <Field label="Preferred promo code" required hint="4 to 16 letters or numbers. Leave it empty and we will make one for you." full>
              <div className="inline-input">
                <input {...text('promo_code')} maxLength={16} placeholder="e.g. ASHA10" style={{ textTransform: 'uppercase' }} />
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => set('promo_code', suggestCode(value.display_name || value.full_name))}>Suggest one</button>
              </div>
            </Field>
          )}
          <div className="f-field full">
            <span className="f-label">Where will you promote Fillie? <em>*</em> <small>(choose all that apply)</small></span>
            <Chips multiple options={PROMOTE_ON} value={value.promote_on} onChange={(v) => set('promote_on', v)} />
          </div>
        </div>
      </section>
    </div>
  );
}

export interface PayoutState {
  account_holder: string; account_number: string; account_number_confirm: string; ifsc: string; bank_name: string; upi_id: string;
  pan: string; pan_name: string; gstin: string; proof_path: string;
}
export const PAYOUT_DEFAULTS: PayoutState = { account_holder: '', account_number: '', account_number_confirm: '', ifsc: '', bank_name: '', upi_id: '', pan: '', pan_name: '', gstin: '', proof_path: '' };

export function validatePayout(p: PayoutState): string | null {
  if (p.account_holder.trim().length < 2) return 'Enter the account holder name.';
  if (!/^\d{9,18}$/.test(p.account_number.replace(/\s/g, ''))) return 'Enter a valid bank account number (9 to 18 digits).';
  if (p.account_number.replace(/\s/g, '') !== p.account_number_confirm.replace(/\s/g, '')) return 'The account numbers do not match.';
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(p.ifsc.trim().toUpperCase())) return 'Enter a valid IFSC code, for example HDFC0001234.';
  if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(p.pan.trim().toUpperCase())) return 'Enter a valid PAN, for example ABCDE1234F.';
  if (p.upi_id.trim() && !/^[a-z0-9._-]{2,}@[a-z]{2,}$/i.test(p.upi_id.trim())) return 'Enter a valid UPI ID, for example name@bank.';
  return null;
}

export function PayoutForm({ value, onChange, userId }: { value: PayoutState; onChange: (next: PayoutState) => void; userId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const bind = (key: keyof PayoutState, upper = false) => ({ value: value[key], onChange: (e: ChangeEvent<HTMLInputElement>) => onChange({ ...value, [key]: upper ? e.target.value.toUpperCase() : e.target.value }) });
  const pick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return setError('Please choose a file under 5 MB.');
    setBusy(true);
    setError('');
    try {
      onChange({ ...value, proof_path: await uploadFile('influencer-proofs', userId, file) });
    } catch (e) {
      setError(messageOf(e, 'Could not upload the file.'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="f-grid">
      <Field label="Account holder name" required><input {...bind('account_holder')} autoComplete="off" maxLength={120} /></Field>
      <Field label="Bank name"><input {...bind('bank_name')} maxLength={80} /></Field>
      <Field label="Bank account number" required><input {...bind('account_number')} inputMode="numeric" autoComplete="off" maxLength={24} /></Field>
      <Field label="Confirm bank account number" required><input {...bind('account_number_confirm')} inputMode="numeric" autoComplete="off" maxLength={24} onPaste={(e) => e.preventDefault()} /></Field>
      <Field label="IFSC code" required><input {...bind('ifsc', true)} autoComplete="off" maxLength={11} placeholder="HDFC0001234" /></Field>
      <Field label="UPI ID"><input {...bind('upi_id')} autoComplete="off" maxLength={80} placeholder="name@bank" /></Field>
      <Field label="PAN number" required hint="Needed for tax on your commission."><input {...bind('pan', true)} autoComplete="off" maxLength={10} placeholder="ABCDE1234F" /></Field>
      <Field label="Name on PAN"><input {...bind('pan_name')} maxLength={120} /></Field>
      <Field label="GSTIN (only if you are GST registered)"><input {...bind('gstin', true)} maxLength={15} /></Field>
      <div className="f-field">
        <span>Cancelled cheque / bank proof <small>(optional, helps us verify faster)</small></span>
        <label className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }}>
          {busy ? 'Uploading…' : value.proof_path ? 'Replace file ✓' : 'Upload file'}
          <input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={pick} hidden disabled={busy} />
        </label>
        {error && <small style={{ color: '#b3261e' }}>{error}</small>}
      </div>
    </div>
  );
}
