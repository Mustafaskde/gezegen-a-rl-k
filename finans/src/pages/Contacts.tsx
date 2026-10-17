import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { ContactType } from '../types';
import { useStore } from '../store';
import { useModal } from '../components/modals';
import { Card, Empty, PageHeader, Segmented, Stat } from '../components/ui';
import { CONTACT_TYPE_LABEL } from '../components/forms';
import { contactBalances } from '../lib/finance';
import { money } from '../lib/format';
import { navigate } from '../lib/nav';

type Sort = 'ad' | 'bakiye' | 'gecikmis';

export default function Contacts() {
  const { data, ref } = useStore();
  const open = useModal();
  const [type, setType] = useState<'tumu' | ContactType>('tumu');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('bakiye');
  const bals = useMemo(() => contactBalances(data, ref), [data, ref]);

  const rows = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase('tr');
    return data.contacts
      .filter((c) => (type === 'tumu' || c.type === type) && (!needle || `${c.name} ${c.taxNo ?? ''} ${c.email ?? ''}`.toLocaleLowerCase('tr').includes(needle)))
      .map((c) => ({ c, b: bals.get(c.id)! }))
      .sort((x, y) =>
        sort === 'ad' ? x.c.name.localeCompare(y.c.name, 'tr') : sort === 'gecikmis' ? Math.abs(y.b.overdue) - Math.abs(x.b.overdue) : Math.abs(y.b.net) - Math.abs(x.b.net),
      );
  }, [data.contacts, bals, type, q, sort]);

  const totals = useMemo(() => {
    let r = 0;
    let p = 0;
    let o = 0;
    for (const b of bals.values()) {
      r += b.receivable;
      p += b.payable;
      if (b.overdue > 0) o += b.overdue;
    }
    return { r, p, o };
  }, [bals]);

  return (
    <>
      <PageHeader
        title="Cari Hesaplar"
        subtitle="Müşteri ve tedarikçilerle açık alacak / borç durumu"
        actions={
          <button className="btn btn-primary" onClick={() => open({ type: 'contact' })}>
            Cari ekle
          </button>
        }
      />
      <div className="stats">
        <Stat label="Toplam açık alacak" value={money(totals.r)} />
        <Stat label="Toplam açık borç" value={money(totals.p)} />
        <Stat label="Net cari pozisyon" value={money(totals.r - totals.p, 'TRY', { sign: true })} tone={totals.r - totals.p >= 0 ? 'pos' : 'neg'} />
        <Stat label="Vadesi geçmiş alacak" value={money(totals.o)} tone={totals.o > 0 ? 'warn' : undefined} />
      </div>
      <Card>
        <div className="filters">
          <div className="search">
            <Search size={16} />
            <input placeholder="Unvan, vergi no, e-posta…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Ara" />
          </div>
          <Segmented
            label="Cari türü"
            value={type}
            onChange={setType}
            options={[
              { value: 'tumu', label: 'Tümü' },
              { value: 'musteri', label: 'Müşteriler' },
              { value: 'tedarikci', label: 'Tedarikçiler' },
              { value: 'diger', label: 'Diğer' },
            ]}
          />
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sırala">
            <option value="bakiye">Bakiyeye göre</option>
            <option value="gecikmis">Gecikmişe göre</option>
            <option value="ad">Ada göre</option>
          </select>
        </div>
        {rows.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Cari</th>
                  <th className="right hide-sm">Alacak</th>
                  <th className="right hide-sm">Borç</th>
                  <th className="right">Net bakiye</th>
                  <th className="right hide-sm">Gecikmiş</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ c, b }) => (
                  <tr key={c.id} className="clickable" tabIndex={0} onClick={() => navigate(`/cariler/${encodeURIComponent(c.id)}`)} onKeyDown={(e) => e.key === 'Enter' && navigate(`/cariler/${encodeURIComponent(c.id)}`)}>
                    <td>
                      <strong>{c.name}</strong>
                      <span className="muted small block">
                        {CONTACT_TYPE_LABEL[c.type]}
                        {b.openCount ? ` · ${b.openCount} açık kayıt` : ''}
                      </span>
                    </td>
                    <td className="right num hide-sm">{b.receivable ? money(b.receivable) : '—'}</td>
                    <td className="right num hide-sm">{b.payable ? money(b.payable) : '—'}</td>
                    <td className={`right num ${b.net > 0 ? 'tone-pos' : b.net < 0 ? 'tone-neg' : ''}`}>
                      {b.net ? money(b.net, 'TRY', { sign: true }) : '—'}
                      <span className="muted small block">{b.net > 0 ? 'bize borçlu' : b.net < 0 ? 'borcumuz' : ''}</span>
                    </td>
                    <td className={`right num hide-sm ${b.overdue ? 'tone-warn' : ''}`}>{b.overdue ? money(Math.abs(b.overdue)) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="Cari bulunamadı" action={<button className="btn" onClick={() => open({ type: 'contact' })}>Cari ekle</button>} />
        )}
      </Card>
    </>
  );
}
