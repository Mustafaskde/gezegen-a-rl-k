import { useMemo, type ReactNode } from 'react';
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, CheckCircle2, ChevronRight, CircleAlert, Info, Sparkles } from 'lucide-react';
import { useStore } from '../store';
import { useModal } from '../components/modals';
import { useAssistant } from '../components/Assistant';
import { Card, Empty, PageHeader, StatusBadge } from '../components/ui';
import { CashChart, IncomeExpenseChart, Legend, mergeCash } from '../components/charts';
import ExpenseBreakdown, { Change } from '../components/ExpenseBreakdown';
import { accountBalances, cashForecast, cashHistory, contactBalances, monthlySeries, occurrences, remaining, scheduledStatus, toTRY } from '../lib/finance';
import { analyze, type Severity } from '../lib/insights';
import { addDays, addMonths, diffDays, startOfMonth } from '../lib/date';
import { fmtDate, fmtShortDate, money, relativeDays } from '../lib/format';
import { ACCOUNT_TYPE_LABEL } from '../components/forms';
import { TxRow } from './Transactions';

const SEVERITY: Record<Severity, { icon: ReactNode; label: string }> = {
  critical: { icon: <CircleAlert size={16} />, label: 'Kritik' },
  warning: { icon: <AlertTriangle size={16} />, label: 'Dikkat' },
  info: { icon: <Info size={16} />, label: 'Bilgi' },
  good: { icon: <CheckCircle2 size={16} />, label: 'İyi' },
};

function Kpi({ label, value, change, goodWhenUp, sub, tone }: { label: string; value: string; change?: number; goodWhenUp?: boolean; sub?: ReactNode; tone?: 'pos' | 'neg' }) {
  return (
    <div className="kpi">
      <span className="kpi-label">{label}</span>
      <span className={`kpi-value ${tone ? `tone-${tone}` : ''}`}>{value}</span>
      <span className="kpi-sub">
        {change !== undefined && isFinite(change) && <Change value={change} goodWhenUp={goodWhenUp} />}
        {sub}
      </span>
    </div>
  );
}

export default function Dashboard() {
  const { data, ref } = useStore();
  const open = useModal();
  const assistant = useAssistant();

  const a = useMemo(() => analyze(data, ref), [data, ref]);
  const m = useMemo(() => {
    const balances = contactBalances(data, ref);
    let receivable = 0;
    let payable = 0;
    for (const b of balances.values()) {
      receivable += b.receivable;
      payable += b.payable;
    }
    for (const s of data.scheduled) {
      if (s.contactId) continue;
      const v = toTRY(remaining(s), s.currency, data.settings.rates);
      if (s.kind === 'tahsilat') receivable += v;
      else payable += v;
    }
    const forecast = cashForecast(data, ref, 60);
    const history = cashHistory(data, addDays(ref, -45), ref);
    const cash30ago = history[15]?.balance ?? history[0]?.balance ?? 0;
    const upcoming = occurrences(data, ref, addDays(ref, 14), undefined).filter((o) => !o.virtual);
    const overdue = data.scheduled.filter((s) => scheduledStatus(s, ref) === 'gecikmis').sort((x, y) => x.dueDate.localeCompare(y.dueDate));
    const months = monthlySeries(data, startOfMonth(addMonths(ref, -5)), ref);
    return { receivable, payable, forecast, history, cash30ago, upcoming, overdue, months };
  }, [data, ref]);

  const bals = useMemo(() => accountBalances(data, ref), [data, ref]);
  const recent = useMemo(() => [...data.transactions].filter((t) => t.date <= ref).sort((x, y) => y.date.localeCompare(x.date)).slice(0, 6), [data.transactions, ref]);
  const contactName = new Map(data.contacts.map((c) => [c.id, c.name]));
  const dueList = [...m.overdue.map((s) => ({ s, date: s.dueDate })), ...m.upcoming.map((o) => ({ s: o.scheduled, date: o.date }))].slice(0, 6);
  const change = (cur: number, prev: number) => (prev ? (cur - prev) / Math.abs(prev) : NaN);
  const issues = a.insights.filter((i) => i.severity !== 'good');

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
      <PageHeader
        eyebrow={fmtDate(ref)}
        title="Genel Bakış"
        subtitle={`${data.settings.companyName} için anlık finansal durum`}
        actions={
          <button className="btn" onClick={() => assistant.ask('Bu ayın genel durumunu özetler misin?')}>
            <Sparkles size={15} /> Bu ayı özetle
          </button>
        }
      />

      {(m.overdue.length > 0 || a.minBalance < 0) && (
        <div className="alerts">
          {m.overdue.length > 0 && (
            <a className="alert alert-critical" href="#/vadeler?durum=gecikmis">
              <AlertTriangle size={16} />
              <span>
                <strong>{m.overdue.length} gecikmiş kayıt</strong> · tahsilat {money(a.overdueReceivableTotal)}, ödeme {money(a.overduePayableTotal)}
              </span>
              <ChevronRight size={16} />
            </a>
          )}
          {a.minBalance < 0 && (
            <a className="alert alert-warning" href="#/nakit-akisi">
              <AlertTriangle size={16} />
              <span>
                Tahmini nakit <strong>{fmtDate(a.minDate)}</strong> tarihinde {money(a.minBalance)} seviyesine düşüyor.
              </span>
              <ChevronRight size={16} />
            </a>
          )}
        </div>
      )}

      <section className="kpi-strip" aria-label="Temel göstergeler">
        <Kpi label="Toplam nakit" value={money(a.cash)} change={change(a.cash, m.cash30ago)} goodWhenUp sub={<span>30 güne göre</span>} />
        <Kpi label="Bu ay gelir" value={money(a.income)} change={change(a.income, a.prevIncome)} goodWhenUp sub={<span>geçen ay aynı dönem</span>} />
        <Kpi label="Bu ay gider" value={money(a.expense)} change={change(a.expense, a.prevExpense)} sub={<span>geçen ay aynı dönem</span>} />
        <Kpi label="Net sonuç" value={money(a.net, 'TRY', { sign: true })} tone={a.net >= 0 ? 'pos' : 'neg'} sub={<span>kâr marjı {a.income ? `%${Math.round((a.net / a.income) * 100)}` : '—'}</span>} />
        <Kpi label="Açık alacak" value={money(m.receivable)} sub={<span className={a.overdueReceivableTotal ? 'tone-warn' : ''}>{money(a.overdueReceivableTotal, 'TRY', { compact: true })} gecikmiş</span>} />
        <Kpi label="Açık borç" value={money(m.payable)} sub={<span>30 günde {money(a.upcomingOut30, 'TRY', { compact: true })} ödeme</span>} />
      </section>

      <div className="grid-2-1">
        <div className="col">
          <Card
            title="Nakit pozisyonu"
            subtitle="Son 45 gün gerçekleşen, önümüzdeki 60 gün vadeli kayıtlara göre tahmin"
            action={
              <a className="link" href="#/nakit-akisi">
                Nakit akışı <ChevronRight size={14} />
              </a>
            }
          >
            <Legend
              items={[
                { label: 'Gerçekleşen', color: 'var(--series-1)' },
                { label: 'Tahmin', color: 'var(--series-1)', dashed: true },
              ]}
            />
            <CashChart data={mergeCash(m.history, m.forecast)} today={ref} height={260} />
          </Card>

          <ExpenseBreakdown />

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
            <IncomeExpenseChart data={m.months} height={240} />
          </Card>
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
                        {st === 'gecikmis' ? (
                          <StatusBadge status={st} />
                        ) : (
                          <button className="btn btn-xs" onClick={() => open({ type: 'settle', item: s })}>
                            {s.kind === 'tahsilat' ? 'Tahsil et' : 'Öde'}
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

        </div>

        <div className="col">
          <Card
            title={
              <span className="title-icon">
                <Sparkles size={16} /> Dikkat gerektirenler
              </span>
            }
            subtitle="Bu ayın kayıtlarından hesaplandı; yorum için asistana sorun"
            className="insights-card"
          >
            {issues.length ? (
              <ul className="insights">
                {issues.slice(0, 5).map((i, n) => (
                  <li key={n} className={`insight insight-${i.severity}`}>
                    <span className="insight-icon" aria-label={SEVERITY[i.severity].label}>
                      {SEVERITY[i.severity].icon}
                    </span>
                    <div>
                      <strong>{i.title}</strong>
                      <p>{i.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Bu ay dikkat gerektiren bir durum bulunmadı.</p>
            )}
            <div className="row-gap insights-actions">
              <button className="btn btn-primary btn-sm" onClick={() => assistant.ask('Bu ay gereksiz harcamalarım neler?')}>
                Asistana yorumlat
              </button>
              <button className="btn btn-sm" onClick={() => assistant.setOpen(true)}>
                Asistanı aç
              </button>
            </div>
          </Card>

          <Card title="Finansal göstergeler">
            <dl className="metrics">
              <div>
                <dt>Nakit yeterlilik süresi</dt>
                <dd className={a.runwayMonths < 1 ? 'tone-neg' : a.runwayMonths < 2 ? 'tone-warn' : ''}>{isFinite(a.runwayMonths) ? `${a.runwayMonths.toFixed(1).replace('.', ',')} ay` : '—'}</dd>
                <span>Aylık ortalama gider {money(a.avgMonthlyExpense, 'TRY', { compact: true })}</span>
              </div>
              <div>
                <dt>30 gün sonra tahmini nakit</dt>
                <dd className={a.forecast30 < 0 ? 'tone-neg' : ''}>{money(a.forecast30, 'TRY', { compact: true })}</dd>
                <span>Bugüne göre {money(a.forecast30 - a.cash, 'TRY', { compact: true, sign: true })}</span>
              </div>
              <div>
                <dt>Ortalama tahsilat süresi</dt>
                <dd>{isFinite(a.avgCollectionDays) ? `${a.avgCollectionDays} gün` : '—'}</dd>
                <span>Fatura tarihinden tahsilata</span>
              </div>
              <div>
                <dt>Gider / gelir oranı</dt>
                <dd className={a.expense > a.income ? 'tone-neg' : ''}>{a.income ? `%${Math.round((a.expense / a.income) * 100)}` : '—'}</dd>
                <span>Bu ay</span>
              </div>
            </dl>
          </Card>

          <Card
            title="Bütçe takibi"
            subtitle="Bu ay, kategori bütçelerine göre"
            action={
              <a className="link" href="#/ayarlar?bolum=kategoriler">
                Düzenle <ChevronRight size={14} />
              </a>
            }
          >
            {a.budgets.length ? (
              <ul className="budgets">
                {a.budgets.map((b) => {
                  const state = b.pct >= 1 ? 'over' : b.projected > b.budget ? 'risk' : 'ok';
                  return (
                    <li key={b.id}>
                      <div className="budget-top">
                        <span>{b.name}</span>
                        <span className="num">
                          <strong>{money(b.spent, 'TRY', { compact: true })}</strong> <span className="muted">/ {money(b.budget, 'TRY', { compact: true })}</span>
                        </span>
                      </div>
                      <div className="meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(b.pct * 100)} aria-label={b.name}>
                        <div className={`meter-fill meter-${state}`} style={{ width: `${Math.min(100, b.pct * 100)}%` }} />
                      </div>
                      <div className={`budget-state state-${state}`}>
                        {state === 'over' ? <CircleAlert size={12} /> : state === 'risk' ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
                        {state === 'over' ? `Aşıldı (%${Math.round(b.pct * 100)})` : state === 'risk' ? `Ay sonu tahmini ${money(b.projected, 'TRY', { compact: true })}` : `%${Math.round(b.pct * 100)} kullanıldı`}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="muted">Ayarlar → Kategoriler bölümünden aylık bütçe tanımlayın.</p>
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
                .filter((x) => !x.archived)
                .map((x) => {
                  const b = bals.get(x.id) ?? 0;
                  return (
                    <li key={x.id}>
                      <div>
                        <strong>{x.name}</strong>
                        <span className="muted small">
                          {x.bank ?? ACCOUNT_TYPE_LABEL[x.type]} · {x.currency}
                        </span>
                      </div>
                      <div className="right">
                        <span className={`num ${b < 0 ? 'tone-neg' : ''}`}>{money(b, x.currency)}</span>
                        {x.currency !== 'TRY' && <span className="muted small num">≈ {money(toTRY(b, x.currency, data.settings.rates))}</span>}
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
