import { describe, expect, it } from 'vitest';
import type { AppData } from '../types';
import { emptyData, buildDemoData } from './seed';
import { reducer } from '../store';
import { accountBalance, aging, cashForecast, cashHistory, contactBalances, contactStatement, occurrences, periodSummary, remaining, scheduledStatus, totalCash } from './finance';
import { addMonths, endOfMonth } from './date';
import { parseAmount } from './format';

const REF = '2026-10-17';

function base(): AppData {
  return {
    ...emptyData(),
    accounts: [
      { id: 'a', name: 'TL', type: 'banka', currency: 'TRY', openingBalance: 1000, openingDate: '2026-01-01' },
      { id: 'u', name: 'USD', type: 'banka', currency: 'USD', openingBalance: 100, openingDate: '2026-01-01' },
    ],
    contacts: [{ id: 'k', name: 'Müşteri', type: 'musteri' }],
    settings: { companyName: 'Test', rates: { TRY: 1, USD: 40, EUR: 45 }, theme: 'system' },
  };
}

describe('tarih yardımcıları', () => {
  it('ay sonunu taşırmadan ay ekler', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29');
    expect(endOfMonth('2026-02-10')).toBe('2026-02-28');
  });
});

describe('tutar ayrıştırma', () => {
  it('Türkçe ve noktalı biçimleri anlar', () => {
    expect(parseAmount('1.234,56')).toBe(1234.56);
    expect(parseAmount('1234.56')).toBe(1234.56);
    expect(parseAmount('1.250.000')).toBe(1250000);
    expect(parseAmount('₺ 45,5')).toBe(45.5);
    expect(parseAmount('')).toBeNaN();
  });
});

describe('hesap bakiyeleri', () => {
  it('gelir, gider ve kur farklı transferleri işler', () => {
    let d = base();
    d = reducer(d, { type: 'tx/save', tx: { id: 't1', kind: 'gelir', date: '2026-10-01', amount: 500, accountId: 'a', description: '' } });
    d = reducer(d, { type: 'tx/save', tx: { id: 't2', kind: 'gider', date: '2026-10-02', amount: 200, accountId: 'a', description: '' } });
    d = reducer(d, { type: 'tx/save', tx: { id: 't3', kind: 'transfer', date: '2026-10-03', amount: 800, accountId: 'a', toAccountId: 'u', toAmount: 20, description: '' } });
    expect(accountBalance(d.accounts[0], d.transactions)).toBe(500);
    expect(accountBalance(d.accounts[1], d.transactions)).toBe(120);
    expect(accountBalance(d.accounts[0], d.transactions, '2026-10-01')).toBe(1500);
    expect(totalCash(d)).toBe(500 + 120 * 40);
  });

  it('günlük nakit geçmişi son bakiyeyle tutarlıdır', () => {
    const d = buildDemoData(REF);
    const h = cashHistory(d, '2026-07-01', REF);
    expect(h[h.length - 1].balance).toBeCloseTo(totalCash(d, REF), 2);
  });
});

describe('vadeli kayıtlar', () => {
  it('kısmi ve tam tahsilat cari bakiyesini ve hesabı günceller', () => {
    let d = base();
    d = reducer(d, {
      type: 'scheduled/save',
      item: { id: 's', kind: 'tahsilat', title: 'F1', contactId: 'k', amount: 1000, currency: 'TRY', issueDate: '2026-10-01', dueDate: '2026-10-10', paidAmount: 0, recurrence: 'yok' },
    });
    expect(scheduledStatus(d.scheduled[0], REF)).toBe('gecikmis');
    expect(contactBalances(d, REF).get('k')).toMatchObject({ receivable: 1000, net: 1000, overdue: 1000 });

    d = reducer(d, { type: 'scheduled/settle', scheduledId: 's', accountId: 'a', date: REF, amount: 400, scheduledAmount: 400, description: 'kısmi' });
    expect(remaining(d.scheduled[0])).toBe(600);
    expect(accountBalance(d.accounts[0], d.transactions)).toBe(1400);
    expect(contactStatement(d, 'k').at(-1)?.balance).toBe(600);

    d = reducer(d, { type: 'scheduled/settle', scheduledId: 's', accountId: 'a', date: REF, amount: 600, scheduledAmount: 600, description: 'kalan' });
    expect(scheduledStatus(d.scheduled[0], REF)).toBe('tamamlandi');
    expect(contactBalances(d, REF).get('k')?.net).toBe(0);

    // Bağlı işlemi silmek ödemeyi geri alır
    const txId = d.transactions[1].id;
    d = reducer(d, { type: 'tx/delete', id: txId });
    expect(remaining(d.scheduled[0])).toBe(600);
  });

  it('dövizli kaydı TL hesaptan kapatır', () => {
    let d = base();
    d = reducer(d, {
      type: 'scheduled/save',
      item: { id: 's', kind: 'odeme', title: 'Lisans', amount: 10, currency: 'USD', issueDate: REF, dueDate: REF, paidAmount: 0, recurrence: 'yok' },
    });
    d = reducer(d, { type: 'scheduled/settle', scheduledId: 's', accountId: 'a', date: REF, amount: 400, scheduledAmount: 10, description: '' });
    expect(accountBalance(d.accounts[0], d.transactions)).toBe(600);
    expect(scheduledStatus(d.scheduled[0], REF)).toBe('tamamlandi');
  });

  it('tekrarlayan kayıt kapanınca bir sonraki dönemi oluşturur', () => {
    let d = base();
    d = reducer(d, {
      type: 'scheduled/save',
      item: { id: 'r', kind: 'odeme', title: 'Kira', amount: 300, currency: 'TRY', issueDate: '2026-10-05', dueDate: '2026-10-05', paidAmount: 0, recurrence: 'aylik' },
    });
    // Henüz oluşturulmamış dönemler tahmine sanal olarak girer
    const occ = occurrences(d, REF, '2027-01-31');
    expect(occ.map((o) => o.date)).toEqual(['2026-11-05', '2026-12-05', '2027-01-05']);
    expect(occ.every((o) => o.virtual)).toBe(true);

    d = reducer(d, { type: 'scheduled/settle', scheduledId: 'r', accountId: 'a', date: '2026-10-05', amount: 300, scheduledAmount: 300, description: '' });
    expect(d.scheduled).toHaveLength(2);
    expect(d.scheduled[1]).toMatchObject({ dueDate: '2026-11-05', paidAmount: 0, recurrence: 'aylik' });
    expect(d.scheduled[0].nextSpawned).toBe(true);
    // Sanal dönemler artık yalnızca yeni kayıttan türetilir; çift sayım yok
    expect(occurrences(d, REF, '2027-01-31').map((o) => o.date)).toEqual(['2026-11-05', '2026-12-05', '2027-01-05']);
  });

  it('nakit tahmini gecikmişleri bugüne taşır', () => {
    let d = base();
    d = reducer(d, {
      type: 'scheduled/save',
      item: { id: 's', kind: 'tahsilat', title: 'F', amount: 500, currency: 'TRY', issueDate: '2026-09-01', dueDate: '2026-10-01', paidAmount: 0, recurrence: 'yok' },
    });
    const start = totalCash(d, REF);
    expect(cashForecast(d, REF, 10, true)[0].balance).toBe(start + 500);
    expect(cashForecast(d, REF, 10, false)[0].balance).toBe(start);
  });

  it('yaşlandırma gecikme gününe göre gruplar', () => {
    let d = base();
    const mk = (id: string, due: string) =>
      (d = reducer(d, { type: 'scheduled/save', item: { id, kind: 'tahsilat', title: id, contactId: 'k', amount: 100, currency: 'TRY', issueDate: '2026-01-01', dueDate: due, paidAmount: 0, recurrence: 'yok' } }));
    mk('a', '2026-11-01');
    mk('b', '2026-10-01');
    mk('c', '2026-06-01');
    expect(aging(d, REF, 'tahsilat')[0].buckets).toEqual([100, 100, 0, 0, 100]);
  });
});

describe('raporlar', () => {
  it('transferleri gelir/gidere katmaz', () => {
    let d = base();
    d = reducer(d, { type: 'tx/save', tx: { id: 't1', kind: 'gelir', date: REF, amount: 10, accountId: 'u', description: '' } });
    d = reducer(d, { type: 'tx/save', tx: { id: 't2', kind: 'transfer', date: REF, amount: 100, accountId: 'a', toAccountId: 'u', toAmount: 2.5, description: '' } });
    const s = periodSummary(d, REF, REF);
    expect(s.income).toBe(400);
    expect(s.expense).toBe(0);
  });
});
