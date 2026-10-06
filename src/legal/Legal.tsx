import type { ReactNode } from 'react';
import { BUSINESS, SITE } from '../config';

export type LegalPage = 'terms' | 'privacy' | 'refund' | 'contact';

const UPDATED = 'October 2026';
const PLACEHOLDER_EMAIL = BUSINESS.email.includes('YOUR-DOMAIN');

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section>
    <h2>{title}</h2>
    {children}
  </section>
);

function Terms() {
  return (
    <>
      <p className="legal-updated">Last updated {UPDATED}</p>
      <Section title="1. About Fillie">
        <p>Fillie is a browser extension, operated by {BUSINESS.legalName} (“we”, “us”), that helps you fill online forms using your own profile and resume. You always review the answers and press submit yourself. Fillie never submits a form for you.</p>
      </Section>
      <Section title="2. Free use and paid access">
        <p>Fillie includes {SITE.freeFillsPerWeek} free form fillings each calendar week. Unlimited use is available for a one-time payment of {SITE.price}. The payment unlocks your account permanently, for as long as Fillie is offered. It is not a subscription and does not renew.</p>
      </Section>
      <Section title="3. Delivery">
        <p>Fillie is a digital product. Access is unlocked on your account immediately after the payment is confirmed. Nothing is shipped. If your access does not appear within a few minutes, contact us and we will fix it.</p>
      </Section>
      <Section title="4. Your responsibilities">
        <ul>
          <li>Check every answer before you submit a form. Answers can be wrong or incomplete, especially those written with AI.</li>
          <li>Only use information you are entitled to share, and keep your sign-in and any API keys you add to yourself.</li>
          <li>Do not use Fillie to break the rules of a website, to deceive, or to submit false information.</li>
        </ul>
      </Section>
      <Section title="5. No guarantees">
        <p>We do not promise any outcome, such as interviews or job offers. Fillie is provided “as is”. To the extent the law allows, our total liability for any claim is limited to the amount you paid us.</p>
      </Section>
      <Section title="6. Third-party services">
        <p>Fillie can connect to AI services you choose, using your own keys. Those services have their own terms and charge you directly. Payments are processed by Razorpay.</p>
      </Section>
      <Section title="7. Changes and ending access">
        <p>We may update Fillie and these terms. We may suspend access for misuse or abuse. Refunds are covered by the <a href="/refund">Refund policy</a>.</p>
      </Section>
      <Section title="8. Governing law and contact">
        <p>These terms are governed by the laws of India. Questions: <a href="/contact">Contact us</a>.</p>
      </Section>
    </>
  );
}

function Privacy() {
  return (
    <>
      <p className="legal-updated">Last updated {UPDATED}</p>
      <Section title="What we collect">
        <ul>
          <li><strong>Account:</strong> your email address and which sign-in method you used (Google, GitHub, Apple or email).</li>
          <li><strong>Free-use counting:</strong> to count the {SITE.freeFillsPerWeek} free fillings a week, we store irreversible hashes of an install id, basic device traits and your network address. We do not store the raw values.</li>
          <li><strong>Backup (when signed in):</strong> your Fillie profile, resumes, learned answers and application tracker, so they survive if your browser data is cleared.</li>
          <li><strong>Feedback and usage:</strong> reviews you send, and counts such as forms filled and how many answers you corrected. No answer text.</li>
          <li><strong>Payments:</strong> handled by Razorpay. We receive the payment reference, amount and currency. We never see or store your card details.</li>
        </ul>
      </Section>
      <Section title="What stays on your device">
        <p>Any AI API keys you add never leave your device. When you use an AI service, the questions it needs help with, and the relevant parts of your profile, are sent from your browser to the service you chose.</p>
      </Section>
      <Section title="How we use it">
        <p>To run Fillie, unlock your plan, back up your data, count free use, prevent abuse, and improve the product. We do not sell your data or use it for advertising.</p>
      </Section>
      <Section title="Who processes it for us">
        <p>Supabase (accounts and database), Razorpay (payments) and Vercel (this website). Each handles data only to provide its service.</p>
      </Section>
      <Section title="Your choices">
        <p>You can ask us to export or delete your account and data at any time through the <a href="/contact">contact page</a>. Deleting your account removes your backup and application records. We keep payment records as long as the law requires.</p>
      </Section>
      <Section title="Security">
        <p>Data is stored with access rules so each person can only read their own. No system is perfectly secure, so please keep your sign-in safe.</p>
      </Section>
    </>
  );
}

function Refund() {
  return (
    <>
      <p className="legal-updated">Last updated {UPDATED}</p>
      <Section title="Cancellation">
        <p>Fillie is a one-time purchase, so there is nothing to cancel and you will never be charged again.</p>
      </Section>
      <Section title={`${BUSINESS.refundDays}-day refund`}>
        <p>If Fillie is not right for you, email us within <strong>{BUSINESS.refundDays} days</strong> of paying and we will refund the full {SITE.price}. No questions asked. Please include the email address you signed in with.</p>
      </Section>
      <Section title="After that">
        <p>Because Fillie is a digital product, we do not refund after {BUSINESS.refundDays} days, except where you were charged twice or a technical problem on our side stopped you from using what you paid for and we could not fix it.</p>
      </Section>
      <Section title="How refunds are paid">
        <p>Refunds go back to the original payment method through Razorpay. Banks usually take 5 to 7 business days to show it. Your account returns to the free plan once a refund is issued.</p>
      </Section>
      <p>To request a refund, <a href="/contact">contact us</a>.</p>
    </>
  );
}

function Contact() {
  return (
    <>
      <Section title="Get in touch">
        <p>We reply within 2 working days, and usually sooner.</p>
        <dl className="legal-contact">
          <dt>Business name</dt>
          <dd>{BUSINESS.legalName}</dd>
          <dt>Email</dt>
          <dd>{PLACEHOLDER_EMAIL ? <span className="dev-note">Set your email in src/config.ts (BUSINESS.email)</span> : <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>}</dd>
          {BUSINESS.phone && (
            <>
              <dt>Phone</dt>
              <dd>{BUSINESS.phone}</dd>
            </>
          )}
          {BUSINESS.address && (
            <>
              <dt>Address</dt>
              <dd>{BUSINESS.address}</dd>
            </>
          )}
        </dl>
      </Section>
      <Section title="What to include">
        <p>For payment or access questions, send the email address you signed in with to Fillie. For refunds, see the <a href="/refund">Refund policy</a>.</p>
      </Section>
    </>
  );
}

const TITLES: Record<LegalPage, string> = { terms: 'Terms of Service', privacy: 'Privacy Policy', refund: 'Refund & Cancellation Policy', contact: 'Contact us' };

export function Legal({ page }: { page: LegalPage }) {
  return (
    <div className="legal">
      <header className="nav">
        <a className="brand" href="/"><span className="mark" aria-hidden="true" />Fillie</a>
        <nav aria-label="Legal pages">
          {(['terms', 'privacy', 'refund', 'contact'] as const).map((id) => (
            <a key={id} href={`/${id}`} aria-current={page === id ? 'page' : undefined}>{id === 'refund' ? 'Refunds' : TITLES[id].split(' ')[0]}</a>
          ))}
        </nav>
      </header>
      <main className="legal-body">
        <h1>{TITLES[page]}</h1>
        {page === 'terms' && <Terms />}
        {page === 'privacy' && <Privacy />}
        {page === 'refund' && <Refund />}
        {page === 'contact' && <Contact />}
        <p className="legal-back"><a href="/">← Back to Fillie</a></p>
      </main>
    </div>
  );
}
