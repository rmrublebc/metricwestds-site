"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteAgencyButton({
  agencyId,
  agencyName,
}: {
  agencyId: string;
  agencyName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    const confirmed = window.confirm(
      `Delete "${agencyName}"?\n\nThis cancels any Stripe subscription, removes the Stripe customer, deletes portal logins for this agency, and cannot be undone.`,
    );
    if (!confirmed) return;

    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/agencies/${agencyId}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Could not delete agency.");
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <button
        className="btn btn-danger"
        type="button"
        disabled={loading}
        onClick={onDelete}
      >
        {loading ? "Deleting…" : "Delete agency"}
      </button>
      {error ? <p className="text-sm text-[#8a1f1f]">{error}</p> : null}
    </div>
  );
}
