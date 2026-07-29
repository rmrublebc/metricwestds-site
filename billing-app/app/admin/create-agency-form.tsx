"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function CreateAgencyForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [contactName, setContactName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInviteUrl(null);
    setEmailSent(false);
    setEmailError(null);

    const res = await fetch("/api/admin/agencies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, billingEmail, contactName }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Could not create agency.");
      return;
    }
    setInviteUrl(data.inviteUrl);
    setEmailSent(Boolean(data.emailSent));
    setEmailError(data.emailError || null);
    setName("");
    setBillingEmail("");
    setContactName("");
    router.refresh();
  }

  return (
    <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
      <div className="md:col-span-2">
        <label className="label" htmlFor="agencyName">
          Agency name
        </label>
        <input
          id="agencyName"
          className="input"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor="billingEmail">
          Billing email (invite goes here)
        </label>
        <input
          id="billingEmail"
          className="input"
          type="email"
          required
          value={billingEmail}
          onChange={(e) => setBillingEmail(e.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor="contactName">
          Contact name
        </label>
        <input
          id="contactName"
          className="input"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
        />
      </div>
      {error ? <p className="md:col-span-2 text-sm text-[#8a1f1f]">{error}</p> : null}
      {inviteUrl ? (
        <p className="md:col-span-2 rounded-lg bg-[rgba(31,111,91,0.1)] p-3 text-sm">
          {emailSent
            ? "Invite emailed via Paubox. Backup link (in case they need it):"
            : `Invite created, but email was not sent${emailError ? `: ${emailError}` : "."} Share this link manually:`}
          <br />
          <a href={inviteUrl}>{inviteUrl}</a>
        </p>
      ) : null}
      <div className="md:col-span-2">
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? "Creating…" : "Create agency & invite"}
        </button>
      </div>
    </form>
  );
}
