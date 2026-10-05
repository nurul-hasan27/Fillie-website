import { useEffect, useState } from 'react';
import { SITE } from '../config';
import { Puzzle } from './Clay';

const STEPS = [
  { title: 'Download and unzip', body: 'Click the button below, then unzip the file. You get a folder called fillie-extension. Keep it somewhere you will not delete.' },
  { title: 'Open the extensions page', body: 'In Chrome, Edge, Brave or Arc, open a new tab and go to chrome://extensions. (Copy the address with the button.)' },
  { title: 'Turn on Developer mode', body: 'Flip the “Developer mode” switch in the top-right corner of that page.' },
  { title: 'Click “Load unpacked”', body: 'A button appears at the top-left. Click it and choose the unzipped fillie-extension folder.' },
  { title: 'Pin it and add your profile', body: 'Click the puzzle icon in the toolbar and pin Fillie. Open it, go to Settings, and fill in your profile. Add a free AI key if you want smarter answers.' },
];

export function SetupModal({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText('chrome://extensions');
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard can be blocked; the address is also shown on screen */
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="setup-title" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        <div className="modal-head">
          <Puzzle size={84} />
          <div>
            <h2 id="setup-title">Download &amp; set up Fillie</h2>
            <p>Takes about two minutes. No store, no account.</p>
          </div>
        </div>

        <a className="btn btn-primary btn-lg btn-block" href={SITE.downloadUrl} download>
          ⬇ Download fillie-extension.zip <span className="muted">v{SITE.version}</span>
        </a>

        <ol className="steps">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <span className="step-num">{index + 1}</span>
              <div>
                <strong>{step.title}</strong>
                <p>{step.body}</p>
                {index === 1 && (
                  <button className="btn btn-ghost btn-sm" onClick={copy}>
                    {copied ? 'Copied ✓' : 'Copy chrome://extensions'}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ol>

        <p className="modal-foot">
          Prefer to build it yourself? <a href={SITE.githubUrl} target="_blank" rel="noreferrer">Follow the README on GitHub</a>.
        </p>
      </div>
    </div>
  );
}
