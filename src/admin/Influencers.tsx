import { useCallback, useEffect, useMemo, useState } from 'react';
import { day, dayTime, money, moneyMap, num, percent } from '../lib/format';
import { Avatar, Modal, messageOf, useToast } from '../ui/ui';
import { photoUrl } from '../influencer/api';
import {
  fraudFlags, inbox, influencerDetail, infOverview, ledger, ledgerAction, listInfluencers, orderId, proofLink, resolveMessage, setInfluencerStatus,
  setPayoutVerification, withdrawalAction, withdrawalDetail, withdrawals, getSettings, setSettings,
  type Flag, type InboxMessage, type InfDetail, type InfOverview, type InfRow, type LedgerRow, type LedgerStatus, type Settings, type Verification,
  type WithdrawalDetail, type WithdrawalListRow, type WithdrawalStatus,
} from './influencer-api';
import { SOCIAL_KEYS } from '../influencer/api';

type Sub = 'list' | 'withdrawals' | 'ledger' | 'fraud' | 'support' | 'settings';

const L_TONE: Record<LedgerStatus, string> = { pending: 'marigold', approved: 'green', cancelled: 'sand', reversed: 'coral' };
const W_TONE: Record<WithdrawalStatus, string> = { pending: 'marigold', approved: 'sky', paid: 'green', rejected: 'coral' };
const V_TONE: Record<Verification | 'none', string> = { pending: 'marigold', verified: 'green', rejected: 'coral', none: 'sand' };
const V_TEXT: Record<Verification | 'none', string> = { pending: 'Unverified', verified: 'Verified', rejected: 'Rejected', none: 'No details' };
const S_TONE = { active: 'green', suspended: 'marigold', deleted: 'sand' } as const;
const S_TEXT = { active: 'Active', suspended: 'Suspended', deleted: 'Deleted account' } as const;

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: 'sky' | 'marigold' | 'green' | 'coral' | 'ink' | 'sand' }) {
  return <div className="kpi" data-tone={tone}><span className="kpi-label">{label}</span><strong>{value}</strong>{sub && <span className="kpi-sub">{sub}</span>}</div>;
}

export function Influencers({ initialInfluencer, onOpenedInfluencer }: { initialInfluencer?: string | null; onOpenedInfluencer?: () => void }) {
  const [sub, setSub] = useState<Sub>('list');
  const [overview, setOverview] = useState<InfOverview | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [openWithdrawal, setOpenWithdrawal] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const toast = useToast();

  const reload = useCallback(() => setTick((n) => n + 1), []);
  useEffect(() => {
    infOverview().then(setOverview).catch(() => setOverview(null));
  }, [tick]);
  useEffect(() => {
    if (initialInfluencer) { setOpenId(initialInfluencer); onOpenedInfluencer?.(); }
  }, [initialInfluencer, onOpenedInfluencer]);

  return (
    <>
      <section className="kpis">
        <Kpi tone="green" label="Active influencers" value={num(overview?.active_influencers ?? 0)} sub={`${num(overview?.total_influencers ?? 0)} joined in total`} />
        <Kpi tone="ink" label="Commission generated" value={moneyMap(overview?.commission_generated, '₹0')} sub={`${num(overview?.orders ?? 0)} orders · ${moneyMap(overview?.influencer_revenue, '₹0')} paid by customers`} />
        <Kpi tone="marigold" label="Pending withdrawals" value={num(overview?.pending_withdrawals ?? 0)} sub={moneyMap(overview?.pending_withdrawal_minor, 'nothing waiting')} />
        <Kpi tone="coral" label="Still owed to influencers" value={moneyMap(overview?.commission_owed, '₹0')} sub="earned and not yet paid out" />
      </section>

      <nav className="tabs-sub" role="tablist" aria-label="Influencer sections">
        {([['list', 'Influencers'], ['withdrawals', 'Withdrawal management'], ['ledger', 'Transaction ledger'], ['fraud', 'Suspicious activity'], ['support', 'Support'], ['settings', 'Programme settings']] as const).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={sub === id} onClick={() => setSub(id)}>
            {label}
            {id === 'withdrawals' && overview && overview.pending_withdrawals > 0 && <span className="badge">{overview.pending_withdrawals}</span>}
            {id === 'support' && overview && overview.open_messages > 0 && <span className="badge">{overview.open_messages}</span>}
          </button>
        ))}
      </nav>

      {sub === 'list' && <InfluencerList tick={tick} onOpen={setOpenId} />}
      {sub === 'withdrawals' && <Withdrawals tick={tick} onOpen={setOpenWithdrawal} />}
      {sub === 'ledger' && <Ledger tick={tick} onChanged={reload} onOpenInfluencer={setOpenId} toast={toast.show} />}
      {sub === 'fraud' && <Fraud onOpenInfluencer={setOpenId} />}
      {sub === 'support' && <Inbox tick={tick} onChanged={reload} onOpenInfluencer={setOpenId} />}
      {sub === 'settings' && <ProgrammeSettings toast={toast.show} />}

      {openId && <InfluencerModal id={openId} onClose={() => setOpenId(null)} onChanged={reload} toast={toast.show} />}
      {openWithdrawal !== null && <WithdrawalModal id={openWithdrawal} onClose={() => setOpenWithdrawal(null)} onChanged={reload} onOpenInfluencer={(id) => { setOpenWithdrawal(null); setOpenId(id); }} toast={toast.show} />}
      {toast.node}
    </>
  );
}

/* ----------------------------------------------------------------------------------------------- influencers */

function useLoad<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    setError('');
    load().then((d) => live && setData(d)).catch((e) => live && setError(messageOf(e, 'Could not load.')));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { data, error, setData };
}

const Loading = ({ error }: { error: string }) => (error ? <p className="f-error">{error}</p> : <div className="adm-center" style={{ minHeight: 200 }}><span className="adm-spinner" /></div>);

function InfluencerList({ tick, onOpen }: { tick: number; onOpen: (id: string) => void }) {
  const { data, error } = useLoad(listInfluencers, [tick]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | InfRow['status']>('all');
  const rows = useMemo(() => (data ?? []).filter((r) => (status === 'all' || r.status === status) && `${r.name} ${r.full_name} ${r.codes.map((c) => c.code).join(' ')} ${r.city} ${r.state}`.toLowerCase().includes(q.toLowerCase())), [data, q, status]);
  if (!data) return <Loading error={error} />;
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Influencers <small>{rows.length}</small></h2>
        <div className="f-actions">
          <div className="chips">{(['all', 'active', 'suspended', 'deleted'] as const).map((s) => <button key={s} className={`tg tg-${s === 'all' ? 'sky' : S_TONE[s]}${status === s ? ' on' : ''}`} onClick={() => setStatus(s)}>{s === 'all' ? 'all' : s === 'deleted' ? 'deleted account' : s}</button>)}</div>
          <input className="adm-input" placeholder="Search name, code or city…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      {rows.length === 0 && <p className="muted">{data.length === 0 ? 'No influencers have joined yet. Share fillie-website.vercel.app/influencer with creators.' : 'Nobody matches.'}</p>}
      <div className="inf-boxes">
        {rows.map((r) => (
          <button key={r.id} className="inf-box" data-status={r.status} onClick={() => onOpen(r.id)} aria-label={`Open ${r.name}`}>
            <div className="inf-box-top">
              <Avatar name={r.name} src={photoUrl(r.photo_path)} />
              <div className="inf-box-name"><b>{r.name}</b><span>{[r.city, r.state].filter(Boolean).join(', ') || r.primary_platform || '—'}</span></div>
              <span className={`tg tg-${S_TONE[r.status]}`}>{S_TEXT[r.status]}</span>
            </div>
            <div className="inf-box-codes">{r.codes.length ? r.codes.map((c) => <code key={c.code} data-off={String(!c.active)}>{c.code}</code>) : <span className="muted">no codes</span>}</div>
            <dl className="inf-box-stats">
              <div><dt>Orders</dt><dd>{num(r.orders)}</dd></div>
              <div><dt>Revenue</dt><dd>{moneyMap(r.revenue, '₹0')}</dd></div>
              <div><dt>Commission</dt><dd>{moneyMap(r.commission, '₹0')}</dd></div>
              <div><dt>Balance</dt><dd>{moneyMap(r.balance, '₹0')}</dd></div>
            </dl>
          </button>
        ))}
      </div>
    </section>
  );
}

function InfluencerModal({ id, onClose, onChanged, toast }: { id: string; onClose: () => void; onChanged: () => void; toast: (t: string, tone?: 'ok' | 'error') => void }) {
  const [version, setVersion] = useState(0);
  const { data: d, error } = useLoad<InfDetail>(() => influencerDetail(id), [id, version]);
  const [proof, setProof] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try { await fn(); toast(ok); setVersion((n) => n + 1); onChanged(); } catch (e) { toast(messageOf(e), 'error'); } finally { setBusy(false); }
  };
  const viewProof = async (path: string) => setProof(await proofLink(path));

  return (
    <Modal title={d ? String(d.profile.display_name || d.profile.full_name) : 'Influencer'} onClose={onClose} width={980}>
      {!d ? <Loading error={error} /> : (() => {
        const p = d.profile;
        const socials = (p.socials ?? {}) as Record<string, { username: string; url: string }>;
        const status = p.status as InfRow['status'];
        return (
          <>
            <div className="f-actions">
              <Avatar name={String(p.display_name || p.full_name)} src={photoUrl(p.photo_path)} />
              <span className={`tg tg-${S_TONE[status]}`}>{S_TEXT[status]}</span>
              <span className="muted">Joined {day(p.created_at)}{p.deleted_at ? ` · left ${day(p.deleted_at)}` : ''}</span>
              {status !== 'deleted' && (
                <span style={{ marginLeft: 'auto' }}>
                  {status === 'active'
                    ? <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void act(() => setInfluencerStatus(id, 'suspended'), 'Influencer suspended. Their codes stop working.')}>Suspend</button>
                    : <button className="btn btn-ok btn-sm" disabled={busy} onClick={() => void act(() => setInfluencerStatus(id, 'active'), 'Influencer is active again')}>Reactivate</button>}
                </span>
              )}
            </div>

            <section className="kpis">
              <Kpi tone="sky" label="Orders" value={num(d.totals.orders)} />
              <Kpi tone="sand" label="Revenue (paid by customers)" value={moneyMap(d.totals.revenue, '₹0')} />
              <Kpi tone="ink" label="Commission" value={moneyMap(d.totals.commission, '₹0')} />
              <Kpi tone="green" label="Balance to withdraw" value={moneyMap(d.balance, '₹0')} sub={`${moneyMap(d.totals.paid_out, '₹0')} paid out`} />
            </section>

            <div className="adm-grid">
              <article className="panel">
                <h2>Profile</h2>
                <dl className="kv">
                  <dt>Full name</dt><dd>{p.full_name}</dd>
                  <dt>Email</dt><dd>{p.email || '—'}{d.sign_in_email && d.sign_in_email !== p.email ? <span className="muted"> · signs in as {d.sign_in_email}</span> : null}</dd>
                  <dt>Mobile</dt><dd>{p.phone || '—'}</dd>
                  <dt>Date of birth</dt><dd>{p.dob ? day(p.dob) : '—'}</dd>
                  <dt>Location</dt><dd>{[p.city, p.state].filter(Boolean).join(', ') || '—'}</dd>
                  <dt>Primary platform</dt><dd>{p.primary_platform || '—'} · {num(Number(p.total_followers) || 0)} followers</dd>
                  <dt>Socials</dt>
                  <dd>{SOCIAL_KEYS.filter((s) => socials[s.key]).map((s) => <div key={s.key}>{s.label}: {socials[s.key]!.url ? <a href={socials[s.key]!.url} target="_blank" rel="noreferrer">{socials[s.key]!.username || socials[s.key]!.url}</a> : socials[s.key]!.username}</div>)}{Object.keys(socials).length === 0 && '—'}</dd>
                  <dt>Niche</dt><dd>{p.niche}{p.niche === 'Other' && p.niche_other ? ` (${p.niche_other})` : ''}</dd>
                  <dt>Audience</dt><dd>{p.audience_size || '—'} · {p.audience_location || '—'}{p.monthly_reach ? ` · ${p.monthly_reach}` : ''}</dd>
                  <dt>Promotes on</dt><dd>{(p.promote_on ?? []).join(', ') || '—'}</dd>
                  <dt>Collaboration</dt><dd>{p.collab_type || '—'}</dd>
                  <dt>About</dt><dd>{p.description || '—'}</dd>
                  <dt>Agreed to terms</dt><dd>{dayTime(p.agreed_at)} (v{p.terms_version})</dd>
                </dl>
              </article>
              <article className="panel">
                <h2>Payment details</h2>
                {!d.payout ? <p className="muted">{status === 'deleted' ? 'Removed when the account was deleted.' : 'Not added yet. They cannot withdraw until they do.'}</p> : (
                  <>
                    <dl className="kv">
                      <dt>Account holder</dt><dd>{d.payout.account_holder}</dd>
                      <dt>Account number</dt><dd>{d.payout.account_number}</dd>
                      <dt>IFSC · bank</dt><dd>{d.payout.ifsc} · {d.payout.bank_name || '—'}</dd>
                      <dt>UPI</dt><dd>{d.payout.upi_id || '—'}</dd>
                      <dt>PAN</dt><dd>{d.payout.pan}{d.payout.pan_name ? ` · ${d.payout.pan_name}` : ''}</dd>
                      <dt>GSTIN</dt><dd>{d.payout.gstin || '—'}</dd>
                      <dt>Bank proof</dt><dd>{d.payout.proof_path ? (proof ? <a href={proof} target="_blank" rel="noreferrer">Open file</a> : <button className="link-btn" onClick={() => void viewProof(d.payout!.proof_path!)}>View file</button>) : 'Not uploaded'}</dd>
                      <dt>Verification</dt><dd><span className={`tg tg-${V_TONE[d.payout.verification]}`}>{V_TEXT[d.payout.verification]}</span></dd>
                    </dl>
                    <div className="f-actions" style={{ marginTop: 12 }}>
                      <button className="btn btn-ok btn-sm" disabled={busy || d.payout.verification === 'verified'} onClick={() => void act(() => setPayoutVerification(id, 'verified'), 'Payment details marked verified')}>Mark verified</button>
                      <button className="btn btn-ghost btn-sm" disabled={busy || d.payout.verification === 'rejected'} onClick={() => void act(() => setPayoutVerification(id, 'rejected'), 'Marked as rejected')}>Reject</button>
                    </div>
                  </>
                )}
              </article>
            </div>

            <article className="panel">
              <h2>Promo codes <small>{d.codes.length}</small></h2>
              <div className="table-wrap"><table className="adm-table">
                <thead><tr><th>Code</th><th>Status</th><th>Customer discount</th><th>Commission rate</th><th>Orders</th><th>Revenue</th><th>Commission</th><th>Created</th></tr></thead>
                <tbody>{d.codes.map((c) => <tr key={c.id}><td><code>{c.code}</code></td><td><span className={`tg ${c.active ? 'tg-green' : 'tg-sand'}`}>{c.active ? 'Live' : 'Paused'}</span></td><td>{percent(c.discount_bps)}</td><td>{percent(c.commission_bps)}</td><td>{c.orders}</td><td>{moneyMap(c.revenue)}</td><td>{moneyMap(c.commission)}</td><td>{day(c.created_at)}</td></tr>)}</tbody>
              </table></div>
            </article>

            <article className="panel">
              <h2>Transaction history <small>{d.ledger.length}</small></h2>
              {d.ledger.length === 0 ? <p className="muted">No orders yet.</p> : (
                <div className="table-wrap"><table className="adm-table">
                  <thead><tr><th>Order ID</th><th>Promo code</th><th>Customer</th><th>Order amount</th><th>Commission</th><th>Status</th><th>Date</th></tr></thead>
                  <tbody>{d.ledger.map((l) => <tr key={l.id}><td title={l.order_ref}><code>{orderId(l.order_ref)}</code></td><td>{l.code}</td><td>{l.customer_email ?? '—'}</td><td>{money(l.order_amount_minor, l.currency)}</td><td><b>{money(l.commission_minor, l.currency)}</b></td><td title={l.note}><span className={`tg tg-${L_TONE[l.status]}`}>{l.status}</span>{l.withdrawal_id ? <span className="muted"> · W#{l.withdrawal_id}</span> : null}</td><td>{dayTime(l.created_at)}</td></tr>)}</tbody>
                </table></div>
              )}
            </article>

            <div className="adm-grid">
              <article className="panel">
                <h2>Withdrawals <small>{d.withdrawals.length}</small></h2>
                {d.withdrawals.length === 0 ? <p className="muted">None yet.</p> : (
                  <div className="table-wrap"><table className="adm-table">
                    <thead><tr><th>#</th><th>Requested</th><th>Gross</th><th>Net</th><th>Status</th></tr></thead>
                    <tbody>{d.withdrawals.map((w) => <tr key={w.id}><td>{w.id}</td><td>{day(w.requested_at)}</td><td>{money(w.gross_minor, w.currency)}</td><td>{money(w.net_minor, w.currency)}</td><td><span className={`tg tg-${W_TONE[w.status]}`}>{w.status}</span></td></tr>)}</tbody>
                  </table></div>
                )}
              </article>
              <article className="panel">
                <h2>Messages <small>{d.messages.length}</small></h2>
                {d.messages.length === 0 ? <p className="muted">No messages.</p> : d.messages.map((m) => <div key={m.id} className="feed-item"><b>{m.subject}</b> <span className="muted">{dayTime(m.created_at)}{m.resolved ? ' · resolved' : ''}</span><p>{m.message}</p></div>)}
              </article>
            </div>
          </>
        );
      })()}
    </Modal>
  );
}

/* --------------------------------------------------------------------------------------------- withdrawals */

function Withdrawals({ tick, onOpen }: { tick: number; onOpen: (id: number) => void }) {
  const [filter, setFilter] = useState<WithdrawalStatus | 'all'>('pending');
  const { data, error } = useLoad<WithdrawalListRow[]>(() => withdrawals(filter === 'all' ? null : filter), [filter, tick]);
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Withdrawal management <small>{data?.length ?? 0}</small></h2>
        <div className="chips">{(['pending', 'approved', 'paid', 'rejected', 'all'] as const).map((s) => <button key={s} className={`tg tg-${s === 'all' ? 'sky' : W_TONE[s]}${filter === s ? ' on' : ''}`} onClick={() => setFilter(s)}>{s}</button>)}</div>
      </div>
      {!data ? <Loading error={error} /> : data.length === 0 ? <p className="muted">{filter === 'pending' ? 'No pending withdrawals. 🎉' : 'Nothing here.'}</p> : (
        <div className="table-wrap"><table className="adm-table">
          <thead><tr><th>Influencer</th><th>Amount to pay</th><th>Requested</th><th>Payment method</th><th>Payout details</th><th>Status</th><th /></tr></thead>
          <tbody>{data.map((w) => (
            <tr key={w.id}>
              <td><b>{w.influencer}</b></td>
              <td><b>{money(w.net_minor, w.currency)}</b>{w.gross_minor !== w.net_minor && <span className="muted"> of {money(w.gross_minor, w.currency)}</span>}</td>
              <td>{dayTime(w.requested_at)}</td>
              <td>{w.method === 'bank' ? 'Bank transfer' : 'UPI'}</td>
              <td><span className={`tg tg-${V_TONE[w.payout]}`}>{V_TEXT[w.payout]}</span></td>
              <td><span className={`tg tg-${W_TONE[w.status]}`}>{w.status}</span></td>
              <td><button className="btn btn-secondary btn-sm" onClick={() => onOpen(w.id)}>{w.status === 'pending' ? 'Review' : 'View'}</button></td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </section>
  );
}

function WithdrawalModal({ id, onClose, onChanged, onOpenInfluencer, toast }: { id: number; onClose: () => void; onChanged: () => void; onOpenInfluencer: (id: string) => void; toast: (t: string, tone?: 'ok' | 'error') => void }) {
  const [version, setVersion] = useState(0);
  const { data: d, error } = useLoad<WithdrawalDetail | null>(() => withdrawalDetail(id), [id, version]);
  const [mode, setMode] = useState<null | 'paid' | 'reject'>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');

  const run = async (action: 'approve' | 'paid' | 'reject', note = '', reference = '') => {
    setBusy(true);
    setProblem('');
    try {
      await withdrawalAction(id, action, note, reference);
      toast(action === 'approve' ? 'Withdrawal approved' : action === 'paid' ? 'Marked as paid' : 'Withdrawal rejected. The money is back in their balance.');
      setMode(null);
      setText('');
      setVersion((n) => n + 1);
      onChanged();
    } catch (e) {
      setProblem(messageOf(e));
    } finally {
      setBusy(false);
    }
  };

  const w = d?.withdrawal;
  const pay = d?.payout;
  const snap = w?.payout_snapshot ?? {};
  const changed = Boolean(pay && snap.account_number && (pay.account_number !== snap.account_number || pay.ifsc !== snap.ifsc || pay.pan !== snap.pan));
  return (
    <Modal title={w ? `Withdrawal #${w.id}` : 'Withdrawal'} onClose={onClose} width={900}>
      {!d || !w ? <Loading error={error} /> : (
        <>
          <div className="f-actions">
            <b style={{ fontSize: 18 }}>{d.influencer.name}</b>
            <span className={`tg tg-${W_TONE[w.status]}`}>{w.status}</span>
            <button className="link-btn" onClick={() => onOpenInfluencer(d.influencer.id)}>Open full profile</button>
          </div>

          <div className="adm-grid">
            <article className="panel">
              <h2>Amount</h2>
              <div className="sum">
                <div className="sum-row"><span>Commission requested</span><b>{money(w.gross_minor, w.currency)}</b></div>
                {(w.breakdown.lines ?? []).map((l) => <div key={l.label} className="sum-row minus"><span>{l.label}<small>{l.note}</small></span><b>− {money(l.amount_minor, w.currency)}</b></div>)}
                <div className="sum-row total"><span>Pay the influencer</span><b>{money(w.net_minor, w.currency)}</b></div>
              </div>
              <p className="muted" style={{ marginTop: 10 }}>Requested {dayTime(w.requested_at)}{w.paid_at ? ` · paid ${dayTime(w.paid_at)}` : ''}{w.payout_reference ? ` · ref ${w.payout_reference}` : ''}</p>
              {w.admin_note && <p className="muted">Note: {w.admin_note}</p>}
            </article>
            <article className="panel">
              <h2>Bank details &amp; verification</h2>
              <dl className="kv">
                <dt>Pay to</dt><dd><b>{snap.holder}</b></dd>
                <dt>Account number</dt><dd><code>{snap.account_number}</code></dd>
                <dt>IFSC · bank</dt><dd>{snap.ifsc} · {snap.bank_name || '—'}</dd>
                <dt>UPI</dt><dd>{snap.upi_id || '—'}</dd>
                <dt>PAN</dt><dd><code>{snap.pan}</code>{snap.pan_name ? ` · ${snap.pan_name}` : ''}</dd>
                <dt>Phone</dt><dd>{d.influencer.phone || '—'}</dd>
                <dt>Verification</dt><dd>{pay ? <span className={`tg tg-${V_TONE[pay.verification]}`}>{V_TEXT[pay.verification]}</span> : <span className="muted">Details deleted</span>}</dd>
              </dl>
              {changed && <p className="f-warn" style={{ marginTop: 10 }}>The influencer changed their bank details after requesting. The details above are the ones they requested with; double-check before paying.</p>}
              {pay && pay.verification !== 'verified' && <p className="f-info" style={{ marginTop: 10 }}>Not verified yet. Open the profile to verify the PAN and bank proof first.</p>}
            </article>
          </div>

          <article className="panel">
            <h2>Related commission transactions <small>{d.commissions.length}</small></h2>
            <div className="table-wrap"><table className="adm-table">
              <thead><tr><th>Order ID</th><th>Promo code</th><th>Order amount</th><th>Commission</th><th>Date</th></tr></thead>
              <tbody>{d.commissions.map((c) => <tr key={c.id}><td title={c.order_ref}><code>{orderId(c.order_ref)}</code></td><td>{c.code}</td><td>{money(c.order_amount_minor, c.currency)}</td><td>{money(c.commission_minor, c.currency)}</td><td>{day(c.created_at)}</td></tr>)}</tbody>
            </table></div>
          </article>

          <article className="panel">
            <h2>Previous withdrawals <small>{d.previous.length}</small></h2>
            {d.previous.length === 0 ? <p className="muted">This is their first withdrawal.</p> : (
              <div className="table-wrap"><table className="adm-table">
                <thead><tr><th>#</th><th>Requested</th><th>Gross</th><th>Net</th><th>Status</th><th>Reference</th></tr></thead>
                <tbody>{d.previous.map((p) => <tr key={p.id}><td>{p.id}</td><td>{day(p.requested_at)}</td><td>{money(p.gross_minor, p.currency)}</td><td>{money(p.net_minor, p.currency)}</td><td><span className={`tg tg-${W_TONE[p.status]}`}>{p.status}</span></td><td>{p.payout_reference || '—'}</td></tr>)}</tbody>
              </table></div>
            )}
          </article>

          {problem && <p className="f-error" role="alert">{problem}</p>}
          {mode && (
            <div className="f-field">
              <span>{mode === 'paid' ? 'Transaction reference (UTR) of the transfer you made' : 'Reason (the influencer will see this)'}</span>
              {mode === 'paid' ? <input value={text} onChange={(e) => setText(e.target.value)} autoFocus placeholder="e.g. UTR 4128…" /> : <textarea value={text} onChange={(e) => setText(e.target.value)} autoFocus />}
            </div>
          )}
          <div className="f-actions">
            {w.status === 'pending' && !mode && <button className="btn btn-primary" disabled={busy} onClick={() => void run('approve')}>Approve</button>}
            {w.status === 'approved' && !mode && <button className="btn btn-ok" disabled={busy} onClick={() => setMode('paid')}>Mark as paid</button>}
            {(w.status === 'pending' || w.status === 'approved') && !mode && <button className="btn btn-danger" disabled={busy} onClick={() => setMode('reject')}>Reject</button>}
            {mode === 'paid' && <button className="btn btn-ok" disabled={busy || !text.trim()} onClick={() => void run('paid', '', text)}>{busy ? 'Saving…' : `Confirm paid ${money(w.net_minor, w.currency)}`}</button>}
            {mode === 'reject' && <button className="btn btn-danger" disabled={busy || !text.trim()} onClick={() => void run('reject', text)}>{busy ? 'Saving…' : 'Reject withdrawal'}</button>}
            {mode && <button className="btn btn-ghost" onClick={() => { setMode(null); setText(''); setProblem(''); }}>Back</button>}
          </div>
        </>
      )}
    </Modal>
  );
}

/* ------------------------------------------------------------------------------------------------- ledger */

function Ledger({ tick, onChanged, onOpenInfluencer, toast }: { tick: number; onChanged: () => void; onOpenInfluencer: (id: string) => void; toast: (t: string, tone?: 'ok' | 'error') => void }) {
  const [filter, setFilter] = useState<LedgerStatus | 'all'>('all');
  const [version, setVersion] = useState(0);
  const { data, error } = useLoad(() => ledger(filter === 'all' ? null : filter), [filter, tick, version]);
  const [acting, setActing] = useState<{ row: LedgerRow; action: 'cancel' | 'reverse' | 'approve' | 'reinstate' } | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');

  const confirm = async () => {
    if (!acting) return;
    setBusy(true);
    setProblem('');
    try {
      await ledgerAction(acting.row.id, acting.action, note);
      toast('Ledger updated');
      setActing(null);
      setNote('');
      setVersion((n) => n + 1);
      onChanged();
    } catch (e) {
      setProblem(messageOf(e));
    } finally {
      setBusy(false);
    }
  };

  const WORDS = { cancel: ['Cancel commission', 'Use this for fraud or ineligible orders. The commission is removed and the customer keeps their purchase.'], reverse: ['Reverse commission', 'Use this when the customer was refunded. The commission is taken back, and if it was already paid out it is deducted from the next withdrawal.'], approve: ['Approve now', 'Release this commission before the refund window ends.'], reinstate: ['Reinstate', 'Put a cancelled commission back to pending.'] } as const;

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Transaction ledger <small>{data?.total ?? 0}</small></h2>
        <div className="chips">{(['all', 'pending', 'approved', 'cancelled', 'reversed'] as const).map((s) => <button key={s} className={`tg tg-${s === 'all' ? 'sky' : L_TONE[s]}${filter === s ? ' on' : ''}`} onClick={() => setFilter(s)}>{s}</button>)}</div>
      </div>
      <p className="muted" style={{ marginBottom: 8 }}>Order ID → Promo code → Influencer → Order amount → Commission → Status → Date. Every commission is recorded here, for disputes.</p>
      {!data ? <Loading error={error} /> : data.rows.length === 0 ? <p className="muted">No commissions yet.</p> : (
        <div className="table-wrap"><table className="adm-table">
          <thead><tr><th>Order ID</th><th>Promo code</th><th>Influencer</th><th>Order amount</th><th>Commission</th><th>Status</th><th>Date</th><th>Customer</th><th /></tr></thead>
          <tbody>{data.rows.map((r) => (
            <tr key={r.id}>
              <td title={`${r.order_ref} · payment #${r.payment_id}`}><code>{orderId(r.order_ref)}</code></td>
              <td>{r.code}</td>
              <td><button className="link-btn dark" onClick={() => onOpenInfluencer(r.influencer_id)}>{r.influencer}</button></td>
              <td>{money(r.order_amount_minor, r.currency)}</td>
              <td><b>{money(r.commission_minor, r.currency)}</b></td>
              <td title={r.note}><span className={`tg tg-${L_TONE[r.status]}`}>{r.status}</span>{r.withdrawal_id ? <span className="muted"> · W#{r.withdrawal_id}</span> : null}{r.payment_status === 'refunded' && <span className="muted"> · refunded</span>}</td>
              <td>{dayTime(r.created_at)}</td>
              <td className="muted">{r.customer_email ?? '—'}</td>
              <td className="row-actions">
                {(r.status === 'pending' || r.status === 'approved') && <button className="btn btn-ghost btn-sm" onClick={() => setActing({ row: r, action: 'reverse' })}>Reverse</button>}
                {(r.status === 'pending' || r.status === 'approved') && <button className="btn btn-ghost btn-sm" onClick={() => setActing({ row: r, action: 'cancel' })}>Cancel</button>}
                {r.status === 'pending' && <button className="btn btn-ghost btn-sm" onClick={() => setActing({ row: r, action: 'approve' })}>Approve</button>}
                {r.status === 'cancelled' && <button className="btn btn-ghost btn-sm" onClick={() => setActing({ row: r, action: 'reinstate' })}>Reinstate</button>}
              </td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
      {acting && (
        <Modal title={WORDS[acting.action][0]} onClose={() => setActing(null)} width={480}>
          <p>{WORDS[acting.action][1]}</p>
          <p className="muted-p"><code>{orderId(acting.row.order_ref)}</code> · {acting.row.influencer} · {money(acting.row.commission_minor, acting.row.currency)}</p>
          <label className="f-field"><span>Note (kept in the ledger)</span><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" /></label>
          {problem && <p className="f-error" role="alert">{problem}</p>}
          <div className="f-actions"><button className={acting.action === 'cancel' || acting.action === 'reverse' ? 'btn btn-danger' : 'btn btn-primary'} disabled={busy} onClick={() => void confirm()}>{busy ? 'Saving…' : WORDS[acting.action][0]}</button><button className="btn btn-ghost" onClick={() => setActing(null)}>Back</button></div>
        </Modal>
      )}
    </section>
  );
}

/* --------------------------------------------------------------------------------------------------- fraud */

const FLAG_TITLE: Record<Flag['kind'], string> = {
  self_referral: 'Self-referral', multiple_codes: 'Same customer, multiple codes', cancellations: 'Excessive cancellations', refunds: 'Refunds after commission',
  burst: 'Unusual order pattern', fresh_accounts: 'Brand-new accounts buying',
};
const SEV_TONE = { high: 'coral', medium: 'marigold', low: 'sky' } as const;

function Fraud({ onOpenInfluencer }: { onOpenInfluencer: (id: string) => void }) {
  const { data, error } = useLoad(fraudFlags, []);
  if (!data) return <Loading error={error} />;
  const order = { high: 0, medium: 1, low: 2 } as const;
  const rows = [...data].sort((a, b) => order[a.severity] - order[b.severity]);
  const counts = data.reduce<Record<string, number>>((m, f) => ({ ...m, [f.kind]: (m[f.kind] ?? 0) + 1 }), {});
  return (
    <>
      <section className="kpis">
        {(Object.keys(FLAG_TITLE) as Flag['kind'][]).map((k, i) => <Kpi key={k} tone={(['coral', 'marigold', 'sand', 'sky', 'ink', 'green'] as const)[i]!} label={FLAG_TITLE[k]} value={String(counts[k] ?? 0)} />)}
      </section>
      <section className="panel">
        <h2>Suspicious activity <small>{rows.length}</small></h2>
        <p className="muted" style={{ marginBottom: 8 }}>These are signals, not proof. Check the ledger, then cancel or reverse commissions that look wrong.</p>
        {rows.length === 0 ? <p className="muted">Nothing suspicious right now. 👍</p> : (
          <div className="table-wrap"><table className="adm-table">
            <thead><tr><th>Signal</th><th>Severity</th><th>Who</th><th>Code</th><th>Details</th><th>When</th></tr></thead>
            <tbody>{rows.map((f, i) => (
              <tr key={i}>
                <td><b>{FLAG_TITLE[f.kind]}</b></td>
                <td><span className={`tg tg-${SEV_TONE[f.severity]}`}>{f.severity}</span></td>
                <td>{f.influencer_id ? <button className="link-btn dark" onClick={() => onOpenInfluencer(f.influencer_id!)}>{f.influencer}</button> : f.influencer}</td>
                <td>{f.code ?? '—'}</td>
                <td>{f.detail}</td>
                <td>{f.at ? day(f.at) : '—'}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </section>
    </>
  );
}

/* ------------------------------------------------------------------------------------------------ support */

function Inbox({ tick, onChanged, onOpenInfluencer }: { tick: number; onChanged: () => void; onOpenInfluencer: (id: string) => void }) {
  const [resolved, setResolved] = useState(false);
  const [version, setVersion] = useState(0);
  const { data, error } = useLoad<InboxMessage[]>(() => inbox(resolved), [resolved, tick, version]);
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Influencer support <small>{data?.length ?? 0}</small></h2>
        <div className="chips">{[false, true].map((r) => <button key={String(r)} className={`tg tg-${r ? 'green' : 'marigold'}${resolved === r ? ' on' : ''}`} onClick={() => setResolved(r)}>{r ? 'resolved' : 'open'}</button>)}</div>
      </div>
      {!data ? <Loading error={error} /> : data.length === 0 ? <p className="muted">{resolved ? 'No resolved messages.' : 'Inbox zero. 🎉'}</p> : (
        <div className="feed">{data.map((m) => (
          <article key={m.id} className="feed-item">
            <div className="feed-top"><b>{m.subject}</b><button className="link-btn dark" onClick={() => onOpenInfluencer(m.influencer_id)}>{m.influencer}</button><span className="muted">{m.email ? <a href={`mailto:${m.email}?subject=${encodeURIComponent('Re: ' + m.subject)}`}>{m.email}</a> : 'no email'} · {dayTime(m.created_at)}</span></div>
            <p style={{ whiteSpace: 'pre-wrap' }}>{m.message}</p>
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={async () => { await resolveMessage(m.id, !resolved); setVersion((n) => n + 1); onChanged(); }}>{resolved ? 'Reopen' : 'Mark resolved'}</button>
          </article>
        ))}</div>
      )}
    </section>
  );
}

/* ----------------------------------------------------------------------------------------------- settings */

const major = (obj: Record<string, number> | undefined, cur: string) => String(((obj?.[cur] ?? 0) as number) / 100);
const minor = (value: string) => Math.max(0, Math.round((Number(value) || 0) * 100));

function ProgrammeSettings({ toast }: { toast: (t: string, tone?: 'ok' | 'error') => void }) {
  const { data, error } = useLoad<Settings>(getSettings, []);
  const [f, setF] = useState<Record<string, string> | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!data) return;
    setF({
      refund: String(data.refund_window_days ?? 7), maxCodes: String(data.max_codes_per_influencer ?? 5),
      discount: String((data.default_customer_discount_bps ?? 1000) / 100), commission: String((data.default_commission_bps ?? 1000) / 100),
      minInr: major(data.min_withdrawal_minor, 'INR'), minUsd: major(data.min_withdrawal_minor, 'USD'),
      tds: String((data.tds_bps ?? 200) / 100), tdsNoPan: String((data.tds_no_pan_bps ?? 2000) / 100), tdsLimit: major(data.tds_threshold_minor, 'INR'),
      feeInr: major(data.payout_fee_minor, 'INR'), feeUsd: major(data.payout_fee_minor, 'USD'),
    });
  }, [data]);
  if (!f) return <Loading error={error} />;
  const bind = (k: string) => ({ value: f[k] ?? '', onChange: (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value }), inputMode: 'decimal' as const });
  const save = async () => {
    setBusy(true);
    try {
      await setSettings({
        refund_window_days: Math.round(Number(f.refund)), max_codes_per_influencer: Math.round(Number(f.maxCodes)),
        default_customer_discount_bps: Math.round(Number(f.discount) * 100), default_commission_bps: Math.round(Number(f.commission) * 100),
        min_withdrawal_minor: { INR: minor(f.minInr!), USD: minor(f.minUsd!) },
        tds_bps: Math.round(Number(f.tds) * 100), tds_no_pan_bps: Math.round(Number(f.tdsNoPan) * 100), tds_threshold_minor: { INR: minor(f.tdsLimit!) },
        payout_fee_minor: { INR: minor(f.feeInr!), USD: minor(f.feeUsd!) },
      });
      toast('Settings saved');
    } catch (e) { toast(messageOf(e), 'error'); } finally { setBusy(false); }
  };
  return (
    <section className="panel">
      <h2>Programme settings</h2>
      <p className="muted" style={{ marginBottom: 14 }}>These apply from now on. The discount and commission rate are copied onto each new promo code, so existing codes keep theirs.</p>
      <div className="f-grid">
        <label className="f-field"><span>Customer discount for new codes (%)</span><input {...bind('discount')} /></label>
        <label className="f-field"><span>Commission rate for new influencers (%)</span><input {...bind('commission')} /></label>
        <label className="f-field"><span>Refund window (days)</span><input {...bind('refund')} /><small>A commission becomes withdrawable after this many days. Match your refund policy.</small></label>
        <label className="f-field"><span>Promo codes per influencer</span><input {...bind('maxCodes')} /></label>
        <label className="f-field"><span>Minimum withdrawal (₹)</span><input {...bind('minInr')} /></label>
        <label className="f-field"><span>Minimum withdrawal ($)</span><input {...bind('minUsd')} /></label>
        <label className="f-field"><span>TDS rate (%)</span><input {...bind('tds')} /><small>Section 194H. Confirm the current rate with your accountant.</small></label>
        <label className="f-field"><span>TDS rate without a valid PAN (%)</span><input {...bind('tdsNoPan')} /></label>
        <label className="f-field"><span>TDS yearly limit (₹)</span><input {...bind('tdsLimit')} /><small>No TDS until an influencer's payouts in the financial year pass this.</small></label>
        <div />
        <label className="f-field"><span>Transfer fee charged per payout (₹)</span><input {...bind('feeInr')} /><small>Leave at 0 to absorb bank or Razorpay payout fees yourself.</small></label>
        <label className="f-field"><span>Transfer fee charged per payout ($)</span><input {...bind('feeUsd')} /></label>
      </div>
      <div className="f-actions" style={{ marginTop: 16 }}><button className="btn btn-primary" disabled={busy} onClick={() => void save()}>{busy ? 'Saving…' : 'Save settings'}</button></div>
    </section>
  );
}
