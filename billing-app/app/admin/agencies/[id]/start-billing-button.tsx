"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function StartBillingButton({
  agencyId,
  disabled,
  amountLabel,
}: {
  agencyId: string;
  disabled?: boolean;
  amountLabel?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function startBilling() {
    setLoading(true);
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/admin/agencies/${agencyId}/start-billing`, {
      method: "POST",
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Could not start billing.");
      return;
    }
    setMessage("Subscription started. Stripe will email the invoice.");
    router.refresh();
  }

  const labelAmount = amountLabel || "$750";

  return (
    <div className="space-y-2">
      <button
        className="btn btn-primary"
        type="button"
        disabled={disabled || loading}
        onClick={startBilling}
      >
        {disabled
          ? "Billing already started"
          : loading
            ? "Starting…"
            : `Start monthly invoicing (${labelAmount})`}
      </button>
      {error ? <p className="text-sm text-[#8a1f1f]">{error}</p> : null}
      {message ? <p className="text-sm text-[var(--accent-deep)]">{message}</p> : null}
    </div>
  );
}
