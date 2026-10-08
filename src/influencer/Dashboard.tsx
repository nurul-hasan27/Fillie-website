import { Bars, HBars } from '../admin/charts';
import { day, money, moneyMap, num, percent, type MoneyMap } from '../lib/format';
import { CopyButton } from '../ui/ui';
import type { Dashboard as Data, Me, Status } from './api';

export const STATUS_TONE: Record<Status, string> = { pending: 'marigold', approved: 'green', cancelled: 'sand', reversed: 'coral' };
export const STATUS_HELP: Record<Status, string> = {
  pending: 'In the refund window. It becomes available automatically.',
  approved: 'Available to withdraw.',
  cancelled: 'Not counted (for example a self-referral).',
  reversed: 'The customer was refunded, so the commission was taken back.',
};

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: 'sky' | 'marigold' | 'green' | 'coral' | 'ink' | 'sand' }) {
  return (
    <div className="kpi" data-tone={tone}>
      <span className="kpi-label">{label}</span>
      <strong>{value}</strong>
      {sub && <span className="kpi-sub">{sub}</span>}
    </div>
  );
}

const sumBy = (rows: Data['balances'], key: 'available' | 'pending' | 'lifetime' | 'paid_out'): MoneyMap => Object.fromEntries(rows.map((b) => [b.currency, b[key]]));

export function Dashboard({ me, data, days, onDays, onGoto }: { me: Me; data: Data; days: number; onDays: (n: number) => void; onGoto: (tab: 'codes' | 'earnings') => void }) {
  const t = data.totals;
  const orders = data.daily.reduce((a, d) => a + d.orders, 0);
  const earnedInr = data.daily.reduce((a, d) => a + d.earned_inr, 0);
  const earnedUsd = data.daily.reduce((a, d) => a + d.earned_usd, 0);
  const status = data.status_counts;
  const bestCode = [...data.codes].sort((a, b) => b.orders - a.orders)[0];

  return (
    <>
      <section className="kpis">
        <Kpi tone="green" label="Available to withdraw" value={moneyMap(sumBy(data.balances, 'available'), '₹0')} sub={data.balances.some((b) => b.available > 0) ? 'ready now' : 'nothing yet'} />
        <Kpi tone="marigold" label="Pending" value={moneyMap(sumBy(data.balances, 'pending'), '₹0')} sub={`in the ${data.refund_window_days}-day refund window`} />
        <Kpi tone="ink" label="Total earned" value={moneyMap(t.commission, '₹0')} sub={`${percent(me.commission_bps)} of ${moneyMap(t.revenue, '₹0')} paid`} />
        <Kpi tone="sky" label="Orders" value={num(t.orders)} sub={t.cancelled ? `${t.cancelled} cancelled or refunded` : 'with your codes'} />
        <Kpi tone="sand" label="Paid out" value={moneyMap(sumBy(data.balances, 'paid_out'), '₹0')} sub="to your bank so far" />
        <Kpi tone="coral" label="Best code" value={bestCode && bestCode.orders ? bestCode.code : '—'} sub={bestCode && bestCode.orders ? `${bestCode.orders} ${bestCode.orders === 1 ? 'order' : 'orders'}` : 'share one to get started'} />
      </section>

      <div className="panel-head" style={{ marginTop: 6 }}>
        <h2 style={{ margin: 0, font: '500 22px var(--serif)' }}>Performance</h2>
        <div className="tabs-sub" role="tablist" aria-label="Time range">
          {[7, 30, 90].map((n) => <button key={n} role="tab" aria-selected={days === n} onClick={() => onDays(n)}>{n} days</button>)}
        </div>
      </div>

      <section className="adm-grid">
        <article className="panel">
          <h2>Orders <small>{orders} in {days} days</small></h2>
          <Bars data={data.daily.map((d) => ({ label: d.day, value: d.orders }))} color="var(--blue)" />
        </article>
        <article className="panel">
          <h2>Earnings <small>{money(earnedInr, 'INR')}{earnedUsd ? ` + ${money(earnedUsd, 'USD')}` : ''}</small></h2>
          <Bars data={data.daily.map((d) => ({ label: d.day, value: d.earned_inr / 100 }))} color="var(--green)" />
        </article>
        <article className="panel">
          <h2>Your codes</h2>
          {data.codes.length === 0 ? <p className="muted">No codes yet.</p> : (
            <HBars rows={data.codes.map((c, i) => ({ label: c.code, value: c.orders, color: ['var(--blue)', 'var(--marigold)', 'var(--green)', 'var(--coral)', 'var(--midnight)'][i % 5] ?? 'var(--blue)', note: c.active ? (c.orders === 1 ? 'order' : 'orders') : 'paused' }))} />
          )}
          <p style={{ marginTop: 14 }}><button className="btn btn-ghost btn-sm" onClick={() => onGoto('codes')}>Manage codes</button></p>
        </article>
        <article className="panel">
          <h2>Where your orders stand</h2>
          <HBars rows={(['approved', 'pending', 'reversed', 'cancelled'] as const).map((s) => ({ label: s[0]!.toUpperCase() + s.slice(1), value: status[s] ?? 0, color: s === 'approved' ? 'var(--green)' : s === 'pending' ? 'var(--marigold)' : s === 'reversed' ? 'var(--coral)' : '#b8b3ad' }))} />
          <p className="muted" style={{ marginTop: 12 }}>Pending orders become available after {data.refund_window_days} days, once the refund window has passed.</p>
        </article>
        <article className="panel wide">
          <div className="panel-head"><h2>Recent orders</h2><button className="btn btn-ghost btn-sm" onClick={() => onGoto('earnings')}>Earnings &amp; withdrawals</button></div>
          {data.recent.length === 0 ? (
            <p className="muted">No orders yet. Share your code, and each purchase shows up here. Customer details stay private.</p>
          ) : (
            <div className="table-wrap">
              <table className="adm-table">
                <thead><tr><th>Order</th><th>Date</th><th>Code</th><th>Customer paid</th><th>You earn</th><th>Status</th></tr></thead>
                <tbody>
                  {data.recent.map((r) => (
                    <tr key={r.order_id + r.created_at}>
                      <td><code>{r.order_id}</code></td>
                      <td>{day(r.created_at)}</td>
                      <td>{r.code}</td>
                      <td>{money(r.order_amount_minor, r.currency)}</td>
                      <td><b>{money(r.commission_minor, r.currency)}</b></td>
                      <td title={STATUS_HELP[r.status]}><span className={`tg tg-${STATUS_TONE[r.status]}`}>{r.status}</span>{r.available_on && <span className="muted"> · available {day(r.available_on)}</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>
    </>
  );
}

export function shareLink(code: string) {
  return `${location.origin}/?code=${encodeURIComponent(code)}`;
}

export { CopyButton };
