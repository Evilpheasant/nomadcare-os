import { createPolicy } from "@/app/actions";
import { LINES, type Dict, type Labels } from "@/lib/i18n";

export function PolicyForm({
  t,
  l,
  lines,
  clientId,
  insurers,
  entities,
}: {
  t: Dict;
  l: Labels;
  lines: Record<string, string>;
  clientId: string;
  insurers: { id: string; name: string }[];
  entities: { id: string; code: string; name: string }[];
}) {
  return (
    <form action={createPolicy} className="grid grid-cols-2 gap-3 p-4 md:grid-cols-6">
      <input type="hidden" name="client_id" value={clientId} />
      <label>
        <span className="label">{t.line}</span>
        <select name="line" className="field" defaultValue="ipmi">
          {LINES.map((k) => (
            <option key={k} value={k}>{lines[k]}</option>
          ))}
        </select>
      </label>
      <label>
        <span className="label">{t.insurer}</span>
        <select name="insurer_id" className="field" defaultValue="">
          <option value="">—</option>
          {insurers.map((i) => (
            <option key={i.id} value={i.id}>{i.name}</option>
          ))}
        </select>
      </label>
      <label>
        <span className="label">{t.product}</span>
        <input name="product" className="field" />
      </label>
      <label>
        <span className="label">{t.policyNumber}</span>
        <input name="policy_number" className="field" />
      </label>
      <label>
        <span className="label">{t.status}</span>
        <select name="status" className="field" defaultValue="active">
          {Object.entries(l.policyStatus).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </label>
      <label>
        <span className="label">{t.entity}</span>
        <select name="entity_id" className="field" defaultValue={entities.find((e) => e.code === "DE")?.id}>
          {entities.map((e) => (
            <option key={e.id} value={e.id}>{e.code}</option>
          ))}
        </select>
      </label>
      <label>
        <span className="label">Start</span>
        <input name="start_date" type="date" className="field" />
      </label>
      <label>
        <span className="label">{t.renewal}</span>
        <input name="renewal_date" type="date" className="field" />
      </label>
      <label>
        <span className="label">{t.notice}</span>
        <input name="notice_period_days" type="number" min={0} className="field" placeholder="90" />
      </label>
      <label>
        <span className="label">{t.premium}</span>
        <input name="premium" inputMode="decimal" className="field" />
      </label>
      <label>
        <span className="label">{t.frequency}</span>
        <select name="premium_frequency" className="field" defaultValue="yearly">
          {Object.entries(l.frequency).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </label>
      <label>
        <span className="label">{t.currency}</span>
        <select name="currency" className="field" defaultValue="EUR">
          {["EUR", "GBP", "USD", "CHF", "IDR"].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <div className="col-span-2 flex items-end md:col-span-6">
        <button className="btn">{t.add}</button>
      </div>
    </form>
  );
}
