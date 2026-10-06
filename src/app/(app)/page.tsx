import Link from "next/link";
import { TaskList, TASK_SELECT, type TaskWithClient } from "@/components/TaskRow";
import { requireUser } from "@/lib/auth";
import { addDaysISO, daysBetween, noticeDeadline, todayISO } from "@/lib/dates";
import { fmtDate, getT } from "@/lib/i18n";

export default async function Dashboard() {
  const { supabase } = await requireUser();
  const { t, l, lang, lines } = await getT();
  const today = todayISO();

  const [{ data: open }, { data: renewals }] = await Promise.all([
    supabase.from("tasks").select(TASK_SELECT).neq("status", "done").order("due_date", { ascending: true }).limit(300),
    supabase
      .from("policies")
      .select("id, line, product, policy_number, renewal_date, notice_period_days, client_id, clients(display_name), insurers(name)")
      .eq("status", "active")
      .gte("renewal_date", today)
      .lte("renewal_date", addDaysISO(today, 90))
      .order("renewal_date"),
  ]);

  const tasks = (open ?? []) as unknown as TaskWithClient[];
  const actionable = tasks.filter((x) => x.status === "open");
  const overdue = actionable.filter((x) => x.due_date && x.due_date < today);
  const dueToday = actionable.filter((x) => !x.due_date || x.due_date === today);
  const waitingIns = tasks.filter((x) => x.status === "waiting" && x.waiting_on === "insurer");
  const waitingCli = tasks.filter((x) => x.status === "waiting" && x.waiting_on !== "insurer");
  const chaseDue = tasks.filter((x) => x.status === "waiting" && x.next_chase_date && x.next_chase_date <= today);
  const todayMinutes = [...overdue, ...dueToday].reduce((s, x) => s + (x.estimated_minutes ?? 0), 0);

  const stats = [
    { label: t.overdue, value: overdue.length, tone: overdue.length ? "text-danger" : "" },
    { label: t.today, value: dueToday.length, sub: `${Math.round(todayMinutes / 6) / 10} h` },
    { label: t.chaseDue, value: chaseDue.length, tone: chaseDue.length ? "text-warn" : "" },
    { label: t.renewals90, value: renewals?.length ?? 0 },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-semibold">{t.dashboard}</h1>
        <span className="text-sm text-muted">{fmtDate(today, lang)}</span>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <div className="text-xs text-muted">{s.label}</div>
            <div className={`mt-1 text-2xl font-semibold ${s.tone ?? ""}`}>{s.value}</div>
            {s.sub && <div className="text-xs text-muted">{s.sub}</div>}
          </div>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title={`${t.overdue} & ${t.today}`} href="/tasks">
          <TaskList tasks={[...overdue, ...dueToday]} t={t} l={l} lang={lang} />
        </Panel>
        <Panel title={t.chaseDue} href="/tasks?status=waiting">
          <TaskList tasks={chaseDue} t={t} l={l} lang={lang} />
        </Panel>
        <Panel title={t.waitingInsurer} href="/tasks?status=waiting">
          <TaskList tasks={waitingIns} t={t} l={l} lang={lang} />
        </Panel>
        <Panel title={t.waitingClient} href="/tasks?status=waiting">
          <TaskList tasks={waitingCli} t={t} l={l} lang={lang} />
        </Panel>
      </div>

      <Panel title={t.renewals90} href="/policies">
        {renewals?.length ? (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">{t.renewal}</th>
                <th className="px-4 py-2 font-medium">{t.client}</th>
                <th className="px-4 py-2 font-medium">{t.line}</th>
                <th className="px-4 py-2 font-medium">{t.insurer}</th>
                <th className="px-4 py-2 font-medium">{t.noticeDeadline}</th>
              </tr>
            </thead>
            <tbody>
              {renewals.map((p) => {
                const nd = noticeDeadline(p.renewal_date, p.notice_period_days);
                const client = p.clients as unknown as { display_name: string } | null;
                const insurer = p.insurers as unknown as { name: string } | null;
                return (
                  <tr key={p.id} className="border-t border-line">
                    <td className="px-4 py-2">{fmtDate(p.renewal_date, lang)} <span className="text-xs text-muted">({daysBetween(today, p.renewal_date!)} {t.daysLeft})</span></td>
                    <td className="px-4 py-2"><Link className="hover:underline" href={`/clients/${p.client_id}`}>{client?.display_name}</Link></td>
                    <td className="px-4 py-2">{lines[p.line as keyof typeof lines] ?? p.line}</td>
                    <td className="px-4 py-2">{insurer?.name ?? "—"}</td>
                    <td className={`px-4 py-2 ${nd && nd < today ? "text-danger" : ""}`}>{fmtDate(nd, lang)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="px-4 py-3 text-sm text-muted">{t.nothingHere}</p>
        )}
      </Panel>
    </div>
  );
}

function Panel({ title, href, children }: { title: string; href?: string; children: React.ReactNode }) {
  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <h2 className="text-sm font-semibold">{title}</h2>
        {href && <Link href={href} className="text-xs text-muted hover:underline">→</Link>}
      </div>
      {children}
    </section>
  );
}
