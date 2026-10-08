import { useState } from 'react';
import { moneyMap, percent } from '../lib/format';
import { Field, CopyButton, messageOf } from '../ui/ui';
import { createCode, setCodeActive, suggestCode, type Dashboard as Data, type Me } from './api';
import { shareLink } from './Dashboard';

export function Codes({ me, data, onMe, onToast }: { me: Me; data: Data | null; onMe: (me: Me) => void; onToast: (text: string, tone?: 'ok' | 'error') => void }) {
  const [wanted, setWanted] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const stats = new Map((data?.codes ?? []).map((c) => [c.id, c]));
  const full = me.codes.length >= me.max_codes;
  const suspended = me.profile.status !== 'active';

  const add = async () => {
    setBusy(true);
    setError('');
    try {
      onMe(await createCode(wanted.trim()));
      setWanted('');
      onToast('New promo code created');
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  };
  const toggle = async (id: string, active: boolean) => {
    try {
      onMe(await setCodeActive(id, active));
      onToast(active ? 'Code is live again' : 'Code paused. Nobody can use it until you turn it back on.');
    } catch (e) {
      onToast(messageOf(e), 'error');
    }
  };

  return (
    <>
      <section className="panel">
        <h2>Your promo codes <small>{me.codes.length} of {me.max_codes}</small></h2>
        <p className="muted">Anyone who enters one of these at checkout gets {percent(me.codes[0]?.discount_bps ?? 1000)} off Fillie, and you earn {percent(me.commission_bps)} of what they pay. Share the link and the code is filled in for them.</p>
        <div className="code-cards">
          {me.codes.map((c) => {
            const s = stats.get(c.id);
            return (
              <article key={c.id} className="code-card" data-active={String(c.active)}>
                <div className="code-top">
                  <code className="code-big">{c.code}</code>
                  <span className={`tg ${c.active ? 'tg-green' : 'tg-sand'}`}>{c.active ? 'Live' : 'Paused'}</span>
                </div>
                <dl className="code-stats">
                  <div><dt>Orders</dt><dd>{s?.orders ?? 0}</dd></div>
                  <div><dt>Customers paid</dt><dd>{moneyMap(s?.revenue)}</dd></div>
                  <div><dt>You earned</dt><dd>{moneyMap(s?.commission)}</dd></div>
                </dl>
                <div className="f-actions">
                  <CopyButton text={c.code} label="Copy code" />
                  <CopyButton text={shareLink(c.code)} label="Copy link" />
                  <button className="btn btn-ghost btn-sm" onClick={() => void toggle(c.id, !c.active)} disabled={suspended}>{c.active ? 'Pause' : 'Turn on'}</button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <h2>Make another code</h2>
        <p className="muted">Use a different code per platform to see which one works best. You can have up to {me.max_codes}.</p>
        {suspended && <p className="f-warn">Your account is suspended, so new codes are off. Contact support.</p>}
        <div className="f-grid" style={{ marginTop: 12 }}>
          <Field label="Code" hint="4 to 16 letters or numbers. Leave empty to get one made for you.">
            <div className="inline-input">
              <input value={wanted} onChange={(e) => setWanted(e.target.value)} maxLength={16} placeholder="e.g. ASHAYT" style={{ textTransform: 'uppercase' }} disabled={full || suspended} />
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setWanted(suggestCode(me.profile.display_name || me.profile.full_name))} disabled={full || suspended}>Suggest</button>
            </div>
          </Field>
        </div>
        {error && <p className="f-error" style={{ marginTop: 10 }} role="alert">{error}</p>}
        <div className="f-actions" style={{ marginTop: 12 }}>
          <button className="btn btn-primary" onClick={() => void add()} disabled={busy || full || suspended}>{busy ? 'Creating…' : 'Create code'}</button>
          {full && <span className="muted">You have reached the limit. Paused codes still count towards it.</span>}
        </div>
      </section>
    </>
  );
}
