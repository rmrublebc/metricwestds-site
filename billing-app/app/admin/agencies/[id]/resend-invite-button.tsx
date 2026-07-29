"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ResendInviteButton({
  agencyId,
  inviteUrl,
  expiresAt,
}: {
  agencyId: string;
  inviteUrl: string;
  expiresAt: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onResend() {
    setLoading(true);
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/admin/agencies/${agencyId}/resend-invite`, {
      method: "POST",
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Could not resend invite.");
      if (data.inviteUrl) {
        setMessage(`Backup link: ${data.inviteUrl}`);
      }
      return;
    }
    setMessage("Invite re-emailed via Paubox (expiry extended 14 days).");
    router.refresh();
  }

  const expiresLabel = new Date(expiresAt).toLocaleString();

  return (
    <div className="space-y-2">
      <p className="m-0 text-sm">
        Pending invite link (expires {expiresLabel}):
        <br />
        <a href={inviteUrl}>{inviteUrl}</a>
      </p>
      <button className="btn btn-ghost" type="button" disabled={loading} onClick={onResend}>
        {loading ? "Sending…" : "Resend invite email"}
      </button>
      {error ? <p className="text-sm text-[#8a1f1f]">{error}</p> : null}
      {message ? <p className="text-sm text-[var(--accent-deep)]">{message}</p> : null}
    </div>
  );
}
