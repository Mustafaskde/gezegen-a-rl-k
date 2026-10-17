import { useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useStore } from '../store';
import { Card, PageHeader, Segmented, Stat } from '../components/ui';
import { CashChart, Legend, mergeCash } from '../components/charts';
import { cashForecast, cashHistory, occurrences, totalCash } from '../lib/finance';
import { addDays, monthKey } from '../lib/date';
import { fmtDate, fmtLongMonth, money } from '../lib/format';

const HORIZONS = [
  { value: '30', label: '30 gün' },
  { value: '60', label: '60 gün' },
  { value: '90', label: '90 gün' },
  { value: '180', label: '6 ay' },
] as const;

export default function CashFlow() {
  const { data, ref } = useStore();
  const [horizon, setHorizon] = useState<(typeof HORIZONS)[number]['value']>('90');
  const [includeOverdue, setIncludeOverdue] = useState(true);
  const days = Number(horizon);

  const r = useMemo(() => {
    const history = cashHistory(data, addDays(ref, -Math.min(days, 90)), ref);
    const forecast = cashForecast(data, ref, days, includeOverdue);
    const occ = occurrences(data, ref, addDays(ref, days), includeOverdue ? ref : undefined);
    const cash = totalCash(data, ref);
    const end = forecast[forecast.length - 1].balance;
    const min = forecast.reduce((a, b) => (b.balance < a.balance ? b : a), forecast[0]);
    const firstNeg = forecast.find((p) => p.balance < 0);
    const inflow = forecast.reduce((s, p) => s + p.inflow, 0);
    const outflow = forecast.reduce((s, p) => s + p.outflow, 0);
    // Aylık kırılım
    const months = new Map<string, { inflow: number; outflow: number }>();
    for (const p of forecast) {
      const k = monthKey(p.date);
      const m = months.get(k) ?? { inflow: 0, outflow: 0 };
      m.inflow += p.inflow;
      m.outflow += p.outflow;
      months.set(k, m);
    }
    let running = cash;
    const monthRows = [...months.entries()].map(([k, m]) => {
      const open = running;
      running += m.inflow - m.outflow;
      return { month: k, open, ...m, close: running };
    });
    return { history, forecast, occ, cash, end, min, firstNeg, inflow, outflow, monthRows };
  }, [data, ref, days, includeOverdue]);

  const contactName = new Map(data.contacts.map((c) => [c.id, c.name]));
  let running = r.cash;

  return (
    <>
      <PageHeader title="Nakit Akışı" subtitle="Gerçekleşen bakiye ve vadeli kayıtlara dayalı ileriye dönük tahmin" />
      <div className="stats">
        <Stat label="Bugünkü nakit" value={money(r.cash)} />
        <Stat label="Beklenen giriş" value={money(r.inflow)} tone="pos" sub={`${HORIZONS.find((h) => h.value === horizon)!.label} içinde`} />
        <Stat label="Beklenen çıkış" value={money(r.outflow)} sub={`${HORIZONS.find((h) => h.value === horizon)!.label} içinde`} />
        <Stat label="Dönem sonu tahmini" value={money(r.end)} tone={r.end < 0 ? 'neg' : undefined} sub={`Değişim ${money(r.end - r.cash, 'TRY', { sign: true, compact: true })}`} />
        <Stat label="En düşük seviye" value={money(r.min.balance)} tone={r.min.balance < 0 ? 'neg' : undefined} sub={fmtDate(r.min.date)} />
      </div>

      {r.firstNeg && (
        <div className="alert alert-warning">
          <AlertTriangle size={16} />
          <span>
            Mevcut planla nakit <strong>{fmtDate(r.firstNeg.date)}</strong> tarihinde eksiye düşüyor ({money(r.firstNeg.balance)}). Tahsilatları öne çekmeyi veya ödemeleri ertelemeyi değerlendirin.
          </span>
        </div>
      )}

      <Card
        title="Nakit pozisyonu"
        action={
          <div className="row-gap">
            <label className="check">
              <input type="checkbox" checked={includeOverdue} onChange={(e) => setIncludeOverdue(e.target.checked)} /> Gecikmişleri bugüne dahil et
            </label>
            <Segmented label="Tahmin ufku" value={horizon} onChange={setHorizon} options={HORIZONS.map((h) => ({ value: h.value, label: h.label }))} />
          </div>
        }
      >
        <Legend
          items={[
            { label: 'Gerçekleşen', color: 'var(--series-1)' },
            { label: 'Tahmin', color: 'var(--series-1)', dashed: true },
          ]}
        />
        <CashChart data={mergeCash(r.history, r.forecast)} today={ref} height={340} />
      </Card>

      <div className="grid-1-1">
        <Card title="Aylık nakit tablosu">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Ay</th>
                  <th className="right">Açılış</th>
                  <th className="right">Giriş</th>
                  <th className="right">Çıkış</th>
                  <th className="right">Kapanış</th>
                </tr>
              </thead>
              <tbody>
                {r.monthRows.map((m) => (
                  <tr key={m.month}>
                    <td className="nowrap">{fmtLongMonth(m.month)}</td>
                    <td className="right num">{money(m.open)}</td>
                    <td className="right num tone-pos">+{money(m.inflow)}</td>
                    <td className="right num">−{money(m.outflow)}</td>
                    <td className={`right num ${m.close < 0 ? 'tone-neg' : ''}`}>
                      <strong>{money(m.close)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Planlanan hareketler" subtitle="Tarih sırasıyla, kümülatif bakiye">
          <div className="table-wrap scroll-y">
            <table className="table">
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Kayıt</th>
                  <th className="right">Tutar</th>
                  <th className="right">Bakiye</th>
                </tr>
              </thead>
              <tbody>
                {r.occ.map((o, i) => {
                  const v = o.scheduled.kind === 'tahsilat' ? o.amountTRY : -o.amountTRY;
                  running += v;
                  return (
                    <tr key={o.scheduled.id + i} className={o.virtual ? 'is-virtual' : ''}>
                      <td className="nowrap muted">{fmtDate(o.date)}</td>
                      <td>
                        {o.scheduled.title}
                        <span className="muted small block">
                          {(o.scheduled.contactId && contactName.get(o.scheduled.contactId)) || '—'}
                          {o.virtual ? ' · öngörülen tekrar' : o.scheduled.dueDate < ref ? ' · gecikmiş' : ''}
                        </span>
                      </td>
                      <td className={`right num ${v > 0 ? 'tone-pos' : ''}`}>{money(v, 'TRY', { sign: true })}</td>
                      <td className={`right num ${running < 0 ? 'tone-neg' : ''}`}>{money(running)}</td>
                    </tr>
                  );
                })}
                {!r.occ.length && (
                  <tr>
                    <td colSpan={4} className="muted center">
                      Bu dönemde planlanmış hareket yok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
