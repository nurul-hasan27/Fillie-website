import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { isSupabaseConfigured, SUPABASE } from '../config';

let client: SupabaseClient | null = null;

/** One shared client for the whole site (pricing/checkout and /admin). */
export function supabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  client ??= createClient(SUPABASE.url, SUPABASE.anonKey, { auth: { persistSession: true, detectSessionInUrl: true } });
  return client;
}
