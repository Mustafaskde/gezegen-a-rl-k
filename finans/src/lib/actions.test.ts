import { describe, expect, it } from 'vitest';
import { buildDemoData } from './seed';
import { isActionRequest, normalizeModelAction } from './actions';

const REF = '2026-10-18';
const data = buildDemoData(REF);

describe('kayıt isteği', () => {
  it('ekleme isteğini sorudan ayırır', () => {
    expect(isActionRequest('Ziraat vadesiz hesabım var bakiyesi 85 bin TL, ekle')).toBe(true);
    expect(isActionRequest('Dün akaryakıta 2.400 TL harcadım')).toBe(true);
    expect(isActionRequest('Bu ay gereksiz harcamalarım neler?')).toBe(false);
    expect(isActionRequest('Bunu ekler misin?')).toBe(true);
  });






  it('model çıktısını doğrular, geçersizi reddeder', () => {
    expect(normalizeModelAction({ type: 'account', name: 'Halkbank Vadesiz', balance: 12000 }, data, REF)).toMatchObject({ type: 'account', accountType: 'banka', currency: 'TRY', balance: 12000 });
    expect(normalizeModelAction({ type: 'transaction', kind: 'gider', amount: -5 }, data, REF)).toBeUndefined();
    expect(normalizeModelAction({ type: 'sil', id: 'a-ziraat' }, data, REF)).toBeUndefined();
    expect(normalizeModelAction({ type: 'none' }, data, REF)).toBeUndefined();
    expect(normalizeModelAction({ type: 'transaction', kind: 'gider', amount: '2.400', account: 'kredi kartı', category: 'Ulaşım', date: '2026-10-17', description: 'Akaryakıt' }, data, REF)).toMatchObject({
      type: 'transaction',
      amount: 2400,
      accountId: 'a-kk',
      categoryId: 'c-ulasim',
      date: '2026-10-17',
    });
    expect(normalizeModelAction({ type: 'scheduled', kind: 'odeme', amount: 40000, dueDate: '15.12.2026' }, data, REF)).toBeUndefined();
  });
});
