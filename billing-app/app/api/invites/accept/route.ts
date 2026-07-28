import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = String(body.token || "").trim();
    const password = String(body.password || "");
    const fullName = String(body.fullName || "").trim();

    if (!token || password.length < 8) {
      return NextResponse.json(
        { error: "Valid invite token and password (8+ chars) required." },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const { data: invite, error: inviteError } = await admin
      .from("invites")
      .select("*")
      .eq("token", token)
      .is("accepted_at", null)
      .maybeSingle();

    if (inviteError || !invite) {
      return NextResponse.json({ error: "Invite not found or already used." }, { status: 404 });
    }

    if (new Date(invite.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: "Invite has expired." }, { status: 400 });
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: invite.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
      app_metadata: { role: "agency" },
    });

    if (createError || !created.user) {
      return NextResponse.json(
        { error: createError?.message || "Could not create user." },
        { status: 500 },
      );
    }

    await admin
      .from("profiles")
      .update({
        role: "agency",
        agency_id: invite.agency_id,
        full_name: fullName,
        email: invite.email,
      })
      .eq("id", created.user.id);

    await admin
      .from("invites")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invite.id);

    await admin.from("agencies").update({ status: "active" }).eq("id", invite.agency_id);

    return NextResponse.json({ email: invite.email });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
