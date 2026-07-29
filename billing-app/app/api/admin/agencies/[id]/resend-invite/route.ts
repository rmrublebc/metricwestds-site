import { requireAdminApi } from "@/lib/auth";
import { sendAgencyInviteEmail } from "@/lib/paubox";
import { createAdminClient } from "@/lib/supabase/admin";
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

    const { data: agency, error } = await admin
      .from("agencies")
      .select("id, name, billing_email, contact_name, invites(*)")
      .eq("id", id)
      .single();

    if (error || !agency) {
      return NextResponse.json({ error: "Agency not found." }, { status: 404 });
    }

    const invites = Array.isArray(agency.invites) ? agency.invites : [];
    const invite = invites
      .slice()
      .sort(
        (a: { created_at: string }, b: { created_at: string }) =>
          +new Date(b.created_at) - +new Date(a.created_at),
      )[0];

    if (!invite || invite.accepted_at) {
      return NextResponse.json(
        { error: "No pending invite to resend for this agency." },
        { status: 400 },
      );
    }

    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const { error: updateError } = await admin
      .from("invites")
      .update({ expires_at: expiresAt })
      .eq("id", invite.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const inviteUrl = `${siteUrl}/invite/${invite.token}`;

    try {
      await sendAgencyInviteEmail({
        to: agency.billing_email,
        agencyName: agency.name,
        contactName: agency.contact_name || undefined,
        inviteUrl,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not send invite email.";
      return NextResponse.json(
        { error: message, inviteUrl, expiresAt },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      emailSent: true,
      inviteUrl,
      expiresAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
