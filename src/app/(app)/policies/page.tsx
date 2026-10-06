import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { noticeDeadline, todayISO } from "@/lib/dates";
import { fmtDate, fmtMoney, getT } from "@/lib/i18n";

export default async function PoliciesPage() {
  const { supabase } = await requireUser();
  const { t, l, lang, lines } = await getT();
  const today = todayISO();
  const { data: policies } = await supabase
    .from("policies")
    .select("id, line, product, policy_number, status, renewal_date, notice_period_days, premium, premium_frequency, currency, client_id, clients(display_name), insurers(name), entities(code)")
    .order("renewal_date", { ascending: true, nullsFirst: false })
    .limit(1000);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="text-xl font-semibold">{t.policies}</h1>
      <section className="card overflow-x-auto">
        {policies?.length ? (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">{t.renewal}</th>
                <th className="px-4 py-2 font-medium">{t.noticeDeadline}</th>
                <th className="px-4 py-2 font-medium">{t.client}</th>
                <th className="px-4 py-2 font-medium">{t.line}</th>
                <th className="px-4 py-2 font-medium">{t.insurer}</th>
                <th className="px-4 py-2 font-medium">{t.policyNumber}</th>
                <th className="px-4 py-2 font-medium">{t.status}</th>
                <th className="px-4 py-2 font-medium">{t.entity}</th>
                <th className="px-4 py-2 text-right font-medium">{t.premium}</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((p) => {
                const nd = noticeDeadline(p.renewal_date, p.notice_period_days);
                return (
                  <tr key={p.id} className="border-t border-line">
                    <td className="px-4 py-2">{fmtDate(p.renewal_date, lang)}</td>
                    <td className={`px-4 py-2 ${nd && nd < today && p.status === "active" ? "text-danger" : ""}`}>{fmtDate(nd, lang)}</td>
                    <td className="px-4 py-2">
                      <Link className="hover:underline" href={`/clients/${p.client_id}`}>
                        {(p.clients as unknown as { display_name: string } | null)?.display_name}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{lines[p.line as keyof typeof lines] ?? p.line}</td>
                    <td className="px-4 py-2">{(p.insurers as unknown as { name: string } | null)?.name ?? "—"}</td>
                    <td className="px-4 py-2 font-mono text-xs">{p.policy_number ?? "—"}</td>
                    <td className="px-4 py-2">{l.policyStatus[p.status as keyof typeof l.policyStatus]}</td>
                    <td className="px-4 py-2">{(p.entities as unknown as { code: string } | null)?.code ?? "—"}</td>
                    <td className="px-4 py-2 text-right">{fmtMoney(p.premium, p.currency, lang)}</td>
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
