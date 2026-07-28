import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "agency";
  agency_id: string | null;
};

export async function getSessionProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, agency_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return null;
  return { supabase, user, profile: profile as Profile };
}

export async function requireUser() {
  const ctx = await getSessionProfile();
  if (!ctx) redirect("/login");
  return ctx;
}

export async function requireProfile() {
  return requireUser();
}

export async function requireAdmin() {
  const ctx = await requireProfile();
  if (ctx.profile.role !== "admin") redirect("/portal");
  return ctx;
}

export async function requireAgency() {
  const ctx = await requireProfile();
  if (ctx.profile.role !== "agency") redirect("/admin");
  if (!ctx.profile.agency_id) redirect("/portal?setup=1");
  return ctx;
}

export async function requireAdminApi() {
  const ctx = await getSessionProfile();
  if (!ctx) return { error: "Unauthorized", status: 401 as const };
  if (ctx.profile.role !== "admin") return { error: "Forbidden", status: 403 as const };
  return ctx;
}
