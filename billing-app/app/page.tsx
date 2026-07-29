import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 px-6 py-16">
      <div>
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--accent-deep)]">
          Metric West Development Solutions
        </p>
        <h1 className="m-0 text-4xl font-bold tracking-tight">Agency billing portal</h1>
        <p className="mt-4 max-w-xl text-lg text-[var(--ink-soft)]">
          Manage your Case-Flo Pro subscription, view monthly invoices, and pay online.
          This portal is separate from the Case-Flo clinical application.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link className="btn btn-primary" href="/login">
          Agency sign in
        </Link>
        <Link className="btn btn-ghost" href="/admin">
          Metric West admin
        </Link>
      </div>
    </main>
  );
}
