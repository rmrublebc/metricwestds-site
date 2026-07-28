import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

/** One-time: create the Metric West admin user if none exists. */
export async function POST(request: Request) {
  try {
    const adminEmail = (process.env.ADMIN_EMAIL || "ryan.ruble@metricwestds.com")
      .trim()
      .toLowerCase();
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const fullName = String(body.fullName || "Ryan Ruble").trim();
    const setupSecret = String(body.setupSecret || "");

    if (setupSecret !== process.env.ADMIN_SETUP_SECRET) {
      return NextResponse.json({ error: "Invalid setup secret." }, { status: 403 });
    }
    if (email !== adminEmail) {
      return NextResponse.json({ error: "Email must match ADMIN_EMAIL." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");

    if ((count || 0) > 0) {
      return NextResponse.json({ error: "Admin already exists." }, { status: 400 });
    }

    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
      app_metadata: { role: "admin" },
    });

    if (error || !created.user) {
      return NextResponse.json({ error: error?.message || "Create failed." }, { status: 500 });
    }

    await admin
      .from("profiles")
      .update({ role: "admin", full_name: fullName, email })
      .eq("id", created.user.id);

    return NextResponse.json({ ok: true, email });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
