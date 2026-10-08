import { useEffect, useState } from 'react';
import { dayTime, money, moneyMap } from '../lib/format';
import { Modal, messageOf } from '../ui/ui';
import { quoteWithdrawal, requestWithdrawal, type Balance, type Dashboard as Data, type Quote, type WStatus } from './api';

const W_TONE: Record<WStatus, string> = { pending: 'marigold', approved: 'sky', paid: 'green', rejected: 'coral' };
const W_HELP: Record<WStatus, string> = {
  pending: 'Waiting for us to review it.',
  approved: 'Approved. The transfer to your bank is on its way.',
  paid: 'Paid to your bank account.',
  rejected: 'Not paid. The money is back in your balance.',
};

export function Earnings({ data, onChanged, onGoSettings, onToast }: { data: Data; onChanged: () => void; onGoSettings: () => void; onToast: (text: string, tone?: 'ok' | 'error') => void }) {
  const [withdrawing, setWithdrawing] = useState<string | null>(null);
  const balances: Balance[] = data.balances.length ? data.balances : [{ currency: 'INR', available: 0, pending: 0, lifetime: 0, paid_out: 0, in_review: 0 }];

  return (
    <>
      <section className="kpis">
        {balances.map((b) => (
          <div key={b.currency} className="kpi bal" data-tone={b.currency === 'INR' ? 'green' : 'sky'}>
            <span className="kpi-label">Available · {b.currency}</span>
            <strong>{money(b.available, b.currency)}</strong>
            <span className="kpi-sub">
              {b.pending ? `${money(b.pending, b.currency)} still in the refund window` : 'nothing waiting'}
              {b.in_review ? ` · ${money(b.in_review, b.currency)} being paid out` : ''}
            </span>
            <button className="btn btn-primary btn-sm" onClick={() => setWithdrawing(b.currency)} disabled={b.available <= 0}>Withdraw</button>
          </div>
        ))}
        <div className="kpi" data-tone="ink"><span className="kpi-label">Paid to your bank</span><strong>{moneyMap(Object.fromEntries(data.balances.map((b) => [b.currency, b.paid_out])), '₹0')}</strong><span className="kpi-sub">after tax and fees</span></div>
      </section>

      <section className="panel">
        <h2>Withdrawals</h2>
        {data.withdrawals.length === 0 ? (
          <p className="muted">No withdrawals yet. When your available balance reaches the minimum, press Withdraw. You will see exactly what lands in your bank before you confirm.</p>
        ) : (
          <div className="table-wrap">
            <table className="adm-table">
              <thead><tr><th>Requested</th><th>Amount</th><th>Tax &amp; fees</th><th>You receive</th><th>Status</th><th>Reference</th></tr></thead>
              <tbody>
                {data.withdrawals.map((w) => (
                  <tr key={w.id}>
                    <td>{dayTime(w.requested_at)}</td>
                    <td>{money(w.gross_minor, w.currency)}</td>
                    <td>{w.tds_minor + w.fee_minor ? `− ${money(w.tds_minor + w.fee_minor, w.currency)}` : '—'}</td>
                    <td><b>{money(w.net_minor, w.currency)}</b></td>
                    <td title={W_HELP[w.status]}><span className={`tg tg-${W_TONE[w.status]}`}>{w.status}</span>{w.status === 'rejected' && w.note && <div className="muted">{w.note}</div>}</td>
                    <td>{w.payout_reference || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {withdrawing && <WithdrawModal currency={withdrawing} onClose={() => setWithdrawing(null)} onDone={() => { setWithdrawing(null); onChanged(); onToast('Withdrawal requested. We will review it shortly.'); }} onGoSettings={() => { setWithdrawing(null); onGoSettings(); }} />}
    </>
  );
}

const REASON: Record<string, string> = {
  suspended: 'Your account is suspended, so withdrawals are paused. Contact support.',
  no_balance: 'You have nothing available to withdraw right now.',
};

export function WithdrawModal({ currency, onClose, onDone, onGoSettings }: { currency: string; onClose: () => void; onDone: () => void; onGoSettings: () => void }) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    quoteWithdrawal(currency).then((q) => live && setQuote(q)).catch((e) => live && setError(messageOf(e)));
    return () => { live = false; };
  }, [currency]);

  const confirm = async () => {
    setBusy(true);
    setError('');
    try {
      await requestWithdrawal(currency);
      onDone();
    } catch (e) {
      setError(messageOf(e));
      setBusy(false);
    }
  };

  const dest = quote?.destination;
  return (
    <Modal title="Withdraw your earnings" onClose={onClose} width={520}>
      {!quote && !error && <p className="muted-p">Working out what you will receive…</p>}
      {error && <p className="f-error" role="alert">{error}</p>}
      {quote && (
        <>
          {quote.reason === 'payout_details_missing' && (
            <>
              <p className="f-warn">Add your bank account and PAN first. We need them to pay you and to report tax correctly.</p>
              <button className="btn btn-primary" onClick={onGoSettings}>Add payment details</button>
            </>
          )}
          {quote.reason === 'below_minimum' && <p className="f-info">The minimum withdrawal is <b>{money(quote.minimum, quote.currency)}</b>{quote.available > 0 ? <>, and you have {money(quote.available, quote.currency)} available</> : null}. Keep earning and come back.</p>}
          {quote.reason && REASON[quote.reason] && <p className="f-info">{REASON[quote.reason]}</p>}

          {quote.gross > 0 && quote.reason !== 'payout_details_missing' && (
            <div className="sum" aria-label="What you will receive">
              <div className="sum-row"><span>Your available commission</span><b>{money(quote.gross, quote.currency)}</b></div>
              {quote.lines.map((l) => (
                <div key={l.key} className="sum-row minus"><span>{l.label}<small>{l.note}</small></span><b>− {money(l.amount_minor, quote.currency)}</b></div>
              ))}
              {quote.lines.length === 0 && <div className="sum-row"><span>Taxes and fees<small>None apply to this withdrawal.</small></span><b>{money(0, quote.currency)}</b></div>}
              <div className="sum-row total"><span>You receive</span><b>{money(quote.net, quote.currency)}</b></div>
            </div>
          )}
          {quote.ok && dest && (
            <p className="muted-p">Sent to <b>{dest.holder}</b>, {dest.bank_name || 'bank'} account <b>{dest.account_masked}</b> ({dest.ifsc}). We review each request and then transfer the money. You can follow it on this page.</p>
          )}
          <div className="f-actions">
            <button className="btn btn-ok btn-lg" onClick={() => void confirm()} disabled={!quote.ok || busy}>{busy ? 'Requesting…' : quote.ok ? `Request ${money(quote.net, quote.currency)}` : 'Request withdrawal'}</button>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          </div>
        </>
      )}
    </Modal>
  );
}
