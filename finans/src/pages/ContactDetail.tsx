import { useMemo } from 'react';
import { ArrowLeft, Download, Mail, Pencil, Phone, Printer } from 'lucide-react';
import { useStore } from '../store';
import { useModal } from '../components/modals';
import { Card, Empty, PageHeader, Stat, StatusBadge } from '../components/ui';
import { CONTACT_TYPE_LABEL } from '../components/forms';
import { contactBalances, contactStatement, remaining, scheduledStatus } from '../lib/finance';
import { diffDays } from '../lib/date';
import { fmtDate, money, relativeDays } from '../lib/format';
import { downloadCSV } from '../lib/csv';
import { TxRow } from './Transactions';

export default function ContactDetail({ id }: { id: string }) {
  const { data, ref } = useStore();
  const open = useModal();
  const contact = data.contacts.find((c) => c.id === id);
  const bal = useMemo(() => contactBalances(data, ref).get(id), [data, ref, id]);
  const statement = useMemo(() => contactStatement(data, id), [data, id]);
  const openItems = data.scheduled.filter((s) => s.contactId === id && remaining(s) > 0).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const cashTx = data.transactions.filter((t) => t.contactId === id && !t.scheduledId).sort((a, b) => b.date.localeCompare(a.date));

  if (!contact || !bal) {
    return (
      <Empty title="Cari bulunamadı" action={<a className="btn" href="#/cariler">Carilere dön</a>}>
        Kayıt silinmiş olabilir.
      </Empty>
    );
  }

  const exportStatement = () =>
    downloadCSV(
      `ekstre_${contact.name.replace(/[^\p{L}\p{N}]+/gu, '_')}_${ref}.csv`,
      ['Tarih', 'Açıklama', 'Borç', 'Alacak', 'Bakiye'],
      statement.map((l) => [l.date, l.description, l.debit, l.credit, l.balance]),
    );

  return (
    <>
      <a href="#/cariler" className="back-link">
        <ArrowLeft size={16} /> Cari hesaplar
      </a>
      <PageHeader
        title={contact.name}
        subtitle={
          <span className="contact-meta">
            <span>{CONTACT_TYPE_LABEL[contact.type]}</span>
            {contact.taxNo && <span>VKN/TCKN {contact.taxNo}</span>}
            {contact.phone && (
              <a href={`tel:${contact.phone.replace(/\s/g, '')}`}>
                <Phone size={13} /> {contact.phone}
              </a>
            )}
            {contact.email && (
              <a href={`mailto:${contact.email}`}>
                <Mail size={13} /> {contact.email}
              </a>
            )}
          </span>
        }
        actions={
          <>
            <button className="btn" onClick={() => open({ type: 'contact', initial: contact })}>
              <Pencil size={15} /> Düzenle
            </button>
            <button className="btn" onClick={() => open({ type: 'scheduled', kind: 'odeme', contactId: id })}>
              Ödeme planla
            </button>
            <button className="btn btn-primary" onClick={() => open({ type: 'scheduled', kind: 'tahsilat', contactId: id })}>
              Tahsilat planla
            </button>
          </>
        }
      />
      {contact.note && <p className="note">{contact.note}</p>}
      <div className="stats">
        <Stat label="Açık alacak" value={money(bal.receivable)} />
        <Stat label="Açık borç" value={money(bal.payable)} />
        <Stat label="Net bakiye" value={money(bal.net, 'TRY', { sign: true })} tone={bal.net > 0 ? 'pos' : bal.net < 0 ? 'neg' : undefined} sub={bal.net > 0 ? 'Cari bize borçlu' : bal.net < 0 ? 'Cariye borcumuz var' : 'Hesap kapalı'} />
        <Stat label="Vadesi geçmiş" value={money(Math.abs(bal.overdue))} tone={bal.overdue ? 'warn' : undefined} />
      </div>

      <Card title="Açık kayıtlar" subtitle="Vadesi gelen ve yaklaşan ödeme / tahsilatlar">
        {openItems.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Vade</th>
                  <th>Kayıt</th>
                  <th className="hide-sm">Durum</th>
                  <th className="right">Kalan</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {openItems.map((s) => {
                  const st = scheduledStatus(s, ref);
                  return (
                    <tr key={s.id}>
                      <td className="nowrap">
                        {fmtDate(s.dueDate)}
                        <span className={`small block ${st === 'gecikmis' ? 'tone-neg' : 'muted'}`}>{relativeDays(diffDays(s.dueDate, ref))}</span>
                      </td>
                      <td>
                        <button className="link-btn" onClick={() => open({ type: 'scheduled', initial: s })}>
                          {s.title}
                        </button>
                        <span className="muted small block">{s.kind === 'tahsilat' ? 'Tahsilat' : 'Ödeme'}</span>
                      </td>
                      <td className="hide-sm">
                        <StatusBadge status={st} />
                      </td>
                      <td className={`right num ${s.kind === 'tahsilat' ? 'tone-pos' : ''}`}>
                        {s.kind === 'tahsilat' ? '+' : '−'}
                        {money(remaining(s), s.currency)}
                      </td>
                      <td className="right">
                        <button className="btn btn-xs" onClick={() => open({ type: 'settle', item: s })}>
                          {s.kind === 'tahsilat' ? 'Tahsil et' : 'Öde'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="Açık kayıt yok" />
        )}
      </Card>

      <Card
        title="Cari ekstre"
        subtitle="Vadeli kayıtlar ve bunlara bağlı ödemeler (TL karşılığı)"
        className="printable"
        action={
          <div className="row-gap no-print">
            <button className="btn btn-sm export-only" onClick={exportStatement} disabled={!statement.length}>
              <Download size={14} /> CSV
            </button>
            <button className="btn btn-sm export-only" onClick={() => window.print()}>
              <Printer size={14} /> Yazdır
            </button>
          </div>
        }
      >
        {statement.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Açıklama</th>
                  <th className="right">Borç</th>
                  <th className="right">Alacak</th>
                  <th className="right">Bakiye</th>
                </tr>
              </thead>
              <tbody>
                {statement.map((l, i) => (
                  <tr key={i}>
                    <td className="nowrap muted">{fmtDate(l.date)}</td>
                    <td>{l.description}</td>
                    <td className="right num">{l.debit ? money(l.debit) : ''}</td>
                    <td className="right num">{l.credit ? money(l.credit) : ''}</td>
                    <td className={`right num ${l.balance < 0 ? 'tone-neg' : ''}`}>
                      {money(Math.abs(l.balance))} {l.balance > 0 ? '(B)' : l.balance < 0 ? '(A)' : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="muted small pad">(B): cari borçlu — bize ödeme yapacak · (A): cari alacaklı — biz ödeme yapacağız</p>
          </div>
        ) : (
          <Empty title="Ekstre hareketi yok" />
        )}
      </Card>

      {cashTx.length > 0 && (
        <Card title="Peşin işlemler" subtitle="Vadeli kayda bağlı olmayan, bakiyeyi etkilemeyen hareketler">
          <div className="table-wrap">
            <table className="table">
              <tbody>
                {cashTx.slice(0, 50).map((t) => (
                  <TxRow key={t.id} tx={t} />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
