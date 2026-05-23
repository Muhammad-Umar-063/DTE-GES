// Tiny relative-time formatter. "2 hours ago", "3 days ago", etc.
// Used in engagement tables and the recent-activity feed.

const UNITS: Array<[number, Intl.RelativeTimeFormatUnit]> = [
  [60, "second"],
  [60, "minute"],
  [24, "hour"],
  [7, "day"],
  [4.34812, "week"],
  [12, "month"],
  [Number.POSITIVE_INFINITY, "year"],
];

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

export function relativeTime(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  let delta = (date.getTime() - Date.now()) / 1000; // seconds; negative for past

  for (const [div, unit] of UNITS) {
    if (Math.abs(delta) < div) {
      return rtf.format(Math.round(delta), unit);
    }
    delta /= div;
  }
  return rtf.format(Math.round(delta), "year");
}

export function isToday(iso: string | Date): boolean {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function isYesterday(iso: string | Date): boolean {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return (
    d.getFullYear() === y.getFullYear() &&
    d.getMonth() === y.getMonth() &&
    d.getDate() === y.getDate()
  );
}
