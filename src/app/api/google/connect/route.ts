import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { consentUrl, googleConfigured } from "@/lib/google";

export async function GET() {
  await requireUser();
  if (!googleConfigured()) return NextResponse.redirect(new URL("/settings?google=not-configured", process.env.APP_URL));
  const state = randomBytes(24).toString("hex");
  const c = await cookies();
  c.set("g_oauth_state", state, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 });
  return NextResponse.redirect(consentUrl(state));
}
