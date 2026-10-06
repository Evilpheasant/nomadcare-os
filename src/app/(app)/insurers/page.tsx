import { createInsurer } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";

export default async function InsurersPage() {
  const { supabase } = await requireUser();
  const { t } = await getT();
  const { data: insurers } = await supabase.from("insurers").select("id, name, country, email, phone, policies(count)").order("name");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-xl font-semibold">{t.insurers}</h1>
      <section className="card">
        <h2 className="border-b border-line px-4 py-2.5 text-sm font-semibold">{t.newInsurer}</h2>
        <form action={createInsurer} className="grid grid-cols-2 gap-3 p-4 md:grid-cols-5">
          <label className="col-span-2 md:col-span-1">
            <span className="label">{t.name}</span>
            <input name="name" className="field" required />
          </label>
          <label>
            <span className="label">{t.country}</span>
            <input name="country" className="field" />
          </label>
          <label>
            <span className="label">{t.email}</span>
            <input name="email" type="email" className="field" />
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
      <section className="card overflow-x-auto">
        {insurers?.length ? (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">{t.name}</th>
                <th className="px-4 py-2 font-medium">{t.country}</th>
                <th className="px-4 py-2 font-medium">{t.email}</th>
                <th className="px-4 py-2 font-medium">{t.phone}</th>
                <th className="px-4 py-2 text-right font-medium">{t.policies}</th>
              </tr>
            </thead>
            <tbody>
              {insurers.map((i) => (
                <tr key={i.id} className="border-t border-line">
                  <td className="px-4 py-2 font-medium">{i.name}</td>
                  <td className="px-4 py-2">{i.country ?? "—"}</td>
                  <td className="px-4 py-2">{i.email ?? "—"}</td>
                  <td className="px-4 py-2">{i.phone ?? "—"}</td>
                  <td className="px-4 py-2 text-right">{(i.policies as unknown as { count: number }[])?.[0]?.count ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-4 py-3 text-sm text-muted">{t.nothingHere}</p>
        )}
      </section>
    </div>
  );
}
