# Metric West billing (Stripe + agency portal)

Separate from Case-Flo Pro. No clinical data. No Case-Flo app code.

## Stripe (Test mode)

| Item | Value |
|------|--------|
| Product | Case-Flo Pro — Starter (1–10 users) |
| Amount | $750 / month |
| Price ID | `price_1TyHmLEmQKE8Hks6ayjrvW7m` |

Add more tier prices later (11–20, etc.) on the same product.

### Flow

1. You invite an agency (admin on metricwestds.com)
2. Agency creates portal password via invite link
3. Subscription uses Stripe Checkout (prebuilt)
4. Stripe sends monthly invoices; agency pays from portal (or invoice link)
5. Case-Flo access stays manual/separate for now

## Env

See `.env.example`. Put secrets only in `.env.local` (never commit).

## Supabase

Use a **new** project named Metric West — not the CaseFlo Pro project.
