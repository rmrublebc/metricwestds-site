import { requireAdminApi } from "@/lib/auth";
import { getProductByKey, listConfiguredProducts } from "@/lib/products";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function PATCH(
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
    const productKey = String(body.productKey || "").trim();
    const product = getProductByKey(productKey);

    if (!product) {
      const available = listConfiguredProducts()
        .map((p) => p.key)
        .join(", ");
      return NextResponse.json(
        { error: `Unknown or unconfigured plan "${productKey}". Configured: ${available || "none"}.` },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const { data: agency, error } = await admin
      .from("agencies")
      .select("id, agency_subscriptions(*)")
      .eq("id", id)
      .single();

    if (error || !agency) {
      return NextResponse.json({ error: "Agency not found." }, { status: 404 });
    }

    const existingSub = Array.isArray(agency.agency_subscriptions)
      ? agency.agency_subscriptions[0]
      : agency.agency_subscriptions;

    if (existingSub?.stripe_subscription_id) {
      return NextResponse.json(
        { error: "Billing already started. Plan can only be changed before invoicing begins." },
        { status: 400 },
      );
    }

    if (existingSub?.id) {
      const { error: updateError } = await admin
        .from("agency_subscriptions")
        .update({
          product_key: product.key,
          product_label: product.label,
          stripe_price_id: product.priceId,
          monthly_amount_cents: product.monthlyAmountCents,
          seat_band: product.seatBand,
        })
        .eq("id", existingSub.id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    } else {
      const { error: insertError } = await admin.from("agency_subscriptions").insert({
        agency_id: agency.id,
        product_key: product.key,
        product_label: product.label,
        stripe_price_id: product.priceId,
        monthly_amount_cents: product.monthlyAmountCents,
        seat_band: product.seatBand,
        status: "incomplete",
      });
      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true, productKey: product.key });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
