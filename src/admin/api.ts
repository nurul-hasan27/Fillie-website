import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface Overview {
  users_total: number;
  users_7d: number;
  paid_users: number;
  active_7d: number;
  active_30d: number;
  fills_total: number;
  fills_7d: number;
  revenue: Array<{ currency: string; total_minor: number; payments: number; last_30d_minor: number }>;
  revenue_by_provider: Array<{ provider: string; currency: string; total_minor: number; payments: number }>;
  applications_total: number;
  funnel: Partial<Record<'applied' | 'interview' | 'offer' | 'rejected', number>>;
  offers_count: number;
  offers_avg_lpa: number | null;
  top_companies: Array<{ company: string; applications: number; offers: number }>;
  feedback_total: number;
  avg_rating: number | null;
  rating_counts: Record<string, number>;
  answers_filled: number;
  answers_edited: number;
  signups_daily: Array<{ day: string; count: number }>;
  fills_daily: Array<{ day: string; count: number }>;
}

export interface AdminUser { id: string; email: string; created_at: string; last_sign_in_at: string | null; paid: boolean; applications: number; offers: number }
export interface FeedbackRow { id: number; rating: number | null; kind: 'review' | 'bug' | 'idea'; message: string; created_at: string; email: string | null }
export interface OfferRow { company: string; role: string; offer_lpa: number | null; applied_at: string; shared: boolean; email: string | null }
export interface PaymentRow { id: number; provider: 'stripe' | 'razorpay'; amount_minor: number; currency: string; created_at: string; email: string | null }

export interface AdminData {
  overview: Overview;
  users: AdminUser[];
  feedback: FeedbackRow[];
  offers: OfferRow[];
  payments: PaymentRow[];
}

/** Demo data is only available while developing, never in a production build. */
export const demoAllowed = import.meta.env.DEV && new URLSearchParams(location.search).has('demo');

export { supabase };

export async function getSession(): Promise<Session | null> {
  const sb = supabase();
  return sb ? (await sb.auth.getSession()).data.session : null;
}

export async function signInWithGoogle(): Promise<void> {
  await supabase()?.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${location.origin}/admin` } });
}

export async function signOut(): Promise<void> {
  await supabase()?.auth.signOut();
}

/** Asks the database whether this session is the admin. The database is the authority, not this page. */
export async function checkAdmin(): Promise<boolean> {
  const sb = supabase();
  if (!sb) return false;
  const { data, error } = await sb.rpc('is_admin');
  return !error && data === true;
}

export async function loadAdminData(): Promise<AdminData> {
  if (demoAllowed) return demoData();
  const sb = supabase();
  if (!sb) throw new Error('Supabase is not configured.');
  const call = async <T,>(fn: string, args?: Record<string, unknown>): Promise<T> => {
    const { data, error } = await sb.rpc(fn, args);
    if (error) throw new Error(error.message);
    return data as T;
  };
  const [overview, users, feedback, offers, payments] = await Promise.all([
    call<Overview>('admin_overview'),
    call<AdminUser[]>('admin_users', { p_limit: 200, p_offset: 0 }),
    call<FeedbackRow[]>('admin_feedback', { p_limit: 200 }),
    call<OfferRow[]>('admin_offers'),
    call<PaymentRow[]>('admin_payments', { p_limit: 200 }),
  ]);
  return { overview, users, feedback, offers, payments };
}

/* ------------------------------ demo data ------------------------------ */

function demoData(): AdminData {
  const days = (base: number) =>
    Array.from({ length: 30 }, (_, i) => {
      const d = new Date(Date.now() - (29 - i) * 864e5).toISOString().slice(0, 10);
      return { day: d, count: Math.round(base * (0.4 + 0.6 * Math.abs(Math.sin(i / 3 + 1))) + i / 3) };
    });
  const now = Date.now();
  const iso = (ago: number) => new Date(now - ago * 864e5).toISOString();
  return {
    overview: {
      users_total: 1284, users_7d: 96, paid_users: 211, active_7d: 438, active_30d: 902, fills_total: 7311, fills_7d: 1204,
      revenue: [{ currency: 'USD', total_minor: 62500, payments: 125, last_30d_minor: 21500 }, { currency: 'INR', total_minor: 3612000, payments: 86, last_30d_minor: 1260000 }],
      revenue_by_provider: [
        { provider: 'stripe', currency: 'USD', total_minor: 62500, payments: 125 },
        { provider: 'razorpay', currency: 'INR', total_minor: 3612000, payments: 86 },
      ],
      applications_total: 5420, funnel: { applied: 3900, interview: 842, offer: 211, rejected: 467 }, offers_count: 211, offers_avg_lpa: 9.4,
      top_companies: [
        { company: 'TCS', applications: 310, offers: 41 }, { company: 'Infosys', applications: 268, offers: 33 }, { company: 'Razorpay', applications: 120, offers: 9 },
        { company: 'Zoho', applications: 98, offers: 14 }, { company: 'Wipro', applications: 92, offers: 11 },
      ],
      feedback_total: 143, avg_rating: 4.4, rating_counts: { '1': 4, '2': 6, '3': 14, '4': 41, '5': 78 },
      answers_filled: 48210, answers_edited: 5309, signups_daily: days(5), fills_daily: days(34),
    },
    users: Array.from({ length: 12 }, (_, i) => ({ id: String(i), email: `student${i + 1}@college.edu`, created_at: iso(i * 2), last_sign_in_at: iso(i), paid: i % 3 === 0, applications: 3 + i * 2, offers: i % 4 === 0 ? 1 : 0 })),
    feedback: [
      { id: 1, rating: 5, kind: 'review', message: 'Filled my whole Workday application in a minute. The resume picker is great.', created_at: iso(1), email: 'student1@college.edu' },
      { id: 2, rating: 3, kind: 'bug', message: 'Date of birth field was filled in the wrong format on one site.', created_at: iso(2), email: 'student4@college.edu' },
      { id: 3, rating: null, kind: 'idea', message: 'Please add a reminder before interviews.', created_at: iso(3), email: null },
    ],
    offers: [
      { company: 'Razorpay', role: 'SDE I', offer_lpa: 14, applied_at: iso(12).slice(0, 10), shared: true, email: 'student1@college.edu' },
      { company: 'Zoho', role: 'Software Developer', offer_lpa: 8.5, applied_at: iso(20).slice(0, 10), shared: true, email: 'student5@college.edu' },
      { company: 'TCS', role: 'Ninja', offer_lpa: 3.6, applied_at: iso(30).slice(0, 10), shared: false, email: null },
    ],
    payments: [
      { id: 1, provider: 'razorpay', amount_minor: 42000, currency: 'INR', created_at: iso(0.5), email: 'student1@college.edu' },
      { id: 2, provider: 'stripe', amount_minor: 500, currency: 'USD', created_at: iso(1), email: 'student9@college.edu' },
    ],
  };
}
