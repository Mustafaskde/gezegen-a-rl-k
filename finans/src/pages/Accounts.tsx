import { useMemo, useState } from 'react';
import { Banknote, Copy, CreditCard, Landmark, Pencil } from 'lucide-react';
import type { Account, Currency } from '../types';
import { useStore } from '../store';
import { useModal } from '../components/modals';
import { Card, Empty, PageHeader, Stat } from '../components/ui';
import { ACCOUNT_TYPE_LABEL } from '../components/forms';
import { accountBalances, toTRY, totalCash, txEffect } from '../lib/finance';
import { addDays } from '../lib/date';
import { money } from '../lib/format';

const ICON = { banka: Landmark, kasa: Banknote, kredi_karti: CreditCard };

export default function Accounts() {
  const { data, ref } = useStore();
  const open = useModal();
  const [copied, setCopied] = useState('');
  const bals = useMemo(() => accountBalances(data, ref), [data, ref]);
  const flows = useMemo(() => {
    const from = addDays(ref, -29);
    const m = new Map<string, { in: number; out: number }>();
    for (const a of data.accounts) m.set(a.id, { in: 0, out: 0 });
    for (const t of data.transactions) {
      if (t.date < from || t.date > ref) continue;
      for (const id of [t.accountId, t.toAccountId]) {
        if (!id) continue;
        const e = txEffect(t, id);
        const f = m.get(id);
        if (!f) continue;
        if (e > 0) f.in += e;
        else f.out -= e;
      }
    }
    return m;
  }, [data, ref]);

  const active = data.accounts.filter((a) => !a.archived);
  const archived = data.accounts.filter((a) => a.archived);
  const byCurrency = useMemo(() => {
    const m = new Map<Currency, number>();
    for (const a of active) m.set(a.currency, (m.get(a.currency) ?? 0) + (bals.get(a.id) ?? 0));
    return [...m.entries()];
  }, [active, bals]);
  const cash = totalCash(data, ref);
  const card = active.filter((a) => a.type === 'kredi_karti').reduce((s, a) => s + toTRY(bals.get(a.id) ?? 0, a.currency, data.settings.rates), 0);

  const copy = (iban: string, id: string) => {
    navigator.clipboard?.writeText(iban.replace(/\s/g, '')).then(
      () => {
        setCopied(id);
        setTimeout(() => setCopied(''), 1500);
      },
      () => {},
    );
  };

  const renderCard = (a: Account) => {
    const Icon = ICON[a.type];
    const b = bals.get(a.id) ?? 0;
    const f = flows.get(a.id) ?? { in: 0, out: 0 };
    return (
      <article key={a.id} className={`acc-card ${a.archived ? 'is-archived' : ''}`}>
        <header>
          <span className="acc-icon">
            <Icon size={18} />
          </span>
          <div className="grow">
            <strong>{a.name}</strong>
            <span className="muted small">
              {a.bank ? `${a.bank} · ` : ''}
              {ACCOUNT_TYPE_LABEL[a.type]}
              {a.archived ? ' · arşiv' : ''}
            </span>
          </div>
          <button className="icon-btn" onClick={() => open({ type: 'account', initial: a })} aria-label={`${a.name} düzenle`}>
            <Pencil size={16} />
          </button>
        </header>
        <div className={`acc-balance ${b < 0 ? 'tone-neg' : ''}`}>{money(b, a.currency)}</div>
        {a.currency !== 'TRY' && <div className="muted small num">≈ {money(toTRY(b, a.currency, data.settings.rates))} (1 {a.currency} = {money(data.settings.rates[a.currency])})</div>}
        {a.iban && (
          <button className="iban" onClick={() => copy(a.iban!, a.id)} title="IBAN kopyala">
            <span>{a.iban}</span>
            <Copy size={13} />
            {copied === a.id && <em>Kopyalandı</em>}
          </button>
        )}
        <dl className="acc-flows">
          <div>
            <dt>Son 30 gün giriş</dt>
            <dd className="num tone-pos">+{money(f.in, a.currency)}</dd>
          </div>
          <div>
            <dt>Son 30 gün çıkış</dt>
            <dd className="num">−{money(f.out, a.currency)}</dd>
          </div>
        </dl>
        <footer>
          <a className="btn btn-sm" href={`#/islemler?hesap=${encodeURIComponent(a.id)}`}>
            Hareketler
          </a>
          {!a.archived && (
            <button className="btn btn-sm" onClick={() => open({ type: 'tx', kind: 'transfer' })}>
              Transfer
            </button>
          )}
        </footer>
      </article>
    );
  };

  return (
    <>
      <PageHeader
        title="Banka & Kasa"
        subtitle="Banka hesapları, nakit kasalar ve kredi kartları"
        actions={
          <>
            <button className="btn" onClick={() => open({ type: 'tx', kind: 'transfer' })} disabled={active.length < 2}>
              Transfer
            </button>
            <button className="btn btn-primary" onClick={() => open({ type: 'account' })}>
              Hesap ekle
            </button>
          </>
        }
      />
      <div className="stats">
        <Stat label="Toplam varlık (TL)" value={money(cash)} sub="Döviz hesapları güncel kurla" />
        {byCurrency.map(([c, v]) => (
          <Stat key={c} label={`${c} hesapları toplamı`} value={money(v, c)} />
        ))}
        {card !== 0 && <Stat label="Kredi kartı bakiyesi" value={money(card)} tone={card < 0 ? 'neg' : undefined} />}
      </div>
      {active.length ? (
        <div className="acc-grid">{active.map(renderCard)}</div>
      ) : (
        <Empty title="Henüz hesap yok" action={<button className="btn btn-primary" onClick={() => open({ type: 'account' })}>Hesap ekle</button>} />
      )}
      {archived.length > 0 && (
        <Card title="Arşivlenmiş hesaplar" subtitle="Toplamlara dahil edilmez">
          <div className="acc-grid">{archived.map(renderCard)}</div>
        </Card>
      )}
    </>
  );
}
