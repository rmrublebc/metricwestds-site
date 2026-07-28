import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(request: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  let event: Stripe.Event;
  try {
    if (!webhookSecret || !signature) {
      // Local/dev convenience when webhook secret not set yet
      event = JSON.parse(body) as Stripe.Event;
    } else {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid webhook";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    switch (event.type) {
      case "customer.subscription.updated":
      case "customer.subscription.created":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const status = subscription.status;
        const mapped =
          status === "active" || status === "trialing"
            ? status === "trialing"
              ? "trialing"
              : "active"
            : status === "past_due"
              ? "past_due"
              : status === "canceled"
                ? "canceled"
                : status === "unpaid"
                  ? "unpaid"
                  : "incomplete";

        const periodEnd =
          "current_period_end" in subscription &&
          typeof subscription.current_period_end === "number"
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null;

        await admin
          .from("agency_subscriptions")
          .update({
            status: mapped,
            current_period_end: periodEnd,
          })
          .eq("stripe_subscription_id", subscription.id);
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const invoiceAny = invoice as Stripe.Invoice & {
          subscription?: string | Stripe.Subscription | null;
        };
        const subId =
          typeof invoiceAny.subscription === "string"
            ? invoiceAny.subscription
            : invoiceAny.subscription?.id;
        if (subId) {
          await admin
            .from("agency_subscriptions")
            .update({ status: "active" })
            .eq("stripe_subscription_id", subId);
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook handler failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
