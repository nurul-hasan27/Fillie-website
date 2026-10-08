/**
 * Everything you need to edit before deploying lives here.
 * Leave a value as '' to hide that option on the site.
 */

export const SITE = {
  name: 'Fillie',
  author: 'Nurul Hasan',
  /** Your Chrome Web Store listing. Replace once the extension is published. */
  storeUrl: 'https://chromewebstore.google.com/detail/YOUR-EXTENSION-ID',
  freeFillsPerWeek: 3,
  price: '$5',
  /** Rupee price: unlocks UPI, netbanking, wallets and Indian cards at checkout. Match RAZORPAY_INR_AMOUNT_MINOR on the server. */
  priceInr: '₹449',
};

/**
 * Supabase project used by the /admin dashboard. The anon key is public by
 * design; the admin data itself is protected by database rules that only
 * let your verified Google account read it.
 */
/**
 * Business details shown on the policy pages. Payment providers (and customers)
 * expect real contact details here, so fill these in before applying for live payments.
 */
export const BUSINESS = {
  legalName: 'Fillie',
  /** Where customers can reach you (shown on the Contact page). */
  email: 'fillie.company@gmail.com',
  phone: '',
  address: '',
  /** Days after paying during which a refund is given on request. */
  refundDays: 7,
};

export const SUPABASE = {
  url: 'https://erhrkrcbcugckaczavsm.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyaHJrcmNiY3VnY2thY3phdnNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyMzM1OTcsImV4cCI6MjEwNjgwOTU5N30.uvq5Zpa9NnM6KJWxPx012fjIpG42crXW_tHKDKUfXP4',
};


export const isSupabaseConfigured = !SUPABASE.url.includes('YOUR-PROJECT');

export const DONATE = {
  upiId: 'nh61@ybl',
  upiName: 'Md Nurul Hasan',
  cardLink: 'https://razorpay.me/@mdnurulhasan',
  paypalLink: '',
  sponsorsLink: 'https://github.com/sponsors/nurul-hasan27',
  coffeeLink: 'https://buymeacoffee.com/nurul_hasan27',
  amounts: [49, 99, 249, 499],
};

export const isPlaceholderUpi = DONATE.upiId.startsWith('yourname');
