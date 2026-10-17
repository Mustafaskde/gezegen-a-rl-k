import { Area, Bar, BarChart, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps } from 'recharts';
import { fmtDate, fmtMonth, fmtShortDate, money } from '../lib/format';
import type { CashPoint, CategoryTotal, MonthPoint } from '../lib/finance';

const axisProps = {
  stroke: 'var(--axis)',
  tick: { fill: 'var(--text-muted)', fontSize: 12 },
  tickLine: false,
  axisLine: { stroke: 'var(--axis)' },
} as const;

const compact = (v: number) => money(v, 'TRY', { compact: true });

function TipBox({ title, rows }: { title: string; rows: { label: string; value: string; color?: string; dashed?: boolean }[] }) {
  return (
    <div className="chart-tip">
      <div className="chart-tip-title">{title}</div>
      {rows.map((r) => (
        <div key={r.label} className="chart-tip-row">
          {r.color && <span className={`swatch ${r.dashed ? 'swatch-dashed' : ''}`} style={{ background: r.dashed ? undefined : r.color, borderColor: r.color }} />}
          <span>{r.label}</span>
          <strong>{r.value}</strong>
        </div>
      ))}
    </div>
  );
}

export interface CashSeriesPoint {
  date: string;
  actual?: number;
  forecast?: number;
  inflow: number;
  outflow: number;
}

export function mergeCash(history: CashPoint[], forecast: CashPoint[]): CashSeriesPoint[] {
  const out: CashSeriesPoint[] = history.map((p) => ({ date: p.date, actual: p.balance, inflow: p.inflow, outflow: p.outflow }));
  forecast.forEach((p, i) => {
    if (i === 0 && out.length && out[out.length - 1].date === p.date) {
      // Bugün: gerçekleşen bakiye, tahmin çizgisinin başlangıcı olur.
      const last = out[out.length - 1];
      last.forecast = last.actual;
      if (p.inflow || p.outflow) {
        // Gecikmiş/bugün vadeli kalemler bugünden itibaren tahmine yansır
        last.forecast = p.balance;
      }
      return;
    }
    out.push({ date: p.date, forecast: p.balance, inflow: p.inflow, outflow: p.outflow });
  });
  return out;
}

export function CashChart({ data, today, height = 280 }: { data: CashSeriesPoint[]; today: string; height?: number }) {
  return (
    <div className="chart" style={{ height }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 12, right: 12, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="cashFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--series-1)" stopOpacity={0.22} />
              <stop offset="100%" stopColor="var(--series-1)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          <XAxis dataKey="date" {...axisProps} interval="preserveStartEnd" tickFormatter={fmtShortDate} minTickGap={36} />
          <YAxis {...axisProps} width={72} tickFormatter={compact} axisLine={false} />
          <ReferenceLine y={0} stroke="var(--axis-strong)" />
          <ReferenceLine x={today} stroke="var(--text-muted)" strokeDasharray="2 3" label={{ value: 'Bugün', position: 'insideTopRight', fill: 'var(--text-secondary)', fontSize: 12 }} />
          <Tooltip
            cursor={{ stroke: 'var(--text-muted)', strokeWidth: 1 }}
            content={({ active, payload, label }: TooltipProps<number, string>) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as CashSeriesPoint;
              const rows = [];
              if (p.actual !== undefined) rows.push({ label: 'Gerçekleşen bakiye', value: money(p.actual), color: 'var(--series-1)' });
              if (p.forecast !== undefined && p.date !== today) rows.push({ label: 'Tahmini bakiye', value: money(p.forecast), color: 'var(--series-1)', dashed: true });
              if (p.date === today && p.forecast !== undefined && p.forecast !== p.actual) rows.push({ label: 'Gecikmişler dahil', value: money(p.forecast), color: 'var(--series-1)', dashed: true });
              if (p.inflow) rows.push({ label: 'Giriş', value: money(p.inflow, 'TRY', { sign: true }) });
              if (p.outflow) rows.push({ label: 'Çıkış', value: money(-p.outflow, 'TRY', { sign: true }) });
              return <TipBox title={fmtDate(String(label))} rows={rows} />;
            }}
          />
          <Area type="monotone" dataKey="actual" stroke="var(--series-1)" strokeWidth={2} fill="url(#cashFill)" dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)' }} isAnimationActive={false} connectNulls={false} />
          <Line type="stepAfter" dataKey="forecast" stroke="var(--series-1)" strokeWidth={2} strokeDasharray="5 4" dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)' }} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function IncomeExpenseChart({ data, height = 260 }: { data: MonthPoint[]; height?: number }) {
  return (
    <div className="chart" style={{ height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 12, right: 8, left: 4, bottom: 0 }} barGap={2} barCategoryGap="22%">
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          <XAxis dataKey="month" {...axisProps} tickFormatter={fmtMonth} />
          <YAxis {...axisProps} width={72} tickFormatter={compact} axisLine={false} />
          <Tooltip
            cursor={{ fill: 'var(--hover)' }}
            content={({ active, payload, label }: TooltipProps<number, string>) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as MonthPoint;
              return (
                <TipBox
                  title={fmtMonth(String(label))}
                  rows={[
                    { label: 'Gelir', value: money(p.gelir), color: 'var(--series-1)' },
                    { label: 'Gider', value: money(p.gider), color: 'var(--series-2)' },
                    { label: 'Net', value: money(p.net, 'TRY', { sign: true }) },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="gelir" name="Gelir" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
          <Bar dataKey="gider" name="Gider" fill="var(--series-2)" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <div className="legend">
      {items.map((i) => (
        <span key={i.label} className="legend-item">
          <span className={`swatch ${i.dashed ? 'swatch-dashed' : ''}`} style={{ background: i.dashed ? undefined : i.color, borderColor: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

/** Kategori dağılımı: tek renkli yatay çubuklar + doğrudan etiketler (pasta yerine). */
export function CategoryBars({ items, total, color, limit = 7 }: { items: CategoryTotal[]; total: number; color: string; limit?: number }) {
  const shown = items.slice(0, limit);
  const rest = items.slice(limit);
  if (rest.length) shown.push({ id: '_rest', name: `Diğer (${rest.length})`, total: rest.reduce((s, c) => s + c.total, 0), count: rest.reduce((s, c) => s + c.count, 0) });
  const max = Math.max(...shown.map((s) => s.total), 1);
  return (
    <ul className="catbars">
      {shown.map((c) => (
        <li key={c.id} title={`${c.name}: ${money(c.total)} · ${c.count} işlem`}>
          <div className="catbars-label">
            <span>{c.name}</span>
            <span className="num">
              {money(c.total)} <span className="muted">· %{total ? ((c.total / total) * 100).toFixed(1).replace('.', ',') : '0'}</span>
            </span>
          </div>
          <div className="catbars-track">
            <div className="catbars-fill" style={{ width: `${(c.total / max) * 100}%`, background: color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
