/**
 * Everything you need to edit before deploying lives here.
 * Leave a value as '' to hide that option on the site.
 */

export const SITE = {
  name: 'Fillie',
  author: 'Nurul Hasan',
  githubUrl: 'https://github.com/nurul-hasan27/Fillie-AI',
  downloadUrl: 'https://github.com/nurul-hasan27/Fillie-AI/releases/download/v1.0.0/fillie-extension.zip',
  version: '1.0.0',
};

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
