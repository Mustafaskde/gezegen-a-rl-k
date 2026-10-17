import type { Account, AppData, Currency, Scheduled, ScheduledStatus, Transaction } from '../types';
import { addDays, addMonths, diffDays, eachDay, eachMonth, monthKey } from './date';

export const toTRY = (amount: number, currency: Currency, rates: AppData['settings']['rates']) =>
  currency === 'TRY' ? amount : amount * (rates[currency] || 0);

export const fromTRY = (amount: number, currency: Currency, rates: AppData['settings']['rates']) =>
  currency === 'TRY' ? amount : amount / (rates[currency] || 1);

export function convert(amount: number, from: Currency, to: Currency, rates: AppData['settings']['rates']) {
  return from === to ? amount : fromTRY(toTRY(amount, from, rates), to, rates);
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

/* ---------------------------------------------------------------- Hesaplar */

/** Bir işlemin verilen hesabın bakiyesine etkisi (hesabın para biriminde). */
export function txEffect(tx: Transaction, accountId: string): number {
  if (tx.kind === 'gelir') return tx.accountId === accountId ? tx.amount : 0;
  if (tx.kind === 'gider') return tx.accountId === accountId ? -tx.amount : 0;
  let e = 0;
  if (tx.accountId === accountId) e -= tx.amount;
  if (tx.toAccountId === accountId) e += tx.toAmount ?? tx.amount;
  return e;
}

export function accountBalance(account: Account, txs: Transaction[], asOf?: string): number {
  let bal = asOf && account.openingDate > asOf ? 0 : account.openingBalance;
  for (const tx of txs) {
    if (asOf && tx.date > asOf) continue;
    bal += txEffect(tx, account.id);
  }
  return round2(bal);
}

export function accountBalances(data: AppData, asOf?: string): Map<string, number> {
  const m = new Map<string, number>();
  for (const a of data.accounts) m.set(a.id, accountBalance(a, data.transactions, asOf));
  return m;
}

/** Tüm hesapların TL karşılığı toplamı. */
export function totalCash(data: AppData, asOf?: string): number {
  const bals = accountBalances(data, asOf);
  let sum = 0;
  for (const a of data.accounts) if (!a.archived) sum += toTRY(bals.get(a.id) ?? 0, a.currency, data.settings.rates);
  return round2(sum);
}

/* ---------------------------------------------------- Vadeli kayıtlar */

export const remaining = (s: Scheduled) => round2(Math.max(0, s.amount - s.paidAmount));

export function scheduledStatus(s: Scheduled, ref: string): ScheduledStatus {
  if (remaining(s) <= 0) return 'tamamlandi';
  if (s.dueDate < ref) return 'gecikmis';
  if (s.paidAmount > 0) return 'kismi';
  return 'bekliyor';
}

export function nextDueDate(d: string, r: Scheduled['recurrence']): string {
  switch (r) {
    case 'haftalik':
      return addDays(d, 7);
    case 'aylik':
      return addMonths(d, 1);
    case 'yillik':
      return addMonths(d, 12);
    default:
      return d;
  }
}

export interface Occurrence {
  scheduled: Scheduled;
  date: string;
  /** TL karşılığı, kalan tutar */
  amountTRY: number;
  /** Henüz oluşturulmamış, tekrar kuralından türetilmiş gelecek dönem. */
  virtual: boolean;
}

/**
 * [from, to] aralığına düşen açık vadeli kayıtları ve tekrar kuralından doğacak
 * gelecek dönemleri döner. `from` öncesindeki gecikmiş kalemler `overdueAt`
 * verilirse o tarihe taşınır.
 */
export function occurrences(data: AppData, from: string, to: string, overdueAt?: string): Occurrence[] {
  const out: Occurrence[] = [];
  const rates = data.settings.rates;
  for (const s of data.scheduled) {
    const rem = remaining(s);
    if (rem > 0) {
      if (s.dueDate >= from && s.dueDate <= to) {
        out.push({ scheduled: s, date: s.dueDate, amountTRY: toTRY(rem, s.currency, rates), virtual: false });
      } else if (s.dueDate < from && overdueAt) {
        out.push({ scheduled: s, date: overdueAt, amountTRY: toTRY(rem, s.currency, rates), virtual: false });
      }
    }
    if (s.recurrence !== 'yok' && !s.nextSpawned) {
      let d = nextDueDate(s.dueDate, s.recurrence);
      let guard = 0;
      while (d <= to && (!s.recurrenceEnd || d <= s.recurrenceEnd) && guard++ < 520) {
        if (d >= from) out.push({ scheduled: s, date: d, amountTRY: toTRY(s.amount, s.currency, rates), virtual: true });
        d = nextDueDate(d, s.recurrence);
      }
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/* ------------------------------------------------------------ Nakit akışı */

export interface CashPoint {
  date: string;
  balance: number;
  inflow: number;
  outflow: number;
  projected: boolean;
}

/** Günlük gerçekleşen nakit pozisyonu (TL). */
export function cashHistory(data: AppData, from: string, to: string): CashPoint[] {
  const rates = data.settings.rates;
  const accById = new Map(data.accounts.filter((a) => !a.archived).map((a) => [a.id, a]));
  let bal = totalCash(data, addDays(from, -1));
  const inflow = new Map<string, number>();
  const outflow = new Map<string, number>();
  const add = (m: Map<string, number>, d: string, v: number) => m.set(d, (m.get(d) ?? 0) + v);

  for (const a of accById.values()) {
    if (a.openingDate >= from && a.openingDate <= to) {
      const v = toTRY(a.openingBalance, a.currency, rates);
      add(v >= 0 ? inflow : outflow, a.openingDate, Math.abs(v));
    }
  }
  for (const tx of data.transactions) {
    if (tx.date < from || tx.date > to) continue;
    const src = accById.get(tx.accountId);
    if (tx.kind === 'gelir' && src) add(inflow, tx.date, toTRY(tx.amount, src.currency, rates));
    else if (tx.kind === 'gider' && src) add(outflow, tx.date, toTRY(tx.amount, src.currency, rates));
    else if (tx.kind === 'transfer') {
      // Transferler toplam nakdi değiştirmez; yalnızca kur farkı / arşiv hesap etkisi yansır.
      const dst = tx.toAccountId ? accById.get(tx.toAccountId) : undefined;
      const net = (dst ? toTRY(tx.toAmount ?? tx.amount, dst.currency, rates) : 0) - (src ? toTRY(tx.amount, src.currency, rates) : 0);
      if (Math.abs(net) > 0.005) add(net > 0 ? inflow : outflow, tx.date, Math.abs(net));
    }
  }

  return eachDay(from, to).map((date) => {
    const i = inflow.get(date) ?? 0;
    const o = outflow.get(date) ?? 0;
    bal += i - o;
    return { date, balance: round2(bal), inflow: round2(i), outflow: round2(o), projected: false };
  });
}

/** Bugünkü bakiyeden başlayarak vadeli kayıtlara göre günlük tahmini bakiye. */
export function cashForecast(data: AppData, ref: string, days: number, includeOverdue = true): CashPoint[] {
  const end = addDays(ref, days);
  const occ = occurrences(data, ref, end, includeOverdue ? ref : undefined);
  const inflow = new Map<string, number>();
  const outflow = new Map<string, number>();
  for (const o of occ) {
    const m = o.scheduled.kind === 'tahsilat' ? inflow : outflow;
    m.set(o.date, (m.get(o.date) ?? 0) + o.amountTRY);
  }
  let bal = totalCash(data, ref);
  return eachDay(ref, end).map((date, idx) => {
    const i = inflow.get(date) ?? 0;
    const o = outflow.get(date) ?? 0;
    bal += i - o;
    return { date, balance: round2(bal), inflow: round2(i), outflow: round2(o), projected: idx > 0 };
  });
}

/* ------------------------------------------------------------- Raporlar */

export interface CategoryTotal {
  id: string;
  name: string;
  total: number;
  count: number;
}

export interface PeriodSummary {
  income: number;
  expense: number;
  net: number;
  incomeByCategory: CategoryTotal[];
  expenseByCategory: CategoryTotal[];
  count: number;
}

export function txAmountTRY(data: AppData, tx: Transaction): number {
  const acc = data.accounts.find((a) => a.id === tx.accountId);
  return toTRY(tx.amount, acc?.currency ?? 'TRY', data.settings.rates);
}

export function periodSummary(data: AppData, from: string, to: string): PeriodSummary {
  const catName = new Map(data.categories.map((c) => [c.id, c.name]));
  const inc = new Map<string, CategoryTotal>();
  const exp = new Map<string, CategoryTotal>();
  let income = 0;
  let expense = 0;
  let count = 0;
  for (const tx of data.transactions) {
    if (tx.kind === 'transfer' || tx.date < from || tx.date > to) continue;
    const v = txAmountTRY(data, tx);
    const key = tx.categoryId ?? '_';
    const m = tx.kind === 'gelir' ? inc : exp;
    const cur = m.get(key) ?? { id: key, name: catName.get(key) ?? 'Kategorisiz', total: 0, count: 0 };
    cur.total += v;
    cur.count++;
    m.set(key, cur);
    if (tx.kind === 'gelir') income += v;
    else expense += v;
    count++;
  }
  const sort = (m: Map<string, CategoryTotal>) =>
    [...m.values()].map((c) => ({ ...c, total: round2(c.total) })).sort((a, b) => b.total - a.total);
  return {
    income: round2(income),
    expense: round2(expense),
    net: round2(income - expense),
    incomeByCategory: sort(inc),
    expenseByCategory: sort(exp),
    count,
  };
}

export interface MonthPoint {
  month: string;
  gelir: number;
  gider: number;
  net: number;
}

export function monthlySeries(data: AppData, from: string, to: string): MonthPoint[] {
  const months = eachMonth(from, to);
  const idx = new Map(months.map((m, i) => [m, i]));
  const out = months.map((month) => ({ month, gelir: 0, gider: 0, net: 0 }));
  for (const tx of data.transactions) {
    if (tx.kind === 'transfer' || tx.date < from || tx.date > to) continue;
    const i = idx.get(monthKey(tx.date));
    if (i === undefined) continue;
    const v = txAmountTRY(data, tx);
    if (tx.kind === 'gelir') out[i].gelir += v;
    else out[i].gider += v;
  }
  return out.map((p) => ({ month: p.month, gelir: round2(p.gelir), gider: round2(p.gider), net: round2(p.gelir - p.gider) }));
}

/* ----------------------------------------------------------- Cari hesaplar */

export interface ContactBalance {
  receivable: number; // bize borçlu (açık alacak)
  payable: number; // bizim borcumuz
  net: number;
  overdue: number; // gecikmiş net tutar (alacak - borç)
  openCount: number;
}

export function contactBalances(data: AppData, ref: string): Map<string, ContactBalance> {
  const m = new Map<string, ContactBalance>();
  for (const c of data.contacts) m.set(c.id, { receivable: 0, payable: 0, net: 0, overdue: 0, openCount: 0 });
  for (const s of data.scheduled) {
    if (!s.contactId) continue;
    const b = m.get(s.contactId);
    const rem = remaining(s);
    if (!b || rem <= 0) continue;
    const v = toTRY(rem, s.currency, data.settings.rates);
    const sign = s.kind === 'tahsilat' ? 1 : -1;
    if (sign > 0) b.receivable += v;
    else b.payable += v;
    if (s.dueDate < ref) b.overdue += sign * v;
    b.openCount++;
  }
  for (const b of m.values()) {
    b.receivable = round2(b.receivable);
    b.payable = round2(b.payable);
    b.overdue = round2(b.overdue);
    b.net = round2(b.receivable - b.payable);
  }
  return m;
}

export interface StatementLine {
  date: string;
  description: string;
  debit: number; // cari borçlandırıldı (alacağımız arttı)
  credit: number; // cari alacaklandırıldı
  balance: number;
  ref: { type: 'scheduled' | 'transaction'; id: string };
}

/** Cari ekstresi: vadeli kayıtlar borç/alacak, bunlara bağlı ödemeler karşı kayıt olarak işlenir. */
export function contactStatement(data: AppData, contactId: string): StatementLine[] {
  const rates = data.settings.rates;
  const lines: Omit<StatementLine, 'balance'>[] = [];
  const schedById = new Map(data.scheduled.map((s) => [s.id, s]));
  for (const s of data.scheduled) {
    if (s.contactId !== contactId) continue;
    const v = toTRY(s.amount, s.currency, rates);
    lines.push({
      date: s.issueDate,
      description: `${s.title} (vade ${s.dueDate.split('-').reverse().join('.')})`,
      debit: s.kind === 'tahsilat' ? v : 0,
      credit: s.kind === 'odeme' ? v : 0,
      ref: { type: 'scheduled', id: s.id },
    });
  }
  for (const tx of data.transactions) {
    const s = tx.scheduledId ? schedById.get(tx.scheduledId) : undefined;
    if (!s || s.contactId !== contactId) continue;
    const v = toTRY(tx.scheduledAmount ?? tx.amount, s.currency, rates);
    lines.push({
      date: tx.date,
      description: tx.description || (s.kind === 'tahsilat' ? 'Tahsilat' : 'Ödeme'),
      debit: s.kind === 'odeme' ? v : 0,
      credit: s.kind === 'tahsilat' ? v : 0,
      ref: { type: 'transaction', id: tx.id },
    });
  }
  lines.sort((a, b) => a.date.localeCompare(b.date) || (a.ref.type === 'scheduled' ? -1 : 1));
  let bal = 0;
  return lines.map((l) => {
    bal += l.debit - l.credit;
    return { ...l, debit: round2(l.debit), credit: round2(l.credit), balance: round2(bal) };
  });
}

export const AGING_BUCKETS = ['Vadesi gelmemiş', '1–30 gün', '31–60 gün', '61–90 gün', '90+ gün'] as const;

export interface AgingRow {
  contactId: string;
  name: string;
  buckets: number[];
  total: number;
}

export function aging(data: AppData, ref: string, kind: Scheduled['kind']): AgingRow[] {
  const rows = new Map<string, AgingRow>();
  const names = new Map(data.contacts.map((c) => [c.id, c.name]));
  for (const s of data.scheduled) {
    if (s.kind !== kind) continue;
    const rem = remaining(s);
    if (rem <= 0) continue;
    const key = s.contactId ?? '_';
    const row = rows.get(key) ?? { contactId: key, name: names.get(key) ?? 'Carisiz kayıtlar', buckets: [0, 0, 0, 0, 0], total: 0 };
    const late = diffDays(ref, s.dueDate);
    const b = late <= 0 ? 0 : late <= 30 ? 1 : late <= 60 ? 2 : late <= 90 ? 3 : 4;
    const v = toTRY(rem, s.currency, data.settings.rates);
    row.buckets[b] += v;
    row.total += v;
    rows.set(key, row);
  }
  return [...rows.values()]
    .map((r) => ({ ...r, buckets: r.buckets.map(round2), total: round2(r.total) }))
    .sort((a, b) => b.total - a.total);
}
