import "server-only";
import { accessTokenFrom, gmail, type GmailMessage, type GmailPart, type GmailThread } from "@/lib/google";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Gmail → NomadCare OS sync.
 *
 * Rules (agreed with Duncan):
 * - 24 months of history, then everything new.
 * - Email BODIES are never stored. Each thread becomes one timeline entry (subject, date, link to Gmail).
 * - Health-related threads (IPMI, life, medical) are stored with a neutral subject and their attachments are NOT copied.
 * - Other attachments on client threads (PDF, Word, Excel) are copied into private storage.
 * - People Duncan wrote to who match no client or insurer go to the review queue, never straight in.
 * - Nothing is ever sent, changed or deleted in Gmail (read-only scope).
 */

const BACKFILL_MONTHS = 24;
const THREADS_PER_RUN = 150;
const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
const DOC_EXT = /\.(pdf|docx?|xlsx?|odt|ods|rtf|msg|eml)$/i;

const GENERIC_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "gmx.de", "gmx.net", "gmx.at", "gmx.ch", "web.de", "t-online.de", "outlook.com", "outlook.de",
  "hotmail.com", "hotmail.de", "hotmail.co.uk", "live.com", "live.de", "yahoo.com", "yahoo.de", "yahoo.co.uk", "icloud.com",
  "me.com", "mac.com", "aol.com", "aol.de", "proton.me", "protonmail.com", "freenet.de", "mail.de", "posteo.de", "gmx.com",
  "msn.com", "btinternet.com", "arcor.de", "online.de", "vodafone.de", "mail.ru", "yandex.ru", "qq.com",
]);

const NOISE_LOCAL = /^(no-?reply|do-?not-?reply|donotreply|mailer-daemon|postmaster|notifications?|newsletter|news|info-?mail|bounce|marketing|support|system|automated|alerts?)([+.-]|$)/i;
const NOISE_DOMAINS = /(google\.com|googlemail\.com|github\.com|supabase\.(io|com)|railway\.app|linkedin\.com|facebook|instagram|calendly\.com|zoom\.us|docusign|echosign|adobesign|mailchimp|hubspot|odoo\.com|amazon\.|paypal\.|stripe\.com|apple\.com|microsoft\.com|slack\.com|notion\.so|webflow\.com|canva\.com)$/i;

const HEALTH_DOMAINS = /(bupa|cigna|cignahealthcare|allianzcare|april\.com|now-health|imglobal|william-russell|globality|foyerglobalhealth|passportcard|genki\.|safetywing|aetna|msh-intl|hansemerkur|debeka|dkv\.com|barmenia|canadalife|insurednomads|squarelife|expatinsurance)/i;
const HEALTH_WORDS = /(ipmi|health|medical|medic|kranken|gesundheit|krankheit|pkv|\bbu\b|berufsunf|pflege|lebensvers|risikoleben|\blife\b|leben|dental|zahn|vorerkrank|arzt|diagnos|hospital|klinik|therapie|anamnese)/i;

type Ctx = {
  ownerId: string;
  ownAddresses: Set<string>;
  labelNames: Map<string, string>;
  clientByLabel: Map<string, string>;
  clientByEmail: Map<string, string>;
  clientByDomain: Map<string, string>;
  healthClients: Set<string>;
  insurerByEmail: Map<string, string>;
  insurerByDomain: Array<[string, string]>;
  stats: Record<string, number>;
};

type Addr = { name: string; email: string };

function parseAddresses(value: string | undefined): Addr[] {
  if (!value) return [];
  const out: Addr[] = [];
  for (const raw of value.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)) {
    const m = raw.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/) ?? raw.match(/^\s*()([^\s<>]+@[^\s<>]+)\s*$/);
    if (m) out.push({ name: m[1].trim(), email: m[2].trim().toLowerCase() });
  }
  return out;
}

const domainOf = (email: string) => email.split("@")[1] ?? "";
const header = (part: GmailPart | undefined, name: string) =>
  part?.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value;

function isNoise(a: Addr) {
  const [local, domain] = a.email.split("@");
  return NOISE_LOCAL.test(local ?? "") || NOISE_DOMAINS.test(domain ?? "");
}

function walkParts(part: GmailPart | undefined, out: GmailPart[] = []) {
  if (!part) return out;
  if (part.filename && part.body?.attachmentId) out.push(part);
  for (const p of part.parts ?? []) walkParts(p, out);
  return out;
}

function docType(filename: string) {
  const f = filename.toLowerCase();
  if (/(police|policy|versicherungsschein|nachtrag|certificate|zertifikat)/.test(f)) return "policy";
  if (/(angebot|offer|quote|quotation|vorschlag|proposal)/.test(f)) return "offer";
  if (/(antrag|application)/.test(f)) return "application";
  if (/(maklervertrag|maklervollmacht|vollmacht|mandat|broker ?agreement|toba)/.test(f)) return "mandate";
  if (/(rechnung|invoice|beitragsrechnung)/.test(f)) return "invoice";
  if (/(avb|bedingungen|terms|wording|ipid|produktinformation)/.test(f)) return "terms";
  if (/(abrechnung|statement|provision|courtage|commission)/.test(f)) return "statement";
  if (/(schaden|claim)/.test(f)) return "claim";
  return "other";
}

async function loadContext(ownerId: string, googleEmail: string | null, accessLabels: Map<string, string>): Promise<Ctx> {
  const db = createAdminClient();
  const [{ data: clients }, { data: contacts }, { data: insurers }, { data: policies }] = await Promise.all([
    db.from("clients").select("id, email, email_domains, gmail_labels, tags").eq("owner_id", ownerId),
    db.from("contacts").select("email, client_id, insurer_id").eq("owner_id", ownerId).not("email", "is", null),
    db.from("insurers").select("id, email, domains").eq("owner_id", ownerId),
    db.from("policies").select("client_id, line").eq("owner_id", ownerId),
  ]);

  const ctx: Ctx = {
    ownerId,
    ownAddresses: new Set(["duncan@nomadcare.org", ...(googleEmail ? [googleEmail.toLowerCase()] : [])]),
    labelNames: accessLabels,
    clientByLabel: new Map(),
    clientByEmail: new Map(),
    clientByDomain: new Map(),
    healthClients: new Set(),
    insurerByEmail: new Map(),
    insurerByDomain: [],
    stats: {},
  };
  for (const c of clients ?? []) {
    for (const l of c.gmail_labels ?? []) ctx.clientByLabel.set(l, c.id);
    if (c.email) ctx.clientByEmail.set(c.email.toLowerCase(), c.id);
    for (const d of c.email_domains ?? []) if (!GENERIC_DOMAINS.has(d)) ctx.clientByDomain.set(d.toLowerCase(), c.id);
    if ((c.gmail_labels ?? []).some((l: string) => /ipmi/i.test(l))) ctx.healthClients.add(c.id);
  }
  for (const p of policies ?? []) if (["ipmi", "life", "pension"].includes(p.line)) ctx.healthClients.add(p.client_id);
  for (const k of contacts ?? []) {
    const e = (k.email as string).toLowerCase();
    if (k.client_id) ctx.clientByEmail.set(e, k.client_id);
    else if (k.insurer_id) ctx.insurerByEmail.set(e, k.insurer_id);
  }
  for (const i of insurers ?? []) {
    if (i.email) ctx.insurerByEmail.set(i.email.toLowerCase(), i.id);
    for (const d of i.domains ?? []) ctx.insurerByDomain.push([d.toLowerCase(), i.id]);
  }
  return ctx;
}

function matchInsurer(ctx: Ctx, addrs: Addr[]) {
  for (const a of addrs) {
    const byEmail = ctx.insurerByEmail.get(a.email);
    if (byEmail) return byEmail;
    const d = domainOf(a.email);
    const hit = ctx.insurerByDomain.find(([dom]) => d === dom || d.endsWith(`.${dom}`));
    if (hit) return hit[1];
  }
  return null;
}

function matchClient(ctx: Ctx, labelIds: string[], addrs: Addr[]) {
  for (const id of labelIds) {
    const name = ctx.labelNames.get(id);
    const c = name ? ctx.clientByLabel.get(name) : undefined;
    if (c) return c;
  }
  for (const a of addrs) {
    const c = ctx.clientByEmail.get(a.email);
    if (c) return c;
  }
  for (const a of addrs) {
    const d = domainOf(a.email);
    if (GENERIC_DOMAINS.has(d)) continue;
    const c = ctx.clientByDomain.get(d);
    if (c) return c;
  }
  return null;
}

async function processThread(ctx: Ctx, api: ReturnType<typeof gmail>, threadId: string) {
  const db = createAdminClient();
  const thread = await api.get<GmailThread>(`threads/${threadId}`, {
    format: "metadata",
    metadataHeaders: ["From", "To", "Cc", "Subject", "Date", "Content-Type"],
  });
  const msgs = (thread.messages ?? []).filter((m) => !(m.labelIds ?? []).includes("DRAFT"));
  if (!msgs.length) return;
  const labelIds = [...new Set(msgs.flatMap((m) => m.labelIds ?? []))];
  if (labelIds.includes("SPAM") || labelIds.includes("TRASH") || labelIds.includes("CATEGORY_PROMOTIONS") || labelIds.includes("CATEGORY_SOCIAL")) {
    ctx.stats.skipped = (ctx.stats.skipped ?? 0) + 1;
    return;
  }

  const first = msgs[0];
  const last = msgs[msgs.length - 1];
  const subject = header(first.payload, "Subject")?.trim() || "(no subject)";
  const all: Addr[] = msgs.flatMap((m) => [
    ...parseAddresses(header(m.payload, "From")),
    ...parseAddresses(header(m.payload, "To")),
    ...parseAddresses(header(m.payload, "Cc")),
  ]);
  const others = all.filter((a) => !ctx.ownAddresses.has(a.email) && !a.email.endsWith("@nomadcare.org"));
  const uniqueOthers = [...new Map(others.map((a) => [a.email, a])).values()];
  const iWrote = msgs.some((m) => (m.labelIds ?? []).includes("SENT"));

  const clientId = matchClient(ctx, labelIds, uniqueOthers);
  const insurerId = matchInsurer(ctx, uniqueOthers);
  const labelText = labelIds.map((id) => ctx.labelNames.get(id) ?? "").join(" ");
  const health =
    (clientId !== null && ctx.healthClients.has(clientId)) ||
    HEALTH_WORDS.test(subject) ||
    HEALTH_WORDS.test(labelText) ||
    uniqueOthers.some((a) => HEALTH_DOMAINS.test(domainOf(a.email)));

  const occurredAt = new Date(Number(last.internalDate ?? Date.now())).toISOString();
  const viewUrl = `https://mail.google.com/mail/?authuser=duncan@nomadcare.org#all/${thread.id}`;

  // 1. Timeline entry (one per thread, kept up to date)
  if (clientId || insurerId) {
    const summary = health ? "Email (health-related – details in Gmail)" : subject.slice(0, 300);
    const { data: existing } = await db
      .from("activities")
      .select("id")
      .eq("owner_id", ctx.ownerId)
      .eq("source", "gmail")
      .eq("external_id", thread.id)
      .maybeSingle();
    const row = {
      owner_id: ctx.ownerId,
      source: "gmail",
      external_id: thread.id,
      external_url: viewUrl,
      kind: "email",
      summary,
      occurred_at: occurredAt,
      client_id: clientId,
      insurer_id: insurerId,
    };
    if (existing) await db.from("activities").update(row).eq("id", existing.id);
    else await db.from("activities").insert(row);
    if (clientId) {
      await db.from("clients").update({ last_contact_at: occurredAt }).eq("id", clientId).or(`last_contact_at.is.null,last_contact_at.lt.${occurredAt}`);
    }
    ctx.stats.linked = (ctx.stats.linked ?? 0) + 1;
  } else if (iWrote) {
    // 2. Unknown people Duncan corresponds with → review queue
    for (const a of uniqueOthers.filter((x) => !isNoise(x)).slice(0, 3)) {
      const d = domainOf(a.email);
      const generic = GENERIC_DOMAINS.has(d);
      const name = a.name || (generic ? a.email.split("@")[0] : d);
      const { error } = await db.from("review_items").insert({
        owner_id: ctx.ownerId,
        kind: "new_contact",
        title: a.name ? `${a.name} <${a.email}>` : a.email,
        detail: health ? "Health-related thread" : subject.slice(0, 300),
        suggested: { client: { display_name: name, email: a.email, kind: generic ? "person" : "company", status: "lead" } },
        source: "gmail",
        external_id: a.email,
        external_url: viewUrl,
        found_at: occurredAt,
      });
      if (!error) ctx.stats.review = (ctx.stats.review ?? 0) + 1;
    }
    ctx.stats.unmatched = (ctx.stats.unmatched ?? 0) + 1;
  } else {
    ctx.stats.ignored = (ctx.stats.ignored ?? 0) + 1;
  }

  // 3. Copy non-health attachments on client threads
  const hasAttachments = msgs.some((m) => /multipart\/mixed/i.test(header(m.payload, "Content-Type") ?? m.payload?.mimeType ?? ""));
  if (clientId && !health && hasAttachments) {
    await copyAttachments(ctx, api, thread.id, clientId, insurerId);
  } else if (clientId && health && hasAttachments) {
    ctx.stats.health_docs_skipped = (ctx.stats.health_docs_skipped ?? 0) + 1;
  }
}

async function copyAttachments(ctx: Ctx, api: ReturnType<typeof gmail>, threadId: string, clientId: string, insurerId: string | null) {
  const db = createAdminClient();
  const full = await api.get<GmailThread>(`threads/${threadId}`, { format: "full" });
  for (const m of full.messages ?? []) {
    for (const part of walkParts(m.payload)) {
      const filename = part.filename!;
      const size = part.body?.size ?? 0;
      if (!DOC_EXT.test(filename) || size > MAX_ATTACHMENT_BYTES || HEALTH_WORDS.test(filename)) continue;
      const externalId = `${m.id}:${part.partId ?? filename}`;
      const { data: exists } = await db
        .from("documents")
        .select("id")
        .eq("owner_id", ctx.ownerId)
        .eq("source", "gmail")
        .eq("external_id", externalId)
        .maybeSingle();
      if (exists) continue;

      const att = await api.get<{ data: string; size: number }>(`messages/${m.id}/attachments/${part.body!.attachmentId}`);
      const bytes = Buffer.from(att.data.replace(/-/g, "+").replace(/_/g, "/"), "base64");
      const safe = filename.replace(/[^\w.\- ()äöüÄÖÜß]/g, "_").slice(-120);
      const path = `${ctx.ownerId}/${clientId}/${m.id}-${part.partId ?? "0"}-${safe}`;
      const up = await db.storage.from("documents").upload(path, bytes, {
        contentType: part.mimeType || "application/octet-stream",
        upsert: true,
      });
      if (up.error) {
        ctx.stats.doc_errors = (ctx.stats.doc_errors ?? 0) + 1;
        continue;
      }
      await db.from("documents").insert({
        owner_id: ctx.ownerId,
        client_id: clientId,
        insurer_id: insurerId,
        filename,
        doc_type: docType(filename),
        mime_type: part.mimeType ?? null,
        doc_date: new Date(Number(m.internalDate ?? Date.now())).toISOString().slice(0, 10),
        source: "gmail",
        external_id: externalId,
        external_url: `https://mail.google.com/mail/?authuser=duncan@nomadcare.org#all/${threadId}`,
        storage_path: path,
        size_bytes: bytes.length,
      });
      ctx.stats.documents = (ctx.stats.documents ?? 0) + 1;
    }
  }
}

function backfillQuery() {
  const since = new Date();
  since.setMonth(since.getMonth() - BACKFILL_MONTHS);
  const d = `${since.getFullYear()}/${since.getMonth() + 1}/${since.getDate()}`;
  return `after:${d} -in:chats -in:spam -in:trash -category:promotions -category:social`;
}

/** One sync run for one owner: continues the 24-month backfill, then picks up anything new. */
export async function runSync(ownerId: string) {
  const db = createAdminClient();
  const { data: conn } = await db.from("google_connections").select("*").eq("owner_id", ownerId).maybeSingle();
  if (!conn) return { ok: false, error: "Google not connected" };

  // Only one run at a time per owner (the scheduler and "Sync now" can overlap).
  const nowIso = new Date().toISOString();
  const { data: locked } = await db
    .from("google_connections")
    .update({ sync_lock_until: new Date(Date.now() + 15 * 60_000).toISOString() })
    .eq("owner_id", ownerId)
    .or(`sync_lock_until.is.null,sync_lock_until.lt.${nowIso}`)
    .select("owner_id");
  if (!locked?.length) return { ok: false, error: "A sync is already running" };

  const started = Date.now();
  const result: Record<string, unknown> = {};
  try {
    const token = await accessTokenFrom(conn.refresh_token);
    const api = gmail(token);
    const { labels } = await api.get<{ labels: { id: string; name: string }[] }>("labels");
    const ctx = await loadContext(ownerId, conn.google_email, new Map(labels.map((l) => [l.id, l.name])));

    // Incremental first (cheap): everything since the last run, minus one hour overlap.
    if (conn.last_sync_at) {
      const since = Math.floor(new Date(conn.last_sync_at).getTime() / 1000) - 3600;
      let pageToken: string | undefined;
      do {
        const page = await api.get<{ threads?: { id: string }[]; nextPageToken?: string }>("threads", {
          q: `after:${since} -in:chats -in:spam -in:trash -category:promotions -category:social`,
          maxResults: "100",
          ...(pageToken ? { pageToken } : {}),
        });
        for (const t of page.threads ?? []) await processThread(ctx, api, t.id);
        pageToken = page.nextPageToken;
      } while (pageToken);
    }

    // Backfill, a bounded slice per run.
    let backfillToken: string | null = conn.backfill_page_token;
    let backfillDone: boolean = conn.backfill_done;
    let processed = 0;
    while (!backfillDone && processed < THREADS_PER_RUN) {
      const page = await api.get<{ threads?: { id: string }[]; nextPageToken?: string }>("threads", {
        q: backfillQuery(),
        maxResults: "50",
        ...(backfillToken ? { pageToken: backfillToken } : {}),
      });
      for (const t of page.threads ?? []) {
        await processThread(ctx, api, t.id);
        processed++;
      }
      backfillToken = page.nextPageToken ?? null;
      if (!backfillToken) backfillDone = true;
      // Save progress after every page so a crash never repeats work.
      await db.from("google_connections").update({ backfill_page_token: backfillToken, backfill_done: backfillDone }).eq("owner_id", ownerId);
    }

    Object.assign(result, ctx.stats, { backfill_done: backfillDone, seconds: Math.round((Date.now() - started) / 1000) });
    await db
      .from("google_connections")
      .update({ last_sync_at: new Date(started).toISOString(), last_sync_result: { ok: true, ...result }, updated_at: new Date().toISOString(), sync_lock_until: null })
      .eq("owner_id", ownerId);
    return { ok: true, ...result };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    await db
      .from("google_connections")
      .update({ last_sync_result: { ok: false, error: error.slice(0, 500), ...result }, updated_at: new Date().toISOString(), sync_lock_until: null })
      .eq("owner_id", ownerId);
    return { ok: false, error };
  }
}

/** Sync every connected owner (called by the scheduler). */
export async function runSyncAll() {
  const db = createAdminClient();
  const { data } = await db.from("google_connections").select("owner_id");
  const out: Record<string, unknown> = {};
  for (const r of data ?? []) out[r.owner_id] = await runSync(r.owner_id);
  return out;
}

export type { GmailMessage };
