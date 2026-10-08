import { SUPABASE } from '../config';

export class CheckoutError extends Error {}

async function call<T>(name: string, token: string, payload: object = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(`${SUPABASE.url}/functions/v1/${name}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE.anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const body = (await response.json().catch(() => ({}))) as T & { error?: string };
    if (!response.ok) throw new CheckoutError(body.error ?? `Request failed (${response.status}).`);
    return body;
  } catch (error) {
    if (error instanceof CheckoutError) throw error;
    throw new CheckoutError(controller.signal.aborted ? 'The server took too long to answer. Please try again.' : 'Could not reach the server. Check your connection.');
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Starts the checkout for the signed-in user and returns the payment page address.
 * INR unlocks UPI, netbanking, wallets and Indian cards; USD is international cards.
 * The amount is decided by the server, not here.
 */
export async function createCheckout(token: string, currency: 'INR' | 'USD', codes: string[] = []): Promise<string> {
  const { url } = await call<{ url: string }>('create-checkout', token, { currency, codes });
  if (!url) throw new CheckoutError('Could not start checkout.');
  return url;
}

/** Asks the server to check with the payment provider and unlock the user. Returns how many payments were confirmed. */
export async function confirmPayment(token: string): Promise<number> {
  const { confirmed } = await call<{ confirmed: number }>('confirm-payment', token);
  return confirmed ?? 0;
}

export interface PricedOrder { currency: 'INR' | 'USD'; listMinor: number; promoOffMinor: number; offerOffMinor: number; finalMinor: number }
export interface AppliedCode { kind: 'promo' | 'offer'; code: string; discount_bps: number; title: string }
export interface Quote { order: PricedOrder; applied: AppliedCode[]; rejected: Array<{ code: string; reason: string }> }

/** What the buyer would pay in one currency with these codes. The server works it out; nothing is trusted from the page. */
export function quoteCheckout(token: string, currency: 'INR' | 'USD', codes: string[]): Promise<Quote> {
  return call<Quote>('create-checkout', token, { currency, codes, quote: true });
}

const CODE_KEY = 'fillie:codes';

/** Codes remembered between visits, for example from a creator's share link (?code=ASHA10). */
export function savedCodes(): string[] {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(CODE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((c): c is string => typeof c === 'string').slice(0, 3) : [];
  } catch {
    return [];
  }
}

export function saveCodes(codes: string[]): void {
  try {
    sessionStorage.setItem(CODE_KEY, JSON.stringify(codes));
  } catch {
    /* storage unavailable */
  }
}

/** Reads ?code=XYZ from the address once, remembers it, and tidies the address bar. */
export function captureCodeFromUrl(): void {
  const params = new URLSearchParams(location.search);
  const code = params.get('code')?.replace(/\s+/g, '').toUpperCase();
  if (!code || !/^[A-Z0-9]{4,16}$/.test(code)) return;
  saveCodes([code, ...savedCodes().filter((c) => c !== code)].slice(0, 3));
  params.delete('code');
  const rest = params.toString();
  history.replaceState(null, '', location.pathname + (rest ? `?${rest}` : '') + location.hash);
}

export const REJECT_TEXT: Record<string, string> = {
  not_found: 'That code is not valid.',
  inactive: 'That code is not active.',
  own_code: 'You cannot use your own code.',
  expired: 'That offer has ended.',
  not_started: 'That offer has not started yet.',
  used_up: 'That offer has been fully used.',
};
