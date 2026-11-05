import { createClient } from "@supabase/supabase-js";

/** Validate identity and read its protected role with the caller's own RLS permissions. */
export async function readAccountRole(accessToken: string) {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Account service is not configured.");
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data: { user }, error } = await client.auth.getUser(accessToken);
  if (error || !user) return null;
  const { data: role, error: roleError } = await client
    .from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
  if (roleError) throw new Error("Account permissions could not be verified.");
  return { user, isAdmin: role?.role === "admin" };
}