import { formatUsdFromCents } from "@/lib/money";

export type CaseFloProduct = {
  key: string;
  label: string;
  seatBand: string;
  monthlyAmountCents: number;
  priceId: string;
};

type ProductDef = {
  key: string;
  label: string;
  seatBand: string;
  monthlyAmountCents: number;
  envKey: string;
  /** Used only when env is unset (local/dev fallback for Starter). */
  fallbackPriceId?: string;
};

/**
 * Flat monthly bands (not per-seat).
 * Amounts must match the Stripe Price you create for each env var.
 * Tiers without a configured price ID are hidden from admin until you add them.
 */
const PRODUCT_DEFS: ProductDef[] = [
  {
    key: "caseflo_starter",
    label: "Case-Flo Pro — Starter (1–10 users)",
    seatBand: "1-10",
    monthlyAmountCents: 75_000,
    envKey: "STRIPE_PRICE_CASEFLO_STARTER",
    fallbackPriceId: "price_1TyHh2EmQKE8Hks69hfE68Bx",
  },
  {
    key: "caseflo_growth",
    label: "Case-Flo Pro — Growth (11–25 users)",
    seatBand: "11-25",
    monthlyAmountCents: 125_000,
    envKey: "STRIPE_PRICE_CASEFLO_GROWTH",
  },
  {
    key: "caseflo_scale",
    label: "Case-Flo Pro — Scale (26–40 users)",
    seatBand: "26-40",
    monthlyAmountCents: 200_000,
    envKey: "STRIPE_PRICE_CASEFLO_SCALE",
  },
  {
    key: "caseflo_enterprise",
    label: "Case-Flo Pro — Enterprise (41+ users)",
    seatBand: "41+",
    monthlyAmountCents: 350_000,
    envKey: "STRIPE_PRICE_CASEFLO_ENTERPRISE",
  },
];

function resolvePriceId(def: ProductDef): string | null {
  const fromEnv = process.env[def.envKey]?.trim();
  if (fromEnv) return fromEnv;
  return def.fallbackPriceId ?? null;
}

export function listConfiguredProducts(): CaseFloProduct[] {
  return PRODUCT_DEFS.flatMap((def) => {
    const priceId = resolvePriceId(def);
    if (!priceId) return [];
    return [
      {
        key: def.key,
        label: def.label,
        seatBand: def.seatBand,
        monthlyAmountCents: def.monthlyAmountCents,
        priceId,
      },
    ];
  });
}

export function listProductCatalog() {
  return PRODUCT_DEFS.map((def) => ({
    key: def.key,
    label: def.label,
    seatBand: def.seatBand,
    monthlyAmountCents: def.monthlyAmountCents,
    envKey: def.envKey,
    configured: Boolean(resolvePriceId(def)),
  }));
}

export function getProductByKey(key: string): CaseFloProduct | null {
  return listConfiguredProducts().find((p) => p.key === key) ?? null;
}

/** @deprecated Prefer getProductByKey / listConfiguredProducts */
export const STARTER_PRODUCT: CaseFloProduct =
  getProductByKey("caseflo_starter") ?? {
    key: "caseflo_starter",
    label: "Case-Flo Pro — Starter (1–10 users)",
    seatBand: "1-10",
    monthlyAmountCents: 75_000,
    priceId: process.env.STRIPE_PRICE_CASEFLO_STARTER || "price_1TyHh2EmQKE8Hks69hfE68Bx",
  };

export { formatUsdFromCents } from "@/lib/money";
