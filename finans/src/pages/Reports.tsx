import { useMemo, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { useStore } from '../store';
import { Card, PageHeader, Segmented, Stat } from '../components/ui';
import { CategoryBars, IncomeExpenseChart, Legend } from '../components/charts';
import { accountBalances, aging, AGING_BUCKETS, monthlySeries, periodSummary, toTRY, type CategoryTotal } from '../lib/finance';
import { addDays, addMonths, diffDays, startOfMonth, startOfQuarter, startOfYear } from '../lib/date';
import { fmtDate, fmtLongMonth, money, percent } from '../lib/format';
import { downloadCSV } from '../lib/csv';
import { ACCOUNT_TYPE_LABEL } from '../components/forms';

type Tab = 'gelir-tablosu' | 'trend' | 'yaslandirma' | 'hesaplar';
type Period = 'bu-ay' | 'gecen-ay' | 'bu-ceyrek' | 'bu-yil' | 'son-12' | 'ozel';

function periodRange(p: Period, ref: string, custom: { from: string; to: string }) {
  switch (p) {
    case 'bu-ay':
      return { from: startOfMonth(ref), to: ref };
    case 'gecen-ay': {
      const s = addMonths(startOfMonth(ref), -1);
      return { from: s, to: addDays(startOfMonth(ref), -1) };
    }
    case 'bu-ceyrek':
      return { from: startOfQuarter(ref), to: ref };
    case 'bu-yil':
      return { from: startOfYear(ref), to: ref };
    case 'son-12':
      return { from: startOfMonth(addMonths(ref, -11)), to: ref };
    case 'ozel':
      return custom;
  }
}

const PERIODS: { value: Period; label: string }[] = [
  { value: 'bu-ay', label: 'Bu ay' },
  { value: 'gecen-ay', label: 'Geçen ay' },
  { value: 'bu-ceyrek', label: 'Bu çeyrek' },
  { value: 'bu-yil', label: 'Bu yıl' },
  { value: 'son-12', label: 'Son 12 ay' },
  { value: 'ozel', label: 'Özel aralık' },
];

export default function Reports() {
  const { data, ref } = useStore();
  const [tab, setTab] = useState<Tab>('gelir-tablosu');
  const [period, setPeriod] = useState<Period>('bu-ay');
  const [custom, setCustom] = useState({ from: startOfMonth(addMonths(ref, -2)), to: ref });
  const { from, to } = periodRange(period, ref, custom);

  // Karşılaştırma: takvim dönemlerinde bir önceki dönemin aynı günleri, özel aralıkta eşit uzunlukta önceki dönem
  const shift = period === 'bu-ay' || period === 'gecen-ay' ? 1 : period === 'bu-ceyrek' ? 3 : period === 'ozel' ? 0 : 12;
  const len = diffDays(to, from) + 1;
  const prevFrom = shift ? addMonths(from, -shift) : addDays(from, -len);
  const prevTo = period === 'gecen-ay' ? addDays(from, -1) : shift ? addMonths(to, -shift) : addDays(from, -1);

  const cur = useMemo(() => periodSummary(data, from, to), [data, from, to]);
  const prev = useMemo(() => periodSummary(data, prevFrom, prevTo), [data, prevFrom, prevTo]);
  const months = useMemo(() => monthlySeries(data, from, to), [data, from, to]);

  const change = (a: number, b: number) => (b ? (a - b) / Math.abs(b) : NaN);
  const margin = cur.income ? cur.net / cur.income : NaN;
  const periodLabel = `${fmtDate(from)} – ${fmtDate(to)}`;

  return (
    <>
      <PageHeader
        title="Raporlar"
        subtitle="Gelir tablosu, trendler, cari yaşlandırma ve hesap özetleri"
        actions={
          <button className="btn no-print export-only" onClick={() => window.print()}>
            <Printer size={16} /> Yazdır / PDF
          </button>
        }
      />
      <div className="filters no-print report-filters">
        <Segmented
          label="Rapor"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'gelir-tablosu', label: 'Gelir tablosu' },
            { value: 'trend', label: 'Aylık trend' },
            { value: 'yaslandirma', label: 'Cari yaşlandırma' },
            { value: 'hesaplar', label: 'Hesap özeti' },
          ]}
        />
        {(tab === 'gelir-tablosu' || tab === 'trend') && (
          <>
            <select value={period} onChange={(e) => setPeriod(e.target.value as Period)} aria-label="Dönem">
              {PERIODS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            {period === 'ozel' && (
              <>
                <input type="date" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} aria-label="Başlangıç" />
                <input type="date" value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} aria-label="Bitiş" />
              </>
            )}
          </>
        )}
      </div>
      <div className="print-only print-title">
        <h2>{data.settings.companyName}</h2>
        <p>
          {tab === 'gelir-tablosu' || tab === 'trend' ? periodLabel : `${fmtDate(ref)} itibarıyla`} · Döviz tutarları güncel kurla TL’ye çevrilmiştir.
        </p>
      </div>

      {tab === 'gelir-tablosu' && (
        <>
          <div className="stats">
            <Stat label="Toplam gelir" value={money(cur.income)} sub={`Önceki dönem ${percent(change(cur.income, prev.income))}`} />
            <Stat label="Toplam gider" value={money(cur.expense)} sub={`Önceki dönem ${percent(change(cur.expense, prev.expense))}`} />
            <Stat label="Net kâr / zarar" value={money(cur.net, 'TRY', { sign: true })} tone={cur.net >= 0 ? 'pos' : 'neg'} sub={`Önceki dönem ${money(prev.net, 'TRY', { compact: true, sign: true })}`} />
            <Stat label="Net kâr marjı" value={isFinite(margin) ? percent(margin).replace('+', '') : '—'} sub={`${cur.count} işlem`} />
          </div>
          <div className="grid-1-1">
            <Card title="Gelir dağılımı" subtitle={periodLabel}>
              <CategoryBars items={cur.incomeByCategory} total={cur.income} color="var(--series-1)" />
            </Card>
            <Card title="Gider dağılımı" subtitle={periodLabel}>
              <CategoryBars items={cur.expenseByCategory} total={cur.expense} color="var(--series-2)" />
            </Card>
          </div>
          <IncomeStatement income={cur.incomeByCategory} expense={cur.expenseByCategory} prevIncome={prev.incomeByCategory} prevExpense={prev.expenseByCategory} from={from} to={to} compareLabel={`${fmtDate(prevFrom)} – ${fmtDate(prevTo)}`} />
        </>
      )}

      {tab === 'trend' && (
        <>
          <Card title="Aylık gelir ve gider" subtitle={periodLabel}>
            <Legend
              items={[
                { label: 'Gelir', color: 'var(--series-1)' },
                { label: 'Gider', color: 'var(--series-2)' },
              ]}
            />
            <IncomeExpenseChart data={months} height={320} />
          </Card>
          <Card
            title="Aylık tablo"
            action={
              <button className="btn btn-sm no-print export-only" onClick={() => downloadCSV(`aylik_trend_${from}_${to}.csv`, ['Ay', 'Gelir', 'Gider', 'Net', 'Kümülatif net'], months.reduce<{ rows: (string | number)[][]; c: number }>((acc, m) => ((acc.c += m.net), acc.rows.push([m.month, m.gelir, m.gider, m.net, acc.c]), acc), { rows: [], c: 0 }).rows)}>
                <Download size={14} /> CSV
              </button>
            }
          >
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Ay</th>
                    <th className="right">Gelir</th>
                    <th className="right">Gider</th>
                    <th className="right">Net</th>
                    <th className="right hide-sm">Marj</th>
                  </tr>
                </thead>
                <tbody>
                  {months.map((m) => (
                    <tr key={m.month}>
                      <td>{fmtLongMonth(m.month)}</td>
                      <td className="right num">{money(m.gelir)}</td>
                      <td className="right num">{money(m.gider)}</td>
                      <td className={`right num ${m.net >= 0 ? 'tone-pos' : 'tone-neg'}`}>{money(m.net, 'TRY', { sign: true })}</td>
                      <td className="right num hide-sm">{m.gelir ? percent(m.net / m.gelir) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th>Toplam</th>
                    <th className="right num">{money(cur.income)}</th>
                    <th className="right num">{money(cur.expense)}</th>
                    <th className="right num">{money(cur.net, 'TRY', { sign: true })}</th>
                    <th className="right num hide-sm">{isFinite(margin) ? percent(margin) : '—'}</th>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </>
      )}

      {tab === 'yaslandirma' && (
        <>
          <AgingTable kind="tahsilat" title="Alacak yaşlandırma" />
          <AgingTable kind="odeme" title="Borç yaşlandırma" />
        </>
      )}

      {tab === 'hesaplar' && <AccountSummary />}
    </>
  );
}

function IncomeStatement({ income, expense, prevIncome, prevExpense, from, to, compareLabel }: { income: CategoryTotal[]; expense: CategoryTotal[]; prevIncome: CategoryTotal[]; prevExpense: CategoryTotal[]; from: string; to: string; compareLabel: string }) {
  const prevMap = new Map([...prevIncome, ...prevExpense].map((c) => [c.id + c.name, c.total]));
  const sum = (l: CategoryTotal[]) => l.reduce((s, c) => s + c.total, 0);
  const ti = sum(income);
  const te = sum(expense);
  const pi = sum(prevIncome);
  const pe = sum(prevExpense);
  const line = (c: CategoryTotal) => {
    const p = prevMap.get(c.id + c.name) ?? 0;
    return (
      <tr key={c.id}>
        <td className="indent">{c.name}</td>
        <td className="right num">{money(c.total)}</td>
        <td className="right num muted hide-sm">{money(p)}</td>
        <td className="right num hide-sm">{p ? percent((c.total - p) / p) : '—'}</td>
      </tr>
    );
  };
  const exportCSV = () =>
    downloadCSV(`gelir_tablosu_${from}_${to}.csv`, ['Kalem', 'Tür', 'Bu dönem', 'Önceki dönem'], [
      ...income.map((c) => [c.name, 'Gelir', c.total, prevMap.get(c.id + c.name) ?? 0]),
      ['TOPLAM GELİR', '', ti, pi],
      ...expense.map((c) => [c.name, 'Gider', c.total, prevMap.get(c.id + c.name) ?? 0]),
      ['TOPLAM GİDER', '', te, pe],
      ['NET', '', ti - te, pi - pe],
    ]);
  return (
    <Card
      title="Gelir tablosu"
      subtitle={`Karşılaştırma dönemi: ${compareLabel}`}
      action={
        <button className="btn btn-sm no-print export-only" onClick={exportCSV}>
          <Download size={14} /> CSV
        </button>
      }
    >
      <div className="table-wrap">
        <table className="table statement">
          <thead>
            <tr>
              <th>Kalem</th>
              <th className="right">Bu dönem</th>
              <th className="right hide-sm">Önceki dönem</th>
              <th className="right hide-sm">Değişim</th>
            </tr>
          </thead>
          <tbody>
            <tr className="section">
              <td colSpan={4}>Gelirler</td>
            </tr>
            {income.map(line)}
            <tr className="subtotal">
              <td>Toplam gelir</td>
              <td className="right num">{money(ti)}</td>
              <td className="right num hide-sm">{money(pi)}</td>
              <td className="right num hide-sm">{pi ? percent((ti - pi) / pi) : '—'}</td>
            </tr>
            <tr className="section">
              <td colSpan={4}>Giderler</td>
            </tr>
            {expense.map(line)}
            <tr className="subtotal">
              <td>Toplam gider</td>
              <td className="right num">{money(te)}</td>
              <td className="right num hide-sm">{money(pe)}</td>
              <td className="right num hide-sm">{pe ? percent((te - pe) / pe) : '—'}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="total">
              <th>Net kâr / zarar</th>
              <th className={`right num ${ti - te >= 0 ? 'tone-pos' : 'tone-neg'}`}>{money(ti - te, 'TRY', { sign: true })}</th>
              <th className="right num hide-sm">{money(pi - pe, 'TRY', { sign: true })}</th>
              <th className="right num hide-sm">{pi - pe ? percent((ti - te - (pi - pe)) / Math.abs(pi - pe)) : '—'}</th>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
}

function AgingTable({ kind, title }: { kind: 'tahsilat' | 'odeme'; title: string }) {
  const { data, ref } = useStore();
  const rows = useMemo(() => aging(data, ref, kind), [data, ref, kind]);
  const totals = AGING_BUCKETS.map((_, i) => rows.reduce((s, r) => s + r.buckets[i], 0));
  const grand = totals.reduce((a, b) => a + b, 0);
  const overdue = grand - totals[0];
  return (
    <Card
      title={title}
      subtitle={`Toplam ${money(grand)} · vadesi geçmiş ${money(overdue)} (${grand ? percent(overdue / grand).replace('+', '') : '—'})`}
      action={
        <button className="btn btn-sm no-print export-only" onClick={() => downloadCSV(`${kind === 'tahsilat' ? 'alacak' : 'borc'}_yaslandirma_${ref}.csv`, ['Cari', ...AGING_BUCKETS, 'Toplam'], rows.map((r) => [r.name, ...r.buckets, r.total]))} disabled={!rows.length}>
          <Download size={14} /> CSV
        </button>
      }
    >
      {grand > 0 && (
        <div className="aging-bar" role="img" aria-label="Yaşlandırma dağılımı">
          {totals.map((t, i) =>
            t > 0 ? (
              <div key={i} className={`aging-seg aging-${i}`} style={{ flexGrow: t }} title={`${AGING_BUCKETS[i]}: ${money(t)}`} />
            ) : null,
          )}
        </div>
      )}
      {grand > 0 && (
        <Legend items={AGING_BUCKETS.map((b, i) => ({ label: `${b} · ${money(totals[i], 'TRY', { compact: true })}`, color: `var(--aging-${i})` }))} />
      )}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Cari</th>
              {AGING_BUCKETS.map((b, i) => (
                <th key={b} className={`right ${i > 0 && i < 4 ? 'hide-sm' : ''}`}>
                  {b}
                </th>
              ))}
              <th className="right">Toplam</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.contactId}>
                <td>{r.contactId !== '_' ? <a href={`#/cariler/${encodeURIComponent(r.contactId)}`}>{r.name}</a> : r.name}</td>
                {r.buckets.map((v, i) => (
                  <td key={i} className={`right num ${i > 0 && i < 4 ? 'hide-sm' : ''} ${v && i >= 3 ? 'tone-neg' : ''}`}>
                    {v ? money(v) : '—'}
                  </td>
                ))}
                <td className="right num">
                  <strong>{money(r.total)}</strong>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={7} className="muted center">
                  Açık kayıt yok.
                </td>
              </tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr>
                <th>Toplam</th>
                {totals.map((t, i) => (
                  <th key={i} className={`right num ${i > 0 && i < 4 ? 'hide-sm' : ''}`}>
                    {money(t)}
                  </th>
                ))}
                <th className="right num">{money(grand)}</th>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </Card>
  );
}

function AccountSummary() {
  const { data, ref } = useStore();
  const monthStart = startOfMonth(ref);
  const prevEnd = addDays(monthStart, -1);
  const now = useMemo(() => accountBalances(data, ref), [data, ref]);
  const then = useMemo(() => accountBalances(data, prevEnd), [data, prevEnd]);
  const rows = data.accounts.filter((a) => !a.archived);
  const rates = data.settings.rates;
  const totalNow = rows.reduce((s, a) => s + toTRY(now.get(a.id) ?? 0, a.currency, rates), 0);
  const totalThen = rows.reduce((s, a) => s + toTRY(then.get(a.id) ?? 0, a.currency, rates), 0);
  return (
    <Card
      title="Hesap özeti"
      subtitle={`Ay başı (${fmtDate(prevEnd)}) ile bugün karşılaştırması`}
      action={
        <button
          className="btn btn-sm no-print export-only"
          onClick={() =>
            downloadCSV(`hesap_ozeti_${ref}.csv`, ['Hesap', 'Tür', 'Para birimi', 'Ay başı', 'Bugün', 'Değişim', 'TL karşılığı'], rows.map((a) => [a.name, ACCOUNT_TYPE_LABEL[a.type], a.currency, then.get(a.id) ?? 0, now.get(a.id) ?? 0, (now.get(a.id) ?? 0) - (then.get(a.id) ?? 0), toTRY(now.get(a.id) ?? 0, a.currency, rates)]))
          }
        >
          <Download size={14} /> CSV
        </button>
      }
    >
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Hesap</th>
              <th className="right hide-sm">Ay başı</th>
              <th className="right">Bugün</th>
              <th className="right hide-sm">Değişim</th>
              <th className="right">TL karşılığı</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => {
              const n = now.get(a.id) ?? 0;
              const t = then.get(a.id) ?? 0;
              return (
                <tr key={a.id}>
                  <td>
                    {a.name}
                    <span className="muted small block">{ACCOUNT_TYPE_LABEL[a.type]}</span>
                  </td>
                  <td className="right num hide-sm">{money(t, a.currency)}</td>
                  <td className="right num">{money(n, a.currency)}</td>
                  <td className={`right num hide-sm ${n - t >= 0 ? 'tone-pos' : 'tone-neg'}`}>{money(n - t, a.currency, { sign: true })}</td>
                  <td className="right num">{money(toTRY(n, a.currency, rates))}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <th>Toplam (TL)</th>
              <th className="right num hide-sm">{money(totalThen)}</th>
              <th className="right num">{money(totalNow)}</th>
              <th className={`right num hide-sm ${totalNow - totalThen >= 0 ? 'tone-pos' : 'tone-neg'}`}>{money(totalNow - totalThen, 'TRY', { sign: true })}</th>
              <th className="right num">{money(totalNow)}</th>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
}
