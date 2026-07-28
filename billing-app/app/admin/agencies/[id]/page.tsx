import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StartBillingButton } from "./start-billing-button";
import { SignOutButton } from "@/components/sign-out-button";

export default async function AgencyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();

  const { data: agency } = await supabase
    .from("agencies")
    .select("*, agency_subscriptions(*), invites(*)")
    .eq("id", id)
    .single();

  if (!agency) notFound();

  const sub = Array.isArray(agency.agency_subscriptions)
    ? agency.agency_subscriptions[0]
    : agency.agency_subscriptions;

  let invoices: Array<{
    id: string;
    status: string | null;
    amount_due: number;
    hosted_invoice_url: string | null;
    created: number;
  }> = [];

  if (agency.stripe_customer_id && process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = getStripe();
      const list = await stripe.invoices.list({
        customer: agency.stripe_customer_id,
        limit: 12,
      });
      invoices = list.data.map((inv) => ({
        id: inv.id,
        status: inv.status,
        amount_due: inv.amount_due,
        hosted_invoice_url: inv.hosted_invoice_url ?? null,
        created: inv.created,
      }));
    } catch {
      invoices = [];
    }
  }

  const invite = (agency.invites || [])
    .slice()
    .sort(
      (a: { created_at: string }, b: { created_at: string }) =>
        +new Date(b.created_at) - +new Date(a.created_at),
    )[0];

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin" className="text-sm">
            ← All agencies
          </Link>
          <h1 className="mt-2 text-3xl font-bold">{agency.name}</h1>
          <p className="text-[var(--ink-soft)]">{agency.billing_email}</p>
        </div>
        <SignOutButton />
      </header>

      <section className="card mb-6 grid gap-3 md:grid-cols-2">
        <div>
          <p className="label">Status</p>
          <p className="m-0">
            <span className="badge">{agency.status}</span>
          </p>
        </div>
        <div>
          <p className="label">Stripe customer</p>
          <p className="m-0 font-mono text-sm">{agency.stripe_customer_id || "Not created yet"}</p>
        </div>
        <div className="md:col-span-2">
          <p className="label">Subscription</p>
          {sub ? (
            <p className="m-0">
              {sub.product_label} · ${(sub.monthly_amount_cents / 100).toFixed(0)}/mo ·{" "}
              <span className="badge">{sub.status}</span>
            </p>
          ) : (
            <p className="m-0 text-[var(--ink-soft)]">No subscription row yet.</p>
          )}
        </div>
        {invite && !invite.accepted_at ? (
          <div className="md:col-span-2 rounded-lg bg-[rgba(31,111,91,0.08)] p-3 text-sm">
            Pending invite link:
            <br />
            <a href={`${siteUrl}/invite/${invite.token}`}>
              {siteUrl}/invite/{invite.token}
            </a>
          </div>
        ) : null}
        <div className="md:col-span-2">
          <StartBillingButton agencyId={agency.id} disabled={Boolean(sub?.stripe_subscription_id)} />
        </div>
      </section>

      <section className="card">
        <h2 className="mt-0 text-xl font-semibold">Invoices</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Amount</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id}>
                <td>{new Date(inv.created * 1000).toLocaleDateString()}</td>
                <td>${(inv.amount_due / 100).toFixed(2)}</td>
                <td>
                  <span className="badge">{inv.status}</span>
                </td>
                <td>
                  {inv.hosted_invoice_url ? (
                    <a className="btn btn-ghost" href={inv.hosted_invoice_url} target="_blank" rel="noreferrer">
                      Open
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
            {!invoices.length ? (
              <tr>
                <td colSpan={4} className="text-[var(--ink-soft)]">
                  No Stripe invoices yet. Start billing to create the first monthly invoice.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
