import { useEffect, useState } from 'react';
import { SITE } from './config';
import { Brain, Document, Folder, Hand, Heart, Key, Sparkle, Switch } from './components/Clay';
import { Donate } from './components/Donate';
import { PayModal } from './account/PayModal';
import { displayName, useAccount } from './account/useAccount';
import { AccountMenu } from './account/AccountMenu';
import { captureCodeFromUrl, confirmPayment } from './account/checkout';
import { celebrate } from './ui/confetti';

const FEATURES = [
  { icon: <Document size={120} />, tone: 'marigold', title: 'Fills in seconds', body: 'Name, email, education, links, work history. Fillie types them into any form from the profile you set up once.' },
  { icon: <Hand size={120} />, tone: 'sky', title: 'You press submit', body: 'Fillie never clicks Submit, Next or Send. It fills, you check, you send.' },
  { icon: <Heart size={120} />, tone: 'cream', title: 'Track every application', body: 'Status, interview dates, offers in LPA, notes and a rating for each company, all in one colourful list.' },
  { icon: <Key size={120} />, tone: 'coral', title: 'Bring your own AI', body: 'Paste free keys from Gemini, Cerebras, OpenRouter and more. When one runs out of quota, Fillie switches to the next.' },
  { icon: <Folder size={120} />, tone: 'sky', title: 'A resume for every role', body: 'Keep a Frontend resume, a Data resume, and more. Fillie asks which one to use and suggests the best match.' },
  { icon: <Brain size={120} />, tone: 'marigold', title: 'It learns', body: 'Answers you approve are remembered, so the second form is faster than the first.' },
];

const STEPS = [
  { n: '1', title: 'Set up once', body: 'Add your details and paste your resume.' },
  { n: '2', title: 'Open any form', body: 'Click Fillie or press Alt + Shift + F.' },
  { n: '3', title: 'Review and submit', body: 'Green is done, yellow needs a glance, red is yours to answer.' },
];

const PLATFORMS = ['Google Gemini', 'Cerebras', 'OpenRouter', 'Groq', 'Together AI', 'Any OpenAI-compatible'];

const GET = (
  <a className="btn btn-primary btn-lg" href={SITE.storeUrl} target="_blank" rel="noreferrer">
    Add to Chrome
  </a>
);

type Return = 'none' | 'confirming' | 'unlocked' | 'pending' | 'sign-in';

export function App() {
  const account = useAccount();
  // A creator's share link (?code=ASHA10) is remembered so the code is applied at checkout.
  useEffect(() => { captureCodeFromUrl(); }, []);
  const [payOpen, setPayOpen] = useState(false);
  // Razorpay sends the buyer back here (/?payment=success) after paying.
  const [back, setBack] = useState<Return>(() => (new URLSearchParams(location.search).get('payment') === 'success' ? 'confirming' : 'none'));

  // Coming back from signing in with Google/GitHub/Apple: carry on to the payment step.
  useEffect(() => {
    if (!account.ready) return;
    const params = new URLSearchParams(location.search);
    if (params.get('pay') === '1' && account.session) {
      setPayOpen(true);
      history.replaceState(null, '', location.pathname + location.hash);
    }
  }, [account.ready, account.session]);

  // Coming back from paying: ask the server to confirm with Razorpay, so the user is
  // unlocked right away even if the payment provider's notification is a few seconds behind.
  useEffect(() => {
    if (back !== 'confirming' || !account.ready) return;
    const token = account.session?.access_token;
    if (!token) {
      setBack('sign-in');
      return;
    }
    let cancelled = false;
    void (async () => {
      for (let attempt = 0; attempt < 4 && !cancelled; attempt += 1) {
        try {
          if ((await confirmPayment(token)) > 0) break;
        } catch {
          /* try again */
        }
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
      await account.refresh();
      if (!cancelled) setBack('pending'); // upgraded to 'unlocked' below once the licence is visible
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [back, account.ready, account.session?.access_token]);

  useEffect(() => {
    if (account.paid && (back === 'pending' || back === 'confirming')) {
      setBack('unlocked');
      void celebrate(); // a quiet confetti burst, once, when the payment is confirmed
    }
  }, [account.paid, back]);

  const openPay = () => setPayOpen(true);
  const unlocked = account.paid === true;

  return (
    <>
      {back !== 'none' && (
        <div className="paid-banner" role="status" data-state={back}>
          {back === 'confirming' && <strong>Confirming your payment…</strong>}
          {back === 'unlocked' && (
            <>
              <strong>Payment received. Fillie is unlocked!</strong>
              <span>Add the extension and sign in with {account.session?.user.email ?? 'the same account'}. No payment is needed there.</span>
              <a className="btn btn-primary btn-sm" href={SITE.storeUrl} target="_blank" rel="noreferrer">Add to Chrome</a>
            </>
          )}
          {back === 'pending' && (
            <>
              <strong>Payment received. Thank you!</strong>
              <span>It can take a minute to appear. Refresh this page shortly, or sign in to the extension and press “I have paid”.</span>
            </>
          )}
          {back === 'sign-in' && (
            <>
              <strong>Payment received. Thank you!</strong>
              <span>Sign in with the account you paid with to see your unlocked plan.</span>
              <button className="btn btn-primary btn-sm" onClick={openPay}>Sign in</button>
            </>
          )}
          <button onClick={() => setBack('none')} aria-label="Dismiss">×</button>
        </div>
      )}
      <header className="nav">
        <a className="brand" href="#top" aria-label="Fillie home"><span className="mark" aria-hidden="true" />Fillie</a>
        <nav aria-label="Sections">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#ai">AI</a>
          <a href="#pricing">Pricing</a>
          <a href="#donate">Support</a>
          <a href="/influencer">Creators</a>
        </nav>
        <AccountMenu account={account} onSignIn={openPay} />
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <span className="pill">Chrome extension · 3 free fillings a week</span>
            <h1>Forms, <em>filled.</em><br />You press submit.</h1>
            <p>
              Fillie reads the questions on any job application or form and types the answers from your profile and resume. You review everything and
              press submit yourself.
            </p>
            <div className="hero-cta">
              {GET}
              <a className="btn btn-secondary btn-lg" href="#pricing">See pricing</a>
            </div>
            <p className="hero-note">Works in Chrome, Edge and Brave. Start free, no card needed.</p>
          </div>

          <div className="hero-art" aria-hidden="true">
            <div className="blob blob-a" />
            <div className="mock">
              <div className="mock-bar"><i /><i /><i /></div>
              <div className="mock-row"><b>Full name</b><span className="filled">Ada Lovelace</span></div>
              <div className="mock-row"><b>Email</b><span className="filled">ada@example.com</span></div>
              <div className="mock-row"><b>Years of React</b><span className="doubt">4</span></div>
              <div className="mock-row"><b>Expected salary</b><span className="todo">your turn</span></div>
              <div className="mock-submit">Submit</div>
            </div>
            <Sparkle className="float f1" size={130} />
            <Document className="float f2" size={150} />
            <Hand className="float f3" size={110} />
          </div>
        </section>

        <section id="features" className="section">
          <h2 className="title">Everything it does, nothing it shouldn’t</h2>
          <div className="bento">
            {FEATURES.map((feature) => (
              <article key={feature.title} className="tile" data-tone={feature.tone}>
                <div className="tile-art">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="how" className="section">
          <h2 className="title">Three steps. That’s it.</h2>
          <ol className="how">
            {STEPS.map((step) => (
              <li key={step.n}>
                <span className="how-n">{step.n}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="ai" className="section ai">
          <div className="ai-copy">
            <Switch size={150} className="float" />
            <h2 className="title left">Never stuck on a quota</h2>
            <p>
              Add a free key for each AI platform and put them in the order you like. Fillie asks the first one, and if it runs out or fails it quietly
              moves to the next. Every answer shows which platform and model wrote it.
            </p>
          </div>
          <div className="ai-list" aria-label="Supported platforms">
            {PLATFORMS.map((name, index) => (
              <div key={name} className="ai-row">
                <span className="ai-rank">{index + 1}</span>
                <strong>{name}</strong>
                <span className={`ai-state ${index === 0 ? 'on' : ''}`}>{index === 0 ? 'answering' : index === 1 ? 'next in line' : 'standby'}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="pricing" className="section pricing">
          <h2 className="title">Simple pricing. Pay once.</h2>
          <div className="plans">
            <article className="plan">
              <h3>Free</h3>
              <p className="plan-price">{SITE.freeFillsPerWeek} <span>fillings every week</span></p>
              <ul className="checks">
                <li>Fill any form with your profile and resume</li>
                <li>Resume picker and AI platform failover</li>
                <li>No card needed</li>
              </ul>
              {GET}
            </article>
            <article className="plan plan-pro">
              <span className="pill">Best value</span>
              <h3>Unlimited</h3>
              <p className="plan-price">{SITE.priceInr} <span>one-time · or {SITE.price} for international cards</span></p>
              <ul className="checks">
                <li>Unlimited form filling, forever</li>
                <li>Application tracker with notes and ratings</li>
                <li>Cloud backup of your profile and resumes</li>
                <li>Pay once. No subscription.</li>
              </ul>
              <div className="plan-actions">
                {!account.ready || (account.session && account.paid === null) ? (
                  <span className="plan-how">Checking your plan…</span>
                ) : !account.session ? (
                  <>
                    <button className="btn btn-primary btn-lg" onClick={openPay}>Sign in &amp; pay</button>
                    <p className="plan-how">Sign in, pay once, then add Fillie to Chrome and sign in there. It unlocks automatically.</p>
                  </>
                ) : unlocked ? (
                  <>
                    <span className="plan-done">✓ {displayName(account.session)} has unlimited access</span>
                    <p className="plan-how">Signed in as {account.session.user.email}. Add Fillie to Chrome and sign in with this account.</p>
                    {GET}
                  </>
                ) : (
                  <>
                    <button className="btn btn-primary btn-lg" onClick={openPay}>Pay {SITE.priceInr} or {SITE.price}</button>
                    <p className="plan-how">Signed in as {account.session.user.email}. This account is on the free plan. Pay once to unlock unlimited use.</p>
                  </>
                )}
              </div>
            </article>
          </div>
          <p className="plan-note">Start free with 3 fillings a week. Unlock unlimited any time, here or inside the extension, with a one-time card payment.</p>
        </section>

        <Donate />
      </main>

      <footer className="footer">
        <span className="brand"><span className="mark" aria-hidden="true" />Fillie</span>
        <span>Made by {SITE.author}.</span>
        <nav className="footer-links" aria-label="Legal">
          <a href="/terms">Terms</a>
          <a href="/privacy">Privacy</a>
          <a href="/refund">Refunds</a>
          <a href="/contact">Contact</a>
          <a href="/influencer">Earn with Fillie</a>
        </nav>
      </footer>

      {payOpen && <PayModal account={account} onClose={() => setPayOpen(false)} />}

    </>
  );
}
