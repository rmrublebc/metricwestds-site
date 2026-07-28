# Metric West Development Solutions — website

Public company site for **Metric West Development Solutions** (developer/operator of Case-Flo Pro).

- Domain: https://www.metricwestds.com  
- Contact: ryan.ruble@metricwestds.com  
- This site does **not** host PHI or Case-Flo app login.

## Local

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Output is in `dist/` for static hosting (Cloudflare Pages, Netlify, Firebase Hosting, etc.).

## Billing portal

Agency accounts + Stripe invoicing live in `billing-app/` (Next.js).
See `billing-app/README.md` and `docs/BILLING.md`.

Separate Supabase project: **Metric West** (not Case-Flo).

## Privacy note

Marketing/company site only. Clinical product: https://www.caseflo-pro.com
