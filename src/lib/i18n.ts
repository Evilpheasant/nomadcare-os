import { cookies } from "next/headers";

export type Lang = "de" | "en";

const dict = {
  en: {
    appName: "NomadCare OS",
    dashboard: "Dashboard",
    tasks: "Tasks",
    clients: "Clients",
    policies: "Policies",
    insurers: "Insurers",
    signOut: "Sign out",
    signIn: "Sign in",
    createAccount: "Create account",
    email: "Email",
    password: "Password",
    loginIntro: "Private back office. Only the owner can sign in.",
    checkEmail: "Check your inbox to confirm your address, then sign in.",
    today: "Today",
    overdue: "Overdue",
    waitingInsurer: "Waiting on insurers",
    waitingClient: "Waiting on clients",
    renewals90: "Renewals in the next 90 days",
    openTasks: "Open tasks",
    nothingHere: "Nothing here.",
    add: "Add",
    save: "Save",
    search: "Search",
    name: "Name",
    type: "Type",
    status: "Status",
    due: "Due",
    client: "Client",
    insurer: "Insurer",
    entity: "Entity",
    line: "Line",
    product: "Product",
    policyNumber: "Policy no.",
    renewal: "Renewal",
    notice: "Notice (days)",
    premium: "Premium",
    frequency: "Frequency",
    currency: "Currency",
    country: "Country",
    phone: "Phone",
    notes: "Notes",
    title: "Title",
    newTask: "New task",
    newClient: "New client",
    newPolicy: "New policy",
    newInsurer: "New insurer",
    addNote: "Add note",
    timeline: "Timeline",
    markDone: "Done",
    reopen: "Reopen",
    waitOn: "Waiting on",
    chaseEvery: "Chase every (days)",
    nextChase: "Next chase",
    estimate: "Estimate (min)",
    all: "All",
    person: "Person",
    company: "Company",
    kind: "Kind",
    priority: "Priority",
    chaseDue: "Chase due",
    daysLeft: "days",
    noticeDeadline: "Notice deadline",
  },
  de: {
    appName: "NomadCare OS",
    dashboard: "Übersicht",
    tasks: "Aufgaben",
    clients: "Kunden",
    policies: "Verträge",
    insurers: "Versicherer",
    signOut: "Abmelden",
    signIn: "Anmelden",
    createAccount: "Konto anlegen",
    email: "E-Mail",
    password: "Passwort",
    loginIntro: "Privates Backoffice. Nur der Inhaber kann sich anmelden.",
    checkEmail: "Bitte bestätigen Sie Ihre Adresse über den Link in Ihrem Posteingang und melden Sie sich dann an.",
    today: "Heute",
    overdue: "Überfällig",
    waitingInsurer: "Warten auf Versicherer",
    waitingClient: "Warten auf Kunden",
    renewals90: "Verlängerungen in den nächsten 90 Tagen",
    openTasks: "Offene Aufgaben",
    nothingHere: "Nichts vorhanden.",
    add: "Hinzufügen",
    save: "Speichern",
    search: "Suchen",
    name: "Name",
    type: "Art",
    status: "Status",
    due: "Fällig",
    client: "Kunde",
    insurer: "Versicherer",
    entity: "Gesellschaft",
    line: "Sparte",
    product: "Produkt",
    policyNumber: "Vertragsnr.",
    renewal: "Ablauf",
    notice: "Kündigungsfrist (Tage)",
    premium: "Beitrag",
    frequency: "Zahlweise",
    currency: "Währung",
    country: "Land",
    phone: "Telefon",
    notes: "Notizen",
    title: "Titel",
    newTask: "Neue Aufgabe",
    newClient: "Neuer Kunde",
    newPolicy: "Neuer Vertrag",
    newInsurer: "Neuer Versicherer",
    addNote: "Notiz hinzufügen",
    timeline: "Verlauf",
    markDone: "Erledigt",
    reopen: "Wieder öffnen",
    waitOn: "Wartet auf",
    chaseEvery: "Nachfassen alle (Tage)",
    nextChase: "Nächstes Nachfassen",
    estimate: "Aufwand (Min.)",
    all: "Alle",
    person: "Person",
    company: "Firma",
    kind: "Typ",
    priority: "Priorität",
    chaseDue: "Nachfassen fällig",
    daysLeft: "Tage",
    noticeDeadline: "Kündigungsstichtag",
  },
} as const;

export type Dict = (typeof dict)["en"];

export const labels = {
  en: {
    taskType: { quote: "Generate quote", follow_up: "Follow up client", chase_insurer: "Chase insurer", renewal: "Renewal", admin: "Admin", other: "Other" },
    taskStatus: { open: "Open", waiting: "Waiting", done: "Done" },
    waitingOn: { client: "Client", insurer: "Insurer", other: "Other" },
    priority: { low: "Low", normal: "Normal", high: "High" },
    clientStatus: { lead: "Lead", client: "Client", former: "Former" },
    policyStatus: { quote: "Quote", active: "Active", cancelled: "Cancelled", expired: "Expired" },
    frequency: { monthly: "Monthly", quarterly: "Quarterly", half_yearly: "Half-yearly", yearly: "Yearly", single: "Single" },
    activity: { note: "Note", email: "Email", call: "Call", meeting: "Meeting" },
  },
  de: {
    taskType: { quote: "Angebot erstellen", follow_up: "Kunde nachfassen", chase_insurer: "Versicherer nachfassen", renewal: "Verlängerung", admin: "Verwaltung", other: "Sonstiges" },
    taskStatus: { open: "Offen", waiting: "Wartet", done: "Erledigt" },
    waitingOn: { client: "Kunde", insurer: "Versicherer", other: "Sonstiges" },
    priority: { low: "Niedrig", normal: "Normal", high: "Hoch" },
    clientStatus: { lead: "Interessent", client: "Kunde", former: "Ehemalig" },
    policyStatus: { quote: "Angebot", active: "Aktiv", cancelled: "Gekündigt", expired: "Abgelaufen" },
    frequency: { monthly: "Monatlich", quarterly: "Vierteljährlich", half_yearly: "Halbjährlich", yearly: "Jährlich", single: "Einmalig" },
    activity: { note: "Notiz", email: "E-Mail", call: "Anruf", meeting: "Termin" },
  },
} as const;

export type Labels = (typeof labels)["en"];

export const LINES = ["ipmi", "life", "travel", "property", "liability", "d_and_o", "pi", "motor", "legal", "pet", "bond", "pension", "other"] as const;
export const lineLabels: Record<Lang, Record<(typeof LINES)[number], string>> = {
  en: { ipmi: "IPMI / health", life: "Life", travel: "Travel", property: "Property", liability: "Liability", d_and_o: "D&O", pi: "PI / E&O", motor: "Motor", legal: "Legal expenses", pet: "Pet", bond: "Bond / guarantee", pension: "Pension", other: "Other" },
  de: { ipmi: "IPMI / Kranken", life: "Leben", travel: "Reise", property: "Sach", liability: "Haftpflicht", d_and_o: "D&O", pi: "Vermögensschaden", motor: "Kfz", legal: "Rechtsschutz", pet: "Tier", bond: "Bürgschaft / Kaution", pension: "Altersvorsorge", other: "Sonstiges" },
};

export async function getLang(): Promise<Lang> {
  const c = await cookies();
  return c.get("lang")?.value === "en" ? "en" : "de";
}

export async function getT() {
  const lang = await getLang();
  return { lang, t: dict[lang] as Dict, l: labels[lang] as Labels, lines: lineLabels[lang] };
}

export function fmtDate(d: string | null | undefined, lang: Lang) {
  if (!d) return "—";
  return new Date(d.length === 10 ? d + "T00:00:00" : d).toLocaleDateString(lang === "de" ? "de-DE" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function fmtMoney(n: number | null | undefined, currency: string, lang: Lang) {
  if (n == null) return "—";
  return new Intl.NumberFormat(lang === "de" ? "de-DE" : "en-GB", { style: "currency", currency }).format(n);
}
