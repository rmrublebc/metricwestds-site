import { requireAdminApi } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProductByKey, STARTER_PRODUCT } from "@/lib/products";
import { getStripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

export async function POST(
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
    const stripe = getStripe();

    const { data: agency, error } = await admin
      .from("agencies")
      .select("*, agency_subscriptions(*)")
      .eq("id", id)
      .single();

    if (error || !agency) {
      return NextResponse.json({ error: "Agency not found." }, { status: 404 });
    }

    const existingSub = Array.isArray(agency.agency_subscriptions)
      ? agency.agency_subscriptions[0]
      : agency.agency_subscriptions;

    if (existingSub?.stripe_subscription_id) {
      return NextResponse.json({ error: "Billing already started." }, { status: 400 });
    }

    const product =
      getProductByKey(existingSub?.product_key || STARTER_PRODUCT.key) || STARTER_PRODUCT;
    const priceId = existingSub?.stripe_price_id || product.priceId;

    let customerId = agency.stripe_customer_id as string | null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: agency.billing_email,
        name: agency.name,
        metadata: {
          agency_id: agency.id,
          metricwest: "true",
        },
      });
      customerId = customer.id;
      await admin
        .from("agencies")
        .update({ stripe_customer_id: customerId })
        .eq("id", agency.id);
    }

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      collection_method: "send_invoice",
      days_until_due: 14,
      metadata: {
        agency_id: agency.id,
        product_key: product.key,
      },
    });

    const periodEnd =
      "current_period_end" in subscription && typeof subscription.current_period_end === "number"
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null;

    if (existingSub?.id) {
      await admin
        .from("agency_subscriptions")
        .update({
          product_key: product.key,
          product_label: product.label,
          stripe_price_id: priceId,
          monthly_amount_cents: product.monthlyAmountCents,
          seat_band: product.seatBand,
          stripe_subscription_id: subscription.id,
          status: subscription.status === "active" ? "active" : "incomplete",
          current_period_end: periodEnd,
        })
        .eq("id", existingSub.id);
    } else {
      await admin.from("agency_subscriptions").insert({
        agency_id: agency.id,
        product_key: product.key,
        product_label: product.label,
        stripe_price_id: priceId,
        stripe_subscription_id: subscription.id,
        monthly_amount_cents: product.monthlyAmountCents,
        seat_band: product.seatBand,
        status: subscription.status === "active" ? "active" : "incomplete",
        current_period_end: periodEnd,
      });
    }

    const invoices = await stripe.invoices.list({
      customer: customerId,
      subscription: subscription.id,
      limit: 1,
    });
    const latest = invoices.data[0];
    if (latest && latest.status === "draft") {
      await stripe.invoices.finalizeInvoice(latest.id);
    }
    if (latest) {
      try {
        await stripe.invoices.sendInvoice(latest.id);
      } catch {
        // Hosted invoice URL still works if email send is blocked in test.
      }
    }

    await admin.from("agencies").update({ status: "active" }).eq("id", agency.id);

    return NextResponse.json({
      subscriptionId: subscription.id,
      customerId,
      productKey: product.key,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
