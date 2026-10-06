import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isSupabaseConfigured } from '../config';
import { Bars, HBars, Stars } from './charts';
import {
  checkAdmin, demoAllowed, getSession, loadAdminData, signInWithGoogle, signOut, supabase,
  type AdminData, type OfferRow,
} from './api';
import './admin.css';

type Tab = 'overview' | 'users' | 'payments' | 'feedback' | 'stories';
type Phase = 'loading' | 'signed-out' | 'denied' | 'ready' | 'error';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'Users' },
  { id: 'payments', label: 'Revenue' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'stories', label: 'Success stories' },
];

const money = (minor: number, currency: string) =>
  new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(minor / 100);
const num = (n: number) => n.toLocaleString('en-IN');
const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export function Admin() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [email, setEmail] = useState('');
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('overview');

  const load = useCallback(async () => {
    setPhase('loading');
    try {
      setData(await loadAdminData());
      setPhase('ready');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the dashboard.');
      setPhase('error');
    }
  }, []);

  // Which signed-in user the dashboard has already been opened for. Supabase announces
  // "signed in" again on every page load and whenever the tab regains focus; without this
  // the page would restart (or reload) each time.
  const openedFor = useRef<string | null>(null);
  const starting = useRef(false);

  const start = useCallback(async () => {
    if (starting.current) return;
    starting.current = true;
    try {
      if (demoAllowed) {
        setEmail('demo');
        await load();
        return;
      }
      const session = await getSession();
      if (!session) {
        openedFor.current = null;
        setPhase('signed-out');
        return;
      }
      openedFor.current = session.user.id;
      setEmail(session.user.email ?? '');
      // The database decides who the admin is; hiding the UI alone would protect nothing.
      if (!(await checkAdmin())) {
        setPhase('denied');
        return;
      }
      await load();
    } finally {
      starting.current = false;
    }
  }, [load]);

  useEffect(() => {
    void start();
    const sb = supabase();
    const { data: sub } =
      sb?.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
          openedFor.current = null;
          setData(null);
          setPhase('signed-out');
        } else if (event === 'SIGNED_IN' && session?.user.id && session.user.id !== openedFor.current) {
          // Never call back into Supabase from inside this callback; hand off to the next tick.
          setTimeout(() => void start(), 0);
        }
      }) ?? { data: null };
    return () => sub?.subscription.unsubscribe();
  }, [start]);

  if (phase === 'loading') return <div className="adm-center"><span className="adm-spinner" /><p>Loading…</p></div>;

  if (phase === 'signed-out' || phase === 'denied') {
    return (
      <div className="adm-center">
        <div className="adm-gate">
          <span className="mark" aria-hidden="true" />
          <h1>{phase === 'denied' ? 'Not authorised' : 'Fillie admin'}</h1>
          <p>{phase === 'denied' ? 'This account does not have access.' : 'Sign in to continue.'}</p>
          {!isSupabaseConfigured && <p className="adm-warn">Supabase is not configured yet (src/config.ts).</p>}
          {phase === 'denied' ? (
            <button className="btn btn-secondary btn-lg" onClick={() => void signOut()}>Use a different account</button>
          ) : (
            <button className="btn btn-primary btn-lg" onClick={signInWithGoogle} disabled={!isSupabaseConfigured}>Continue with Google</button>
          )}
        </div>
      </div>
    );
  }

  if (phase === 'error' || !data) {
    return (
      <div className="adm-center">
        <div className="adm-gate">
          <h1>Could not load</h1>
          <p>{error}</p>
          <p className="adm-warn">If this says "function does not exist", run the SQL migrations in docs/CLOUD_SETUP.md.</p>
          <button className="btn btn-primary" onClick={load}>Try again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="adm">
      <header className="adm-top">
        <a className="brand" href="/"><span className="mark" aria-hidden="true" />Fillie <small>admin</small></a>
        <nav className="adm-tabs" role="tablist" aria-label="Dashboard sections">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </nav>
        <div className="adm-user">
          <span>{email}</span>
          <button className="btn btn-ghost btn-sm" onClick={load}>Refresh</button>
          {!demoAllowed && <button className="btn btn-ghost btn-sm" onClick={() => void signOut()}>Sign out</button>}
        </div>
      </header>
      <main className="adm-main">
        {tab === 'overview' && <Overview data={data} />}
        {tab === 'users' && <Users data={data} />}
        {tab === 'payments' && <Revenue data={data} />}
        {tab === 'feedback' && <Feedback data={data} />}
        {tab === 'stories' && <Stories data={data} />}
      </main>
    </div>
  );
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: 'sky' | 'marigold' | 'green' | 'coral' | 'ink' | 'sand' }) {
  return (
    <div className="kpi" data-tone={tone}>
      <span className="kpi-label">{label}</span>
      <strong>{value}</strong>
      {sub && <span className="kpi-sub">{sub}</span>}
    </div>
  );
}

function Overview({ data }: { data: AdminData }) {
  const o = data.overview;
  const conversion = o.users_total ? Math.round((o.paid_users / o.users_total) * 100) : 0;
  const accuracy = o.answers_filled ? Math.round((1 - o.answers_edited / o.answers_filled) * 100) : null;
  const funnel = o.funnel;
  const ratingRows = [5, 4, 3, 2, 1].map((n) => ({ label: `${n} ★`, value: o.rating_counts[String(n)] ?? 0, color: n >= 4 ? 'var(--green)' : n === 3 ? 'var(--marigold)' : 'var(--coral)' }));
  return (
    <>
      <section className="kpis">
        <Kpi tone="sky" label="Users" value={num(o.users_total)} sub={`+${num(o.users_7d)} this week`} />
        <Kpi tone="green" label="Paid users" value={num(o.paid_users)} sub={`${conversion}% of users`} />
        <Kpi tone="marigold" label="Active (7 days)" value={num(o.active_7d)} sub={`${num(o.active_30d)} in 30 days`} />
        <Kpi tone="ink" label="Revenue" value={o.revenue.length ? o.revenue.map((r) => money(r.total_minor, r.currency)).join(' + ') : '—'} sub={`${o.revenue.reduce((a, r) => a + r.payments, 0)} payments`} />
        <Kpi tone="sand" label="Forms filled" value={num(o.fills_total)} sub={`${num(o.fills_7d)} this week`} />
        <Kpi tone="coral" label="Rating" value={o.avg_rating ? `${o.avg_rating} ★` : '—'} sub={`${num(o.feedback_total)} reviews`} />
        <Kpi tone="green" label="Answer accuracy" value={accuracy === null ? '—' : `${accuracy}%`} sub={o.answers_filled ? `${num(o.answers_edited)} of ${num(o.answers_filled)} corrected` : 'no data yet'} />
        <Kpi tone="sky" label="Offers" value={num(o.offers_count)} sub={o.offers_avg_lpa ? `avg ${o.offers_avg_lpa} LPA` : 'no packages yet'} />
      </section>

      <section className="adm-grid">
        <article className="panel"><h2>New users · 30 days</h2><Bars data={o.signups_daily.map((d) => ({ label: d.day, value: d.count }))} color="var(--blue)" /></article>
        <article className="panel"><h2>Forms filled · 30 days</h2><Bars data={o.fills_daily.map((d) => ({ label: d.day, value: d.count }))} color="var(--marigold)" /></article>
        <article className="panel">
          <h2>Application funnel</h2>
          <HBars rows={[
            { label: 'Applied', value: funnel.applied ?? 0, color: 'var(--blue)' },
            { label: 'Interview', value: funnel.interview ?? 0, color: 'var(--marigold)' },
            { label: 'Offer', value: funnel.offer ?? 0, color: 'var(--green)' },
            { label: 'Rejected', value: funnel.rejected ?? 0, color: 'var(--coral)' },
          ]} />
        </article>
        <article className="panel"><h2>Rating spread</h2><HBars rows={ratingRows} /></article>
        <article className="panel wide">
          <h2>Where students apply</h2>
          <table className="adm-table">
            <thead><tr><th>Company</th><th>Applications</th><th>Offers</th></tr></thead>
            <tbody>{o.top_companies.map((c) => <tr key={c.company}><td>{c.company}</td><td>{num(c.applications)}</td><td><span className="tg tg-green">{c.offers}</span></td></tr>)}</tbody>
          </table>
        </article>
      </section>
    </>
  );
}

function Users({ data }: { data: AdminData }) {
  const [q, setQ] = useState('');
  const rows = useMemo(() => data.users.filter((u) => u.email?.toLowerCase().includes(q.toLowerCase())), [data.users, q]);
  return (
    <section className="panel">
      <div className="panel-head"><h2>Users <small>{rows.length}</small></h2><input className="adm-input" placeholder="Search email…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="table-wrap">
        <table className="adm-table">
          <thead><tr><th>Email</th><th>Plan</th><th>Joined</th><th>Last seen</th><th>Applications</th><th>Offers</th></tr></thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td><span className={`tg ${u.paid ? 'tg-green' : 'tg-sand'}`}>{u.paid ? 'Paid' : 'Free'}</span></td>
                <td>{day(u.created_at)}</td>
                <td>{u.last_sign_in_at ? day(u.last_sign_in_at) : '—'}</td>
                <td>{u.applications}</td>
                <td>{u.offers ? <span className="tg tg-marigold">{u.offers}</span> : 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Revenue({ data }: { data: AdminData }) {
  const o = data.overview;
  return (
    <>
      <section className="kpis">
        {o.revenue.map((r) => (
          <Kpi key={r.currency} tone={r.currency === 'INR' ? 'marigold' : 'sky'} label={`Collected (${r.currency})`} value={money(r.total_minor, r.currency)} sub={`${money(r.last_30d_minor, r.currency)} in the last 30 days · ${r.payments} payments`} />
        ))}
        {o.revenue_by_provider.map((r) => <Kpi key={r.provider + r.currency} tone="sand" label={r.provider === 'stripe' ? 'Stripe' : 'Razorpay'} value={money(r.total_minor, r.currency)} sub={`${r.payments} payments`} />)}
      </section>
      <section className="panel">
        <h2>Payments</h2>
        <div className="table-wrap">
          <table className="adm-table">
            <thead><tr><th>Date</th><th>Customer</th><th>Via</th><th>Amount</th></tr></thead>
            <tbody>{data.payments.map((p) => <tr key={p.id}><td>{day(p.created_at)}</td><td>{p.email ?? '—'}</td><td><span className={`tg ${p.provider === 'stripe' ? 'tg-sky' : 'tg-marigold'}`}>{p.provider}</span></td><td>{money(p.amount_minor, p.currency)}</td></tr>)}</tbody>
          </table>
        </div>
        <p className="muted">Totals are before the payment provider's fees. Check Razorpay for what you receive.</p>
      </section>
    </>
  );
}

function Feedback({ data }: { data: AdminData }) {
  const [kind, setKind] = useState<'all' | 'review' | 'bug' | 'idea'>('all');
  const rows = data.feedback.filter((f) => kind === 'all' || f.kind === kind);
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Feedback <small>{rows.length}</small></h2>
        <div className="chips">{(['all', 'review', 'bug', 'idea'] as const).map((k) => <button key={k} className={`tg tg-${k === 'bug' ? 'coral' : k === 'idea' ? 'marigold' : k === 'review' ? 'sky' : 'sand'}${kind === k ? ' on' : ''}`} onClick={() => setKind(k)}>{k}</button>)}</div>
      </div>
      <div className="feed">
        {rows.length === 0 && <p className="muted">Nothing here yet.</p>}
        {rows.map((f) => (
          <article key={f.id} className="feed-item">
            <div className="feed-top"><Stars value={f.rating} /><span className={`tg tg-${f.kind === 'bug' ? 'coral' : f.kind === 'idea' ? 'marigold' : 'sky'}`}>{f.kind}</span><span className="muted">{f.email ?? 'anonymous'} · {day(f.created_at)}</span></div>
            {f.message && <p>{f.message}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}

function post(o: OfferRow) {
  const who = o.email ? o.email.split('@')[0] : 'A Fillie user';
  return `🎉 ${who} just got an offer from ${o.company}${o.role ? ` as ${o.role}` : ''}${o.offer_lpa ? ` · ${o.offer_lpa} LPA` : ''}! Applied with Fillie.`;
}

function Stories({ data }: { data: AdminData }) {
  const [copied, setCopied] = useState(-1);
  const shared = data.offers.filter((o) => o.shared);
  const copy = async (text: string, i: number) => {
    try { await navigator.clipboard.writeText(text); setCopied(i); setTimeout(() => setCopied(-1), 1500); } catch { /* ignore */ }
  };
  return (
    <>
      <section className="kpis">
        <Kpi tone="green" label="Offers" value={num(data.overview.offers_count)} sub={data.overview.offers_avg_lpa ? `average ${data.overview.offers_avg_lpa} LPA` : ''} />
        <Kpi tone="marigold" label="Willing to be featured" value={num(shared.length)} sub="opted in to share" />
      </section>
      <section className="panel">
        <h2>Offers</h2>
        <p className="muted">Names and emails appear only for students who ticked "share my offers" in the extension. Everyone else counts in the totals only.</p>
        <div className="table-wrap">
          <table className="adm-table">
            <thead><tr><th>Company</th><th>Role</th><th>Package</th><th>Student</th><th /></tr></thead>
            <tbody>
              {data.offers.map((o, i) => (
                <tr key={i}>
                  <td>{o.company}</td><td>{o.role || '—'}</td>
                  <td>{o.offer_lpa ? <span className="tg tg-green">{o.offer_lpa} LPA</span> : '—'}</td>
                  <td>{o.shared ? o.email : <span className="muted">private</span>}</td>
                  <td>{o.shared && <button className="btn btn-ghost btn-sm" onClick={() => copy(post(o), i)}>{copied === i ? 'Copied ✓' : 'Copy post'}</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
