import { useState } from 'react';
import { SITE } from './config';
import { Brain, Document, Folder, Hand, Key, Shield, Sparkle, Switch } from './components/Clay';
import { SetupModal } from './components/SetupModal';
import { Donate } from './components/Donate';

const FEATURES = [
  { icon: <Document size={120} />, tone: 'marigold', title: 'Fills in seconds', body: 'Name, email, education, links, work history. Fillie types them into any form from the profile you set up once.' },
  { icon: <Hand size={120} />, tone: 'sky', title: 'You press submit', body: 'Fillie never clicks Submit, Next or Send. It fills, you check, you send.' },
  { icon: <Shield size={120} />, tone: 'cream', title: 'Private by design', body: 'Everything lives in your browser. No servers, no accounts, no tracking. It even works with no internet.' },
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

export function App() {
  const [setupOpen, setSetupOpen] = useState(false);
  const github = (
    <a className="btn btn-secondary btn-lg" href={SITE.githubUrl} target="_blank" rel="noreferrer">
      <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38v-1.33c-2.23.48-2.7-1.07-2.7-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.05-.49.05-.49.8.06 1.23.83 1.23.83.71 1.22 1.87.87 2.33.66.07-.52.28-.87.5-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 014 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.2c0 .21.15.46.55.38A8 8 0 0016 8c0-4.42-3.58-8-8-8z" /></svg>
      Source code
    </a>
  );

  return (
    <>
      <header className="nav">
        <a className="brand" href="#top" aria-label="Fillie home"><span className="mark" aria-hidden="true" />Fillie</a>
        <nav aria-label="Sections">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#ai">AI</a>
          <a href="#privacy">Privacy</a>
          <a href="#donate">Support</a>
        </nav>
        <button className="btn btn-primary btn-sm" onClick={() => setSetupOpen(true)}>Download</button>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <span className="pill">Free · Open source · Chrome</span>
            <h1>Forms, <em>filled.</em><br />You press submit.</h1>
            <p>
              Fillie reads the questions on any job application or form and types the answers from your profile and resume. Private, works offline, and
              you stay in charge.
            </p>
            <div className="hero-cta">
              <button className="btn btn-primary btn-lg" onClick={() => setSetupOpen(true)}>⬇ Download &amp; setup</button>
              {github}
            </div>
            <p className="hero-note">No store, no account. Loads in Chrome, Edge, Brave and Arc.</p>
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

        <section id="privacy" className="section privacy">
          <Shield size={150} className="float" />
          <h2 className="title">Your data stays yours</h2>
          <ul className="checks">
            <li>Stored only in your browser, never on a server.</li>
            <li>API keys are used only by the extension’s background worker, never by web pages.</li>
            <li>No key? Then no network request is ever made.</li>
            <li>Fully open source under the MIT licence. Read every line.</li>
          </ul>
          <div className="hero-cta center">
            <button className="btn btn-primary btn-lg" onClick={() => setSetupOpen(true)}>⬇ Download &amp; setup</button>
            {github}
          </div>
        </section>

        <Donate />
      </main>

      <footer className="footer">
        <span className="brand"><span className="mark" aria-hidden="true" />Fillie</span>
        <span>Made by {SITE.author}. MIT licensed.</span>
        <a href={SITE.githubUrl} target="_blank" rel="noreferrer">GitHub</a>
      </footer>

      {setupOpen && <SetupModal onClose={() => setSetupOpen(false)} />}
    </>
  );
}
