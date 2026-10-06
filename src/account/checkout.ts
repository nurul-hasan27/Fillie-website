import { SUPABASE } from '../config';

export class CheckoutError extends Error {}

async function call<T>(name: string, token: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(`${SUPABASE.url}/functions/v1/${name}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE.anonKey, 'Content-Type': 'application/json' },
      body: '{}',
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

/** Starts the $5 checkout for the signed-in user and returns the payment page address. */
export async function createCheckout(token: string): Promise<string> {
  const { url } = await call<{ url: string }>('create-checkout', token);
  if (!url) throw new CheckoutError('Could not start checkout.');
  return url;
}

/** Asks the server to check with the payment provider and unlock the user. Returns how many payments were confirmed. */
export async function confirmPayment(token: string): Promise<number> {
  const { confirmed } = await call<{ confirmed: number }>('confirm-payment', token);
  return confirmed ?? 0;
}
