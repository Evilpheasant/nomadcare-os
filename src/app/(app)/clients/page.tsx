import Link from "next/link";
import { createClientRecord } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";

export default async function ClientsPage({ searchParams }: PageProps<"/clients">) {
  const { supabase } = await requireUser();
  const { t, l } = await getT();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  let query = supabase
    .from("clients")
    .select("id, display_name, kind, email, phone, country, status, entities(code), policies(count), tasks(count)")
    .order("display_name")
    .limit(500);
  if (q) {
    const safe = q.replace(/[%,()]/g, " ");
    query = query.or(`display_name.ilike.%${safe}%,email.ilike.%${safe}%,phone.ilike.%${safe}%`);
  }
  const [{ data: clients }, { data: entities }] = await Promise.all([
    query,
    supabase.from("entities").select("id, code, name").order("code"),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="text-xl font-semibold">{t.clients}</h1>

      <section className="card">
        <h2 className="border-b border-line px-4 py-2.5 text-sm font-semibold">{t.newClient}</h2>
        <form action={createClientRecord} className="grid grid-cols-2 gap-3 p-4 md:grid-cols-6">
          <label className="col-span-2">
            <span className="label">{t.name}</span>
            <input name="display_name" className="field" required />
          </label>
          <label>
            <span className="label">{t.kind}</span>
            <select name="kind" className="field">
              <option value="person">{t.person}</option>
              <option value="company">{t.company}</option>
            </select>
          </label>
          <label>
            <span className="label">{t.email}</span>
            <input name="email" type="email" className="field" />
          </label>
          <label>
            <span className="label">{t.country}</span>
            <input name="country" className="field" placeholder="DE" />
          </label>
          <label>
            <span className="label">{t.entity}</span>
            <select name="entity_id" className="field" defaultValue={entities?.find((e) => e.code === "DE")?.id}>
              {entities?.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">{t.status}</span>
            <select name="status" className="field" defaultValue="client">
              {Object.entries(l.clientStatus).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">{t.phone}</span>
            <input name="phone" className="field" />
          </label>
          <div className="flex items-end">
            <button className="btn w-full">{t.add}</button>
          </div>
        </form>
      </section>

      <form className="flex gap-2">
        <input name="q" defaultValue={q} className="field max-w-sm" placeholder={`${t.search}…`} />
        <button className="btn-ghost">{t.search}</button>
      </form>

      <section className="card overflow-x-auto">
        {clients?.length ? (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">{t.name}</th>
                <th className="px-4 py-2 font-medium">{t.email}</th>
                <th className="px-4 py-2 font-medium">{t.country}</th>
                <th className="px-4 py-2 font-medium">{t.entity}</th>
                <th className="px-4 py-2 font-medium">{t.status}</th>
                <th className="px-4 py-2 text-right font-medium">{t.policies}</th>
                <th className="px-4 py-2 text-right font-medium">{t.tasks}</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => {
                const ent = c.entities as unknown as { code: string } | null;
                const pc = (c.policies as unknown as { count: number }[])?.[0]?.count ?? 0;
                const tc = (c.tasks as unknown as { count: number }[])?.[0]?.count ?? 0;
                return (
                  <tr key={c.id} className="border-t border-line hover:bg-brand-soft/40">
                    <td className="px-4 py-2 font-medium">
                      <Link className="hover:underline" href={`/clients/${c.id}`}>{c.display_name}</Link>
                      {c.kind === "company" && <span className="ml-2 text-xs text-muted">{t.company}</span>}
                    </td>
                    <td className="px-4 py-2 text-muted">{c.email ?? "—"}</td>
                    <td className="px-4 py-2">{c.country ?? "—"}</td>
                    <td className="px-4 py-2">{ent?.code ?? "—"}</td>
                    <td className="px-4 py-2">{l.clientStatus[c.status as keyof typeof l.clientStatus]}</td>
                    <td className="px-4 py-2 text-right">{pc}</td>
                    <td className="px-4 py-2 text-right">{tc}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="px-4 py-3 text-sm text-muted">{t.nothingHere}</p>
        )}
      </section>
    </div>
  );
}
