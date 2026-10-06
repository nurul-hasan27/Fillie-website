import { useState } from 'react';
import { SITE } from './config';
import { Brain, Document, Folder, Hand, Heart, Key, Sparkle, Switch } from './components/Clay';
import { Donate } from './components/Donate';

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

export function App() {
  // Stripe and Razorpay both send the buyer back here after paying.
  const [paid, setPaid] = useState(() => new URLSearchParams(location.search).get('payment') === 'success');
  return (
    <>
      {paid && (
        <div className="paid-banner" role="status">
          <strong>Payment received. Thank you!</strong>
          <span>Open the Fillie extension, go to Account and press “I have paid”. It unlocks within a minute.</span>
          <button onClick={() => setPaid(false)} aria-label="Dismiss">×</button>
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
        </nav>
        <a className="btn btn-primary btn-sm" href={SITE.storeUrl} target="_blank" rel="noreferrer">Add to Chrome</a>
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
              <p className="plan-price">{SITE.price} <span>one-time · or {SITE.priceInr} by UPI</span></p>
              <ul className="checks">
                <li>Unlimited form filling, forever</li>
                <li>Application tracker with notes and ratings</li>
                <li>Cloud backup of your profile and resumes</li>
                <li>Pay once. No subscription.</li>
              </ul>
              {GET}
            </article>
          </div>
          <p className="plan-note">After your free fillings, sign in with email, Google, GitHub or Apple and unlock Fillie with UPI, cards or netbanking.</p>
        </section>

        <Donate />
      </main>

      <footer className="footer">
        <span className="brand"><span className="mark" aria-hidden="true" />Fillie</span>
        <span>Made by {SITE.author}.</span>
        <a href={SITE.storeUrl} target="_blank" rel="noreferrer">Chrome Web Store</a>
      </footer>

    </>
  );
}
