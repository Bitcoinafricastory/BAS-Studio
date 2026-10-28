// Weeks run Monday to Sunday. All values are plain YYYY-MM-DD strings so the same maths
// works in the browser and on the server without timezone surprises.
const pad = (n: number) => String(n).padStart(2, "0");

function fmt(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function parse(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function addDays(date: string, n: number): string {
  const d = parse(date);
  d.setUTCDate(d.getUTCDate() + n);
  return fmt(d);
}

/** Monday and Sunday of the week containing `date`. */
export function weekOf(date: string): { start: string; end: string } {
  const d = parse(date);
  const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
  const start = addDays(date, -dow);
  return { start, end: addDays(start, 6) };
}

export function todayLocal(): string {
  const n = new Date();
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDay(date: string): string {
  const d = parse(date);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

export function formatRange(start: string, end: string): string {
  const a = parse(start);
  const b = parse(end);
  const year = b.getUTCFullYear();
  return a.getUTCMonth() === b.getUTCMonth()
    ? `${a.getUTCDate()} to ${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]} ${year}`
    : `${formatDay(start)} to ${formatDay(end)} ${year}`;
}

/** Best-effort YYYY-MM-DD from whatever the article's `date` field holds. */
export function toDay(value: string): string {
  if (!value) return "";
  if (DATE_RE.test(value.slice(0, 10))) return value.slice(0, 10);
  const t = Date.parse(value);
  return Number.isNaN(t) ? "" : fmt(new Date(t));
}

export function inWeek(value: string, start: string, end: string): boolean {
  const day = toDay(value);
  return !!day && day >= start && day <= end;
}
