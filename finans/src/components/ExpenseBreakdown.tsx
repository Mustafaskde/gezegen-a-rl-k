import { useMemo, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, type TooltipProps } from 'recharts';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { useStore } from '../store';
import { expenseBreakdown, monthToDate } from '../lib/insights';
import { addMonths, endOfMonth, startOfMonth, startOfYear } from '../lib/date';
import { money } from '../lib/format';
import { Segmented } from './ui';

type Range = 'bu-ay' | 'gecen-ay' | 'son-3' | 'bu-yil';

const RANGES: { value: Range; label: string }[] = [
  { value: 'bu-ay', label: 'Bu ay' },
  { value: 'gecen-ay', label: 'Geçen ay' },
  { value: 'son-3', label: 'Son 3 ay' },
  { value: 'bu-yil', label: 'Bu yıl' },
];

function rangeOf(r: Range, ref: string) {
  switch (r) {
    case 'bu-ay': {
      const p = monthToDate(ref);
      return { ...p, compare: 'geçen ayın aynı dönemine göre' };
    }
    case 'gecen-ay': {
      const from = addMonths(startOfMonth(ref), -1);
      const prevFrom = addMonths(from, -1);
      return { from, to: endOfMonth(from), prevFrom, prevTo: endOfMonth(prevFrom), compare: 'önceki aya göre' };
    }
    case 'son-3': {
      const from = startOfMonth(addMonths(ref, -2));
      return { from, to: ref, prevFrom: addMonths(from, -3), prevTo: addMonths(ref, -3), compare: 'önceki 3 aya göre' };
    }
    case 'bu-yil': {
      const from = startOfYear(ref);
      return { from, to: ref, prevFrom: addMonths(from, -12), prevTo: addMonths(ref, -12), compare: 'geçen yılın aynı dönemine göre' };
    }
  }
}

export const catColor = (i: number) => (i >= 0 ? `var(--cat-${i + 1})` : 'var(--cat-other)');
const fmtPct = (v: number) => `%${(v * 100).toFixed(1).replace('.', ',')}`;
const MAX_SEGMENTS = 5;

export default function ExpenseBreakdown() {
  const { data, ref } = useStore();
  const [range, setRange] = useState<Range>('bu-ay');
  const r = rangeOf(range, ref);
  const b = useMemo(() => expenseBreakdown(data, r.from, r.to, r.prevFrom, r.prevTo), [data, r.from, r.to, r.prevFrom, r.prevTo]);

  // Halka en fazla 6 dilim: en büyük 5 kategori + Diğer. Renk kategoriye bağlıdır.
  const top = b.slices.slice(0, MAX_SEGMENTS);
  const rest = b.slices.slice(MAX_SEGMENTS);
  const restTotal = rest.reduce((s, x) => s + x.total, 0);
  const restPrev = rest.reduce((s, x) => s + x.prevTotal, 0);
  const segments = [
    ...top.map((s) => ({ ...s, color: catColor(s.colorIndex) })),
    ...(rest.length
      ? [{ id: '_rest', name: `Diğer (${rest.length} kategori)`, total: restTotal, pct: b.total ? restTotal / b.total : 0, prevTotal: restPrev, change: restPrev ? (restTotal - restPrev) / restPrev : NaN, essential: false, colorIndex: -1, color: 'var(--cat-other)' }]
      : []),
  ];
  const totalChange = b.prevTotal ? (b.total - b.prevTotal) / b.prevTotal : NaN;
  const essentialPct = b.total ? b.essentialTotal / b.total : 0;

  return (
    <section className="card breakdown">
      <header className="card-head">
        <div>
          <h3>Giderler nereye gidiyor?</h3>
          <p className="muted small">Kategori payları {r.compare} değişimle</p>
        </div>
        <Segmented label="Dönem" value={range} onChange={setRange} options={RANGES} />
      </header>
      {b.total === 0 ? (
        <p className="muted pad">Bu dönemde gider kaydı yok.</p>
      ) : (
        <>
          <div className="breakdown-grid">
            <div className="donut">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={segments} dataKey="total" nameKey="name" innerRadius="70%" outerRadius="100%" startAngle={90} endAngle={-270} stroke="var(--surface)" strokeWidth={2} isAnimationActive={false}>
                    {segments.map((s) => (
                      <Cell key={s.id} fill={s.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }: TooltipProps<number, string>) => {
                      if (!active || !payload?.length) return null;
                      const s = payload[0].payload as (typeof segments)[number];
                      return (
                        <div className="chart-tip">
                          <div className="chart-tip-title">{s.name}</div>
                          <div className="chart-tip-row">
                            <span>Pay</span>
                            <strong>{fmtPct(s.pct)}</strong>
                          </div>
                          <div className="chart-tip-row">
                            <span>Tutar</span>
                            <strong>{money(s.total)}</strong>
                          </div>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-center">
                <span className="muted small">Toplam gider</span>
                <strong>{money(b.total, 'TRY', { compact: true })}</strong>
                {isFinite(totalChange) && <Change value={totalChange} />}
              </div>
            </div>
            <ul className="share-list">
              {segments.map((s) => (
                <li key={s.id}>
                  <span className="swatch" style={{ background: s.color }} />
                  <div className="share-name">
                    <span>{s.name}</span>
                    <span className="muted small">{s.id === '_rest' ? rest.map((x) => x.name).join(', ') : s.essential ? 'Zorunlu' : 'İsteğe bağlı'}</span>
                  </div>
                  <div className="share-nums">
                    <strong className="num">{fmtPct(s.pct)}</strong>
                    <span className="muted small num">{money(s.total)}</span>
                  </div>
                  <div className="share-change">{isFinite(s.change) ? <Change value={s.change} /> : <span className="muted small">yeni</span>}</div>
                </li>
              ))}
            </ul>
          </div>
          <div className="split">
            <div className="split-labels">
              <span>
                <span className="swatch swatch-essential" /> Zorunlu <strong className="num">{fmtPct(essentialPct)}</strong> <span className="muted num">{money(b.essentialTotal)}</span>
              </span>
              <span>
                <span className="swatch swatch-discretionary" /> İsteğe bağlı <strong className="num">{fmtPct(1 - essentialPct)}</strong> <span className="muted num">{money(b.discretionaryTotal)}</span>
              </span>
            </div>
            <div className="split-bar" role="img" aria-label={`Zorunlu ${fmtPct(essentialPct)}, isteğe bağlı ${fmtPct(1 - essentialPct)}`}>
              <div className="split-essential" style={{ flexGrow: b.essentialTotal }} />
              <div className="split-discretionary" style={{ flexGrow: b.discretionaryTotal }} />
            </div>
          </div>
        </>
      )}
    </section>
  );
}

/** Gider değişimi: artış kötü (kırmızı), azalış iyi (yeşil). */
export function Change({ value, goodWhenUp = false }: { value: number; goodWhenUp?: boolean }) {
  const up = value >= 0;
  const good = up === goodWhenUp;
  return (
    <span className={`change ${Math.abs(value) < 0.005 ? '' : good ? 'change-good' : 'change-bad'}`}>
      {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {/* Çok büyük artışlarda yüzde yerine kat göster (ör. 12,7×) */}
      {value >= 3 ? `${(1 + value).toFixed(1).replace('.', ',')}×` : fmtPct(Math.abs(value))}
    </span>
  );
}
