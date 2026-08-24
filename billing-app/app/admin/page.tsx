import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatUsdFromCents } from "@/lib/money";
import { listConfiguredProducts, listProductCatalog } from "@/lib/products";
import Link from "next/link";
import { CreateAgencyForm } from "./create-agency-form";
import { SignOutButton } from "@/components/sign-out-button";

export default async function AdminPage() {
  await requireAdmin();
  const supabase = await createClient();
  const products = listConfiguredProducts();
  const catalog = listProductCatalog();

  const { data: agencies } = await supabase
    .from("agencies")
    .select(
      "id, name, billing_email, status, stripe_customer_id, agency_subscriptions(id, product_label, status, monthly_amount_cents, seat_band)",
    )
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="m-0 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--accent-deep)]">
            Metric West admin
          </p>
          <h1 className="mt-1 text-3xl font-bold">Agencies & billing</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            className="btn btn-ghost"
            href="https://statiscribe.com/ops"
            target="_blank"
            rel="noopener noreferrer"
          >
            Statiscribe ops
          </a>
          <Link className="btn btn-ghost" href="/">
            Portal home
          </Link>
          <SignOutButton />
        </div>
      </header>

      <section className="card mb-8">
        <h2 className="mt-0 text-xl font-semibold">Statiscribe</h2>
        <p className="text-sm text-[var(--ink-soft)]">
          Secure messaging control console (accounts, announcements, HIPAA
          compliance). Opens in a new tab — sign in with your Metric West
          Statiscribe ops email if prompted.
        </p>
        <p className="mt-4">
          <a
            className="btn"
            href="https://statiscribe.com/ops"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open Statiscribe ops
          </a>
        </p>
      </section>

      <section className="card mb-8">
        <h2 className="mt-0 text-xl font-semibold">Invite an agency</h2>
        <p className="text-sm text-[var(--ink-soft)]">
          Creates the agency, emails an invite link, and prepares the selected Case-Flo Pro
          plan for monthly invoicing.
        </p>
        <CreateAgencyForm
          products={products.map((p) => ({
            key: p.key,
            label: p.label,
            seatBand: p.seatBand,
            monthlyAmountCents: p.monthlyAmountCents,
          }))}
        />
      </section>

      <section className="card mb-8">
        <h2 className="mt-0 text-xl font-semibold">Plan tiers</h2>
        <p className="text-sm text-[var(--ink-soft)]">
          Only tiers with a Stripe price ID in Vercel appear in the invite form.
        </p>
        <ul className="m-0 list-none space-y-2 p-0">
          {catalog.map((tier) => (
            <li
              key={tier.key}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--line)] bg-white/60 px-3 py-2 text-sm"
            >
              <span>
                {tier.label} · {formatUsdFromCents(tier.monthlyAmountCents)}/mo
              </span>
              <span className={`badge ${tier.configured ? "" : "badge-warn"}`}>
                {tier.configured ? "Ready" : `Add ${tier.envKey}`}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2 className="mt-0 text-xl font-semibold">Agencies</h2>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Agency</th>
                <th>Billing email</th>
                <th>Status</th>
                <th>Subscription</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(agencies || []).map((agency) => {
                const sub = Array.isArray(agency.agency_subscriptions)
                  ? agency.agency_subscriptions[0]
                  : agency.agency_subscriptions;
                return (
                  <tr key={agency.id}>
                    <td>{agency.name}</td>
                    <td>{agency.billing_email}</td>
                    <td>
                      <span className="badge">{agency.status}</span>
                    </td>
                    <td>
                      {sub ? (
                        <>
                          {sub.product_label}
                          <br />
                          <span className="text-sm text-[var(--ink-soft)]">
                            {formatUsdFromCents(sub.monthly_amount_cents)}/mo · {sub.status}
                          </span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <Link className="btn btn-ghost" href={`/admin/agencies/${agency.id}`}>
                        Open
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {!agencies?.length ? (
                <tr>
                  <td colSpan={5}>
                    <div className="py-6 text-center">
                      <p className="m-0 text-base font-semibold">Invite your first agency</p>
                      <p className="mt-2 mb-0 text-sm text-[var(--ink-soft)]">
                        Use the form above to create an agency, choose a plan tier, and email
                        their portal invite.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
