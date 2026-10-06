import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

// The dashboard is its own chunk, so visitors to the landing page never download it.
const Admin = lazy(() => import('./admin/Admin').then((m) => ({ default: m.Admin })));
const isAdmin = location.pathname === '/admin' || location.pathname.startsWith('/admin/');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isAdmin ? (
      <Suspense fallback={null}>
        <Admin />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
);
