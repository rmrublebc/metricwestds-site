import { requireAdminApi } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdminApi();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await context.params;
    const body = await request.json();
    const invoiceId = String(body.invoiceId || "").trim();
    if (!invoiceId) {
      return NextResponse.json({ error: "invoiceId is required." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: agency, error } = await admin
      .from("agencies")
      .select("id, stripe_customer_id")
      .eq("id", id)
      .single();

    if (error || !agency) {
      return NextResponse.json({ error: "Agency not found." }, { status: 404 });
    }
    if (!agency.stripe_customer_id) {
      return NextResponse.json({ error: "Agency has no Stripe customer." }, { status: 400 });
    }

    const stripe = getStripe();
    const invoice = await stripe.invoices.retrieve(invoiceId);

    if (invoice.customer !== agency.stripe_customer_id) {
      return NextResponse.json({ error: "Invoice does not belong to this agency." }, { status: 403 });
    }

    if (invoice.status === "draft") {
      await stripe.invoices.del(invoiceId);
      return NextResponse.json({ ok: true, action: "deleted_draft" });
    }

    if (invoice.status === "open") {
      await stripe.invoices.voidInvoice(invoiceId);
      return NextResponse.json({ ok: true, action: "voided" });
    }

    return NextResponse.json(
      { error: `Cannot void invoice with status "${invoice.status}".` },
      { status: 400 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
