import { requireAdminApi } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdminApi();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await context.params;
    const admin = createAdminClient();

    const { data: agency, error } = await admin
      .from("agencies")
      .select("id, name, stripe_customer_id, agency_subscriptions(stripe_subscription_id)")
      .eq("id", id)
      .single();

    if (error || !agency) {
      return NextResponse.json({ error: "Agency not found." }, { status: 404 });
    }

    const subs = Array.isArray(agency.agency_subscriptions)
      ? agency.agency_subscriptions
      : agency.agency_subscriptions
        ? [agency.agency_subscriptions]
        : [];

    if (process.env.STRIPE_SECRET_KEY) {
      const stripe = getStripe();

      for (const sub of subs) {
        const subscriptionId = sub?.stripe_subscription_id as string | null | undefined;
        if (!subscriptionId) continue;
        try {
          await stripe.subscriptions.cancel(subscriptionId);
        } catch (err) {
          // Already canceled / missing in Stripe — continue cleanup.
          console.warn("Stripe subscription cancel skipped:", subscriptionId, err);
        }
      }

      if (agency.stripe_customer_id) {
        try {
          await stripe.customers.del(agency.stripe_customer_id);
        } catch (err) {
          console.warn("Stripe customer delete skipped:", agency.stripe_customer_id, err);
        }
      }
    }

    const { data: agencyProfiles } = await admin
      .from("profiles")
      .select("id")
      .eq("agency_id", agency.id)
      .eq("role", "agency");

    const userIds = (agencyProfiles || []).map((p) => p.id);

    const { error: deleteAgencyError } = await admin.from("agencies").delete().eq("id", agency.id);
    if (deleteAgencyError) {
      return NextResponse.json(
        { error: deleteAgencyError.message || "Could not delete agency." },
        { status: 500 },
      );
    }

    if (userIds.length) {
      await admin.from("profiles").delete().in("id", userIds);
      for (const userId of userIds) {
        const { error: authError } = await admin.auth.admin.deleteUser(userId);
        if (authError) {
          console.warn("Auth user delete skipped:", userId, authError.message);
        }
      }
    }

    return NextResponse.json({ ok: true, deletedAgencyId: agency.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
