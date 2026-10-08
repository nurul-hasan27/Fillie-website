import { useEffect, useState } from 'react';
import { day, moneyMap, num, percent } from '../lib/format';
import { CopyButton, Modal, messageOf, useToast } from '../ui/ui';
import { deleteOffer, discountOffers, saveOffer, setOfferActive, type OfferRow } from './influencer-api';

const blank = { id: '', code: '', title: '', percent: '10', starts_at: '', ends_at: '', max_uses: '', note: '', active: true, listed: true };
type FormState = typeof blank;

/** datetime-local wants "YYYY-MM-DDTHH:mm" in local time. */
const toLocal = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromLocal = (value: string) => (value ? new Date(value).toISOString() : '');

function state(o: OfferRow): { text: string; tone: string } {
  const now = Date.now();
  if (!o.active) return { text: 'Off', tone: 'sand' };
  if (o.starts_at && new Date(o.starts_at).getTime() > now) return { text: 'Scheduled', tone: 'sky' };
  if (o.ends_at && new Date(o.ends_at).getTime() < now) return { text: 'Expired', tone: 'coral' };
  if (o.max_uses !== null && o.uses >= o.max_uses) return { text: 'Used up', tone: 'coral' };
  return { text: 'Live', tone: 'green' };
}

export function Offers() {
  const [rows, setRows] = useState<OfferRow[] | null>(null);
  const [error, setError] = useState('');
  const [edit, setEdit] = useState<FormState | null>(null);
  const [version, setVersion] = useState(0);
  const toast = useToast();

  useEffect(() => {
    let live = true;
    discountOffers().then((r) => live && setRows(r)).catch((e) => live && setError(messageOf(e, 'Could not load offers.')));
    return () => { live = false; };
  }, [version]);

  const reload = () => setVersion((n) => n + 1);
  const live = rows?.filter((o) => state(o).text === 'Live') ?? [];
  const uses = rows?.reduce((a, o) => a + o.uses, 0) ?? 0;

  return (
    <>
      <section className="kpis">
        <div className="kpi" data-tone="green"><span className="kpi-label">Live offers</span><strong>{live.length}</strong><span className="kpi-sub">customers can use them now</span></div>
        <div className="kpi" data-tone="marigold"><span className="kpi-label">Times used</span><strong>{num(uses)}</strong><span className="kpi-sub">across all offers</span></div>
        <div className="kpi" data-tone="sky"><span className="kpi-label">Discount given</span><strong style={{ fontSize: 26 }}>{moneyMap(rows?.reduce<Record<string, number>>((m, o) => { for (const [c, v] of Object.entries(o.discount_given)) m[c] = (m[c] ?? 0) + v; return m; }, {}), '₹0')}</strong><span className="kpi-sub">taken off customer payments</span></div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Offers <small>{rows?.length ?? 0}</small></h2>
          <button className="btn btn-primary btn-sm" onClick={() => setEdit({ ...blank })}>+ Create offer</button>
        </div>
        <p className="muted" style={{ marginBottom: 8 }}>An offer code takes an extra percentage off what the customer pays. It works together with an influencer promo code: the promo applies first, then the offer comes off the price that is left.</p>
        {error && <p className="f-error">{error}<br />If this says the function does not exist, run migrations 0005 to 0007 on your Supabase project.</p>}
        {!rows && !error && <div className="adm-center" style={{ minHeight: 160 }}><span className="adm-spinner" /></div>}
        {rows && rows.length === 0 && <p className="muted">No offers yet. Create one, for example <code>DIWALI10</code> for 10% off during a sale.</p>}
        {rows && rows.length > 0 && (
          <div className="table-wrap"><table className="adm-table">
            <thead><tr><th>Code</th><th>Offer</th><th>Discount</th><th>Runs</th><th>Used</th><th>Discount given</th><th>Status</th><th /></tr></thead>
            <tbody>{rows.map((o) => {
              const s = state(o);
              return (
                <tr key={o.id}>
                  <td><code>{o.code}</code> <CopyButton text={o.code} label="Copy" className="link-btn dark" /></td>
                  <td>{o.title || '—'}{o.note && <div className="muted">{o.note}</div>}<span className={`tg ${o.listed ? 'tg-sky' : 'tg-sand'}`} style={{ marginTop: 4 }}>{o.listed ? 'Public' : 'Hidden'}</span></td>
                  <td><b>{percent(o.discount_bps)}</b> off</td>
                  <td>{o.starts_at ? day(o.starts_at) : 'now'} → {o.ends_at ? day(o.ends_at) : 'no end'}</td>
                  <td>{o.uses}{o.max_uses !== null ? ` / ${o.max_uses}` : ''}</td>
                  <td>{moneyMap(o.discount_given)}</td>
                  <td><span className={`tg tg-${s.tone}`}>{s.text}</span></td>
                  <td className="row-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => setEdit({ id: o.id, code: o.code, title: o.title, percent: String(o.discount_bps / 100), starts_at: toLocal(o.starts_at), ends_at: toLocal(o.ends_at), max_uses: o.max_uses === null ? '' : String(o.max_uses), note: o.note, active: o.active, listed: o.listed })}>Edit</button>
                    <button className="btn btn-ghost btn-sm" onClick={async () => { try { await setOfferActive(o.id, !o.active); reload(); } catch (e) { toast.show(messageOf(e), 'error'); } }}>{o.active ? 'Turn off' : 'Turn on'}</button>
                    {o.uses === 0 && <button className="btn btn-ghost btn-sm" onClick={async () => { if (!confirm(`Delete ${o.code}?`)) return; try { await deleteOffer(o.id); reload(); } catch (e) { toast.show(messageOf(e), 'error'); } }}>Delete</button>}
                  </td>
                </tr>
              );
            })}</tbody>
          </table></div>
        )}
      </section>

      {edit && <OfferForm initial={edit} onClose={() => setEdit(null)} onSaved={(code) => { setEdit(null); reload(); toast.show(`Offer ${code} saved`); }} />}
      {toast.node}
    </>
  );
}

function OfferForm({ initial, onClose, onSaved }: { initial: FormState; onClose: () => void; onSaved: (code: string) => void }) {
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k: keyof FormState, v: string | boolean) => setF({ ...f, [k]: v });
  const price = (p: number) => `₹449 → ₹${Math.round(449 * (1 - p / 100))}`;
  const pct = Number(f.percent);

  const submit = async () => {
    setError('');
    if (!(pct >= 1 && pct <= 90)) return setError('The discount must be between 1% and 90%.');
    setBusy(true);
    try {
      const saved = await saveOffer({
        id: f.id || undefined, code: f.code.trim(), title: f.title.trim(), discount_percent: pct, starts_at: fromLocal(f.starts_at), ends_at: fromLocal(f.ends_at),
        max_uses: f.max_uses ? Number(f.max_uses) : '', note: f.note.trim(), active: f.active, listed: f.listed,
      });
      onSaved(saved.code);
    } catch (e) {
      setError(messageOf(e));
      setBusy(false);
    }
  };

  return (
    <Modal title={f.id ? 'Edit offer' : 'Create an offer'} onClose={onClose} width={560}>
      <div className="f-grid">
        <label className="f-field"><span>Offer code</span><input value={f.code} onChange={(e) => set('code', e.target.value.toUpperCase())} maxLength={16} placeholder="DIWALI10" /><small>4 to 16 letters or numbers. Leave empty to generate one.</small></label>
        <label className="f-field"><span>Discount (%)</span><input value={f.percent} onChange={(e) => set('percent', e.target.value)} inputMode="decimal" /><small>{pct >= 1 && pct <= 90 ? `On top of any promo code. Example: ${price(pct)}` : '1% to 90%'}</small></label>
        <label className="f-field full"><span>Name (for you)</span><input value={f.title} onChange={(e) => set('title', e.target.value)} maxLength={80} placeholder="Diwali sale" /></label>
        <label className="f-field"><span>Starts</span><input type="datetime-local" value={f.starts_at} onChange={(e) => set('starts_at', e.target.value)} /><small>Empty = starts now</small></label>
        <label className="f-field"><span>Ends</span><input type="datetime-local" value={f.ends_at} onChange={(e) => set('ends_at', e.target.value)} /><small>Empty = never ends</small></label>
        <label className="f-field"><span>Maximum uses</span><input value={f.max_uses} onChange={(e) => set('max_uses', e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="Unlimited" /></label>
        <label className="f-agree" style={{ alignSelf: 'end' }}><input type="checkbox" checked={f.active} onChange={(e) => set('active', e.target.checked)} /><span>Offer is on</span></label>
        <label className="f-agree full"><input type="checkbox" checked={f.listed} onChange={(e) => set('listed', e.target.checked)} /><span><b>Show in "Explore offers"</b> so customers can find and apply it. Turn off for a private code you share yourself.</span></label>
        <label className="f-field full"><span>Note</span><input value={f.note} onChange={(e) => set('note', e.target.value)} maxLength={500} placeholder="Optional" /></label>
      </div>
      {error && <p className="f-error" role="alert">{error}</p>}
      <div className="f-actions"><button className="btn btn-primary" disabled={busy} onClick={() => void submit()}>{busy ? 'Saving…' : f.id ? 'Save offer' : 'Create offer'}</button><button className="btn btn-ghost" onClick={onClose}>Cancel</button></div>
    </Modal>
  );
}
