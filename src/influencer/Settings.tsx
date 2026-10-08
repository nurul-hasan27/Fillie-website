import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { moneyMap } from '../lib/format';
import { Modal, messageOf } from '../ui/ui';
import { deleteAccount, deleteSummary, formFromProfile, removeFiles, savePayout, updateProfile, type DeleteSummary, type FormState, type Me } from './api';
import { PAYOUT_DEFAULTS, PayoutForm, ProfileForm, profilePayload, validatePayout, validateProfile, type PayoutState } from './forms';

const V_TONE = { pending: 'marigold', verified: 'green', rejected: 'coral' } as const;
const V_TEXT = { pending: 'Waiting for our check', verified: 'Verified', rejected: 'Needs a fix, please re-enter your details' } as const;

export function Settings({ me, userId, onMe, onToast, onWithdraw, focusPayout, onLeft }: { me: Me; userId: string; onMe: (me: Me) => void; onToast: (t: string, tone?: 'ok' | 'error') => void; onWithdraw: () => void; focusPayout: boolean; onLeft: () => void }) {
  const [form, setForm] = useState<FormState>(() => formFromProfile(me.profile));
  const [photo, setPhoto] = useState<string | null>(me.profile.photo_path);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editPayout, setEditPayout] = useState(focusPayout || !me.payout);
  const [payout, setPayout] = useState<PayoutState>(PAYOUT_DEFAULTS);
  const [payError, setPayError] = useState('');
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (focusPayout) document.getElementById('payout')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [focusPayout]);

  const saveProfile = async () => {
    setError('');
    const problem = validateProfile(form);
    if (problem) return setError(problem);
    setBusy(true);
    try {
      onMe(await updateProfile(profilePayload(form, photo)));
      onToast('Profile saved');
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  };

  const savePay = async () => {
    setPayError('');
    const problem = validatePayout(payout);
    if (problem) return setPayError(problem);
    setBusy(true);
    try {
      onMe(await savePayout({ ...payout }));
      setPayout(PAYOUT_DEFAULTS);
      setEditPayout(false);
      onToast('Payment details saved');
    } catch (e) {
      setPayError(messageOf(e));
    } finally {
      setBusy(false);
    }
  };

  const p = me.payout;
  return (
    <>
      <section className="panel">
        <h2>Your details</h2>
        <ProfileForm value={form} onChange={setForm} userId={userId} photoPath={photo} onPhoto={setPhoto} />
        {error && <p className="f-error" style={{ marginTop: 14 }} role="alert">{error}</p>}
        <div className="f-actions" style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={() => void saveProfile()} disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
        </div>
      </section>

      <section className="panel" id="payout">
        <h2>Payment details</h2>
        {p && !editPayout ? (
          <>
            <dl className="kv">
              <dt>Account holder</dt><dd>{p.account_holder}</dd>
              <dt>Bank</dt><dd>{p.bank_name || '—'} · account ending {p.account_last4} · {p.ifsc}</dd>
              <dt>UPI</dt><dd>{p.upi_id || '—'}</dd>
              <dt>PAN</dt><dd>{p.pan_masked}{p.pan_name ? ` · ${p.pan_name}` : ''}</dd>
              <dt>GSTIN</dt><dd>{p.gstin || '—'}</dd>
              <dt>Bank proof</dt><dd>{p.has_proof ? 'Uploaded' : 'Not uploaded'}</dd>
              <dt>Status</dt><dd><span className={`tg tg-${V_TONE[p.verification]}`}>{V_TEXT[p.verification]}</span></dd>
            </dl>
            <div className="f-actions" style={{ marginTop: 14 }}><button className="btn btn-secondary btn-sm" onClick={() => setEditPayout(true)}>Update payment details</button></div>
          </>
        ) : (
          <>
            {!p && <p className="f-warn" style={{ marginBottom: 14 }}>You have not added payment details yet. You must add them before your first withdrawal.</p>}
            {p && <p className="f-info" style={{ marginBottom: 14 }}>For your safety we only show a masked copy, so please enter every field again.</p>}
            <PayoutForm value={payout} onChange={setPayout} userId={userId} />
            {payError && <p className="f-error" style={{ marginTop: 14 }} role="alert">{payError}</p>}
            <div className="f-actions" style={{ marginTop: 16 }}>
              <button className="btn btn-primary" onClick={() => void savePay()} disabled={busy}>{busy ? 'Saving…' : 'Save payment details'}</button>
              {p && <button className="btn btn-ghost" onClick={() => { setEditPayout(false); setPayout(PAYOUT_DEFAULTS); }}>Cancel</button>}
            </div>
          </>
        )}
      </section>

      <section className="panel danger">
        <h2>Leave the programme</h2>
        <p className="muted">Deleting your influencer account turns off your promo codes and removes your personal and bank details. Your sign-in stays, so you can still use Fillie. Money you have earned must be withdrawn first.</p>
        <div className="f-actions" style={{ marginTop: 12 }}><button className="btn btn-danger btn-sm" onClick={() => setLeaving(true)}>Delete influencer account</button></div>
      </section>

      {leaving && <LeaveModal userId={userId} onClose={() => setLeaving(false)} onWithdraw={() => { setLeaving(false); onWithdraw(); }} onLeft={onLeft} />}
    </>
  );
}

function LeaveModal({ userId, onClose, onWithdraw, onLeft }: { userId: string; onClose: () => void; onWithdraw: () => void; onLeft: () => void }) {
  const [summary, setSummary] = useState<DeleteSummary | null>(null);
  const [error, setError] = useState('');
  const [forfeit, setForfeit] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    deleteSummary().then((s) => live && setSummary(s)).catch((e) => live && setError(messageOf(e)));
    return () => { live = false; };
  }, []);

  const owed = summary && Object.keys(summary.available).length > 0;
  const inReview = summary && Object.keys(summary.in_review).length > 0;
  const pending = summary && Object.keys(summary.pending).length > 0;

  const remove = async () => {
    setBusy(true);
    setError('');
    try {
      await deleteAccount(forfeit);
      await Promise.all([removeFiles('influencer-photos', userId), removeFiles('influencer-proofs', userId)]).catch(() => undefined);
      void supabase()?.auth.refreshSession();
      onLeft();
    } catch (e) {
      const m = messageOf(e);
      setError(m.includes('balance_left') ? 'You still have money to withdraw.' : m.includes('withdrawal_in_progress') ? 'A withdrawal is still being processed.' : m.includes('pending_left') ? 'Please confirm that you give up the pending commission.' : m);
      setBusy(false);
    }
  };

  return (
    <Modal title={owed ? 'Withdraw your money first' : 'Delete influencer account?'} onClose={onClose} width={500}>
      {!summary && !error && <p className="muted-p">Checking your balance…</p>}
      {error && <p className="f-error" role="alert">{error}</p>}
      {summary && owed && (
        <>
          <p className="f-warn">You still have <b>{moneyMap(summary.available)}</b> available. Withdraw it before deleting your account, so you do not lose it.</p>
          <div className="f-actions"><button className="btn btn-ok" onClick={onWithdraw}>Withdraw now</button><button className="btn btn-ghost" onClick={onClose}>Not now</button></div>
        </>
      )}
      {summary && !owed && inReview && (
        <>
          <p className="f-warn">A withdrawal of <b>{moneyMap(summary.in_review)}</b> is still being processed. You can delete your account after it has been paid.</p>
          <div className="f-actions"><button className="btn btn-ghost" onClick={onClose}>OK</button></div>
        </>
      )}
      {summary && !owed && !inReview && (
        <>
          <p>This turns off all your promo codes and erases your contact, bank and PAN details. It cannot be undone, but you can join again later with a new code.</p>
          {pending && (
            <label className="f-agree">
              <input type="checkbox" checked={forfeit} onChange={(e) => setForfeit(e.target.checked)} />
              <span>I understand that <b>{moneyMap(summary.pending)}</b> is still in the refund window and will be lost if I delete now.</span>
            </label>
          )}
          <label className="f-field"><span>Type <b>DELETE</b> to confirm</span><input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" /></label>
          <div className="f-actions">
            <button className="btn btn-danger" onClick={() => void remove()} disabled={busy || typed !== 'DELETE' || (Boolean(pending) && !forfeit)}>{busy ? 'Deleting…' : 'Delete my account'}</button>
            <button className="btn btn-ghost" onClick={onClose}>Keep it</button>
          </div>
        </>
      )}
    </Modal>
  );
}
