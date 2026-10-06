import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

// The dashboard and the policy pages are their own chunks, so visitors to the landing page never download them.
const Admin = lazy(() => import('./admin/Admin').then((m) => ({ default: m.Admin })));
const Legal = lazy(() => import('./legal/Legal').then((m) => ({ default: m.Legal })));

const path = location.pathname.replace(/\/+$/, '');
const legalPage = (['terms', 'privacy', 'refund', 'contact'] as const).find((id) => path === `/${id}`);
const isAdmin = path === '/admin' || path.startsWith('/admin/');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isAdmin ? (
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
