import type { Account, AppData, Category, Contact, Scheduled, Transaction } from '../types';
import { addDays, addMonths, endOfMonth, startOfMonth } from './date';

export const DATA_VERSION = 1;

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'c-satis', name: 'Satış Gelirleri', kind: 'gelir' },
  { id: 'c-hizmet', name: 'Hizmet Gelirleri', kind: 'gelir' },
  { id: 'c-faiz', name: 'Faiz Gelirleri', kind: 'gelir' },
  { id: 'c-diger-gelir', name: 'Diğer Gelirler', kind: 'gelir' },
  { id: 'c-kira', name: 'Kira', kind: 'gider' },
  { id: 'c-maas', name: 'Personel Maaşları', kind: 'gider' },
  { id: 'c-fatura', name: 'Faturalar (Elektrik, Su, İnternet)', kind: 'gider' },
  { id: 'c-tedarik', name: 'Tedarik / Hammadde', kind: 'gider' },
  { id: 'c-vergi', name: 'Vergi ve SGK', kind: 'gider' },
  { id: 'c-pazarlama', name: 'Pazarlama', kind: 'gider' },
  { id: 'c-ulasim', name: 'Ulaşım ve Akaryakıt', kind: 'gider' },
  { id: 'c-ofis', name: 'Ofis Giderleri', kind: 'gider' },
  { id: 'c-banka', name: 'Banka Masrafları', kind: 'gider' },
];

export function emptyData(): AppData {
  return {
    version: DATA_VERSION,
    accounts: [],
    contacts: [],
    categories: DEFAULT_CATEGORIES,
    transactions: [],
    scheduled: [],
    settings: { companyName: 'Şirketim', rates: { TRY: 1, USD: 41.8, EUR: 48.6 }, theme: 'system' },
    updatedAt: new Date().toISOString(),
  };
}

/** Sabit tohumlu sözde rastgele sayı üreteci; demo verisi her açılışta aynı kalsın. */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildDemoData(ref: string): AppData {
  const rand = rng(42);
  const between = (min: number, max: number) => Math.round((min + rand() * (max - min)) / 50) * 50;
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
  let n = 0;
  const id = (p: string) => `${p}-${(++n).toString(36)}`;

  const start = startOfMonth(addMonths(ref, -6));

  const accounts: Account[] = [
    { id: 'a-ziraat', name: 'Ziraat Vadesiz', type: 'banka', bank: 'Ziraat Bankası', iban: 'TR12 0001 0012 3456 7890 1234 56', currency: 'TRY', openingBalance: 185000, openingDate: start },
    { id: 'a-garanti', name: 'Garanti Ticari', type: 'banka', bank: 'Garanti BBVA', iban: 'TR34 0006 2000 1111 0000 2222 33', currency: 'TRY', openingBalance: 92500, openingDate: start },
    { id: 'a-is-usd', name: 'İş Bankası Döviz', type: 'banka', bank: 'Türkiye İş Bankası', iban: 'TR56 0006 4000 0011 2233 4455 66', currency: 'USD', openingBalance: 4200, openingDate: start },
    { id: 'a-kasa', name: 'Merkez Kasa', type: 'kasa', currency: 'TRY', openingBalance: 12000, openingDate: start },
    { id: 'a-kk', name: 'Şirket Kredi Kartı', type: 'kredi_karti', bank: 'Yapı Kredi', currency: 'TRY', openingBalance: 0, openingDate: start },
  ];

  const contacts: Contact[] = [
    { id: 'k-atlas', name: 'Atlas Yapı A.Ş.', type: 'musteri', taxNo: '1234567890', phone: '0212 555 10 20', email: 'muhasebe@atlasyapi.com.tr' },
    { id: 'k-mavi', name: 'Mavi Deniz Turizm', type: 'musteri', taxNo: '2345678901', phone: '0232 444 22 11', email: 'finans@mavideniz.com.tr' },
    { id: 'k-kuzey', name: 'Kuzey Lojistik Ltd. Şti.', type: 'musteri', taxNo: '3456789012', phone: '0216 333 45 67' },
    { id: 'k-ege', name: 'Ege Gıda San. Tic.', type: 'musteri', taxNo: '4567890123', phone: '0236 222 98 76' },
    { id: 'k-pera', name: 'Pera Mimarlık', type: 'musteri', taxNo: '5678901234', email: 'info@peramimarlik.com' },
    { id: 'k-anadolu', name: 'Anadolu Kağıt Ambalaj', type: 'tedarikci', taxNo: '6789012345', phone: '0312 666 77 88' },
    { id: 'k-demir', name: 'Demir Çelik Tedarik', type: 'tedarikci', taxNo: '7890123456', phone: '0262 111 22 33' },
    { id: 'k-tekno', name: 'TeknoNet Bilişim', type: 'tedarikci', taxNo: '8901234567', email: 'destek@tekno.net' },
    { id: 'k-plaza', name: 'Plaza Gayrimenkul (Kiraya veren)', type: 'tedarikci', phone: '0212 999 88 77' },
    { id: 'k-vergi', name: 'Vergi Dairesi / SGK', type: 'diger' },
  ];

  const transactions: Transaction[] = [];
  const scheduled: Scheduled[] = [];
  const customers = contacts.filter((c) => c.type === 'musteri');
  const tx = (t: Omit<Transaction, 'id'>) => transactions.push({ id: id('t'), ...t });

  // Geçmiş 6 ay + içinde bulunulan ay (bugüne kadar)
  let cardSpend = 0;
  for (let m = 0; m <= 6; m++) {
    const ms = addMonths(start, m);
    const me = endOfMonth(ms);
    const inMonth = (day: number) => {
      const d = addDays(ms, day - 1);
      return d > me ? me : d;
    };
    const past = (d: string) => d <= ref;

    // Satışlar: ayda 6-9 peşin/EFT tahsilat
    const sales = 6 + Math.floor(rand() * 4);
    for (let i = 0; i < sales; i++) {
      const d = inMonth(1 + Math.floor(rand() * 28));
      if (!past(d)) continue;
      const c = pick(customers);
      const isService = rand() < 0.35;
      tx({
        kind: 'gelir',
        date: d,
        amount: isService ? between(10000, 30000) : between(24000, 62000),
        accountId: rand() < 0.55 ? 'a-ziraat' : 'a-garanti',
        categoryId: isService ? 'c-hizmet' : 'c-satis',
        contactId: c.id,
        description: isService ? `${c.name} – danışmanlık hizmeti` : `${c.name} – ürün satışı`,
      });
    }
    // Döviz tahsilatı
    if (rand() < 0.7 && past(inMonth(18))) {
      tx({ kind: 'gelir', date: inMonth(18), amount: between(400, 1200), accountId: 'a-is-usd', categoryId: 'c-satis', contactId: 'k-mavi', description: 'Mavi Deniz Turizm – ihracat faturası' });
    }
    // Kasa satışları
    if (past(inMonth(12))) tx({ kind: 'gelir', date: inMonth(12), amount: between(3000, 9000), accountId: 'a-kasa', categoryId: 'c-satis', description: 'Perakende nakit satışlar' });
    // Faiz
    if (past(me)) tx({ kind: 'gelir', date: me, amount: between(1200, 2800), accountId: 'a-garanti', categoryId: 'c-faiz', description: 'Vadeli hesap faiz getirisi' });

    // Sabit giderler: bugüne kadar gerçekleşenler işlem, sonrakiler vadeli kayıt olarak tutulur
    const fixed = (day: number, t: Omit<Transaction, 'id' | 'date'>) => past(inMonth(day)) && tx({ ...t, date: inMonth(day) });
    fixed(5, { kind: 'gider', amount: 45000, accountId: 'a-garanti', categoryId: 'c-kira', contactId: 'k-plaza', description: 'Ofis kirası' });
    fixed(28, { kind: 'gider', amount: 148000, accountId: 'a-ziraat', categoryId: 'c-maas', description: 'Personel maaş ödemeleri' });
    fixed(26, { kind: 'gider', amount: between(36000, 42000), accountId: 'a-garanti', categoryId: 'c-vergi', contactId: 'k-vergi', description: 'SGK primleri ve muhtasar' });
    if (fixed(15, { kind: 'gider', amount: 2450, accountId: 'a-kk', categoryId: 'c-fatura', contactId: 'k-tekno', description: 'Fiber internet ve bulut hizmetleri' })) cardSpend += 2450;
    fixed(15, { kind: 'gider', amount: between(6200, 9800), accountId: 'a-garanti', categoryId: 'c-fatura', description: 'Elektrik ve su faturaları' });
    // Değişken giderler
    const variable = 3 + Math.floor(rand() * 3);
    for (let i = 0; i < variable; i++) {
      const d = inMonth(1 + Math.floor(rand() * 28));
      if (!past(d)) continue;
      const r = rand();
      if (r < 0.45) {
        const sup = rand() < 0.5 ? 'k-anadolu' : 'k-demir';
        tx({ kind: 'gider', date: d, amount: between(12000, 38000), accountId: 'a-garanti', categoryId: 'c-tedarik', contactId: sup, description: sup === 'k-anadolu' ? 'Ambalaj malzemesi alımı' : 'Hammadde alımı' });
      } else if (r < 0.65) {
        const amt = between(4000, 15000);
        cardSpend += amt;
        tx({ kind: 'gider', date: d, amount: amt, accountId: 'a-kk', categoryId: 'c-pazarlama', description: pick(['Dijital reklam kampanyası', 'Fuar katılım bedeli', 'Sosyal medya reklamları']) });
      } else if (r < 0.85) {
        tx({ kind: 'gider', date: d, amount: between(1500, 5000), accountId: 'a-kasa', categoryId: 'c-ulasim', description: pick(['Akaryakıt', 'Araç bakım', 'Köprü/otoyol geçişleri']) });
      } else {
        tx({ kind: 'gider', date: d, amount: between(800, 4500), accountId: 'a-kasa', categoryId: 'c-ofis', description: pick(['Kırtasiye', 'Mutfak ve temizlik', 'Kargo gönderimleri']) });
      }
    }
    if (past(me)) tx({ kind: 'gider', date: me, amount: between(250, 900), accountId: 'a-ziraat', categoryId: 'c-banka', description: 'Hesap işletim ve EFT masrafları' });
    // Kredi kartı ekstresi bir sonraki ayın 10'unda ödenir
    if (m < 6 && cardSpend > 0 && past(addDays(endOfMonth(ms), 10))) {
      tx({ kind: 'transfer', date: addDays(endOfMonth(ms), 10), amount: cardSpend, accountId: 'a-ziraat', toAccountId: 'a-kk', description: 'Kredi kartı ekstre ödemesi' });
      cardSpend = 0;
    }
  }
  // Kasadan bankaya
  tx({ kind: 'transfer', date: addDays(ref, -9), amount: 15000, accountId: 'a-kasa', toAccountId: 'a-garanti', description: 'Kasadan bankaya nakit yatırma' });

  // ---------------- Vadeli kayıtlar ----------------
  const sc = (s: Omit<Scheduled, 'id' | 'paidAmount' | 'recurrence'> & Partial<Pick<Scheduled, 'paidAmount' | 'recurrence'>>) => {
    const item: Scheduled = { id: id('s'), paidAmount: 0, recurrence: 'yok', ...s };
    scheduled.push(item);
    return item;
  };
  const pay = (s: Scheduled, date: string, amount: number, accountId: string) => {
    s.paidAmount += amount;
    tx({ kind: s.kind === 'tahsilat' ? 'gelir' : 'gider', date, amount, accountId, categoryId: s.categoryId, contactId: s.contactId, description: `${s.title} – ${s.kind === 'tahsilat' ? 'tahsilat' : 'ödeme'}`, scheduledId: s.id, scheduledAmount: amount });
  };

  // Tamamlanmış vadeli satışlar (ekstrelerde görünür)
  const done1 = sc({ kind: 'tahsilat', title: 'Fatura #2024-118', contactId: 'k-atlas', categoryId: 'c-satis', amount: 64000, currency: 'TRY', issueDate: addDays(ref, -75), dueDate: addDays(ref, -45) });
  pay(done1, addDays(ref, -44), 64000, 'a-ziraat');
  const done2 = sc({ kind: 'odeme', title: 'Alış faturası #DÇ-5521', contactId: 'k-demir', categoryId: 'c-tedarik', amount: 41500, currency: 'TRY', issueDate: addDays(ref, -60), dueDate: addDays(ref, -30) });
  pay(done2, addDays(ref, -31), 41500, 'a-garanti');

  // Gecikmiş
  const late1 = sc({ kind: 'tahsilat', title: 'Fatura #2024-131', contactId: 'k-kuzey', categoryId: 'c-satis', amount: 38500, currency: 'TRY', issueDate: addDays(ref, -52), dueDate: addDays(ref, -22), note: 'Müşteri ile görüşüldü, parçalı ödeme yapılacak.' });
  pay(late1, addDays(ref, -15), 15000, 'a-garanti');
  sc({ kind: 'tahsilat', title: 'Fatura #2024-127', contactId: 'k-pera', categoryId: 'c-hizmet', amount: 22000, currency: 'TRY', issueDate: addDays(ref, -100), dueDate: addDays(ref, -70) });
  sc({ kind: 'odeme', title: 'Alış faturası #AK-0932', contactId: 'k-anadolu', categoryId: 'c-tedarik', amount: 18750, currency: 'TRY', issueDate: addDays(ref, -35), dueDate: addDays(ref, -4) });

  // Yaklaşan tahsilatlar
  sc({ kind: 'tahsilat', title: 'Fatura #2024-140', contactId: 'k-atlas', categoryId: 'c-satis', amount: 86000, currency: 'TRY', issueDate: addDays(ref, -20), dueDate: addDays(ref, 3) });
  sc({ kind: 'tahsilat', title: 'Fatura #2024-142', contactId: 'k-ege', categoryId: 'c-satis', amount: 47250, currency: 'TRY', issueDate: addDays(ref, -12), dueDate: addDays(ref, 9) });
  sc({ kind: 'tahsilat', title: 'İhracat faturası EX-77', contactId: 'k-mavi', categoryId: 'c-satis', amount: 3400, currency: 'USD', issueDate: addDays(ref, -8), dueDate: addDays(ref, 16) });
  sc({ kind: 'tahsilat', title: 'Çek – Kuzey Lojistik', contactId: 'k-kuzey', categoryId: 'c-satis', amount: 55000, currency: 'TRY', issueDate: addDays(ref, -5), dueDate: addDays(ref, 34), note: 'Çek no: 0045871' });
  sc({ kind: 'tahsilat', title: 'Bakım sözleşmesi', contactId: 'k-pera', categoryId: 'c-hizmet', amount: 12500, currency: 'TRY', issueDate: startOfMonth(ref), dueDate: addDays(endOfMonth(ref), 0), recurrence: 'aylik' });
  sc({ kind: 'tahsilat', title: 'Fatura #2024-145', contactId: 'k-ege', categoryId: 'c-satis', amount: 61800, currency: 'TRY', issueDate: addDays(ref, -2), dueDate: addDays(ref, 52) });

  // Yaklaşan ödemeler (tekrarlayanlar dahil)
  const nextDay = (day: number) => {
    const d = addDays(startOfMonth(ref), day - 1);
    return d < ref ? addMonths(d, 1) : d;
  };
  sc({ kind: 'odeme', title: 'Ofis kirası', contactId: 'k-plaza', categoryId: 'c-kira', amount: 45000, currency: 'TRY', issueDate: nextDay(5), dueDate: nextDay(5), recurrence: 'aylik' });
  sc({ kind: 'odeme', title: 'Personel maaşları', categoryId: 'c-maas', amount: 148000, currency: 'TRY', issueDate: nextDay(28), dueDate: nextDay(28), recurrence: 'aylik' });
  sc({ kind: 'odeme', title: 'SGK primleri ve muhtasar', contactId: 'k-vergi', categoryId: 'c-vergi', amount: 39000, currency: 'TRY', issueDate: nextDay(26), dueDate: nextDay(26), recurrence: 'aylik' });
  sc({ kind: 'odeme', title: 'İnternet ve bulut', contactId: 'k-tekno', categoryId: 'c-fatura', amount: 2450, currency: 'TRY', issueDate: nextDay(15), dueDate: nextDay(15), recurrence: 'aylik' });
  sc({ kind: 'odeme', title: 'KDV beyannamesi', contactId: 'k-vergi', categoryId: 'c-vergi', amount: 58300, currency: 'TRY', issueDate: addDays(ref, -1), dueDate: nextDay(28) });
  sc({ kind: 'odeme', title: 'Alış faturası #DÇ-5604', contactId: 'k-demir', categoryId: 'c-tedarik', amount: 73200, currency: 'TRY', issueDate: addDays(ref, -10), dueDate: addDays(ref, 20) });
  sc({ kind: 'odeme', title: 'Yazılım lisansı (yıllık)', contactId: 'k-tekno', categoryId: 'c-ofis', amount: 1150, currency: 'EUR', issueDate: addDays(ref, -3), dueDate: addDays(ref, 41) });

  transactions.sort((a, b) => a.date.localeCompare(b.date));

  return {
    ...emptyData(),
    accounts,
    contacts,
    transactions,
    scheduled,
    settings: { companyName: 'Gezegen Teknoloji Ltd. Şti.', rates: { TRY: 1, USD: 41.8, EUR: 48.6 }, theme: 'system' },
  };
}
