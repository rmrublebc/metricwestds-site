"use client";

import { formatUsdFromCents } from "@/lib/money";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type PlanOption = {
  key: string;
  label: string;
  monthlyAmountCents: number;
};

export function ChangePlanForm({
  agencyId,
  currentProductKey,
  products,
  disabled,
}: {
  agencyId: string;
  currentProductKey: string;
  products: PlanOption[];
  disabled?: boolean;
}) {
  const router = useRouter();
  const [productKey, setProductKey] = useState(currentProductKey);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onSave() {
    if (disabled) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/admin/agencies/${agencyId}/plan`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productKey }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Could not update plan.");
      return;
    }
    setMessage("Plan updated.");
    router.refresh();
  }

  if (disabled) {
    return (
      <p className="m-0 text-sm text-[var(--ink-soft)]">
        Plan is locked after monthly invoicing has started.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <label className="label" htmlFor="changePlan">
        Change plan
      </label>
      <div className="flex flex-wrap gap-2">
        <select
          id="changePlan"
          className="input"
          style={{ maxWidth: "28rem" }}
          value={productKey}
          onChange={(e) => setProductKey(e.target.value)}
        >
          {products.map((product) => (
            <option key={product.key} value={product.key}>
              {product.label} — {formatUsdFromCents(product.monthlyAmountCents)}/mo
            </option>
          ))}
        </select>
        <button
          className="btn btn-ghost"
          type="button"
          disabled={loading || productKey === currentProductKey}
          onClick={onSave}
        >
          {loading ? "Saving…" : "Save plan"}
        </button>
      </div>
      {error ? <p className="text-sm text-[#8a1f1f]">{error}</p> : null}
      {message ? <p className="text-sm text-[var(--accent-deep)]">{message}</p> : null}
    </div>
  );
}
