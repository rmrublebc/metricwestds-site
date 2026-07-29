"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function VoidInvoiceButton({
  agencyId,
  invoiceId,
  status,
}: {
  agencyId: string;
  invoiceId: string;
  status: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canVoid = status === "open" || status === "draft";
  if (!canVoid) return null;

  async function onVoid() {
    const confirmed = window.confirm(
      status === "draft"
        ? "Delete this draft invoice?"
        : "Void this open invoice? The agency will no longer be able to pay it.",
    );
    if (!confirmed) return;

    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/agencies/${agencyId}/void-invoice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoiceId }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Could not void invoice.");
      return;
    }
    router.refresh();
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button className="btn btn-ghost" type="button" disabled={loading} onClick={onVoid}>
        {loading ? "Working…" : status === "draft" ? "Delete draft" : "Void"}
      </button>
      {error ? <span className="text-xs text-[#8a1f1f]">{error}</span> : null}
    </span>
  );
}
