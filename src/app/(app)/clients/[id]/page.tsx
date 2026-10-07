import Link from "next/link";
import { notFound } from "next/navigation";
import { addActivity, updateClientNotes } from "@/app/actions";
import { PolicyForm } from "@/components/PolicyForm";
import { TaskForm } from "@/components/TaskForm";
import { TaskList, TASK_SELECT, type TaskWithClient } from "@/components/TaskRow";
import { requireUser } from "@/lib/auth";
import { noticeDeadline } from "@/lib/dates";
import { fmtDate, fmtMoney, getT } from "@/lib/i18n";

export default async function ClientPage({ params }: PageProps<"/clients/[id]">) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const { t, l, lang, lines } = await getT();

  const [{ data: client }, { data: policies }, { data: tasks }, { data: activities }, { data: insurers }, { data: entities }, { data: documents }, { data: contacts }] =
    await Promise.all([
      supabase.from("clients").select("*, entities(code, name)").eq("id", id).maybeSingle(),
      supabase.from("policies").select("*, insurers(name)").eq("client_id", id).order("renewal_date", { ascending: true }),
      supabase.from("tasks").select(TASK_SELECT).eq("client_id", id).order("status").order("due_date"),
      supabase.from("activities").select("id, kind, summary, body, occurred_at, external_url, insurers(name)").eq("client_id", id).order("occurred_at", { ascending: false }).limit(200),
      supabase.from("insurers").select("id, name").order("name"),
      supabase.from("entities").select("id, code, name").order("code"),
      supabase.from("documents").select("id, filename, doc_type, doc_date, storage_path, external_url").eq("client_id", id).order("doc_date", { ascending: false }).limit(200),
      supabase.from("contacts").select("id, name, role, email, phone").eq("client_id", id).order("name"),
    ]);

  if (!client) notFound();
  const ent = client.entities as { code: string; name: string } | null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <Link href="/clients" className="text-xs text-muted hover:underline">← {t.clients}</Link>
        <h1 className="mt-1 text-xl font-semibold">{client.display_name}</h1>
        <div className="mt-1 flex flex-wrap gap-x-4 text-sm text-muted">
          <span>{client.kind === "company" ? t.company : t.person}</span>
          <span>{l.clientStatus[client.status as keyof typeof l.clientStatus]}</span>
          {ent && <span>{ent.name}</span>}
          {client.email && <a className="hover:underline" href={`mailto:${client.email}`}>{client.email}</a>}
          {client.phone && <span>{client.phone}</span>}
          {client.country && <span>{client.country}</span>}
        </div>
      </header>

      <section className="card overflow-hidden">
        <h2 className="border-b border-line px-4 py-2.5 text-sm font-semibold">{t.tasks}</h2>
        <TaskList tasks={(tasks ?? []) as unknown as TaskWithClient[]} t={t} l={l} lang={lang} showClient={false} />
        <div className="border-t border-line">
          <TaskForm t={t} l={l} clientId={client.id} />
        </div>
      </section>

      <section className="card overflow-x-auto">
        <h2 className="border-b border-line px-4 py-2.5 text-sm font-semibold">{t.policies}</h2>
        {policies?.length ? (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">{t.line}</th>
                <th className="px-4 py-2 font-medium">{t.insurer}</th>
                <th className="px-4 py-2 font-medium">{t.policyNumber}</th>
                <th className="px-4 py-2 font-medium">{t.status}</th>
                <th className="px-4 py-2 font-medium">{t.renewal}</th>
                <th className="px-4 py-2 font-medium">{t.noticeDeadline}</th>
                <th className="px-4 py-2 text-right font-medium">{t.premium}</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((p) => (
                <tr key={p.id} className="border-t border-line">
                  <td className="px-4 py-2">{lines[p.line as keyof typeof lines] ?? p.line}{p.product ? ` · ${p.product}` : ""}</td>
                  <td className="px-4 py-2">{(p.insurers as { name: string } | null)?.name ?? "—"}</td>
                  <td className="px-4 py-2 font-mono text-xs">{p.policy_number ?? "—"}</td>
                  <td className="px-4 py-2">{l.policyStatus[p.status as keyof typeof l.policyStatus]}</td>
                  <td className="px-4 py-2">{fmtDate(p.renewal_date, lang)}</td>
                  <td className="px-4 py-2">{fmtDate(noticeDeadline(p.renewal_date, p.notice_period_days), lang)}</td>
                  <td className="px-4 py-2 text-right">
                    {fmtMoney(p.premium, p.currency, lang)}
                    {p.premium_frequency && <span className="text-xs text-muted"> / {l.frequency[p.premium_frequency as keyof typeof l.frequency]}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-4 py-3 text-sm text-muted">{t.nothingHere}</p>
        )}
        <details className="border-t border-line">
          <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium text-brand">+ {t.newPolicy}</summary>
          <PolicyForm t={t} l={l} lines={lines} clientId={client.id} insurers={insurers ?? []} entities={entities ?? []} />
        </details>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card lg:col-span-2">
          <h2 className="border-b border-line px-4 py-2.5 text-sm font-semibold">{t.timeline}</h2>
          <form action={addActivity} className="flex flex-col gap-2 border-b border-line p-4 sm:flex-row">
            <input type="hidden" name="client_id" value={client.id} />
            <select name="kind" className="field sm:!w-32" defaultValue="note">
              {Object.entries(l.activity).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <input name="summary" className="field" required placeholder={t.addNote} />
            <button className="btn">{t.add}</button>
          </form>
          {activities?.length ? (
            <ul>
              {activities.map((a) => (
                <li key={a.id} className="border-b border-line px-4 py-2.5 text-sm last:border-b-0">
                  <span className="mr-2 rounded bg-brand-soft px-1.5 py-0.5 text-[11px] text-brand">{l.activity[a.kind as keyof typeof l.activity]}</span>
                  {a.external_url ? (
                    <a className="hover:underline" href={a.external_url} target="_blank" rel="noreferrer">{a.summary} ↗</a>
                  ) : (
                    a.summary
                  )}
                  {(a.insurers as unknown as { name: string } | null)?.name && (
                    <span className="ml-2 text-xs text-muted">· {(a.insurers as unknown as { name: string }).name}</span>
                  )}
                  <span className="ml-2 text-xs text-muted">{fmtDate(a.occurred_at, lang)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-3 text-sm text-muted">{t.nothingHere}</p>
          )}
        </section>

        <div className="space-y-6">
        <section className="card">
          <h2 className="border-b border-line px-4 py-2.5 text-sm font-semibold">{lang === "de" ? "Dokumente" : "Documents"} ({documents?.length ?? 0})</h2>
          {documents?.length ? (
            <ul className="max-h-80 overflow-y-auto">
              {documents.map((d) => (
                <li key={d.id} className="border-b border-line px-4 py-2 text-sm last:border-b-0">
                  <a className="hover:underline" href={`/api/documents/${d.id}`} target="_blank" rel="noreferrer">{d.filename}</a>
                  <div className="text-xs text-muted">{d.doc_type} · {fmtDate(d.doc_date, lang)}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-3 text-sm text-muted">{t.nothingHere}</p>
          )}
        </section>
        <section className="card">
          <h2 className="border-b border-line px-4 py-2.5 text-sm font-semibold">{lang === "de" ? "Kontakte" : "Contacts"} ({contacts?.length ?? 0})</h2>
          {contacts?.length ? (
            <ul>
              {contacts.map((k) => (
                <li key={k.id} className="border-b border-line px-4 py-2 text-sm last:border-b-0">
                  <div className="font-medium">{k.name}{k.role ? <span className="font-normal text-muted"> · {k.role}</span> : null}</div>
                  <div className="text-xs text-muted">
                    {k.email && <a className="hover:underline" href={`mailto:${k.email}`}>{k.email}</a>}
                    {k.phone && <span> · {k.phone}</span>}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-3 text-sm text-muted">{t.nothingHere}</p>
          )}
        </section>
        <section className="card">
          <h2 className="border-b border-line px-4 py-2.5 text-sm font-semibold">{t.notes}</h2>
          <form action={updateClientNotes} className="space-y-2 p-4">
            <input type="hidden" name="id" value={client.id} />
            <textarea name="notes" rows={8} className="field" defaultValue={client.notes ?? ""} />
            <button className="btn">{t.save}</button>
          </form>
        </section>
        </div>
      </div>
    </div>
  );
}
