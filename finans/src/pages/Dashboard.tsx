import { useMemo } from 'react';
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, ChevronRight } from 'lucide-react';
import { useStore } from '../store';
import { useModal } from '../components/modals';
import { Card, Empty, PageHeader, Stat, StatusBadge } from '../components/ui';
import { CashChart, IncomeExpenseChart, Legend, mergeCash } from '../components/charts';
import { accountBalances, cashForecast, cashHistory, contactBalances, monthlySeries, occurrences, periodSummary, remaining, scheduledStatus, totalCash, toTRY } from '../lib/finance';
import { addDays, addMonths, diffDays, endOfMonth, startOfMonth } from '../lib/date';
import { fmtDate, fmtShortDate, money, percent, relativeDays } from '../lib/format';
import { ACCOUNT_TYPE_LABEL } from '../components/forms';
import { TxRow } from './Transactions';

export default function Dashboard() {
  const { data, ref } = useStore();
  const open = useModal();

  const m = useMemo(() => {
    const cash = totalCash(data, ref);
    const ms = startOfMonth(ref);
    const thisMonth = periodSummary(data, ms, ref);
    const prevStart = addMonths(ms, -1);
    // Geçen ayın aynı gününe kadar, adil kıyas
    const prevSameDay = addMonths(ref, -1) > endOfMonth(prevStart) ? endOfMonth(prevStart) : addMonths(ref, -1);
    const prevMonth = periodSummary(data, prevStart, prevSameDay);
    const balances = contactBalances(data, ref);
    let receivable = 0;
    let payable = 0;
    for (const b of balances.values()) {
      receivable += b.receivable;
      payable += b.payable;
    }
    // Carisiz vadeli kayıtlar da açık alacak/borç toplamına dahil
    for (const s of data.scheduled) {
      if (s.contactId) continue;
      const v = toTRY(remaining(s), s.currency, data.settings.rates);
      if (s.kind === 'tahsilat') receivable += v;
      else payable += v;
    }
    const forecast = cashForecast(data, ref, 60);
    const history = cashHistory(data, addDays(ref, -30), ref);
    const in30 = forecast[30]?.balance ?? cash;
    const minPoint = forecast.reduce((a, b) => (b.balance < a.balance ? b : a), forecast[0]);
    const upcoming = occurrences(data, ref, addDays(ref, 14), undefined).filter((o) => !o.virtual);
    const overdue = data.scheduled.filter((s) => scheduledStatus(s, ref) === 'gecikmis').sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const months = monthlySeries(data, startOfMonth(addMonths(ref, -5)), ref);
    return { cash, thisMonth, prevMonth, receivable, payable, forecast, history, in30, minPoint, upcoming, overdue, months };
  }, [data, ref]);

  const bals = useMemo(() => accountBalances(data, ref), [data, ref]);
  const recent = useMemo(() => [...data.transactions].filter((t) => t.date <= ref).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7), [data.transactions, ref]);
  const contactName = new Map(data.contacts.map((c) => [c.id, c.name]));
  const chartData = mergeCash(m.history, m.forecast);
  const netChange = m.prevMonth.net ? (m.thisMonth.net - m.prevMonth.net) / Math.abs(m.prevMonth.net) : NaN;
  const dueList = [...m.overdue.map((s) => ({ s, date: s.dueDate })), ...m.upcoming.map((o) => ({ s: o.scheduled, date: o.date }))].slice(0, 8);

  if (!data.accounts.length) {
    return (
      <>
        <PageHeader title="Genel Bakış" />
        <Empty title="Başlamak için bir hesap ekleyin" action={<button className="btn btn-primary" onClick={() => open({ type: 'account' })}>Hesap ekle</button>}>
          Banka hesaplarınızı ve kasanızı ekledikten sonra gelir, gider ve vadeli kayıtlarınızı girebilirsiniz. Ayarlar sayfasından demo veriyi de yükleyebilirsiniz.
        </Empty>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Genel Bakış" subtitle={`${fmtDate(ref)} itibarıyla anlık finansal durum`} />

      {(m.overdue.length > 0 || m.minPoint.balance < 0) && (
        <div className="alerts">
          {m.overdue.length > 0 && (
            <a className="alert alert-critical" href="#/vadeler?durum=gecikmis">
              <AlertTriangle size={16} />
              <span>
                <strong>{m.overdue.length} gecikmiş kayıt</strong> · toplam {money(m.overdue.reduce((s, x) => s + toTRY(remaining(x), x.currency, data.settings.rates), 0))}
              </span>
              <ChevronRight size={16} />
            </a>
          )}
          {m.minPoint.balance < 0 && (
            <a className="alert alert-warning" href="#/nakit-akisi">
              <AlertTriangle size={16} />
              <span>
                Tahmini nakit <strong>{fmtDate(m.minPoint.date)}</strong> tarihinde {money(m.minPoint.balance)} seviyesine düşüyor.
              </span>
              <ChevronRight size={16} />
            </a>
          )}
        </div>
      )}

      <div className="stats">
        <Stat label="Toplam nakit" value={money(m.cash)} sub={`${data.accounts.filter((a) => !a.archived).length} hesap · döviz güncel kurla`} />
        <Stat label="Bu ay gelir" value={money(m.thisMonth.income)} sub={`Geçen ay aynı dönem ${money(m.prevMonth.income, 'TRY', { compact: true })}`} />
        <Stat
          label="Bu ay gider"
          value={money(m.thisMonth.expense)}
          sub={
            <>
              Net <span className={m.thisMonth.net >= 0 ? 'tone-pos' : 'tone-neg'}>{money(m.thisMonth.net, 'TRY', { sign: true, compact: true })}</span>
              {isFinite(netChange) ? ` · geçen aya göre ${percent(netChange)}` : ''}
            </>
          }
        />
        <Stat label="Açık alacak" value={money(m.receivable)} icon={<ArrowDownLeft size={14} />} sub="Vadeli tahsilatlar" />
        <Stat label="Açık borç" value={money(m.payable)} icon={<ArrowUpRight size={14} />} sub="Vadeli ödemeler" />
        <Stat label="30 gün sonra (tahmini)" value={money(m.in30)} tone={m.in30 < 0 ? 'neg' : undefined} sub={`Bugüne göre ${money(m.in30 - m.cash, 'TRY', { sign: true, compact: true })}`} />
      </div>

      <div className="grid-2-1">
        <div className="col">
          <Card
            title="Nakit pozisyonu"
            subtitle="Son 30 gün gerçekleşen, önümüzdeki 60 gün vadeli kayıtlara göre tahmin"
            action={
              <a className="link" href="#/nakit-akisi">
                Detay <ChevronRight size={14} />
              </a>
            }
          >
            <Legend
              items={[
                { label: 'Gerçekleşen', color: 'var(--series-1)' },
                { label: 'Tahmin', color: 'var(--series-1)', dashed: true },
              ]}
            />
            <CashChart data={chartData} today={ref} />
          </Card>
          <Card
            title="Aylık gelir ve gider"
            subtitle="Son 6 ay"
            action={
              <a className="link" href="#/raporlar">
                Raporlar <ChevronRight size={14} />
              </a>
            }
          >
            <Legend
              items={[
                { label: 'Gelir', color: 'var(--series-1)' },
                { label: 'Gider', color: 'var(--series-2)' },
              ]}
            />
            <IncomeExpenseChart data={m.months} />
          </Card>
        </div>
        <div className="col">
          <Card
            title="Yaklaşan & gecikmiş"
            subtitle="Önümüzdeki 14 gün"
            action={
              <a className="link" href="#/vadeler">
                Tümü <ChevronRight size={14} />
              </a>
            }
          >
            {dueList.length === 0 ? (
              <Empty title="Yaklaşan kayıt yok" />
            ) : (
              <ul className="due-list">
                {dueList.map(({ s, date }) => {
                  const st = scheduledStatus(s, ref);
                  const d = diffDays(date, ref);
                  return (
                    <li key={s.id}>
                      <span className={`dir dir-${s.kind}`} aria-label={s.kind === 'tahsilat' ? 'Tahsilat' : 'Ödeme'}>
                        {s.kind === 'tahsilat' ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
                      </span>
                      <div className="due-main">
                        <strong>{s.title}</strong>
                        <span className="muted small">
                          {(s.contactId && contactName.get(s.contactId)) || '—'} · {fmtShortDate(date)} · <span className={d < 0 ? 'tone-neg' : ''}>{relativeDays(d)}</span>
                        </span>
                      </div>
                      <div className="due-side">
                        <span className={`num ${s.kind === 'tahsilat' ? 'tone-pos' : ''}`}>
                          {s.kind === 'tahsilat' ? '+' : '−'}
                          {money(remaining(s), s.currency)}
                        </span>
                        {st === 'gecikmis' ? <StatusBadge status={st} /> : null}
                        <button className="btn btn-xs" onClick={() => open({ type: 'settle', item: s })}>
                          {s.kind === 'tahsilat' ? 'Tahsil et' : 'Öde'}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
          <Card
            title="Hesaplar"
            action={
              <a className="link" href="#/hesaplar">
                Yönet <ChevronRight size={14} />
              </a>
            }
          >
            <ul className="acc-list">
              {data.accounts
                .filter((a) => !a.archived)
                .map((a) => {
                  const b = bals.get(a.id) ?? 0;
                  return (
                    <li key={a.id}>
                      <div>
                        <strong>{a.name}</strong>
                        <span className="muted small">
                          {a.bank ?? ACCOUNT_TYPE_LABEL[a.type]} · {a.currency}
                        </span>
                      </div>
                      <div className="right">
                        <span className={`num ${b < 0 ? 'tone-neg' : ''}`}>{money(b, a.currency)}</span>
                        {a.currency !== 'TRY' && <span className="muted small num">≈ {money(toTRY(b, a.currency, data.settings.rates))}</span>}
                      </div>
                    </li>
                  );
                })}
            </ul>
          </Card>
        </div>
      </div>

      <Card
        title="Son işlemler"
        action={
          <a className="link" href="#/islemler">
            Tümü <ChevronRight size={14} />
          </a>
        }
      >
        {recent.length ? (
          <div className="table-wrap">
            <table className="table">
              <tbody>
                {recent.map((t) => (
                  <TxRow key={t.id} tx={t} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="Henüz işlem yok" />
        )}
      </Card>
    </>
  );
}
