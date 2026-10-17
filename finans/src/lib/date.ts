// Tarihler uygulama içinde 'YYYY-MM-DD' dizgileri olarak tutulur.
// Hesaplamalar saat dilimi/yaz saati kaymalarından etkilenmesin diye UTC üzerinden yapılır.

const DAY = 86_400_000;

function toUTC(d: string): number {
  const [y, m, day] = d.split('-').map(Number);
  return Date.UTC(y, m - 1, day);
}

function fromUTC(t: number): string {
  return new Date(t).toISOString().slice(0, 10);
}

export function today(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(d: string, n: number): string {
  return fromUTC(toUTC(d) + n * DAY);
}

export function addMonths(d: string, n: number): string {
  const [y, m, day] = d.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1 + n, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return fromUTC(target.getTime());
}

export function diffDays(a: string, b: string): number {
  return Math.round((toUTC(a) - toUTC(b)) / DAY);
}

export function startOfMonth(d: string): string {
  return d.slice(0, 8) + '01';
}

export function endOfMonth(d: string): string {
  return addDays(addMonths(startOfMonth(d), 1), -1);
}

export function startOfYear(d: string): string {
  return d.slice(0, 4) + '-01-01';
}

export function startOfQuarter(d: string): string {
  const [y, m] = d.split('-').map(Number);
  const qm = Math.floor((m - 1) / 3) * 3 + 1;
  return `${y}-${String(qm).padStart(2, '0')}-01`;
}

export function monthKey(d: string): string {
  return d.slice(0, 7);
}

export function eachDay(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

export function eachMonth(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = startOfMonth(from); d <= to; d = addMonths(d, 1)) out.push(monthKey(d));
  return out;
}
