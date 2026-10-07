import { timingSafeEqual } from "node:crypto";
import { after, NextResponse, type NextRequest } from "next/server";
import { runSyncAll } from "@/lib/gmail-sync";

export const maxDuration = 300;

function authorised(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const got = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || got.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(secret));
}

/** Called by the scheduler every 15 minutes. Answers at once and syncs in the background. */
export async function POST(request: NextRequest) {
  if (!authorised(request)) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  after(() => runSyncAll());
  return NextResponse.json({ accepted: true }, { status: 202 });
}
