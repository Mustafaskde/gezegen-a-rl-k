// Asistanın ve panonun kullandığı finansal analizler. Tüm sayılar burada hesaplanır;
// dil modeli yalnızca bu sonuçları yorumlar, kendisi hesap yapmaz.
import type { AppData, Category, Transaction } from '../types';
import { cashForecast, monthlySeries, remaining, round2, scheduledStatus, toTRY, totalCash, txAmountTRY } from './finance';
import { addDays, addMonths, diffDays, endOfMonth, startOfMonth } from './date';
import { fmtDate, fmtShortDate, money } from './format';

/* --------------------------------------------------------- Gider dağılımı */

export interface ExpenseSlice {
  id: string;
  name: string;
  total: number;
  pct: number;
  prevTotal: number;
  /** Önceki döneme göre oran (NaN: önceki dönemde harcama yok). */
  change: number;
  essential: boolean;
  /** Kategori renk sırası (0–7); -1: renk yok, "Diğer" grubunda gösterilir. */
  colorIndex: number;
}

export interface Breakdown {
  total: number;
  prevTotal: number;
  slices: ExpenseSlice[];
  essentialTotal: number;
  discretionaryTotal: number;
}

/** Gider kategorilerinin sabit renk sırası: renk kategoriye bağlıdır, sıralamaya değil. */
export function categoryColorIndex(categories: Category[], id: string): number {
  const i = categories.filter((c) => c.kind === 'gider').findIndex((c) => c.id === id);
  return i >= 0 && i < 8 ? i : -1;
}

function expenseByCategory(data: AppData, from: string, to: string): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of data.transactions) {
    if (t.kind !== 'gider' || t.date < from || t.date > to) continue;
    const k = t.categoryId ?? '_';
    m.set(k, (m.get(k) ?? 0) + txAmountTRY(data, t));
  }
  return m;
}

export function expenseBreakdown(data: AppData, from: string, to: string, prevFrom: string, prevTo: string): Breakdown {
  const cur = expenseByCategory(data, from, to);
  const prev = expenseByCategory(data, prevFrom, prevTo);
  const cats = new Map(data.categories.map((c) => [c.id, c]));
  const total = [...cur.values()].reduce((a, b) => a + b, 0);
  const prevTotal = [...prev.values()].reduce((a, b) => a + b, 0);
  let essentialTotal = 0;
  const slices = [...cur.entries()]
    .map(([id, v]) => {
      const c = cats.get(id);
      const p = prev.get(id) ?? 0;
      const essential = !!c?.essential;
      if (essential) essentialTotal += v;
      return {
        id,
        name: c?.name ?? 'Kategorisiz',
        total: round2(v),
        pct: total ? v / total : 0,
        prevTotal: round2(p),
        change: p ? (v - p) / p : NaN,
        essential,
        colorIndex: categoryColorIndex(data.categories, id),
      };
    })
    .sort((a, b) => b.total - a.total);
  return { total: round2(total), prevTotal: round2(prevTotal), slices, essentialTotal: round2(essentialTotal), discretionaryTotal: round2(total - essentialTotal) };
}

/* ------------------------------------------------------------ Dönemler */

export interface Period {
  from: string;
  to: string;
  prevFrom: string;
  prevTo: string;
  label: string;
  prevLabel: string;
}

/** Bu ay (bugüne kadar), karşılaştırma geçen ayın aynı günleri. */
export function monthToDate(ref: string): Period {
  const from = startOfMonth(ref);
  const prevFrom = addMonths(from, -1);
  const prevTo = addMonths(ref, -1) > endOfMonth(prevFrom) ? endOfMonth(prevFrom) : addMonths(ref, -1);
  return { from, to: ref, prevFrom, prevTo, label: 'bu ay', prevLabel: 'geçen ayın aynı dönemi' };
}

/* ------------------------------------------------------------- Bulgular */

export interface Anomaly {
  tx: Transaction;
  category: string;
  amount: number;
  typical: number;
}

export interface Duplicate {
  first: Transaction;
  second: Transaction;
  amount: number;
}

export interface Subscription {
  description: string;
  category: string;
  monthly: number;
  months: number;
}

export interface BudgetRow {
  id: string;
  name: string;
  spent: number;
  budget: number;
  pct: number;
  /** Ay sonuna kadar bu hızla gidilirse beklenen harcama. */
  projected: number;
}

export interface CategoryTrend {
  id: string;
  name: string;
  current: number;
  average: number;
  change: number;
  essential: boolean;
}

export type Severity = 'critical' | 'warning' | 'info' | 'good';

export interface Insight {
  severity: Severity;
  title: string;
  detail: string;
}

export interface Analysis {
  period: Period;
  income: number;
  expense: number;
  net: number;
  prevIncome: number;
  prevExpense: number;
  breakdown: Breakdown;
  trends: CategoryTrend[];
  anomalies: Anomaly[];
  duplicates: Duplicate[];
  subscriptions: Subscription[];
  budgets: BudgetRow[];
  /** İsteğe bağlı kategorilerde son 3 ay ortalamasının üzerindeki toplam. */
  savingsPotential: number;
  cash: number;
  forecast30: number;
  minBalance: number;
  minDate: string;
  avgMonthlyExpense: number;
  runwayMonths: number;
  overdueReceivables: { name: string; amount: number; days: number }[];
  overdueReceivableTotal: number;
  overduePayableTotal: number;
  upcomingIn30: number;
  upcomingOut30: number;
  upcomingPayments: { title: string; date: string; amount: number }[];
  avgCollectionDays: number;
  insights: Insight[];
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const normalize = (s: string) => s.trim().toLocaleLowerCase('tr');

export function analyze(data: AppData, ref: string): Analysis {
  const period = monthToDate(ref);
  const { from, to, prevFrom, prevTo } = period;
  const rates = data.settings.rates;
  const cats = new Map(data.categories.map((c) => [c.id, c]));
  const catName = (id?: string) => (id && cats.get(id)?.name) || 'Kategorisiz';

  let income = 0;
  let expense = 0;
  let prevIncome = 0;
  let prevExpense = 0;
  for (const t of data.transactions) {
    if (t.kind === 'transfer') continue;
    const v = txAmountTRY(data, t);
    if (t.date >= from && t.date <= to) t.kind === 'gelir' ? (income += v) : (expense += v);
    else if (t.date >= prevFrom && t.date <= prevTo) t.kind === 'gelir' ? (prevIncome += v) : (prevExpense += v);
  }

  const breakdown = expenseBreakdown(data, from, to, prevFrom, prevTo);
  const current = expenseByCategory(data, from, to);

  // Son 3 ayın aynı günlerine göre kategori ortalaması (ay ortası kıyası adil olsun diye)
  const history = [1, 2, 3].map((k) => expenseByCategory(data, addMonths(from, -k), addMonths(to, -k) > endOfMonth(addMonths(from, -k)) ? endOfMonth(addMonths(from, -k)) : addMonths(to, -k)));
  const trends: CategoryTrend[] = [];
  let savingsPotential = 0;
  for (const c of data.categories.filter((x) => x.kind === 'gider')) {
    const cur = current.get(c.id) ?? 0;
    const avg = history.reduce((s, h) => s + (h.get(c.id) ?? 0), 0) / history.length;
    if (!cur && !avg) continue;
    trends.push({ id: c.id, name: c.name, current: round2(cur), average: round2(avg), change: avg ? (cur - avg) / avg : NaN, essential: !!c.essential });
    if (!c.essential && cur > avg) savingsPotential += cur - avg;
  }
  trends.sort((a, b) => b.current - b.average - (a.current - a.average));

  // Olağan dışı harcamalar: aynı kategorinin son 6 aydaki tipik işlem tutarının 1,6 katı ve üzeri
  const lookback = addMonths(from, -6);
  const byCat = new Map<string, number[]>();
  for (const t of data.transactions) {
    if (t.kind !== 'gider' || t.date < lookback || t.date >= from) continue;
    const k = t.categoryId ?? '_';
    byCat.set(k, [...(byCat.get(k) ?? []), txAmountTRY(data, t)]);
  }
  const periodExpenses = data.transactions.filter((t) => t.kind === 'gider' && t.date >= from && t.date <= to);
  const anomalies: Anomaly[] = [];
  for (const t of periodExpenses) {
    const hist = byCat.get(t.categoryId ?? '_') ?? [];
    if (hist.length < 3) continue;
    const typical = median(hist);
    const v = txAmountTRY(data, t);
    if (v >= typical * 1.6 && v - typical >= 1500) anomalies.push({ tx: t, category: catName(t.categoryId), amount: round2(v), typical: round2(typical) });
  }
  anomalies.sort((a, b) => b.amount - b.typical - (a.amount - a.typical));

  // Mükerrer olabilecek ödemeler: aynı açıklama ve tutar, 5 gün içinde
  const duplicates: Duplicate[] = [];
  const sorted = [...periodExpenses].sort((a, b) => a.date.localeCompare(b.date));
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i];
      const b = sorted[j];
      if (diffDays(b.date, a.date) > 5) break;
      if (a.amount === b.amount && a.accountId === b.accountId && normalize(a.description) === normalize(b.description)) {
        duplicates.push({ first: a, second: b, amount: round2(txAmountTRY(data, b)) });
      }
    }
  }

  // Düzenli abonelik benzeri küçük ödemeler: son 3 ayın en az 3'ünde aynı açıklama ve tutar
  const subMap = new Map<string, { months: Set<string>; amount: number; category: string; description: string }>();
  const subFrom = startOfMonth(addMonths(ref, -3));
  for (const t of data.transactions) {
    if (t.kind !== 'gider' || t.date < subFrom || t.date > to || t.scheduledId) continue;
    const v = txAmountTRY(data, t);
    if (v > 5000) continue;
    const key = `${normalize(t.description)}|${t.amount}`;
    const e = subMap.get(key) ?? { months: new Set<string>(), amount: v, category: catName(t.categoryId), description: t.description };
    e.months.add(t.date.slice(0, 7));
    subMap.set(key, e);
  }
  const subscriptions = [...subMap.values()]
    .filter((e) => e.months.size >= 3)
    .map((e) => ({ description: e.description, category: e.category, monthly: round2(e.amount), months: e.months.size }))
    .sort((a, b) => b.monthly - a.monthly);

  // Bütçeler
  const daysInMonth = diffDays(endOfMonth(ref), startOfMonth(ref)) + 1;
  const elapsed = diffDays(ref, startOfMonth(ref)) + 1;
  const budgets: BudgetRow[] = data.categories
    .filter((c) => c.kind === 'gider' && c.budget && c.budget > 0)
    .map((c) => {
      const spent = round2(current.get(c.id) ?? 0);
      return { id: c.id, name: c.name, spent, budget: c.budget!, pct: spent / c.budget!, projected: round2((spent / elapsed) * daysInMonth) };
    })
    .sort((a, b) => b.pct - a.pct);

  // Nakit
  const cash = totalCash(data, ref);
  const forecast = cashForecast(data, ref, 30, true);
  const minPoint = forecast.reduce((a, b) => (b.balance < a.balance ? b : a), forecast[0]);
  const lastMonths = monthlySeries(data, startOfMonth(addMonths(ref, -3)), addDays(startOfMonth(ref), -1));
  const avgMonthlyExpense = lastMonths.length ? lastMonths.reduce((s, m) => s + m.gider, 0) / lastMonths.length : 0;

  // Cariler
  const names = new Map(data.contacts.map((c) => [c.id, c.name]));
  const overdueReceivables: Analysis['overdueReceivables'] = [];
  let overdueReceivableTotal = 0;
  let overduePayableTotal = 0;
  for (const s of data.scheduled) {
    if (scheduledStatus(s, ref) !== 'gecikmis') continue;
    const v = toTRY(remaining(s), s.currency, rates);
    if (s.kind === 'tahsilat') {
      overdueReceivableTotal += v;
      overdueReceivables.push({ name: (s.contactId && names.get(s.contactId)) || s.title, amount: round2(v), days: diffDays(ref, s.dueDate) });
    } else overduePayableTotal += v;
  }
  overdueReceivables.sort((a, b) => b.amount - a.amount);

  let upcomingIn30 = 0;
  let upcomingOut30 = 0;
  const upcomingPayments: Analysis['upcomingPayments'] = [];
  const horizon = addDays(ref, 30);
  for (const s of data.scheduled) {
    const rem = remaining(s);
    if (rem <= 0 || s.dueDate < ref || s.dueDate > horizon) continue;
    const v = toTRY(rem, s.currency, rates);
    if (s.kind === 'tahsilat') upcomingIn30 += v;
    else {
      upcomingOut30 += v;
      upcomingPayments.push({ title: s.title, date: s.dueDate, amount: round2(v) });
    }
  }
  upcomingPayments.sort((a, b) => a.date.localeCompare(b.date));

  // Ortalama tahsilat süresi: son 180 günde kapanan tahsilatlar
  const schedById = new Map(data.scheduled.map((s) => [s.id, s]));
  const collectDays: number[] = [];
  for (const t of data.transactions) {
    const s = t.scheduledId ? schedById.get(t.scheduledId) : undefined;
    if (!s || s.kind !== 'tahsilat' || t.date < addDays(ref, -180)) continue;
    collectDays.push(Math.max(0, diffDays(t.date, s.issueDate)));
  }
  const avgCollectionDays = collectDays.length ? Math.round(collectDays.reduce((a, b) => a + b, 0) / collectDays.length) : NaN;

  const a: Analysis = {
    period,
    income: round2(income),
    expense: round2(expense),
    net: round2(income - expense),
    prevIncome: round2(prevIncome),
    prevExpense: round2(prevExpense),
    breakdown,
    trends,
    anomalies,
    duplicates,
    subscriptions,
    budgets,
    savingsPotential: round2(savingsPotential),
    cash,
    forecast30: forecast[forecast.length - 1].balance,
    minBalance: minPoint.balance,
    minDate: minPoint.date,
    avgMonthlyExpense: round2(avgMonthlyExpense),
    runwayMonths: avgMonthlyExpense ? cash / avgMonthlyExpense : NaN,
    overdueReceivables,
    overdueReceivableTotal: round2(overdueReceivableTotal),
    overduePayableTotal: round2(overduePayableTotal),
    upcomingIn30: round2(upcomingIn30),
    upcomingOut30: round2(upcomingOut30),
    upcomingPayments,
    avgCollectionDays,
    insights: [],
  };
  a.insights = buildInsights(a);
  return a;
}

const pct = (v: number) => `%${Math.round(Math.abs(v) * 100)}`;

function buildInsights(a: Analysis): Insight[] {
  const out: Insight[] = [];
  for (const d of a.duplicates) {
    out.push({ severity: 'critical', title: 'Mükerrer olabilecek ödeme', detail: `"${d.second.description}" ${fmtShortDate(d.first.date)} ve ${fmtShortDate(d.second.date)} tarihlerinde aynı tutarla (${money(d.amount)}) iki kez ödenmiş.` });
  }
  if (a.minBalance < 0) {
    out.push({ severity: 'critical', title: 'Nakit açığı riski', detail: `Mevcut plana göre nakit ${fmtDate(a.minDate)} tarihinde ${money(a.minBalance)} seviyesine düşüyor.` });
  }
  for (const b of a.budgets.filter((x) => x.pct >= 1)) {
    out.push({ severity: 'critical', title: `${b.name} bütçesi aşıldı`, detail: `${money(b.spent)} harcandı; aylık bütçe ${money(b.budget)} (${pct(b.pct)}).` });
  }
  for (const b of a.budgets.filter((x) => x.pct < 1 && x.projected > x.budget * 1.05)) {
    out.push({ severity: 'warning', title: `${b.name} bütçeyi aşma yolunda`, detail: `Bu hızla ay sonunda ${money(b.projected)} olacak; bütçe ${money(b.budget)}.` });
  }
  for (const an of a.anomalies.slice(0, 3)) {
    out.push({ severity: 'warning', title: 'Olağan dışı harcama', detail: `${an.tx.description} (${an.category}): ${money(an.amount)}. Bu kategoride tipik işlem ${money(an.typical)}.` });
  }
  for (const t of a.trends.filter((x) => !x.essential && x.change > 0.3 && x.current - x.average > 2000).slice(0, 2)) {
    out.push({ severity: 'warning', title: `${t.name} harcaması arttı`, detail: `Bu ay ${money(t.current)}; son 3 ayın aynı dönem ortalaması ${money(t.average)} (${pct(t.change)} fazla).` });
  }
  if (a.overdueReceivableTotal > 0) {
    const top = a.overdueReceivables[0];
    out.push({ severity: 'warning', title: 'Gecikmiş tahsilatlar', detail: `Toplam ${money(a.overdueReceivableTotal)} vadesi geçmiş alacak var. En büyüğü ${top.name}: ${money(top.amount)} (${top.days} gün).` });
  }
  if (a.subscriptions.length) {
    const sum = a.subscriptions.reduce((s, x) => s + x.monthly, 0);
    out.push({ severity: 'info', title: 'Düzenli küçük ödemeler', detail: `${a.subscriptions.length} abonelik benzeri ödeme ayda ${money(sum)} tutuyor: ${a.subscriptions.map((s) => s.description).join(', ')}.` });
  }
  if (isFinite(a.runwayMonths)) {
    out.push({
      severity: a.runwayMonths < 1 ? 'critical' : a.runwayMonths < 2 ? 'warning' : 'good',
      title: 'Nakit yeterlilik süresi',
      detail: `Mevcut nakit, ortalama aylık gidere (${money(a.avgMonthlyExpense)}) göre yaklaşık ${a.runwayMonths.toFixed(1).replace('.', ',')} ay yeter.`,
    });
  }
  const order: Record<Severity, number> = { critical: 0, warning: 1, info: 2, good: 3 };
  return out.sort((x, y) => order[x.severity] - order[y.severity]);
}
