import { syncNow } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { googleConfigured } from "@/lib/google";
import { fmtDate, getT } from "@/lib/i18n";
import { adminConfigured } from "@/lib/supabase/admin";

const MESSAGES: Record<string, string> = {
  connected: "Google connected. The first import has started and runs in slices every 15 minutes.",
  "not-configured": "Google access isn't set up on the server yet (see the checklist below).",
  "no-refresh": "Google didn't return offline access. Remove NomadCare OS at myaccount.google.com → Security → Third-party access, then connect again.",
  error: "Connecting Google failed. Please try again.",
};

export default async function SettingsPage({ searchParams }: PageProps<"/settings">) {
  const { supabase } = await requireUser();
  const { lang } = await getT();
  const sp = await searchParams;
  const { data } = await supabase.rpc("my_google_status");
  const status = (data as { google_email: string; backfill_done: boolean; last_sync_at: string | null; last_sync_result: Record<string, unknown> | null }[] | null)?.[0];
  const ready = googleConfigured() && adminConfigured();
  const r = status?.last_sync_result ?? null;
  const de = lang === "de";

  const [{ count: activities }, { count: documents }, { count: pending }] = await Promise.all([
    supabase.from("activities").select("id", { count: "exact", head: true }).eq("source", "gmail"),
    supabase.from("documents").select("id", { count: "exact", head: true }),
    supabase.from("review_items").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold">{de ? "Einstellungen" : "Settings"}</h1>

      {typeof sp.google === "string" && MESSAGES[sp.google] && (
        <p className="rounded-md bg-brand-soft px-3 py-2 text-sm text-brand">{MESSAGES[sp.google]}</p>
      )}
      {sp.sync === "started" && (
        <p className="rounded-md bg-brand-soft px-3 py-2 text-sm text-brand">{de ? "Synchronisierung gestartet. Seite in ein paar Minuten neu laden." : "Sync started. Reload this page in a few minutes."}</p>
      )}

      <section className="card p-5">
        <h2 className="text-sm font-semibold">Gmail</h2>
        {status ? (
          <div className="mt-3 space-y-2 text-sm">
            <p>
              {de ? "Verbunden mit" : "Connected to"} <strong>{status.google_email}</strong>
            </p>
            <p className="text-muted">
              {de ? "Letzte Synchronisierung" : "Last sync"}: {status.last_sync_at ? `${fmtDate(status.last_sync_at, lang)} ${new Date(status.last_sync_at).toLocaleTimeString(de ? "de-DE" : "en-GB", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit" })}` : "—"}
              {" · "}
              {status.backfill_done ? (de ? "24 Monate vollständig importiert" : "24 months fully imported") : de ? "Import der letzten 24 Monate läuft" : "Importing the last 24 months"}
            </p>
            {r && r.ok === false && <p className="rounded-md bg-danger-soft px-3 py-2 text-danger">{String(r.error)}</p>}
            {r && r.ok !== false && (
              <p className="text-xs text-muted">
                {de ? "Letzter Lauf" : "Last run"}: {String(r.linked ?? 0)} {de ? "verknüpft" : "linked"}, {String(r.documents ?? 0)} {de ? "Dokumente" : "documents"}, {String(r.review ?? 0)} {de ? "zur Prüfung" : "for review"}, {String(r.health_docs_skipped ?? 0)} {de ? "Gesundheitsthreads ohne Anhänge" : "health threads (attachments skipped)"}
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <form action={syncNow}>
                <button className="btn">{de ? "Jetzt synchronisieren" : "Sync now"}</button>
              </form>
              <a className="btn-ghost" href="/api/google/connect">{de ? "Neu verbinden" : "Reconnect"}</a>
            </div>
          </div>
        ) : ready ? (
          <div className="mt-3 space-y-3 text-sm">
            <p>{de ? "Gmail ist noch nicht verbunden." : "Gmail isn't connected yet."}</p>
            <a className="btn" href="/api/google/connect">{de ? "Mit Google verbinden" : "Connect Google"}</a>
          </div>
        ) : (
          <div className="mt-3 space-y-2 text-sm">
            <p className="text-muted">{de ? "Auf dem Server fehlt noch:" : "Still missing on the server:"}</p>
            <ul className="list-disc pl-5">
              {!process.env.GOOGLE_CLIENT_ID && <li>GOOGLE_CLIENT_ID</li>}
              {!process.env.GOOGLE_CLIENT_SECRET && <li>GOOGLE_CLIENT_SECRET</li>}
              {!process.env.APP_URL && <li>APP_URL</li>}
              {!adminConfigured() && <li>SUPABASE_SERVICE_ROLE_KEY</li>}
            </ul>
          </div>
        )}
        <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-line pt-4 text-sm">
          <div>
            <dt className="text-xs text-muted">{de ? "E-Mail-Verläufe" : "Email threads"}</dt>
            <dd className="text-lg font-semibold">{activities ?? 0}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">{de ? "Dokumente" : "Documents"}</dt>
            <dd className="text-lg font-semibold">{documents ?? 0}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">{de ? "Zu prüfen" : "To review"}</dt>
            <dd className="text-lg font-semibold">{pending ?? 0}</dd>
          </div>
        </dl>
      </section>

      <section className="card p-5 text-sm">
        <h2 className="text-sm font-semibold">{de ? "Was die Synchronisierung tut" : "What the sync does"}</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
          <li>{de ? "Liest Gmail nur (keine E-Mails werden gesendet, geändert oder gelöscht)." : "Reads Gmail only: nothing is ever sent, changed or deleted."}</li>
          <li>{de ? "Speichert pro Verlauf Betreff, Datum und Link – keine E-Mail-Texte." : "Stores subject, date and a link per thread, never email text."}</li>
          <li>{de ? "Gesundheitsbezogene Verläufe (IPMI, Leben, medizinisch): neutraler Betreff, Anhänge werden nicht kopiert." : "Health-related threads (IPMI, life, medical): neutral subject, attachments not copied."}</li>
          <li>{de ? "Kopiert PDF/Word/Excel-Anhänge von Kunden-Verläufen in den privaten Speicher." : "Copies PDF, Word and Excel attachments on client threads into private storage."}</li>
          <li>{de ? "Unbekannte Korrespondenzpartner landen in „Prüfen“." : "Unknown people you write to land in Review."}</li>
        </ul>
      </section>
    </div>
  );
}
