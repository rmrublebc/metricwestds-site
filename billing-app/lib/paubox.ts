type SendInviteEmailArgs = {
  to: string;
  agencyName: string;
  contactName?: string;
  inviteUrl: string;
};

export async function sendAgencyInviteEmail({
  to,
  agencyName,
  contactName,
  inviteUrl,
}: SendInviteEmailArgs): Promise<{ trackingId?: string }> {
  const apiKey = process.env.PAUBOX_API_KEY;
  const from = process.env.PAUBOX_FROM_EMAIL;

  if (!apiKey || !from) {
    throw new Error(
      "Missing PAUBOX_API_KEY or PAUBOX_FROM_EMAIL. Add them in Vercel env vars.",
    );
  }

  const greeting = contactName ? `Hi ${contactName},` : "Hello,";
  const subject = `You're invited to the Metric West agency portal — ${agencyName}`;
  const text = [
    greeting,
    "",
    `Metric West Development Solutions invited ${agencyName} to the agency billing portal.`,
    "Use the link below to set your password and view invoices:",
    "",
    inviteUrl,
    "",
    "This portal is for billing only. Case-Flo Pro clinical login stays at caseflo-pro.com.",
    "",
    "— Metric West Development Solutions",
    "ryan.ruble@metricwestds.com",
  ].join("\n");

  const html = `
    <p>${escapeHtml(greeting)}</p>
    <p>Metric West Development Solutions invited <strong>${escapeHtml(agencyName)}</strong> to the agency billing portal.</p>
    <p>Use the button below to set your password and view invoices:</p>
    <p><a href="${escapeHtml(inviteUrl)}" style="display:inline-block;padding:12px 18px;background:#1f6f5b;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Accept invite</a></p>
    <p style="font-size:14px;color:#555;">Or copy this link:<br /><a href="${escapeHtml(inviteUrl)}">${escapeHtml(inviteUrl)}</a></p>
    <p style="font-size:14px;color:#555;">This portal is for billing only. Case-Flo Pro clinical login stays at caseflo-pro.com.</p>
    <p>— Metric West Development Solutions<br />ryan.ruble@metricwestds.com</p>
  `;

  const replyTo = process.env.PAUBOX_REPLY_TO || from;
  const headers: Record<string, string> = {
    subject,
    from,
    "reply-to": replyTo,
  };

  const res = await fetch("https://api.paubox.com/v1/email/messages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: {
        message: {
          recipients: [to],
          // Invite link only — no PHI. Allow non-TLS so recipients aren't forced into Secure Portal.
          allowNonTLS: true,
          headers,
          content: {
            "text/plain": text,
            "text/html": html,
          },
        },
      },
    }),
  });

  const payload = (await res.json().catch(() => null)) as
    | { sourceTrackingId?: string; data?: string; errors?: { title?: string; details?: string }[] }
    | null;

  if (!res.ok) {
    const detail =
      payload?.errors?.map((e) => e.details || e.title).filter(Boolean).join("; ") ||
      `Paubox HTTP ${res.status}`;
    throw new Error(detail);
  }

  return { trackingId: payload?.sourceTrackingId };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
