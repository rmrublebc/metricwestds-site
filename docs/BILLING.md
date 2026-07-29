# Metric West billing (Stripe + agency portal)

Separate from Case-Flo Pro. No clinical data. No Case-Flo app code.

## Stripe (Live)

| Tier | Users | Amount | Env var |
|------|--------|--------|---------|
| Starter | 1–10 | $750 / month | `STRIPE_PRICE_CASEFLO_STARTER` |
| Growth | 11–25 | $1,250 / month | `STRIPE_PRICE_CASEFLO_GROWTH` |
| Scale | 26–40 | $2,000 / month | `STRIPE_PRICE_CASEFLO_SCALE` |
| Enterprise | 41+ | $3,500 / month | `STRIPE_PRICE_CASEFLO_ENTERPRISE` |

Amounts are flat monthly bands (not per-seat). Create matching recurring prices in Stripe Live, then set the env vars in Vercel. Tiers without a price ID stay hidden in admin.

### Flow

1. You invite an agency (admin portal) — choose a plan tier; Paubox emails the invite link
2. Agency creates portal password via invite link
3. Admin starts monthly invoicing (`send_invoice`)
4. Stripe sends monthly invoices; agency pays from portal (or invoice link)
5. Case-Flo access stays manual/separate for now

## Env

See `.env.example`. Put secrets only in `.env.local` (never commit).

## Supabase

Use the **Metric West** Supabase project — not the CaseFlo Pro project.
