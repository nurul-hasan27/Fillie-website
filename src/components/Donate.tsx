import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { DONATE, isPlaceholderUpi } from '../config';
import { Heart } from './Clay';

type Tab = 'upi' | 'card' | 'world';

function upiLink(amount: number | null): string {
  const params = new URLSearchParams({ pa: DONATE.upiId, pn: DONATE.upiName, cu: 'INR', tn: 'Fillie support' });
  if (amount) params.set('am', String(amount));
  return `upi://pay?${params.toString()}`;
}

export function Donate() {
  const [tab, setTab] = useState<Tab>('upi');
  const [amount, setAmount] = useState<number | null>(DONATE.amounts[1] ?? null);
  const [qr, setQr] = useState('');
  const [copied, setCopied] = useState(false);
  const link = useMemo(() => upiLink(amount), [amount]);

  useEffect(() => {
    let live = true;
    QRCode.toDataURL(link, { width: 320, margin: 1, color: { dark: '#02093a', light: '#ffffff' } })
      .then((url) => live && setQr(url))
      .catch(() => live && setQr(''));
    return () => {
      live = false;
    };
  }, [link]);

  const copyUpi = async () => {
    try {
      await navigator.clipboard.writeText(DONATE.upiId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  const world = [
    { label: 'PayPal', href: DONATE.paypalLink },
    { label: 'GitHub Sponsors', href: DONATE.sponsorsLink },
    { label: 'Buy me a coffee', href: DONATE.coffeeLink },
  ].filter((item) => item.href);

  return (
    <section id="donate" className="section donate">
      <div className="donate-card">
        <div className="donate-intro">
          <Heart size={150} className="float" />
          <h2>Like Fillie? Buy me a chai.</h2>
          <p>
            Fillie is built and maintained by one person. If it saved you time, a small tip helps me keep it working and add new things. No pressure, a GitHub star
            helps too.
          </p>
        </div>

        <div className="donate-panel">
          <div className="tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'upi'} onClick={() => setTab('upi')}>UPI &amp; QR</button>
            <button role="tab" aria-selected={tab === 'card'} onClick={() => setTab('card')}>Cards &amp; netbanking</button>
            <button role="tab" aria-selected={tab === 'world'} onClick={() => setTab('world')}>Worldwide</button>
          </div>

          {tab === 'upi' && (
            <div className="upi">
              <div className="chips" aria-label="Amount in rupees">
                {DONATE.amounts.map((value) => (
                  <button key={value} className="chip" data-on={amount === value} onClick={() => setAmount(value)}>₹{value}</button>
                ))}
                <button className="chip" data-on={amount === null} onClick={() => setAmount(null)}>Any</button>
              </div>
              <div className="qr-wrap">
                {qr ? <img className="qr" src={qr} alt={`UPI QR code to pay ${amount ? `₹${amount}` : 'any amount'}`} width={200} height={200} /> : <div className="qr qr-empty" />}
                <div className="qr-meta">
                  <p>Scan with <strong>GPay, PhonePe, Paytm, BHIM</strong> or any UPI app.</p>
                  <a className="btn btn-primary" href={link}>Open in my UPI app</a>
                  <button className="btn btn-ghost" onClick={copyUpi}>{copied ? 'Copied ✓' : `Copy UPI ID: ${DONATE.upiId}`}</button>
                </div>
              </div>
              {isPlaceholderUpi && <p className="dev-note">Demo UPI ID. Set yours in <code>src/config.ts</code> before deploying.</p>}
            </div>
          )}

          {tab === 'card' && (
            <div className="card-pay">
              <p>Pay with <strong>debit or credit card, netbanking, wallets</strong> or UPI on a secure checkout page. Card details never touch this site.</p>
              {DONATE.cardLink ? (
                <a className="btn btn-primary btn-lg" href={DONATE.cardLink} target="_blank" rel="noreferrer">Donate by card</a>
              ) : (
                <p className="dev-note">Card checkout is not set up yet. Add a Razorpay payment link as <code>cardLink</code> in <code>src/config.ts</code>.</p>
              )}
              <div className="brands" aria-hidden="true"><span>Visa</span><span>Mastercard</span><span>RuPay</span><span>Amex</span></div>
            </div>
          )}

          {tab === 'world' && (
            <div className="card-pay">
              <p>Outside India? Pick whatever is easiest for you.</p>
              {world.length ? (
                <div className="world">
                  {world.map((item) => (
                    <a key={item.label} className="btn btn-secondary btn-lg" href={item.href} target="_blank" rel="noreferrer">{item.label}</a>
                  ))}
                </div>
              ) : (
                <p className="dev-note">Add <code>paypalLink</code>, <code>sponsorsLink</code> or <code>coffeeLink</code> in <code>src/config.ts</code>.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
