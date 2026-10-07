import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

/** Opens a stored document through a short-lived signed link (row-level security applies). */
export async function GET(_req: Request, ctx: RouteContext<"/api/documents/[id]">) {
  const { id } = await ctx.params;
  const { supabase } = await requireUser();
  const { data: doc } = await supabase.from("documents").select("storage_path, external_url").eq("id", id).maybeSingle();
  if (!doc) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!doc.storage_path) {
    return doc.external_url ? NextResponse.redirect(doc.external_url) : NextResponse.json({ error: "no file" }, { status: 404 });
  }
  const { data, error } = await supabase.storage.from("documents").createSignedUrl(doc.storage_path, 120);
  if (error || !data) return NextResponse.json({ error: "could not open file" }, { status: 500 });
  return NextResponse.redirect(data.signedUrl);
}
