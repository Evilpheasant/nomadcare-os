import Link from "next/link";
import { acceptReview, rejectReview } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { fmtDate, getT } from "@/lib/i18n";

type Item = {
  id: string;
  kind: "task" | "new_contact" | "new_client" | "deadline" | "status_change";
  title: string;
  detail: string | null;
  client_id: string | null;
  suggested: { type?: string; priority?: string; due_date?: string; waiting_on?: string; client?: { display_name: string; email?: string } };
  external_url: string | null;
  found_at: string;
  clients: { display_name: string } | null;
};

export default async function ReviewPage({ searchParams }: PageProps<"/review">) {
  const { supabase } = await requireUser();
  const { lang, l } = await getT();
  const de = lang === "de";
  const sp = await searchParams;
  const kind = typeof sp.kind === "string" ? sp.kind : "";

  let q = supabase
    .from("review_items")
    .select("id, kind, title, detail, client_id, suggested, external_url, found_at, clients(display_name)")
    .eq("status", "pending")
    .order("found_at", { ascending: false })
    .limit(200);
  if (kind) q = q.eq("kind", kind);
  const [{ data }, { data: clients }, { data: counts }] = await Promise.all([
    q,
    supabase.from("clients").select("id, display_name").order("display_name"),
    supabase.from("review_items").select("kind").eq("status", "pending"),
  ]);
  const items = (data ?? []) as unknown as Item[];
  const byKind = (counts ?? []).reduce<Record<string, number>>((acc, r) => ((acc[r.kind] = (acc[r.kind] ?? 0) + 1), acc), {});

  const kindLabel: Record<Item["kind"], string> = de
    ? { task: "Aufgabe", new_contact: "Neuer Kontakt", new_client: "Neuer Kunde", deadline: "Frist", status_change: "Status" }
    : { task: "Task", new_contact: "New contact", new_client: "New client", deadline: "Deadline", status_change: "Status" };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-xl font-semibold">{de ? "Prüfen" : "Review"}</h1>
        <p className="text-sm text-muted">
          {de
            ? "Automatisch in Gmail gefunden. Übernehmen legt die Aufgabe bzw. den Kunden an, Ablehnen blendet den Eintrag aus."
            : "Found automatically in Gmail. Accept creates the task or client; reject hides it for good."}
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <Link href="/review" className={`btn-ghost ${!kind ? "bg-brand-soft" : ""}`}>{de ? "Alle" : "All"} ({Object.values(byKind).reduce((a, b) => a + b, 0)})</Link>
        {(Object.keys(kindLabel) as Item["kind"][]).filter((k) => byKind[k]).map((k) => (
          <Link key={k} href={`/review?kind=${k}`} className={`btn-ghost ${kind === k ? "bg-brand-soft" : ""}`}>
            {kindLabel[k]} ({byKind[k]})
          </Link>
        ))}
      </div>

      <section className="card overflow-hidden">
        {items.length === 0 ? (
          <p className="px-4 py-3 text-sm text-muted">{de ? "Nichts zu prüfen." : "Nothing to review."}</p>
        ) : (
          <ul>
            {items.map((it) => (
              <li key={it.id} className="flex flex-col gap-3 border-b border-line px-4 py-3 last:border-b-0 lg:flex-row lg:items-start">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-brand-soft px-1.5 py-0.5 text-[11px] text-brand">{kindLabel[it.kind]}</span>
                    {it.suggested?.priority === "high" && <span className="rounded bg-danger-soft px-1.5 py-0.5 text-[11px] text-danger">{l.priority.high}</span>}
                    <span className="text-sm font-medium">{it.title}</span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted">
                    {it.clients && it.client_id && <Link className="hover:underline" href={`/clients/${it.client_id}`}>{it.clients.display_name}</Link>}
                    {it.detail && <span className="truncate">{it.detail}</span>}
                    <span>{fmtDate(it.found_at, lang)}</span>
                    {it.suggested?.due_date && <span>{de ? "Fällig" : "Due"}: {fmtDate(it.suggested.due_date, lang)}</span>}
                    {it.external_url && <a className="text-brand hover:underline" href={it.external_url} target="_blank" rel="noreferrer">Gmail ↗</a>}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {it.kind === "new_contact" ? (
                    <>
                      <form action={acceptReview} className="flex items-center gap-1">
                        <input type="hidden" name="id" value={it.id} />
                        <select name="client_id" className="field !w-44 !py-1 text-xs" defaultValue="" aria-label={de ? "Zu Kunde hinzufügen" : "Add to client"}>
                          <option value="" disabled>{de ? "Kontakt von…" : "Contact of…"}</option>
                          {clients?.map((c) => <option key={c.id} value={c.id}>{c.display_name}</option>)}
                        </select>
                        <button className="btn-ghost">{de ? "Zuordnen" : "Add"}</button>
                      </form>
                      <form action={acceptReview}>
                        <input type="hidden" name="id" value={it.id} />
                        <button className="btn-ghost">{de ? "Neuer Kunde" : "New client"}</button>
                      </form>
                    </>
                  ) : (
                    <form action={acceptReview}>
                      <input type="hidden" name="id" value={it.id} />
                      <button className="btn !px-2.5 !py-1 !text-xs">✓ {de ? "Übernehmen" : "Accept"}</button>
                    </form>
                  )}
                  <form action={rejectReview}>
                    <input type="hidden" name="id" value={it.id} />
                    <button className="btn-ghost">✕ {de ? "Ablehnen" : "Reject"}</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
