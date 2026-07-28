import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { CreateAgencyForm } from "./create-agency-form";
import { SignOutButton } from "@/components/sign-out-button";

export default async function AdminPage() {
  await requireAdmin();
  const supabase = await createClient();

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
        <div className="flex gap-2">
          <Link className="btn btn-ghost" href="/">
            Portal home
          </Link>
          <SignOutButton />
        </div>
      </header>

      <section className="card mb-8">
        <h2 className="mt-0 text-xl font-semibold">Invite an agency</h2>
        <p className="text-sm text-[var(--ink-soft)]">
          Creates the agency, emails an invite link, and prepares Case-Flo Pro Starter
          ($750/mo) for invoicing.
        </p>
        <CreateAgencyForm />
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
                            ${(sub.monthly_amount_cents / 100).toFixed(0)}/mo · {sub.status}
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
                  <td colSpan={5} className="text-[var(--ink-soft)]">
                    No agencies yet.
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
