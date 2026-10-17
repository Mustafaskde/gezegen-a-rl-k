import { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Download, Link2, Search } from 'lucide-react';
import type { Transaction, TransactionKind } from '../types';
import { useStore } from '../store';
import { useModal } from '../components/modals';
import { Card, Empty, PageHeader, Segmented } from '../components/ui';
import { round2, txAmountTRY } from '../lib/finance';
import { addDays, addMonths, endOfMonth, startOfMonth, startOfYear } from '../lib/date';
import { fmtDate, money } from '../lib/format';
import { downloadCSV } from '../lib/csv';

export function TxRow({ tx }: { tx: Transaction }) {
  const { data } = useStore();
  const open = useModal();
  const acc = data.accounts.find((a) => a.id === tx.accountId);
  const toAcc = tx.toAccountId ? data.accounts.find((a) => a.id === tx.toAccountId) : undefined;
  const cat = data.categories.find((c) => c.id === tx.categoryId);
  const contact = data.contacts.find((c) => c.id === tx.contactId);
  const icon = tx.kind === 'gelir' ? <ArrowDownLeft size={15} /> : tx.kind === 'gider' ? <ArrowUpRight size={15} /> : <ArrowLeftRight size={15} />;
  const sign = tx.kind === 'gelir' ? '+' : tx.kind === 'gider' ? '−' : '';
  return (
    <tr className="clickable" onClick={() => open({ type: 'tx', initial: tx })} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && open({ type: 'tx', initial: tx })}>
      <td className="nowrap muted hide-sm">{fmtDate(tx.date)}</td>
      <td>
        <div className="tx-desc">
          <span className={`dir dir-${tx.kind}`} aria-label={tx.kind}>
            {icon}
          </span>
          <div>
            <strong>{tx.description || (tx.kind === 'transfer' ? 'Transfer' : cat?.name ?? 'İşlem')}</strong>
            <span className="muted small">
              <span className="show-sm">{fmtDate(tx.date)} · </span>
              {tx.kind === 'transfer' ? `${acc?.name ?? '?'} → ${toAcc?.name ?? '?'}` : [cat?.name, contact?.name].filter(Boolean).join(' · ') || 'Kategorisiz'}
              {tx.scheduledId && (
                <span className="linked" title="Vadeli kayda bağlı">
                  {' '}
                  <Link2 size={12} /> vadeli
                </span>
              )}
            </span>
          </div>
        </div>
      </td>
      <td className="muted hide-sm">{tx.kind === 'transfer' ? '' : acc?.name}</td>
      <td className={`num right nowrap ${tx.kind === 'gelir' ? 'tone-pos' : ''}`}>
        {sign}
        {money(tx.amount, acc?.currency)}
        {tx.kind === 'transfer' && toAcc && toAcc.currency !== acc?.currency && <div className="muted small">→ {money(tx.toAmount ?? tx.amount, toAcc.currency)}</div>}
      </td>
    </tr>
  );
}

type Range = 'bu-ay' | 'gecen-ay' | 'son-30' | 'son-90' | 'bu-yil' | 'tumu' | 'ozel';

export function rangeDates(r: Range, ref: string, custom: { from: string; to: string }): { from: string; to: string } {
  switch (r) {
    case 'bu-ay':
      return { from: startOfMonth(ref), to: endOfMonth(ref) };
    case 'gecen-ay': {
      const s = addMonths(startOfMonth(ref), -1);
      return { from: s, to: endOfMonth(s) };
    }
    case 'son-30':
      return { from: addDays(ref, -29), to: ref };
    case 'son-90':
      return { from: addDays(ref, -89), to: ref };
    case 'bu-yil':
      return { from: startOfYear(ref), to: ref.slice(0, 4) + '-12-31' };
    case 'tumu':
      return { from: '0000-01-01', to: '9999-12-31' };
    case 'ozel':
      return custom;
  }
}

export const RANGE_OPTIONS: { value: Range; label: string }[] = [
  { value: 'bu-ay', label: 'Bu ay' },
  { value: 'gecen-ay', label: 'Geçen ay' },
  { value: 'son-30', label: 'Son 30 gün' },
  { value: 'son-90', label: 'Son 90 gün' },
  { value: 'bu-yil', label: 'Bu yıl' },
  { value: 'tumu', label: 'Tümü' },
  { value: 'ozel', label: 'Özel aralık' },
];

export default function Transactions({ query }: { query: URLSearchParams }) {
  const { data, ref } = useStore();
  const open = useModal();
  const [kind, setKind] = useState<'tumu' | TransactionKind>('tumu');
  const [range, setRange] = useState<Range>(query.get('hesap') ? 'tumu' : 'son-90');
  const [custom, setCustom] = useState({ from: addDays(ref, -30), to: ref });
  const [accountId, setAccountId] = useState(query.get('hesap') ?? '');
  const [categoryId, setCategoryId] = useState('');
  const [contactId, setContactId] = useState('');
  const [q, setQ] = useState('');

  const { from, to } = rangeDates(range, ref, custom);

  const rows = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase('tr');
    const contactName = new Map(data.contacts.map((c) => [c.id, c.name]));
    return data.transactions
      .filter((t) => {
        if (t.date < from || t.date > to) return false;
        if (kind !== 'tumu' && t.kind !== kind) return false;
        if (accountId && t.accountId !== accountId && t.toAccountId !== accountId) return false;
        if (categoryId && t.categoryId !== categoryId) return false;
        if (contactId && t.contactId !== contactId) return false;
        if (needle) {
          const hay = `${t.description} ${t.contactId ? contactName.get(t.contactId) : ''}`.toLocaleLowerCase('tr');
          if (!hay.includes(needle)) return false;
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  }, [data, from, to, kind, accountId, categoryId, contactId, q]);

  const totals = useMemo(() => {
    let inc = 0;
    let exp = 0;
    for (const t of rows) {
      if (t.kind === 'gelir') inc += txAmountTRY(data, t);
      else if (t.kind === 'gider') exp += txAmountTRY(data, t);
    }
    return { inc: round2(inc), exp: round2(exp) };
  }, [rows, data]);

  const exportCSV = () => {
    const accName = new Map(data.accounts.map((a) => [a.id, a]));
    const catName = new Map(data.categories.map((c) => [c.id, c.name]));
    const conName = new Map(data.contacts.map((c) => [c.id, c.name]));
    downloadCSV(
      `islemler_${from > '0000-01-01' ? from : 'tum'}_${to < '9999' ? to : ''}.csv`,
      ['Tarih', 'Tür', 'Açıklama', 'Hesap', 'Hedef hesap', 'Kategori', 'Cari', 'Tutar', 'Para birimi', 'TL karşılığı'],
      rows.map((t) => {
        const a = accName.get(t.accountId);
        return [
          t.date,
          t.kind,
          t.description,
          a?.name ?? '',
          t.toAccountId ? accName.get(t.toAccountId)?.name ?? '' : '',
          t.categoryId ? catName.get(t.categoryId) ?? '' : '',
          t.contactId ? conName.get(t.contactId) ?? '' : '',
          t.amount,
          a?.currency ?? 'TRY',
          t.kind === 'transfer' ? '' : txAmountTRY(data, t),
        ];
      }),
    );
  };

  const cats = data.categories.filter((c) => kind === 'tumu' || kind === 'transfer' || c.kind === kind);

  return (
    <>
      <PageHeader
        title="Gelir & Gider"
        subtitle="Tüm hesap hareketleri, transferler ve vadeli kayıt ödemeleri"
        actions={
          <>
            <button className="btn export-only" onClick={exportCSV} disabled={!rows.length}>
              <Download size={16} /> CSV
            </button>
            <button className="btn" onClick={() => open({ type: 'tx', kind: 'gider' })}>
              Gider ekle
            </button>
            <button className="btn btn-primary" onClick={() => open({ type: 'tx', kind: 'gelir' })}>
              Gelir ekle
            </button>
          </>
        }
      />

      <Card>
        <div className="filters">
          <div className="search">
            <Search size={16} />
            <input placeholder="Açıklama veya cari ara…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Ara" />
          </div>
          <Segmented
            label="Tür"
            value={kind}
            onChange={setKind}
            options={[
              { value: 'tumu', label: 'Tümü' },
              { value: 'gelir', label: 'Gelir' },
              { value: 'gider', label: 'Gider' },
              { value: 'transfer', label: 'Transfer' },
            ]}
          />
          <select value={range} onChange={(e) => setRange(e.target.value as Range)} aria-label="Tarih aralığı">
            {RANGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {range === 'ozel' && (
            <>
              <input type="date" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} aria-label="Başlangıç" />
              <input type="date" value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} aria-label="Bitiş" />
            </>
          )}
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} aria-label="Hesap">
            <option value="">Tüm hesaplar</option>
            {data.accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
                {a.archived ? ' (arşiv)' : ''}
              </option>
            ))}
          </select>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label="Kategori">
            <option value="">Tüm kategoriler</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select value={contactId} onChange={(e) => setContactId(e.target.value)} aria-label="Cari">
            <option value="">Tüm cariler</option>
            {data.contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="summary-row">
          <span>
            <span className="muted">Kayıt</span> <strong>{rows.length}</strong>
          </span>
          <span>
            <span className="muted">Gelir</span> <strong className="tone-pos">{money(totals.inc)}</strong>
          </span>
          <span>
            <span className="muted">Gider</span> <strong>{money(totals.exp)}</strong>
          </span>
          <span>
            <span className="muted">Net</span> <strong className={totals.inc - totals.exp >= 0 ? 'tone-pos' : 'tone-neg'}>{money(totals.inc - totals.exp, 'TRY', { sign: true })}</strong>
          </span>
        </div>

        {rows.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th className="hide-sm">Tarih</th>
                  <th>Açıklama</th>
                  <th className="hide-sm">Hesap</th>
                  <th className="right">Tutar</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 500).map((t) => (
                  <TxRow key={t.id} tx={t} />
                ))}
              </tbody>
            </table>
            {rows.length > 500 && <p className="muted small pad">İlk 500 kayıt gösteriliyor. Filtreleri daraltın veya CSV indirin.</p>}
          </div>
        ) : (
          <Empty title="Bu filtrelerle eşleşen işlem yok" />
        )}
      </Card>
    </>
  );
}
