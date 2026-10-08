import { useState } from 'react';
import { BUSINESS } from '../config';
import { messageOf } from '../ui/ui';
import { sendMessage } from './api';

const FAQ = [
  ['How much do I earn?', 'You earn 10% of what each customer actually pays with your code, after their discount. For a ₹449 order that is about ₹40.'],
  ['When can I withdraw?', 'A commission is pending for the 7-day refund window, then it becomes available. You can withdraw your whole available balance once it reaches the minimum.'],
  ['What is deducted from my payout?', 'Before you confirm a withdrawal we show every deduction. Usually that is income-tax (TDS) once your payouts for the financial year pass the legal limit, plus any bank transfer fee. Nothing is hidden.'],
  ['Why was a commission cancelled or reversed?', 'Cancelled means the order was not eligible, for example you bought with your own code. Reversed means the customer was refunded, so the commission was taken back.'],
  ['Can customers see my details?', 'No. They only see your code. And you never see customer names or emails, only order numbers, amounts and dates.'],
];

export function Support({ email, onToast }: { email: string; onToast: (t: string, tone?: 'ok' | 'error') => void }) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const hasEmail = !BUSINESS.email.includes('YOUR-DOMAIN');

  const send = async () => {
    setError('');
    if (!subject.trim() || !message.trim()) return setError('Please write a subject and a message.');
    setBusy(true);
    try {
      await sendMessage(subject, message);
      setSent(true);
      setSubject('');
      setMessage('');
      onToast('Message sent. We will reply to ' + email);
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="adm-grid">
      <section className="panel">
        <h2>Contact support</h2>
        <p className="muted">Questions about payouts, codes or your account? Send us a message and we will reply by email to <b>{email}</b>.</p>
        {sent && <p className="f-ok" style={{ marginTop: 12 }}>Thanks! Your message is with us.</p>}
        <div className="f-grid" style={{ marginTop: 12 }}>
          <label className="f-field full"><span>Subject</span><input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120} /></label>
          <label className="f-field full"><span>Message</span><textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={4000} rows={6} /></label>
        </div>
        {error && <p className="f-error" style={{ marginTop: 12 }} role="alert">{error}</p>}
        <div className="f-actions" style={{ marginTop: 14 }}>
          <button className="btn btn-primary" onClick={() => void send()} disabled={busy}>{busy ? 'Sending…' : 'Send message'}</button>
          {hasEmail && <a className="btn btn-ghost" href={`mailto:${BUSINESS.email}?subject=${encodeURIComponent('Fillie creator support')}`}>Or email {BUSINESS.email}</a>}
        </div>
      </section>
      <section className="panel">
        <h2>Quick answers</h2>
        <div className="faq">
          {FAQ.map(([q, a]) => (
            <details key={q}><summary>{q}</summary><p>{a}</p></details>
          ))}
        </div>
      </section>
    </div>
  );
}
