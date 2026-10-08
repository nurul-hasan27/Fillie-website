import { useCallback, useEffect, useState } from 'react';
import { useAccount, displayName } from '../account/useAccount';
import { isSupabaseConfigured } from '../config';
import { Avatar, CopyButton, Modal, messageOf, useToast } from '../ui/ui';
import { getDashboard, getMe, photoUrl, type Dashboard as Data, type Me } from './api';
import { AuthGate } from './AuthGate';
import { Codes } from './Codes';
import { Dashboard, shareLink } from './Dashboard';
import { Earnings, WithdrawModal } from './Earnings';
import { Onboarding } from './Onboarding';
import { Settings } from './Settings';
import { Support } from './Support';
import '../admin/admin.css';
import './influencer.css';

type Tab = 'dashboard' | 'codes' | 'earnings' | 'settings' | 'support';
const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'codes', label: 'Promo codes' },
  { id: 'earnings', label: 'Earnings' },
  { id: 'settings', label: 'Settings' },
  { id: 'support', label: 'Support' },
];

const tabFromHash = (): Tab => (TABS.find((t) => `#${t.id}` === location.hash)?.id ?? 'dashboard');

export function Influencer() {
  const account = useAccount();
  const toast = useToast();
  const userId = account.session?.user.id;
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [loadError, setLoadError] = useState('');
  const [tab, setTabState] = useState<Tab>(tabFromHash);
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Data | null>(null);
  const [welcome, setWelcome] = useState<Me | null>(null);
  const [withdrawFor, setWithdrawFor] = useState<string | null>(null);
  const [payoutFocus, setPayoutFocus] = useState(false);

  const setTab = useCallback((next: Tab, focusPayout = false) => {
    setTabState(next);
    setPayoutFocus(focusPayout);
    history.replaceState(null, '', `#${next}`);
    window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    const onHash = () => setTabState(tabFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Load the influencer profile whenever the signed-in user changes.
  useEffect(() => {
    if (!account.ready) return;
    if (!userId) {
      setMe(undefined);
      setData(null);
      return;
    }
    let live = true;
    setLoadError('');
    getMe().then((m) => live && setMe(m)).catch((e) => live && (setLoadError(messageOf(e, 'Could not load your account.')), setMe(null)));
    return () => { live = false; };
  }, [account.ready, userId]);

  const loadData = useCallback(async () => {
    try {
      setData(await getDashboard(days));
    } catch (e) {
      toast.show(messageOf(e), 'error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  useEffect(() => {
    if (me) void loadData();
  }, [me?.profile.id, loadData]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!account.ready || (account.session && me === undefined && !loadError)) {
    return <div className="adm-center"><span className="adm-spinner" /><p>Loading…</p></div>;
  }

  if (!account.session) {
    return (
      <div className="inf-page">
        <header className="adm-top"><a className="brand" href="/"><span className="mark" aria-hidden="true" />Fillie <small>creators</small></a></header>
        <main className="inf-main"><AuthGate /></main>
      </div>
    );
  }

  const name = displayName(account.session);

  if (!me) {
    return (
      <div className="inf-page">
        <header className="adm-top">
          <a className="brand" href="/"><span className="mark" aria-hidden="true" />Fillie <small>creators</small></a>
          <div className="adm-user"><span>{account.session.user.email}</span><button className="btn btn-ghost btn-sm" onClick={() => void account.signOut()}>Sign out</button></div>
        </header>
        <main className="inf-main">
          {loadError ? (
            <div className="inf-card" style={{ margin: '40px auto' }}>
              <h2>Could not load</h2>
              <p className="f-error">{loadError}</p>
              <p className="muted-p">If this mentions a missing function, the influencer database setup has not been applied yet.</p>
              <button className="btn btn-primary" onClick={() => location.reload()}>Try again</button>
            </div>
          ) : (
            <Onboarding session={account.session} onJoined={(joined) => { setMe(joined); setWelcome(joined); setTab('dashboard'); }} />
          )}
        </main>
        {toast.node}
      </div>
    );
  }

  const bestCurrency = [...(data?.balances ?? [])].sort((a, b) => b.available - a.available)[0]?.currency ?? 'INR';
  const refresh = () => { void loadData(); };

  return (
    <div className="inf-page">
      <header className="adm-top">
        <a className="brand" href="/"><span className="mark" aria-hidden="true" />Fillie <small>creators</small></a>
        <nav className="adm-tabs" role="tablist" aria-label="Sections">
          {TABS.map((t) => <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</button>)}
        </nav>
        <div className="adm-user">
          <Avatar name={me.profile.display_name || me.profile.full_name || name} src={photoUrl(me.profile.photo_path)} />
          <span className="inf-who">{me.profile.display_name || me.profile.full_name}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => void account.signOut()}>Sign out</button>
        </div>
      </header>

      <main className="adm-main">
        {me.profile.status === 'suspended' && <p className="f-warn">Your account is suspended. Your codes are off. Please contact support from the Support tab.</p>}
        {me.profile.status === 'active' && !me.payout && tab !== 'settings' && (
          <p className="f-info">Add your bank details and PAN in <button className="link-btn" onClick={() => setTab('settings', true)}>Settings</button> before your first withdrawal.</p>
        )}

        {tab === 'dashboard' && (data ? <Dashboard me={me} data={data} days={days} onDays={setDays} onGoto={setTab} /> : <div className="adm-center" style={{ minHeight: 240 }}><span className="adm-spinner" /></div>)}
        {tab === 'codes' && <Codes me={me} data={data} onMe={(next) => { setMe(next); refresh(); }} onToast={toast.show} />}
        {tab === 'earnings' && (data ? <Earnings data={data} onChanged={refresh} onGoSettings={() => setTab('settings', true)} onToast={toast.show} /> : <div className="adm-center" style={{ minHeight: 240 }}><span className="adm-spinner" /></div>)}
        {tab === 'settings' && <Settings me={me} userId={account.session.user.id} onMe={setMe} onToast={toast.show} focusPayout={payoutFocus} onWithdraw={() => setWithdrawFor(bestCurrency)} onLeft={() => { setMe(null); setData(null); toast.show('Your influencer account was deleted.'); }} />}
        {tab === 'support' && <Support email={me.profile.email || account.session.user.email || ''} onToast={toast.show} />}
      </main>

      {welcome && (
        <Modal title="You're in! 🎉" onClose={() => setWelcome(null)} width={480}>
          <p>Here is your promo code. Give it to your audience: they get 10% off Fillie, and you earn 10% of every payment.</p>
          <div className="welcome-code"><code>{welcome.codes[0]?.code}</code><CopyButton text={welcome.codes[0]?.code ?? ''} label="Copy code" className="btn btn-primary btn-sm" /></div>
          <p className="muted-p">Or share this link, it fills the code in for them:</p>
          <div className="welcome-code small"><span>{shareLink(welcome.codes[0]?.code ?? '')}</span><CopyButton text={shareLink(welcome.codes[0]?.code ?? '')} label="Copy link" /></div>
          {!welcome.payout && <p className="f-warn">Remember to add your bank details in Settings before your first withdrawal.</p>}
          <button className="btn btn-secondary" onClick={() => setWelcome(null)}>Go to my dashboard</button>
        </Modal>
      )}
      {withdrawFor && <WithdrawModal currency={withdrawFor} onClose={() => setWithdrawFor(null)} onDone={() => { setWithdrawFor(null); refresh(); toast.show('Withdrawal requested. We will review it shortly.'); }} onGoSettings={() => { setWithdrawFor(null); setTab('settings', true); }} />}
      {toast.node}
      {!isSupabaseConfigured && null}
    </div>
  );
}
