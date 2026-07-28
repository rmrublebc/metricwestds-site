import { requireAgency } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { SignOutButton } from "@/components/sign-out-button";

export default async function PortalPage() {
  const { profile } = await requireAgency();
  const supabase = await createClient();

  const { data: agency } = await supabase
    .from("agencies")
    .select("*, agency_subscriptions(*)")
    .eq("id", profile.agency_id!)
    .single();

  const sub = Array.isArray(agency?.agency_subscriptions)
    ? agency?.agency_subscriptions[0]
    : agency?.agency_subscriptions;

  let invoices: Array<{
    id: string;
    status: string | null;
    amount_due: number;
    hosted_invoice_url: string | null;
    created: number;
    number: string | null;
  }> = [];

  if (agency?.stripe_customer_id && process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = getStripe();
      const list = await stripe.invoices.list({
        customer: agency.stripe_customer_id,
        limit: 24,
      });
      invoices = list.data.map((inv) => ({
        id: inv.id,
        status: inv.status,
        amount_due: inv.amount_due,
        hosted_invoice_url: inv.hosted_invoice_url ?? null,
        created: inv.created,
        number: inv.number ?? null,
      }));
    } catch {
      invoices = [];
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="m-0 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--accent-deep)]">
            Agency portal
          </p>
          <h1 className="mt-1 text-3xl font-bold">{agency?.name || "Your agency"}</h1>
          <p className="text-[var(--ink-soft)]">Signed in as {profile.email}</p>
        </div>
        <SignOutButton />
      </header>

      <section className="card mb-6">
        <h2 className="mt-0 text-xl font-semibold">Your apps</h2>
        {sub ? (
          <div className="rounded-xl border border-[var(--line)] bg-white/70 p-4">
            <p className="m-0 text-lg font-semibold">{sub.product_label}</p>
            <p className="mt-1 text-[var(--ink-soft)]">
              ${(sub.monthly_amount_cents / 100).toFixed(0)} / month · Band {sub.seat_band} users
            </p>
            <p className="mt-2">
              Status: <span className="badge">{sub.status}</span>
            </p>
          </div>
        ) : (
          <p className="text-[var(--ink-soft)]">
            No subscription assigned yet. Metric West will activate billing for your agency.
          </p>
        )}
        <p className="mb-0 mt-4 text-sm text-[var(--ink-soft)]">
          Clinical login for Case-Flo Pro is separate:{" "}
          <a href="https://www.caseflo-pro.com" target="_blank" rel="noreferrer">
            caseflo-pro.com
          </a>
        </p>
      </section>

      <section className="card">
        <h2 className="mt-0 text-xl font-semibold">Invoices & payments</h2>
        <p className="text-sm text-[var(--ink-soft)]">
          Monthly invoices are emailed by Stripe. You can also pay open invoices here.
        </p>
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Invoice</th>
              <th>Amount</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id}>
                <td>{new Date(inv.created * 1000).toLocaleDateString()}</td>
                <td>{inv.number || inv.id}</td>
                <td>${(inv.amount_due / 100).toFixed(2)}</td>
                <td>
                  <span
                    className={`badge ${
                      inv.status === "open"
                        ? "badge-warn"
                        : inv.status === "paid"
                          ? ""
                          : "badge-danger"
                    }`}
                  >
                    {inv.status}
                  </span>
                </td>
                <td>
                  {inv.status === "open" && inv.hosted_invoice_url ? (
                    <a
                      className="btn btn-primary"
                      href={inv.hosted_invoice_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Pay now
                    </a>
                  ) : inv.hosted_invoice_url ? (
                    <a className="btn btn-ghost" href={inv.hosted_invoice_url} target="_blank" rel="noreferrer">
                      View
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
            {!invoices.length ? (
              <tr>
                <td colSpan={5} className="text-[var(--ink-soft)]">
                  No invoices yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
