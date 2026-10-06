<div align="center">

# Fillie Website

The landing page for [Fillie](https://github.com/nurul-hasan27/Fillie-AI), the free Chrome extension that fills forms for you.

**[Live site](https://fillie-website.vercel.app/)** · **[Extension repo](https://github.com/nurul-hasan27/Fillie-AI)**

</div>

## What's on it

- A friendly intro with an **Add to Chrome** button (opens your Web Store listing)
- Features, how it works and pricing, with **Sign in & pay $5** (Razorpay) right on the page
- Terms, Privacy, Refund and Contact pages (`/terms`, `/privacy`, `/refund`, `/contact`)
- A **Support** section with UPI / QR, cards and international options

Built with React, TypeScript and Vite.

## Run it

```bash
npm install
npm run dev
```

## Make it yours

Everything personal is in one file: [`src/config.ts`](src/config.ts): Web Store link, Supabase keys, business contact details (`BUSINESS`, shown on the policy pages), UPI ID and payment links.

## Admin dashboard

`/admin` shows users, revenue, feedback, accuracy and offers. Sign in with Google as the admin address; the database (not the page) decides who can read the data, so nobody else can see it. In development, `npm run dev` then open `/admin?demo=1` to see sample data.

## License

[MIT](LICENSE)
