import { requireAdminApi } from "@/lib/auth";
import { sendAgencyInviteEmail } from "@/lib/paubox";
import { getProductByKey, listConfiguredProducts, STARTER_PRODUCT } from "@/lib/products";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const auth = await requireAdminApi();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { profile } = auth;
    const body = await request.json();
    const name = String(body.name || "").trim();
    const billingEmail = String(body.billingEmail || "").trim().toLowerCase();
    const contactName = String(body.contactName || "").trim();
    const productKey = String(body.productKey || STARTER_PRODUCT.key).trim();

    if (!name || !billingEmail) {
      return NextResponse.json(
        { error: "Agency name and billing email are required." },
        { status: 400 },
      );
    }

    const product = getProductByKey(productKey);
    if (!product) {
      const available = listConfiguredProducts()
        .map((p) => p.key)
        .join(", ");
      return NextResponse.json(
        {
          error: `Unknown or unconfigured product tier "${productKey}". Configured: ${available || "none"}.`,
        },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    const { data: agency, error: agencyError } = await admin
      .from("agencies")
      .insert({
        name,
        billing_email: billingEmail,
        contact_name: contactName || null,
        status: "invited",
      })
      .select("id")
      .single();

    if (agencyError || !agency) {
      return NextResponse.json(
        { error: agencyError?.message || "Could not create agency." },
        { status: 500 },
      );
    }

    const { data: invite, error: inviteError } = await admin
      .from("invites")
      .insert({
        agency_id: agency.id,
        email: billingEmail,
        created_by: profile.id,
      })
      .select("token")
      .single();

    if (inviteError || !invite) {
      return NextResponse.json(
        { error: inviteError?.message || "Could not create invite." },
        { status: 500 },
      );
    }

    await admin.from("agency_subscriptions").insert({
      agency_id: agency.id,
      product_key: product.key,
      product_label: product.label,
      stripe_price_id: product.priceId,
      monthly_amount_cents: product.monthlyAmountCents,
      seat_band: product.seatBand,
      status: "incomplete",
    });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const inviteUrl = `${siteUrl}/invite/${invite.token}`;

    let emailSent = false;
    let emailError: string | null = null;
    try {
      await sendAgencyInviteEmail({
        to: billingEmail,
        agencyName: name,
        contactName: contactName || undefined,
        inviteUrl,
      });
      emailSent = true;
    } catch (err) {
      emailError = err instanceof Error ? err.message : "Could not send invite email.";
    }

    return NextResponse.json({
      agencyId: agency.id,
      inviteUrl,
      emailSent,
      emailError,
      productKey: product.key,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
