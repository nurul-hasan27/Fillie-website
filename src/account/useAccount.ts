import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface Account {
  /** False until the saved session has been read. */
  ready: boolean;
  session: Session | null;
  /** null while unknown. */
  paid: boolean | null;
  refresh(): Promise<void>;
  signOut(): Promise<void>;
}

/** The visitor's sign-in and whether they have already unlocked Fillie. */
export function useAccount(): Account {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [paid, setPaid] = useState<boolean | null>(null);

  useEffect(() => {
    const sb = supabase();
    if (!sb) {
      setReady(true);
      return;
    }
    void sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    // Only store state here; calling Supabase from inside this callback can deadlock it.
    const { data } = sb.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;

  const refresh = useCallback(async () => {
    const sb = supabase();
    if (!sb || !userId) {
      setPaid(null);
      return;
    }
    const { data, error } = await sb.from('entitlements').select('paid').eq('user_id', userId).maybeSingle();
    setPaid(error ? null : Boolean(data?.paid));
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signOut = useCallback(async () => {
    await supabase()?.auth.signOut();
    setPaid(null);
  }, []);

  return { ready, session, paid, refresh, signOut };
}
