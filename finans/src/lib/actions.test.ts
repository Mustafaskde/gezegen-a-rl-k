import { describe, expect, it } from 'vitest';
import { buildDemoData } from './seed';
import { extractAmount, extractDate, isActionRequest, normalizeModelAction, parseActionRule } from './actions';

const REF = '2026-10-18';
const data = buildDemoData(REF);

describe('tutar ve tarih', () => {
  it('Türkçe tutar ifadelerini okur', () => {
    expect(extractAmount('bakiyesi 85 bin TL')).toEqual({ amount: 85000, currency: 'TRY' });
    expect(extractAmount('1,5 milyon lira')).toEqual({ amount: 1500000, currency: 'TRY' });
    expect(extractAmount('12.500,75 TL')).toEqual({ amount: 12500.75, currency: 'TRY' });
    expect(extractAmount('3400 dolar')).toEqual({ amount: 3400, currency: 'USD' });
    expect(extractAmount('€ 950')).toEqual({ amount: 950, currency: 'EUR' });
  });
  it('tarih ifadelerini okur', () => {
    expect(extractDate('dün harcadım', REF)).toBe('2026-10-17');
    expect(extractDate('15 aralık’ta ödeyeceğim', REF)).toBe('2026-12-15');
    expect(extractDate('25.11 tarihinde', REF)).toBe('2026-11-25');
    expect(extractDate('30 gün sonra', REF)).toBe('2026-11-17');
  });
});

describe('kayıt isteği', () => {
  it('ekleme isteğini sorudan ayırır', () => {
    expect(isActionRequest('Ziraat vadesiz hesabım var bakiyesi 85 bin TL, ekle')).toBe(true);
    expect(isActionRequest('Dün akaryakıta 2.400 TL harcadım')).toBe(true);
    expect(isActionRequest('Bu ay gereksiz harcamalarım neler?')).toBe(false);
    expect(isActionRequest('Bunu ekler misin?')).toBe(true);
  });

  it('banka hesabı', () => {
    const r = parseActionRule('Akbank vadesiz hesabım var bakiyesi 85 bin TL, ekle', data, REF);
    expect(r.action).toEqual({ type: 'account', name: 'Akbank Vadesiz', accountType: 'banka', bank: 'Akbank', currency: 'TRY', balance: 85000 });
  });

  it('dövizli hesap ve eksik bakiye', () => {
    expect(parseActionRule('İş Bankası dolar hesabım var, 2.500 dolar var ekle', data, REF).action).toMatchObject({ type: 'account', currency: 'USD', balance: 2500, name: 'Türkiye İş USD Hesabı' });
    expect(parseActionRule('Enpara hesabı ekle', data, REF).missing).toBeTruthy();
  });

  it('gider işlemi', () => {
    const r = parseActionRule('Dün kredi kartıyla 2.400 TL akaryakıt harcadım', data, REF);
    expect(r.action).toMatchObject({ type: 'transaction', kind: 'gider', amount: 2400, accountId: 'a-kk', categoryId: 'c-ulasim', date: '2026-10-17' });
  });

  it('planlı ödeme', () => {
    const r = parseActionRule('15 Aralık’ta Demir Çelik’e 40 bin TL ödeme planla', data, REF);
    expect(r.action).toMatchObject({ type: 'scheduled', kind: 'odeme', amount: 40000, dueDate: '2026-12-15', contactId: 'k-demir' });
  });

  it('cari', () => {
    expect(parseActionRule('"Mavi Yapı Ltd." adlı müşteri ekle', data, REF).action).toEqual({ type: 'contact', name: 'Mavi Yapı Ltd.', contactType: 'musteri' });
  });

  it('model çıktısını doğrular, geçersizi reddeder', () => {
    expect(normalizeModelAction({ type: 'account', name: 'Halkbank Vadesiz', balance: 12000 }, data, REF)).toMatchObject({ type: 'account', accountType: 'banka', currency: 'TRY', balance: 12000 });
    expect(normalizeModelAction({ type: 'transaction', kind: 'gider', amount: -5 }, data, REF)).toBeUndefined();
    expect(normalizeModelAction({ type: 'sil', id: 'a-ziraat' }, data, REF)).toBeUndefined();
  });
});
