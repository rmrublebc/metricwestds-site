import Stripe from "stripe";

export const STRIPE_PRICE_CASEFLO_STARTER =
  process.env.STRIPE_PRICE_CASEFLO_STARTER ?? "price_1TyHmLEmQKE8Hks6ayjrvW7m";

export const STARTER_PRODUCT = {
  key: "caseflo_starter",
  label: "Case-Flo Pro — Starter (1–10 users)",
  seatBand: "1-10",
  monthlyAmountCents: 75000,
  priceId: STRIPE_PRICE_CASEFLO_STARTER,
} as const;

let stripe: Stripe | null = null;

export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripe;
}
