import { rpc } from '../influencer/api';
import { supabase } from '../lib/supabase';
import type { MoneyMap } from '../lib/format';

export type LedgerStatus = 'pending' | 'approved' | 'cancelled' | 'reversed';
export type WithdrawalStatus = 'pending' | 'approved' | 'paid' | 'rejected';
export type Verification = 'pending' | 'verified' | 'rejected';

export interface InfOverview {
  active_influencers: number; total_influencers: number; orders: number; commission_generated: MoneyMap; commission_owed: MoneyMap;
  influencer_revenue: MoneyMap; pending_withdrawals: number; pending_withdrawal_minor: MoneyMap; open_messages: number; active_offers: number; offer_redemptions: number;
}
export interface InfRow {
  id: string; full_name: string; name: string; city: string; state: string; status: 'active' | 'suspended' | 'deleted'; created_at: string; photo_path: string | null;
  primary_platform: string; niche: string; codes: Array<{ code: string; active: boolean }>; orders: number; revenue: MoneyMap; commission: MoneyMap; balance: MoneyMap; payout: Verification | 'none';
}
export interface InfDetail {
  profile: Record<string, any>; sign_in_email: string | null;
  payout: null | { account_holder: string; account_number: string; ifsc: string; bank_name: string; upi_id: string; pan: string; pan_name: string; gstin: string; proof_path: string | null; verification: Verification };
  codes: Array<{ id: string; code: string; active: boolean; discount_bps: number; commission_bps: number; created_at: string; orders: number; revenue: MoneyMap; commission: MoneyMap }>;
  balance: MoneyMap; totals: { orders: number; revenue: MoneyMap; commission: MoneyMap; paid_out: MoneyMap };
  ledger: Array<{ id: number; order_ref: string; code: string; order_amount_minor: number; commission_minor: number; currency: string; status: LedgerStatus; created_at: string; note: string; withdrawal_id: number | null; customer_email: string | null }>;
  withdrawals: Array<{ id: number; currency: string; gross_minor: number; tds_minor: number; fee_minor: number; net_minor: number; status: WithdrawalStatus; method: string; requested_at: string; paid_at: string | null; payout_reference: string }>;
  messages: Array<{ id: number; subject: string; message: string; resolved: boolean; created_at: string }>;
}
export interface LedgerRow {
  id: number; order_ref: string; payment_id: number; code: string; influencer_id: string; influencer: string; order_amount_minor: number; commission_minor: number; currency: string;
  status: LedgerStatus; created_at: string; note: string; withdrawal_id: number | null; customer_email: string | null; payment_status: 'paid' | 'refunded';
}
export interface WithdrawalListRow { id: number; influencer_id: string; influencer: string; gross_minor: number; net_minor: number; tds_minor: number; fee_minor: number; currency: string; requested_at: string; method: string; status: WithdrawalStatus; paid_at: string | null; payout: Verification | 'none' }
export interface WithdrawalDetail {
  withdrawal: { id: number; currency: string; gross_minor: number; tds_minor: number; fee_minor: number; net_minor: number; status: WithdrawalStatus; method: string; requested_at: string; reviewed_at: string | null; paid_at: string | null; payout_reference: string; admin_note: string; breakdown: { lines?: Array<{ label: string; amount_minor: number; note: string }> }; payout_snapshot: Record<string, string> };
  influencer: { id: string; name: string; full_name: string; status: string; phone: string; email: string; city: string; state: string; joined: string };
  payout: InfDetail['payout'];
  previous: Array<{ id: number; currency: string; gross_minor: number; net_minor: number; status: WithdrawalStatus; requested_at: string; paid_at: string | null; payout_reference: string }>;
  commissions: Array<{ id: number; order_ref: string; code: string; order_amount_minor: number; commission_minor: number; currency: string; status: LedgerStatus; created_at: string }>;
}
export interface Flag { kind: 'self_referral' | 'multiple_codes' | 'cancellations' | 'refunds' | 'burst' | 'fresh_accounts'; severity: 'high' | 'medium' | 'low'; influencer_id: string | null; influencer: string; code: string | null; count: number; at: string | null; detail: string }
export interface InboxMessage { id: number; influencer_id: string; influencer: string; email: string; subject: string; message: string; resolved: boolean; created_at: string }
export interface OfferRow { id: string; code: string; title: string; discount_bps: number; starts_at: string | null; ends_at: string | null; max_uses: number | null; active: boolean; listed: boolean; note: string; created_at: string; uses: number; discount_given: MoneyMap; revenue: MoneyMap }
export type Settings = Record<string, any>;

export const infOverview = () => rpc<InfOverview>('admin_influencer_overview');
export const listInfluencers = () => rpc<InfRow[]>('admin_influencers', { p_limit: 500, p_offset: 0 });
export const influencerDetail = (id: string) => rpc<InfDetail>('admin_influencer_detail', { p_id: id });
export const setInfluencerStatus = (id: string, status: 'active' | 'suspended') => rpc<null>('admin_set_influencer_status', { p_id: id, p_status: status });
export const setPayoutVerification = (id: string, verification: Verification) => rpc<null>('admin_set_payout_verification', { p_id: id, p_verification: verification });
export const ledger = (status: LedgerStatus | null) => rpc<{ total: number; rows: LedgerRow[] }>('admin_ledger', { p_status: status, p_limit: 300, p_offset: 0 });
export const ledgerAction = (id: number, action: 'cancel' | 'reverse' | 'approve' | 'reinstate', note: string) => rpc<null>('admin_ledger_action', { p_id: id, p_action: action, p_note: note });
export const withdrawals = (status: WithdrawalStatus | null) => rpc<WithdrawalListRow[]>('admin_withdrawals', { p_status: status });
export const withdrawalDetail = (id: number) => rpc<WithdrawalDetail | null>('admin_withdrawal_detail', { p_id: id });
export const withdrawalAction = (id: number, action: 'approve' | 'paid' | 'reject', note = '', reference = '') => rpc<null>('admin_withdrawal_action', { p_id: id, p_action: action, p_note: note, p_reference: reference });
export const fraudFlags = () => rpc<Flag[]>('admin_fraud_flags');
export const inbox = (resolved: boolean) => rpc<InboxMessage[]>('admin_influencer_messages', { p_resolved: resolved });
export const resolveMessage = (id: number, resolved: boolean) => rpc<null>('admin_message_resolve', { p_id: id, p_resolved: resolved });
export const discountOffers = () => rpc<OfferRow[]>('admin_discount_offers');
export const saveOffer = (p: Record<string, unknown>) => rpc<{ id: string; code: string }>('admin_offer_save', { p });
export const setOfferActive = (id: string, active: boolean) => rpc<null>('admin_offer_set_active', { p_id: id, p_active: active });
export const deleteOffer = (id: string) => rpc<null>('admin_offer_delete', { p_id: id });
export const getSettings = () => rpc<Settings>('admin_get_settings');
export const setSettings = (p: Settings) => rpc<Settings>('admin_set_settings', { p });

/** A short-lived link to a bank proof the influencer uploaded. */
export async function proofLink(path: string): Promise<string | null> {
  const { data } = (await supabase()?.storage.from('influencer-proofs').createSignedUrl(path, 300)) ?? { data: null };
  return data?.signedUrl ?? null;
}

export const orderId = (ref: string) => `ORD-${ref.slice(-6).toUpperCase()}`;
