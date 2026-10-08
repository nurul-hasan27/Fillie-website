/** Shared number, money and date formatting for the dashboards. */

export type MoneyMap = Record<string, number>;

export const money = (minor: number, currency: string) =>
  new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', { style: 'currency', currency, maximumFractionDigits: currency === 'INR' && minor % 100 === 0 ? 0 : 2 }).format(minor / 100);

/** "₹1,200 + $5", or an em dash for nothing. Rupees come first. */
export function moneyMap(map: MoneyMap | null | undefined, empty = '—'): string {
  const entries = Object.entries(map ?? {}).filter(([, v]) => v !== 0).sort(([a], [b]) => (a === 'INR' ? -1 : b === 'INR' ? 1 : a.localeCompare(b)));
  return entries.length ? entries.map(([c, v]) => money(v, c)).join(' + ') : empty;
}

export const num = (n: number) => n.toLocaleString('en-IN');

export const day = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const dayTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';

export const percent = (bps: number) => `${Math.round(bps) / 100}%`;

/** The site address used in share links. */
export const siteUrl = () => location.origin;
