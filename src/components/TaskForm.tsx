import { createTask } from "@/app/actions";
import { todayISO } from "@/lib/dates";
import type { Dict, Labels } from "@/lib/i18n";

export function TaskForm({
  t,
  l,
  clients,
  clientId,
}: {
  t: Dict;
  l: Labels;
  clients?: { id: string; display_name: string }[];
  clientId?: string;
}) {
  return (
    <form action={createTask} className="grid grid-cols-2 gap-3 p-4 md:grid-cols-6">
      <label className="col-span-2 md:col-span-2">
        <span className="label">{t.title}</span>
        <input name="title" className="field" required placeholder="e.g. Chase Allianz for D&O quote" />
      </label>
      <label>
        <span className="label">{t.type}</span>
        <select name="type" className="field" defaultValue="follow_up">
          {Object.entries(l.taskType).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </label>
      {clientId ? (
        <input type="hidden" name="client_id" value={clientId} />
      ) : (
        <label>
          <span className="label">{t.client}</span>
          <select name="client_id" className="field" defaultValue="">
            <option value="">—</option>
            {clients?.map((c) => (
              <option key={c.id} value={c.id}>{c.display_name}</option>
            ))}
          </select>
        </label>
      )}
      <label>
        <span className="label">{t.due}</span>
        <input name="due_date" type="date" className="field" defaultValue={todayISO()} />
      </label>
      <label>
        <span className="label">{t.estimate}</span>
        <input name="estimated_minutes" type="number" min={5} step={5} defaultValue={30} className="field" />
      </label>
      <label>
        <span className="label">{t.priority}</span>
        <select name="priority" className="field" defaultValue="normal">
          {Object.entries(l.priority).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </label>
      <label>
        <span className="label">{t.waitOn}</span>
        <select name="waiting_on" className="field" defaultValue="">
          <option value="">—</option>
          {Object.entries(l.waitingOn).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </label>
      <label>
        <span className="label">{t.chaseEvery}</span>
        <input name="chase_every_days" type="number" min={1} placeholder="3" className="field" />
      </label>
      <div className="col-span-2 flex items-end md:col-span-1">
        <button className="btn w-full">{t.add}</button>
      </div>
    </form>
  );
}
