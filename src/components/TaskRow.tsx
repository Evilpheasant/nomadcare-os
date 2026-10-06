import Link from "next/link";
import { completeTask, logChase, reopenTask, setWaiting } from "@/app/actions";
import { daysBetween, todayISO } from "@/lib/dates";
import { fmtDate, type Dict, type Labels, type Lang } from "@/lib/i18n";

export type TaskWithClient = {
  id: string;
  title: string;
  type: keyof Labels["taskType"];
  status: keyof Labels["taskStatus"];
  waiting_on: keyof Labels["waitingOn"] | null;
  priority: keyof Labels["priority"];
  due_date: string | null;
  next_chase_date: string | null;
  estimated_minutes: number | null;
  client_id: string | null;
  clients: { display_name: string } | null;
};

export const TASK_SELECT =
  "id, title, type, status, waiting_on, priority, due_date, next_chase_date, estimated_minutes, client_id, clients(display_name)";

export function TaskRow({ task, t, l, lang, showClient = true }: { task: TaskWithClient; t: Dict; l: Labels; lang: Lang; showClient?: boolean }) {
  const today = todayISO();
  const overdue = task.status !== "done" && task.due_date && task.due_date < today;
  const chaseDue = task.status === "waiting" && task.next_chase_date && task.next_chase_date <= today;
  return (
    <li className="flex flex-col gap-2 border-b border-line px-4 py-3 last:border-b-0 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-sm font-medium ${task.status === "done" ? "text-muted line-through" : ""}`}>{task.title}</span>
          <span className="rounded bg-brand-soft px-1.5 py-0.5 text-[11px] text-brand">{l.taskType[task.type]}</span>
          {task.priority === "high" && <span className="rounded bg-danger-soft px-1.5 py-0.5 text-[11px] text-danger">{l.priority.high}</span>}
          {task.status === "waiting" && task.waiting_on && (
            <span className="rounded bg-warn-soft px-1.5 py-0.5 text-[11px] text-warn">
              {t.waitOn}: {l.waitingOn[task.waiting_on]}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted">
          {showClient && task.clients && task.client_id && (
            <Link className="hover:underline" href={`/clients/${task.client_id}`}>{task.clients.display_name}</Link>
          )}
          <span className={overdue ? "font-medium text-danger" : ""}>
            {t.due}: {fmtDate(task.due_date, lang)}
            {overdue && task.due_date ? ` (${-daysBetween(today, task.due_date)} ${t.daysLeft})` : ""}
          </span>
          {task.status === "waiting" && (
            <span className={chaseDue ? "font-medium text-warn" : ""}>
              {chaseDue ? t.chaseDue : t.nextChase}: {fmtDate(task.next_chase_date, lang)}
            </span>
          )}
          {task.estimated_minutes ? <span>{task.estimated_minutes} min</span> : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {task.status === "done" ? (
          <form action={reopenTask}>
            <input type="hidden" name="id" value={task.id} />
            <button className="btn-ghost">{t.reopen}</button>
          </form>
        ) : (
          <>
            {task.status === "waiting" ? (
              <form action={logChase}>
                <input type="hidden" name="id" value={task.id} />
                <button className="btn-ghost" title="Log a chase today and set the next one">↻ Chase</button>
              </form>
            ) : (
              <form action={setWaiting} className="flex items-center gap-1">
                <input type="hidden" name="id" value={task.id} />
                <select name="waiting_on" className="field !w-auto !py-1 text-xs" defaultValue="insurer" aria-label={t.waitOn}>
                  <option value="insurer">{l.waitingOn.insurer}</option>
                  <option value="client">{l.waitingOn.client}</option>
                  <option value="other">{l.waitingOn.other}</option>
                </select>
                <input name="chase_every_days" type="number" min={1} defaultValue={3} className="field !w-14 !py-1 text-xs" aria-label={t.chaseEvery} />
                <button className="btn-ghost">{t.waitOn}</button>
              </form>
            )}
            <form action={completeTask}>
              <input type="hidden" name="id" value={task.id} />
              <button className="btn !px-2.5 !py-1 !text-xs">✓ {t.markDone}</button>
            </form>
          </>
        )}
      </div>
    </li>
  );
}

export function TaskList({ tasks, t, l, lang, showClient }: { tasks: TaskWithClient[]; t: Dict; l: Labels; lang: Lang; showClient?: boolean }) {
  if (!tasks.length) return <p className="px-4 py-3 text-sm text-muted">{t.nothingHere}</p>;
  return (
    <ul>
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} t={t} l={l} lang={lang} showClient={showClient} />
      ))}
    </ul>
  );
}
