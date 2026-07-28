"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: signError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (signError) {
      setError(signError.message);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Could not load user.");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (next) {
      router.push(next);
      return;
    }
    router.push(profile?.role === "admin" ? "/admin" : "/portal");
    router.refresh();
  }

  return (
    <form className="card mx-auto w-full max-w-md space-y-4" onSubmit={onSubmit}>
      <div>
        <h1 className="m-0 text-2xl font-bold">Sign in</h1>
        <p className="mt-2 text-sm text-[var(--ink-soft)]">
          Agency portal and Metric West admin use the same sign-in.
        </p>
      </div>
      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          className="input"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error ? <p className="text-sm text-[#8a1f1f]">{error}</p> : null}
      <button className="btn btn-primary w-full" type="submit" disabled={loading}>
        {loading ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-center text-sm text-[var(--ink-soft)]">
        Invited? Use the link in your email, or{" "}
        <Link href="/">go home</Link>.
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center px-6 py-16">
      <Suspense fallback={<div className="card w-full">Loading…</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
