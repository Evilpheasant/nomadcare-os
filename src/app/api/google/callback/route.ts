import { cookies } from "next/headers";
import { after, NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { exchangeCode } from "@/lib/google";
import { runSync } from "@/lib/gmail-sync";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const { user } = await requireUser();
  const base = process.env.APP_URL!;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const c = await cookies();
  const expected = c.get("g_oauth_state")?.value;
  c.delete("g_oauth_state");

  if (!code || !state || !expected || state !== expected) {
    return NextResponse.redirect(new URL("/settings?google=error", base));
  }

  try {
    const tokens = await exchangeCode(code);
    if (!tokens.refresh_token) return NextResponse.redirect(new URL("/settings?google=no-refresh", base));
    let email: string | null = null;
    if (tokens.id_token) {
      const payload = JSON.parse(Buffer.from(tokens.id_token.split(".")[1], "base64url").toString());
      email = payload.email ?? null;
    }
    const db = createAdminClient();
    const { error } = await db.from("google_connections").upsert(
      {
        owner_id: user.id,
        google_email: email,
        refresh_token: tokens.refresh_token,
        scopes: tokens.scope ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "owner_id" },
    );
    if (error) throw new Error(error.message);
    after(() => runSync(user.id));
    return NextResponse.redirect(new URL("/settings?google=connected", base));
  } catch {
    return NextResponse.redirect(new URL("/settings?google=error", base));
  }
}
