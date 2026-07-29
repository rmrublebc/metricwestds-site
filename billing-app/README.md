# Metric West billing portal

Separate from the marketing Vite site and from Case-Flo Pro.

## Stack

- Next.js app in `billing-app/`
- Supabase project **Metric West** (`sstweqfsluxxyztokliw`) — auth + agencies/invites
- Stripe Test price `price_1TyHmLEmQKE8Hks6ayjrvW7m` ($750/mo Starter)

## Setup

1. Copy `.env.example` → `.env.local`
2. Supabase → Metric West → **Project Settings → API**
   - Paste **anon** / publishable key into `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Paste **service_role** into `SUPABASE_SERVICE_ROLE_KEY` (keep secret)
3. Stripe Test → Developers → API keys → paste `sk_test_...` and `pk_test_...`
4. Set a random `ADMIN_SETUP_SECRET`
5. Run:

```bash
cd billing-app
npm install
npm run dev
```

6. Create your admin (once):

```bash
curl -X POST http://localhost:3000/api/admin/bootstrap ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"ryan.ruble@metricwestds.com\",\"password\":\"YOUR_PASSWORD\",\"fullName\":\"Ryan Ruble\",\"setupSecret\":\"YOUR_ADMIN_SETUP_SECRET\"}"
```

7. Sign in at http://localhost:3000/login → Admin dashboard

## Flow

1. Admin invites agency — Paubox emails the invite link (backup link still shown in admin)
2. Agency opens `/invite/[token]`, sets password
3. Admin opens agency → **Start monthly invoicing**
4. Stripe emails invoice; agency pays from `/portal` via Pay now

## Paubox (invite email)

In [Paubox Email API → Settings](https://next.paubox.com/emailapi/settings), open your verified domain (e.g. `metricwestds.com`), add an API key, then set:

- `PAUBOX_API_KEY`
- `PAUBOX_FROM_EMAIL` (must be on that verified domain, e.g. `ryan.ruble@metricwestds.com`)
- optional `PAUBOX_REPLY_TO`

## Webhook

Stripe Dashboard → endpoint  
`https://portal.metricwestds.com/api/webhooks/stripe`  
Events: `customer.subscription.*`, `invoice.paid`
