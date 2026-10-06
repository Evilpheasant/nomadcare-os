"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { ALLOWED_EMAIL, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { addDaysISO, todayISO } from "@/lib/dates";

const str = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
};
const num = (f: FormData, k: string) => {
  const v = str(f, k);
  if (v == null) return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

function refreshAll() {
  revalidatePath("/", "layout");
}

/* ---------- auth & preferences ---------- */

export async function signIn(formData: FormData) {
  const email = str(formData, "email")?.toLowerCase();
  const password = str(formData, "password");
  if (email !== ALLOWED_EMAIL || !password) redirect("/login?error=1");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/login?error=1");
  redirect("/");
}

export async function signUp(formData: FormData) {
  const email = str(formData, "email")?.toLowerCase();
  const password = str(formData, "password");
  if (email !== ALLOWED_EMAIL || !password) redirect("/login?error=1");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) redirect("/login?error=1");
  redirect("/login?check=1");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function setLang(formData: FormData) {
  const lang = str(formData, "lang") === "en" ? "en" : "de";
  const c = await cookies();
  c.set("lang", lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  refreshAll();
}

/* ---------- clients ---------- */

export async function createClientRecord(formData: FormData) {
  const { supabase } = await requireUser();
  const kind = str(formData, "kind") === "company" ? "company" : "person";
  const name = str(formData, "display_name");
  if (!name) return;
  const { data, error } = await supabase
    .from("clients")
    .insert({
      kind,
      display_name: name,
      company_name: kind === "company" ? name : null,
      email: str(formData, "email"),
      phone: str(formData, "phone"),
      country: str(formData, "country"),
      entity_id: str(formData, "entity_id"),
      status: str(formData, "status") ?? "client",
      notes: str(formData, "notes"),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  refreshAll();
  redirect(`/clients/${data.id}`);
}

export async function updateClientNotes(formData: FormData) {
  const { supabase } = await requireUser();
  const id = str(formData, "id");
  if (!id) return;
  await supabase.from("clients").update({ notes: str(formData, "notes") }).eq("id", id);
  refreshAll();
}

/* ---------- insurers ---------- */

export async function createInsurer(formData: FormData) {
  const { supabase } = await requireUser();
  const name = str(formData, "name");
  if (!name) return;
  await supabase.from("insurers").insert({
    name,
    country: str(formData, "country"),
    email: str(formData, "email"),
    phone: str(formData, "phone"),
  });
  refreshAll();
}

/* ---------- policies ---------- */

export async function createPolicy(formData: FormData) {
  const { supabase } = await requireUser();
  const client_id = str(formData, "client_id");
  if (!client_id) return;
  const { error } = await supabase.from("policies").insert({
    client_id,
    insurer_id: str(formData, "insurer_id"),
    entity_id: str(formData, "entity_id"),
    line: str(formData, "line") ?? "other",
    product: str(formData, "product"),
    policy_number: str(formData, "policy_number"),
    status: str(formData, "status") ?? "active",
    start_date: str(formData, "start_date"),
    renewal_date: str(formData, "renewal_date"),
    notice_period_days: num(formData, "notice_period_days"),
    premium: num(formData, "premium"),
    premium_frequency: str(formData, "premium_frequency"),
    currency: str(formData, "currency") ?? "EUR",
    notes: str(formData, "notes"),
  });
  if (error) throw new Error(error.message);
  refreshAll();
}

/* ---------- tasks ---------- */

export async function createTask(formData: FormData) {
  const { supabase } = await requireUser();
  const title = str(formData, "title");
  if (!title) return;
  const waiting_on = str(formData, "waiting_on");
  const chase = num(formData, "chase_every_days");
  const { error } = await supabase.from("tasks").insert({
    title,
    client_id: str(formData, "client_id"),
    policy_id: str(formData, "policy_id"),
    type: str(formData, "type") ?? "other",
    priority: str(formData, "priority") ?? "normal",
    due_date: str(formData, "due_date") ?? todayISO(),
    estimated_minutes: num(formData, "estimated_minutes") ?? 30,
    status: waiting_on ? "waiting" : "open",
    waiting_on,
    chase_every_days: chase,
    next_chase_date: waiting_on && chase ? addDaysISO(todayISO(), chase) : null,
    notes: str(formData, "notes"),
  });
  if (error) throw new Error(error.message);
  refreshAll();
}

export async function completeTask(formData: FormData) {
  const { supabase } = await requireUser();
  const id = str(formData, "id");
  if (!id) return;
  await supabase
    .from("tasks")
    .update({ status: "done", completed_at: new Date().toISOString(), next_chase_date: null })
    .eq("id", id);
  refreshAll();
}

export async function reopenTask(formData: FormData) {
  const { supabase } = await requireUser();
  const id = str(formData, "id");
  if (!id) return;
  await supabase.from("tasks").update({ status: "open", completed_at: null, waiting_on: null }).eq("id", id);
  refreshAll();
}

/** Put a task on hold waiting for someone, with an automatic chase date. */
export async function setWaiting(formData: FormData) {
  const { supabase } = await requireUser();
  const id = str(formData, "id");
  const waiting_on = str(formData, "waiting_on");
  if (!id || !waiting_on) return;
  const days = num(formData, "chase_every_days") ?? 3;
  await supabase
    .from("tasks")
    .update({ status: "waiting", waiting_on, chase_every_days: days, next_chase_date: addDaysISO(todayISO(), days) })
    .eq("id", id);
  refreshAll();
}

/** Record that you chased today and push the next chase date forward. */
export async function logChase(formData: FormData) {
  const { supabase } = await requireUser();
  const id = str(formData, "id");
  if (!id) return;
  const { data: task } = await supabase
    .from("tasks")
    .select("id, title, client_id, policy_id, chase_every_days, waiting_on")
    .eq("id", id)
    .single();
  if (!task) return;
  const days = task.chase_every_days ?? 3;
  await supabase.from("tasks").update({ next_chase_date: addDaysISO(todayISO(), days) }).eq("id", id);
  if (task.client_id) {
    await supabase.from("activities").insert({
      client_id: task.client_id,
      policy_id: task.policy_id,
      kind: "email",
      summary: `Chased ${task.waiting_on ?? ""}: ${task.title}`.trim(),
    });
  }
  refreshAll();
}

/* ---------- activities ---------- */

export async function addActivity(formData: FormData) {
  const { supabase } = await requireUser();
  const client_id = str(formData, "client_id");
  const summary = str(formData, "summary");
  if (!client_id || !summary) return;
  await supabase.from("activities").insert({
    client_id,
    kind: str(formData, "kind") ?? "note",
    summary,
    body: str(formData, "body"),
  });
  refreshAll();
}
