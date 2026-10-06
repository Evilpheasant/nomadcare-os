/** Date helpers working in Europe/Berlin calendar days (YYYY-MM-DD strings). */
export function todayISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date());
}

export function addDaysISO(iso: string, days: number) {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string) {
  return Math.round((Date.parse(toIso + "T12:00:00Z") - Date.parse(fromIso + "T12:00:00Z")) / 864e5);
}

/** Last day notice can be given: renewal date minus notice period. */
export function noticeDeadline(renewal: string | null, noticeDays: number | null) {
  if (!renewal || !noticeDays) return null;
  return addDaysISO(renewal, -noticeDays);
}
