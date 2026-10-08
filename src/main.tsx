import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

// The dashboard and the policy pages are their own chunks, so visitors to the landing page never download them.
const Admin = lazy(() => import('./admin/Admin').then((m) => ({ default: m.Admin })));
const Influencer = lazy(() => import('./influencer/Influencer').then((m) => ({ default: m.Influencer })));
const Legal = lazy(() => import('./legal/Legal').then((m) => ({ default: m.Legal })));

const path = location.pathname.replace(/\/+$/, '');
const legalPage = (['terms', 'privacy', 'refund', 'contact'] as const).find((id) => path === `/${id}`);
const isInfluencer = path === '/influencer' || path.startsWith('/influencer/');
const isAdmin = path === '/admin' || path.startsWith('/admin/');

// Each page gets its own title and description for search results; the admin page is kept out of them.
const PAGE_META: Record<string, { title: string; description: string }> = {
  terms: { title: 'Terms of Service | Fillie', description: 'The terms for using Fillie, the AI job application autofill and tracker Chrome extension.' },
  privacy: { title: 'Privacy Policy | Fillie', description: 'What the Fillie AI Chrome extension stores, what it sends to the AI service you choose, and how you can delete it.' },
  refund: { title: 'Refund Policy | Fillie', description: 'Fillie refunds within 7 days of paying, no questions asked.' },
  contact: { title: 'Contact Fillie', description: 'Contact the Fillie team for help with the AI job application autofill extension, payments or refunds.' },
};
const meta = (name: string, content: string) => {
  let tag = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.name = name;
    document.head.append(tag);
  }
  tag.content = content;
};
if (isAdmin) {
  document.title = 'Fillie admin';
  meta('robots', 'noindex,nofollow');
} else if (isInfluencer) {
  document.title = 'Fillie Creator Programme: give 10% off, earn 10% on every sale';
  meta('description', 'Join the Fillie creator programme. Share your promo code, your audience gets 10% off the AI job application autofill extension, and you earn 10% of every payment.');
} else if (legalPage) {
  document.title = PAGE_META[legalPage]!.title;
  meta('description', PAGE_META[legalPage]!.description);
}
if (!isAdmin) {
  const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (canonical) canonical.href = `https://www.fillie.app${path || '/'}`;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isInfluencer ? (
      <Suspense fallback={null}>
        <Influencer />
      </Suspense>
    ) : isAdmin ? (
      <Suspense fallback={null}>
        <Admin />
      </Suspense>
    ) : legalPage ? (
      <Suspense fallback={null}>
        <Legal page={legalPage} />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
);
