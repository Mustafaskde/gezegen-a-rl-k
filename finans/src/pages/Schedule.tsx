import { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, Repeat } from 'lucide-react';
import type { Scheduled, ScheduledKind } from '../types';
import { useStore } from '../store';
import { useModal } from '../components/modals';
import { Card, Empty, PageHeader, Segmented, Stat, StatusBadge } from '../components/ui';
import { RECURRENCE_LABEL } from '../components/forms';
import { occurrences, remaining, scheduledStatus, toTRY, type Occurrence } from '../lib/finance';
import { addDays, addMonths, diffDays, eachDay, endOfMonth, monthKey, startOfMonth } from '../lib/date';
import { fmtDate, fmtLongMonth, money, relativeDays } from '../lib/format';
import { downloadCSV } from '../lib/csv';

type Filter = 'acik' | 'gecikmis' | 'tamamlandi' | 'tumu';
type View = 'liste' | 'takvim';

const GROUPS = [
  { key: 'late', label: 'Gecikmiş', test: (d: number) => d < 0 },
  { key: 'week', label: 'Bu hafta (7 gün)', test: (d: number) => d >= 0 && d <= 7 },
  { key: 'month', label: '8–30 gün', test: (d: number) => d > 7 && d <= 30 },
  { key: 'later', label: '30 günden sonra', test: (d: number) => d > 30 },
];

export default function Schedule({ query }: { query: URLSearchParams }) {
  const { data, ref } = useStore();
  const open = useModal();
  const [kind, setKind] = useState<'tumu' | ScheduledKind>('tumu');
  const [filter, setFilter] = useState<Filter>((query.get('durum') as Filter) || 'acik');
  const [view, setView] = useState<View>('liste');
  const [month, setMonth] = useState(startOfMonth(ref));
  const contactName = useMemo(() => new Map(data.contacts.map((c) => [c.id, c.name])), [data.contacts]);
  const rates = data.settings.rates;

  const items = useMemo(
    () =>
      data.scheduled
        .filter((s) => kind === 'tumu' || s.kind === kind)
        .filter((s) => {
          const st = scheduledStatus(s, ref);
          if (filter === 'acik') return st !== 'tamamlandi';
          if (filter === 'gecikmis') return st === 'gecikmis';
          if (filter === 'tamamlandi') return st === 'tamamlandi';
          return true;
        })
        .sort((a, b) => (filter === 'tamamlandi' ? b.dueDate.localeCompare(a.dueDate) : a.dueDate.localeCompare(b.dueDate))),
    [data.scheduled, kind, filter, ref],
  );

  const stats = useMemo(() => {
    const sum = (k: ScheduledKind, maxDays: number) =>
      data.scheduled
        .filter((s) => s.kind === k && remaining(s) > 0 && diffDays(s.dueDate, ref) >= 0 && diffDays(s.dueDate, ref) <= maxDays)
        .reduce((t, s) => t + toTRY(remaining(s), s.currency, rates), 0);
    const late = (k: ScheduledKind) => data.scheduled.filter((s) => s.kind === k && scheduledStatus(s, ref) === 'gecikmis').reduce((t, s) => t + toTRY(remaining(s), s.currency, rates), 0);
    return { in7: sum('tahsilat', 7), out7: sum('odeme', 7), in30: sum('tahsilat', 30), out30: sum('odeme', 30), lateIn: late('tahsilat'), lateOut: late('odeme') };
  }, [data.scheduled, ref, rates]);

  const exportCSV = () =>
    downloadCSV(
      `vadeli_kayitlar_${ref}.csv`,
      ['Tür', 'Başlık', 'Cari', 'Kayıt tarihi', 'Vade', 'Tutar', 'Ödenen', 'Kalan', 'Para birimi', 'Durum', 'Tekrar'],
      items.map((s) => [s.kind, s.title, s.contactId ? contactName.get(s.contactId) ?? '' : '', s.issueDate, s.dueDate, s.amount, s.paidAmount, remaining(s), s.currency, scheduledStatus(s, ref), RECURRENCE_LABEL[s.recurrence]]),
    );

  const row = (s: Scheduled) => {
    const st = scheduledStatus(s, ref);
    const d = diffDays(s.dueDate, ref);
    return (
      <tr key={s.id} className="clickable" tabIndex={0} onClick={() => open({ type: 'scheduled', initial: s })} onKeyDown={(e) => e.key === 'Enter' && open({ type: 'scheduled', initial: s })}>
        <td className="nowrap">
          {fmtDate(s.dueDate)}
          {st !== 'tamamlandi' && <span className={`small block ${d < 0 ? 'tone-neg' : 'muted'}`}>{relativeDays(d)}</span>}
        </td>
        <td>
          <div className="tx-desc">
            <span className={`dir dir-${s.kind}`} aria-label={s.kind === 'tahsilat' ? 'Tahsilat' : 'Ödeme'}>
              {s.kind === 'tahsilat' ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
            </span>
            <div>
              <strong>{s.title}</strong>
              <span className="muted small">
                {(s.contactId && contactName.get(s.contactId)) || 'Carisiz'}
                {s.recurrence !== 'yok' && (
                  <>
                    {' · '}
                    <Repeat size={11} /> {RECURRENCE_LABEL[s.recurrence]}
                  </>
                )}
              </span>
            </div>
          </div>
        </td>
        <td className="hide-sm">
          <StatusBadge status={st} />
        </td>
        <td className={`right num nowrap ${s.kind === 'tahsilat' ? 'tone-pos' : ''}`}>
          {s.kind === 'tahsilat' ? '+' : '−'}
          {money(st === 'tamamlandi' ? s.amount : remaining(s), s.currency)}
          {s.paidAmount > 0 && st !== 'tamamlandi' && <span className="muted small block">/ {money(s.amount, s.currency)}</span>}
        </td>
        <td className="right" onClick={(e) => e.stopPropagation()}>
          {st !== 'tamamlandi' && (
            <button className="btn btn-xs" onClick={() => open({ type: 'settle', item: s })}>
              {s.kind === 'tahsilat' ? 'Tahsil et' : 'Öde'}
            </button>
          )}
        </td>
      </tr>
    );
  };

  const table = (list: Scheduled[]) => (
    <div className="table-wrap">
      <table className="table table-fixed">
        <thead>
          <tr>
            <th className="w-date">Vade</th>
            <th>Kayıt</th>
            <th className="hide-sm w-status">Durum</th>
            <th className="right w-amount">Tutar</th>
            <th className="w-action" />
          </tr>
        </thead>
        <tbody>{list.map(row)}</tbody>
      </table>
    </div>
  );

  const grouped = filter === 'acik' || filter === 'tumu';

  return (
    <>
      <PageHeader
        title="Ödeme & Tahsilat"
        subtitle="Vadeli alacaklar, borçlar, çekler ve tekrarlayan ödemeler"
        actions={
          <>
            <button className="btn export-only" onClick={exportCSV} disabled={!items.length}>
              CSV
            </button>
            <button className="btn" onClick={() => open({ type: 'scheduled', kind: 'odeme' })}>
              Ödeme planla
            </button>
            <button className="btn btn-primary" onClick={() => open({ type: 'scheduled', kind: 'tahsilat' })}>
              Tahsilat planla
            </button>
          </>
        }
      />
      <div className="stats">
        <Stat label="7 gün içinde tahsilat" value={money(stats.in7)} icon={<ArrowDownLeft size={14} />} sub={`30 gün: ${money(stats.in30, 'TRY', { compact: true })}`} />
        <Stat label="7 gün içinde ödeme" value={money(stats.out7)} icon={<ArrowUpRight size={14} />} sub={`30 gün: ${money(stats.out30, 'TRY', { compact: true })}`} />
        <Stat label="Gecikmiş tahsilat" value={money(stats.lateIn)} tone={stats.lateIn ? 'warn' : undefined} />
        <Stat label="Gecikmiş ödeme" value={money(stats.lateOut)} tone={stats.lateOut ? 'neg' : undefined} />
      </div>
      <Card>
        <div className="filters">
          <Segmented
            label="Görünüm"
            value={view}
            onChange={setView}
            options={[
              { value: 'liste', label: 'Liste' },
              { value: 'takvim', label: 'Takvim' },
            ]}
          />
          <Segmented
            label="Tür"
            value={kind}
            onChange={setKind}
            options={[
              { value: 'tumu', label: 'Tümü' },
              { value: 'tahsilat', label: 'Tahsilatlar' },
              { value: 'odeme', label: 'Ödemeler' },
            ]}
          />
          {view === 'liste' && (
            <select value={filter} onChange={(e) => setFilter(e.target.value as Filter)} aria-label="Durum">
              <option value="acik">Açık kayıtlar</option>
              <option value="gecikmis">Yalnızca gecikmiş</option>
              <option value="tamamlandi">Tamamlananlar</option>
              <option value="tumu">Tümü</option>
            </select>
          )}
        </div>
        {view === 'takvim' ? (
          <Calendar month={month} setMonth={setMonth} kind={kind} />
        ) : !items.length ? (
          <Empty title="Kayıt yok">Seçili filtrelerle eşleşen vadeli kayıt bulunamadı.</Empty>
        ) : grouped ? (
          GROUPS.map((g) => {
            const list = items.filter((s) => remaining(s) > 0 && g.test(diffDays(s.dueDate, ref)));
            if (!list.length) return null;
            const net = list.reduce((t, s) => t + (s.kind === 'tahsilat' ? 1 : -1) * toTRY(remaining(s), s.currency, rates), 0);
            return (
              <div key={g.key} className="group">
                <div className="group-head">
                  <h4>{g.label}</h4>
                  <span className="muted small">
                    {list.length} kayıt · net <span className={net >= 0 ? 'tone-pos' : 'tone-neg'}>{money(net, 'TRY', { sign: true })}</span>
                  </span>
                </div>
                {table(list)}
              </div>
            );
          })
        ) : (
          table(items)
        )}
        {grouped && view === 'liste' && filter === 'tumu' && items.some((s) => remaining(s) <= 0) && (
          <div className="group">
            <div className="group-head">
              <h4>Tamamlananlar</h4>
            </div>
            {table(items.filter((s) => remaining(s) <= 0).reverse())}
          </div>
        )}
      </Card>
    </>
  );
}

function Calendar({ month, setMonth, kind }: { month: string; setMonth: (m: string) => void; kind: 'tumu' | ScheduledKind }) {
  const { data, ref } = useStore();
  const open = useModal();
  const first = month;
  const last = endOfMonth(month);
  // Pazartesi başlangıçlı ızgara
  const dow = (new Date(first + 'T00:00:00Z').getUTCDay() + 6) % 7;
  const gridStart = addDays(first, -dow);
  const gridEnd = addDays(gridStart, 41);
  const occ = useMemo(() => occurrences(data, gridStart, gridEnd).filter((o) => kind === 'tumu' || o.scheduled.kind === kind), [data, gridStart, gridEnd, kind]);
  const byDay = new Map<string, Occurrence[]>();
  for (const o of occ) byDay.set(o.date, [...(byDay.get(o.date) ?? []), o]);
  const days = eachDay(gridStart, gridEnd);

  return (
    <div className="calendar">
      <div className="cal-head">
        <button className="icon-btn" onClick={() => setMonth(addMonths(month, -1))} aria-label="Önceki ay">
          <ChevronLeft size={18} />
        </button>
        <strong>{fmtLongMonth(month)}</strong>
        <button className="icon-btn" onClick={() => setMonth(addMonths(month, 1))} aria-label="Sonraki ay">
          <ChevronRight size={18} />
        </button>
        <button className="btn btn-sm" onClick={() => setMonth(startOfMonth(ref))}>
          Bugün
        </button>
        <span className="muted small">Kesik çerçeveli kayıtlar tekrar kuralından öngörülen dönemlerdir.</span>
      </div>
      <div className="cal-grid">
        {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((d) => (
          <div key={d} className="cal-dow">
            {d}
          </div>
        ))}
        {days.map((d) => {
          const list = byDay.get(d) ?? [];
          const outside = monthKey(d) !== monthKey(first) || d > last;
          return (
            <div key={d} className={`cal-day ${outside ? 'outside' : ''} ${d === ref ? 'today' : ''}`}>
              <span className="cal-num">{Number(d.slice(8))}</span>
              {list.slice(0, 3).map((o, i) => (
                <button
                  key={o.scheduled.id + i}
                  className={`cal-item cal-${o.scheduled.kind} ${o.virtual ? 'virtual' : ''}`}
                  title={`${o.scheduled.title} · ${money(o.amountTRY)}`}
                  onClick={() => (o.virtual ? open({ type: 'scheduled', initial: o.scheduled }) : open({ type: 'settle', item: o.scheduled }))}
                >
                  {o.scheduled.kind === 'tahsilat' ? '+' : '−'}
                  {money(o.amountTRY, 'TRY', { compact: true })} {o.scheduled.title}
                </button>
              ))}
              {list.length > 3 && <span className="muted small">+{list.length - 3} kayıt</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
