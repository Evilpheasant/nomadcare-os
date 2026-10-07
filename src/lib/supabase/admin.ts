import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client: bypasses row-level security. Server-only.
 * Used by the Gmail sync (runs without a signed-in user) and to store Google tokens.
 * Every query made with it MUST filter by owner_id explicitly.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function adminConfigured() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}
