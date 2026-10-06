import Link from "next/link";
import { TaskForm } from "@/components/TaskForm";
import { TaskList, TASK_SELECT, type TaskWithClient } from "@/components/TaskRow";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";

export default async function TasksPage({ searchParams }: PageProps<"/tasks">) {
  const { supabase } = await requireUser();
  const { t, l, lang } = await getT();
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "active";
  const type = typeof sp.type === "string" ? sp.type : "";

  let q = supabase.from("tasks").select(TASK_SELECT).order("due_date", { ascending: true }).limit(500);
  if (status === "active") q = q.neq("status", "done");
  else if (status !== "all") q = q.eq("status", status);
  if (type) q = q.eq("type", type);

  const [{ data }, { data: clients }] = await Promise.all([
    q,
    supabase.from("clients").select("id, display_name").order("display_name"),
  ]);

  const tabs = [
    { key: "active", label: t.openTasks },
    { key: "open", label: l.taskStatus.open },
    { key: "waiting", label: l.taskStatus.waiting },
    { key: "done", label: l.taskStatus.done },
    { key: "all", label: t.all },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="text-xl font-semibold">{t.tasks}</h1>

      <section className="card">
        <h2 className="border-b border-line px-4 py-2.5 text-sm font-semibold">{t.newTask}</h2>
        <TaskForm t={t} l={l} clients={clients ?? []} />
      </section>

      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={`/tasks?status=${tab.key}${type ? `&type=${type}` : ""}`}
            className={`btn-ghost ${status === tab.key ? "bg-brand-soft" : ""}`}
          >
            {tab.label}
          </Link>
        ))}
        <span className="mx-1 text-line">|</span>
        <Link href={`/tasks?status=${status}`} className={`btn-ghost ${!type ? "bg-brand-soft" : ""}`}>{t.all}</Link>
        {Object.entries(l.taskType).map(([k, v]) => (
          <Link key={k} href={`/tasks?status=${status}&type=${k}`} className={`btn-ghost ${type === k ? "bg-brand-soft" : ""}`}>
            {v}
          </Link>
        ))}
      </div>

      <section className="card overflow-hidden">
        <TaskList tasks={(data ?? []) as unknown as TaskWithClient[]} t={t} l={l} lang={lang} />
      </section>
    </div>
  );
}
