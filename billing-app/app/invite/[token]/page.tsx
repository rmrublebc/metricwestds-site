"use client";

import { createClient } from "@/lib/supabase/client";
import { FormEvent, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/invites/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password, fullName }),
    });
    const data = await res.json();
    if (!res.ok) {
      setLoading(false);
      setError(data.error || "Could not accept invite.");
      return;
    }

    const supabase = createClient();
    const { error: signError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password,
    });
    setLoading(false);
    if (signError) {
      setError(signError.message);
      return;
    }
    router.push("/portal");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center px-6 py-16">
      <form className="card w-full space-y-4" onSubmit={onSubmit}>
        <div>
          <h1 className="m-0 text-2xl font-bold">Create your account</h1>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            Set a password to access the Metric West agency portal.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="fullName">
            Your name
          </label>
          <input
            id="fullName"
            className="input"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            className="input"
            type="password"
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error ? <p className="text-sm text-[#8a1f1f]">{error}</p> : null}
        <button className="btn btn-primary w-full" type="submit" disabled={loading}>
          {loading ? "Creating…" : "Create account"}
        </button>
      </form>
    </main>
  );
}
