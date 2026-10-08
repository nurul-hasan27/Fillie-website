import { supabase } from '../lib/supabase';
import { SUPABASE } from '../config';
import type { MoneyMap } from '../lib/format';

export const PLATFORMS = ['Instagram', 'YouTube', 'Facebook', 'X', 'Other'] as const;
export const NICHES = ['Fashion', 'Beauty', 'Fitness', 'Food', 'Tech', 'Lifestyle', 'Education', 'Gaming', 'Other'] as const;
export const PROMOTE_ON = ['Instagram', 'YouTube', 'WhatsApp', 'Telegram', 'Website/Blog', 'Other'] as const;
export const AUDIENCE_SIZES = ['Under 1k', '1k-10k', '10k-50k', '50k-250k', '250k-1M', 'Over 1M'] as const;
export const COLLAB_TYPES = ['Promo code only', 'Dedicated video / reel', 'Story / short mentions', 'Blog or newsletter', 'Community / group sharing', 'Open to ideas'] as const;
export const SOCIAL_KEYS = [
  { key: 'instagram', label: 'Instagram', userHint: '@yourhandle', urlHint: 'https://instagram.com/yourhandle' },
  { key: 'youtube', label: 'YouTube', userHint: 'Channel name', urlHint: 'https://youtube.com/@yourchannel' },
  { key: 'facebook', label: 'Facebook', userHint: 'Page or profile name', urlHint: 'https://facebook.com/yourpage' },
  { key: 'x', label: 'X / Twitter', userHint: '@yourhandle', urlHint: 'https://x.com/yourhandle' },
  { key: 'other', label: 'Other platform', userHint: 'Name or handle', urlHint: 'https://' },
] as const;

export interface Social { username: string; url: string }
export interface Profile {
  id: string;
  status: 'active' | 'suspended' | 'deleted';
  full_name: string; display_name: string; email: string; phone: string; dob: string | null; photo_path: string | null;
  city: string; state: string; socials: Partial<Record<(typeof SOCIAL_KEYS)[number]['key'], Social>>;
  total_followers: number; primary_platform: string; niche: string; niche_other: string; audience_location: string; audience_size: string;
  description: string; monthly_reach: string; collab_type: string; promote_on: string[]; created_at: string;
}
export interface Payout {
  account_holder: string; account_last4: string; ifsc: string; bank_name: string; upi_id: string; pan_masked: string; pan_name: string; gstin: string;
  has_proof: boolean; verification: 'pending' | 'verified' | 'rejected';
}
export interface Code { id: string; code: string; active: boolean; discount_bps: number; created_at: string }
export interface Me { profile: Profile; commission_bps: number; payout: Payout | null; codes: Code[]; max_codes: number; terms_version: string }

export interface Balance { currency: string; available: number; pending: number; lifetime: number; paid_out: number; in_review: number }
export interface CodeStats { id: string; code: string; active: boolean; discount_bps: number; created_at: string; orders: number; commission: MoneyMap; revenue: MoneyMap }
export interface Recent { order_id: string; code: string; order_amount_minor: number; commission_minor: number; currency: string; status: Status; created_at: string; available_on: string | null }
export interface WithdrawalRow { id: number; currency: string; gross_minor: number; tds_minor: number; fee_minor: number; net_minor: number; status: WStatus; method: string; requested_at: string; paid_at: string | null; payout_reference: string; note: string }
export type Status = 'pending' | 'approved' | 'cancelled' | 'reversed';
export type WStatus = 'pending' | 'approved' | 'paid' | 'rejected';
export interface Dashboard {
  balances: Balance[];
  totals: { orders: number; cancelled: number; revenue: MoneyMap; commission: MoneyMap };
  codes: CodeStats[];
  daily: Array<{ day: string; orders: number; earned_inr: number; earned_usd: number }>;
  recent: Recent[];
  withdrawals: WithdrawalRow[];
  status_counts: Partial<Record<Status, number>>;
  refund_window_days: number;
}
export interface Quote {
  ok: boolean; reason: null | 'suspended' | 'payout_details_missing' | 'no_balance' | 'below_minimum';
  currency: string; available: number; minimum: number; gross: number; tds: number; fee: number; net: number; method: 'bank' | 'upi';
  lines: Array<{ key: string; label: string; amount_minor: number; note: string }>;
  destination: { bank_name: string; holder: string; account_masked: string; ifsc: string; upi_id: string } | null;
}
export interface DeleteSummary { available: MoneyMap; pending: MoneyMap; in_review: MoneyMap }

export class ApiError extends Error {}

export async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const sb = supabase();
  if (!sb) throw new ApiError('Supabase is not configured.');
  const { data, error } = await sb.rpc(fn, args);
  if (error) throw new ApiError(error.message);
  return data as T;
}

export const getMe = () => rpc<Me | null>('influencer_me');
export const apply = (form: Record<string, unknown>) => rpc<Me>('influencer_apply', { p: form });
export const updateProfile = (form: Record<string, unknown>) => rpc<Me>('influencer_update', { p: form });
export const savePayout = (form: Record<string, unknown>) => rpc<Me>('influencer_save_payout', { p: form });
export const createCode = (code: string) => rpc<Me>('influencer_create_code', { p_code: code || null });
export const setCodeActive = (id: string, active: boolean) => rpc<Me>('influencer_set_code_active', { p_id: id, p_active: active });
export const getDashboard = (days: number) => rpc<Dashboard>('influencer_dashboard', { p_days: days });
export const quoteWithdrawal = (currency: string) => rpc<Quote>('influencer_quote_withdrawal', { p_currency: currency });
export const requestWithdrawal = (currency: string) => rpc<{ id: number; net_minor: number; currency: string }>('influencer_request_withdrawal', { p_currency: currency });
export const deleteSummary = () => rpc<DeleteSummary>('influencer_delete_summary');
export const deleteAccount = (forfeitPending: boolean) => rpc<{ deleted: boolean }>('influencer_delete_account', { p_forfeit_pending: forfeitPending });
export const sendMessage = (subject: string, message: string) => rpc<null>('influencer_send_message', { p_subject: subject, p_message: message });

/** Public address of a profile photo. */
export const photoUrl = (path: string | null | undefined) => (path ? `${SUPABASE.url}/storage/v1/object/public/influencer-photos/${path}` : null);

/** Uploads a file into the signed-in user's own folder and returns its path. */
export async function uploadFile(bucket: 'influencer-photos' | 'influencer-proofs', userId: string, file: File): Promise<string> {
  const sb = supabase();
  if (!sb) throw new ApiError('Supabase is not configured.');
  const safe = file.name.replace(/[^A-Za-z0-9._-]/g, '_').slice(-60);
  const path = `${userId}/${Date.now()}-${safe}`;
  const { error } = await sb.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new ApiError(error.message);
  return path;
}

export async function removeFiles(bucket: 'influencer-photos' | 'influencer-proofs', userId: string): Promise<void> {
  const sb = supabase();
  if (!sb) return;
  const { data } = await sb.storage.from(bucket).list(userId);
  if (data?.length) await sb.storage.from(bucket).remove(data.map((f) => `${userId}/${f.name}`));
}

export const FORM_DEFAULTS = {
  full_name: '', display_name: '', email: '', phone: '', dob: '', city: '', state: '',
  socials: {} as Record<string, Social>, total_followers: '', primary_platform: '', niche: '', niche_other: '',
  audience_location: '', audience_size: '', description: '', monthly_reach: '', collab_type: '', promote_on: [] as string[], promo_code: '',
};
export type FormState = typeof FORM_DEFAULTS;

export function formFromProfile(p: Profile): FormState {
  return {
    ...FORM_DEFAULTS,
    full_name: p.full_name, display_name: p.display_name, email: p.email, phone: p.phone, dob: p.dob ?? '', city: p.city, state: p.state,
    socials: { ...(p.socials as Record<string, Social>) }, total_followers: p.total_followers ? String(p.total_followers) : '',
    primary_platform: p.primary_platform, niche: p.niche, niche_other: p.niche_other, audience_location: p.audience_location,
    audience_size: p.audience_size, description: p.description, monthly_reach: p.monthly_reach, collab_type: p.collab_type, promote_on: [...p.promote_on],
  };
}

/** A friendly starting point for a promo code; the server checks that it is free. */
export function suggestCode(name: string): string {
  const base = name.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8) || 'FILLIE';
  return `${base}${Math.floor(10 + Math.random() * 90)}`;
}
