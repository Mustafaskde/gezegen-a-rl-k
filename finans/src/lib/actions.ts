// Asistanın kullanıcı isteğiyle kayıt eklemesi. Bu modül yalnızca bir ÖNERİ üretir;
// kayıt, kullanıcı onay kartındaki "Ekle" düğmesine bastığında yazılır.
import type { AccountType, AppData, ContactType, Currency, Recurrence, ScheduledKind, TransactionKind } from '../types';
import { addDays, addMonths, today as todayFn } from './date';
import { parseAmount } from './format';

export type ProposedAction =
  | { type: 'account'; name: string; accountType: AccountType; bank?: string; currency: Currency; balance: number }
  | { type: 'transaction'; kind: Exclude<TransactionKind, 'transfer'>; amount: number; accountId: string; categoryId?: string; contactId?: string; description: string; date: string }
  | { type: 'scheduled'; kind: ScheduledKind; title: string; amount: number; currency: Currency; dueDate: string; contactId?: string; categoryId?: string; recurrence: Recurrence }
  | { type: 'contact'; name: string; contactType: ContactType };

export interface ActionResult {
  action?: ProposedAction;
  /** Eksik bilgi varsa kullanıcıya sorulacak soru. */
  missing?: string;
}

const ADD_VERB = /(?<![\p{L}\p{N}])(ekle|ekler misin|ekleyebilir|oluştur|kaydet|kayıt (et|aç)|gir(er misin)?|tanımla|aç(ar mısın)?|yaz(ar mısın)?)(?![\p{L}\p{N}])/u;

export function isActionRequest(question: string): boolean {
  const q = question.toLocaleLowerCase('tr');
  if (/\?$/.test(q.trim()) && !/(ekler|oluşturur|kaydeder|girer|açar|yazar) m[ıi]s[ıi]n/.test(q)) return false;
  return ADD_VERB.test(q) || /harcadım|ödedim|tahsil ettim|aldım|kazandım|sattım/.test(q);
}

/* ------------------------------------------------------------ Ayrıştırma */

const BANKS: [RegExp, string][] = [
  [/ziraat/, 'Ziraat Bankası'],
  [/garanti/, 'Garanti BBVA'],
  [/iş ?bank|isbank|(?<![\p{L}\p{N}])iş(?![\p{L}\p{N}])/u, 'Türkiye İş Bankası'],
  [/akbank/, 'Akbank'],
  [/yapı ?kredi|ykb/, 'Yapı Kredi'],
  [/vakıf/, 'VakıfBank'],
  [/halk ?bank|(?<![\p{L}\p{N}])halk(?![\p{L}\p{N}])/u, 'Halkbank'],
  [/qnb|finansbank/, 'QNB'],
  [/deniz ?bank/, 'DenizBank'],
  [/enpara/, 'Enpara'],
  [/(?<![\p{L}\p{N}])ing(?![\p{L}\p{N}])/u, 'ING'],
  [/(?<![\p{L}\p{N}])teb(?![\p{L}\p{N}])/u, 'TEB'],
  [/kuveyt/, 'Kuveyt Türk'],
  [/albaraka/, 'Albaraka'],
  [/şekerbank/, 'Şekerbank'],
  [/odea/, 'Odeabank'],
  [/papara/, 'Papara'],
];

const CATEGORY_HINTS: [RegExp, string][] = [
  [/kira/, 'c-kira'],
  [/maaş|personel|ücret ödeme/, 'c-maas'],
  [/elektrik|su faturası|doğalgaz|internet|fatura|telefon/, 'c-fatura'],
  [/hammadde|malzeme|tedarik|stok|mal alım/, 'c-tedarik'],
  [/vergi|sgk|kdv|muhtasar|stopaj/, 'c-vergi'],
  [/reklam|pazarlama|kampanya|sosyal medya|fuar/, 'c-pazarlama'],
  [/akaryakıt|benzin|mazot|taksi|ulaşım|otopark|köprü|otoyol|uçak|bilet/, 'c-ulasim'],
  [/kırtasiye|ofis|yemek|kahve|temizlik|kargo|abonelik|yazılım/, 'c-ofis'],
  [/banka masraf|eft|havale ücreti|komisyon/, 'c-banka'],
  [/faiz/, 'c-faiz'],
  [/danışmanlık|hizmet/, 'c-hizmet'],
  [/satış|sattım|ürün/, 'c-satis'],
];

/** "85 bin", "1,5 milyon", "12.500,75 TL", "$3.400" gibi tutarları bulur. */
export function extractAmount(text: string): { amount: number; currency: Currency } | null {
  const q = text.toLocaleLowerCase('tr');
  const m = q.match(/([$€₺])?\s*(\d{1,3}(?:[.\s]\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?)\s*(milyon|bin|k(?![\p{L}\p{N}]))?\s*(tl|₺|lira|try|dolar|usd|\$|euro|avro|eur|€)?/u);
  if (!m) return null;
  let amount = parseAmount(m[2].replace(/\s/g, '.'));
  if (isNaN(amount)) return null;
  if (m[3] === 'milyon') amount *= 1_000_000;
  else if (m[3] === 'bin' || m[3] === 'k') amount *= 1000;
  const sym = m[1] || m[4] || '';
  const currency: Currency = /\$|dolar|usd/.test(sym) || /(?<![\p{L}\p{N}])dolar|(?<![\p{L}\p{N}])usd(?![\p{L}\p{N}])/u.test(q) ? 'USD' : /€|euro|avro|eur/.test(sym) || /(?<![\p{L}\p{N}])euro(?![\p{L}\p{N}])|(?<![\p{L}\p{N}])avro(?![\p{L}\p{N}])|(?<![\p{L}\p{N}])eur(?![\p{L}\p{N}])/u.test(q) ? 'EUR' : 'TRY';
  return { amount: Math.round(amount * 100) / 100, currency };
}

export function extractDate(text: string, ref: string): string | undefined {
  const q = text.toLocaleLowerCase('tr');
  if (/(?<![\p{L}\p{N}])dün(?![\p{L}\p{N}])/u.test(q)) return addDays(ref, -1);
  if (/(?<![\p{L}\p{N}])bugün(?![\p{L}\p{N}])/u.test(q)) return ref;
  if (/(?<![\p{L}\p{N}])yarın(?![\p{L}\p{N}])/u.test(q)) return addDays(ref, 1);
  const rel = q.match(/(\d+)\s*(gün|hafta|ay)\s*sonra/);
  if (rel) {
    const n = Number(rel[1]);
    return rel[2] === 'gün' ? addDays(ref, n) : rel[2] === 'hafta' ? addDays(ref, n * 7) : addMonths(ref, n);
  }
  const d = q.match(/(?<![\p{L}\p{N}])(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?(?![\p{L}\p{N}])/u);
  if (d) {
    const y = d[3] ? (d[3].length === 2 ? `20${d[3]}` : d[3]) : ref.slice(0, 4);
    const out = `${y}-${d[2].padStart(2, '0')}-${d[1].padStart(2, '0')}`;
    if (!isNaN(Date.parse(out))) return out;
  }
  const months = ['ocak', 'şubat', 'mart', 'nisan', 'mayıs', 'haziran', 'temmuz', 'ağustos', 'eylül', 'ekim', 'kasım', 'aralık'];
  const named = q.match(new RegExp(`(\\d{1,2})\\s*(${months.join('|')})`));
  if (named) {
    const mi = months.indexOf(named[2]) + 1;
    let y = Number(ref.slice(0, 4));
    const candidate = `${y}-${String(mi).padStart(2, '0')}-${named[1].padStart(2, '0')}`;
    if (candidate < ref && /öde|tahsil|vade|planla/.test(q)) y++;
    return `${y}-${String(mi).padStart(2, '0')}-${named[1].padStart(2, '0')}`;
  }
  return undefined;
}

function findAccount(data: AppData, q: string): string | undefined {
  const active = data.accounts.filter((a) => !a.archived);
  const byName = active.find((a) => q.includes(a.name.toLocaleLowerCase('tr')) || (a.bank && q.includes(a.bank.toLocaleLowerCase('tr').split(' ')[0])));
  if (byName) return byName.id;
  if (/kasa|nakit/.test(q)) return active.find((a) => a.type === 'kasa')?.id;
  if (/kredi kart|kartla|karttan/.test(q)) return active.find((a) => a.type === 'kredi_karti')?.id;
  return undefined;
}

function findContact(data: AppData, q: string): string | undefined {
  return data.contacts.find((c) => {
    const first = c.name.toLocaleLowerCase('tr').split(/\s+/)[0];
    return first.length > 2 && q.includes(first);
  })?.id;
}

function findCategory(data: AppData, q: string, kind: 'gelir' | 'gider'): string | undefined {
  const own = data.categories.find((c) => c.kind === kind && q.includes(c.name.toLocaleLowerCase('tr')));
  if (own) return own.id;
  for (const [re, id] of CATEGORY_HINTS) {
    const c = data.categories.find((x) => x.id === id && x.kind === kind);
    if (c && re.test(q)) return c.id;
  }
  return undefined;
}

// Türkçede kesme işareti (Aralık'ta) yaygın olduğu için yalnızca çift tırnak ad olarak alınır.
const quoted = (text: string) => text.match(/["“”]([^"“”]{2,60})["“”]/)?.[1]?.trim();

const MONTHS = 'ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık';
/** Tutar ararken tarih parçalarını (25.11, 15 Aralık, 30 gün sonra) dışarıda bırakır. */
const stripDates = (q: string) =>
  q
    .replace(/(?<![\p{N}])\d{1,2}[./]\d{1,2}([./]\d{2,4})?(?![\p{N}])/gu, ' ')
    .replace(new RegExp(`(?<![\\p{N}])\\d{1,2}\\s*(${MONTHS})`, 'gu'), ' ')
    .replace(/\d+\s*(gün|hafta|ay)\s*sonra/gu, ' ');

/** Kural tabanlı ayrıştırıcı: model olmadan da sık kullanılan cümleleri anlar. */
export function parseActionRule(text: string, data: AppData, ref = todayFn()): ActionResult {
  const q = text.toLocaleLowerCase('tr');
  const money = extractAmount(stripDates(q));

  // Cari
  if (/(cari|müşteri|tedarikçi)(?![\p{L}\p{N}]).*(?<![\p{L}\p{N}])(ekle|oluştur|kaydet|tanımla|aç)/u.test(q) && !/hesab/.test(q)) {
    const name = quoted(text) ?? text.match(/^\s*(.+?)\s+(adlı|isimli|unvanlı)/i)?.[1]?.trim() ?? text.match(/(?:cari|müşteri|tedarikçi)\s*(?:olarak)?\s*:?\s*(.+?)\s+(?:ekle|oluştur|kaydet|tanımla)/i)?.[1]?.trim();
    const contactType: ContactType = /tedarikçi/.test(q) ? 'tedarikci' : /müşteri/.test(q) ? 'musteri' : 'diger';
    if (!name) return { missing: 'Carinin unvanını tırnak içinde yazar mısınız? Örn. "Mavi Yapı Ltd." adlı müşteri ekle' };
    return { action: { type: 'contact', name, contactType } };
  }

  // Hesap (banka, kasa, kredi kartı)
  const bank = BANKS.find(([re]) => re.test(q))?.[1];
  const isAccount = /hesab|hesap|kasa(?![\p{L}\p{N}])|kredi kart|vadesiz|mevduat/u.test(q) && /bakiye|hesab[ıi]m|hesap ekle|hesap aç|var|ekle|oluştur|aç|tanımla/.test(q) && !/harcadım|ödedim|tahsil/.test(q);
  if (isAccount && !/öde(yeceğim|necek)|tahsil edeceğim/.test(q)) {
    const accountType: AccountType = /kredi kart/.test(q) ? 'kredi_karti' : /kasa|nakit/.test(q) && !bank ? 'kasa' : 'banka';
    const currency = money?.currency ?? (/dolar|usd/.test(q) ? 'USD' : /euro|eur|avro/.test(q) ? 'EUR' : 'TRY');
    const suffix = accountType === 'kredi_karti' ? 'Kredi Kartı' : accountType === 'kasa' ? 'Kasa' : currency !== 'TRY' ? `${currency} Hesabı` : /vadeli/.test(q) && !/vadesiz/.test(q) ? 'Vadeli' : 'Vadesiz';
    const name = quoted(text) ?? (accountType === 'kasa' && !bank ? 'Nakit Kasa' : `${bank ? bank.replace(/ Bankası$/, '') : 'Banka'} ${suffix}`);
    if (!money && !/bakiyesi? (yok|sıfır|0)/.test(q)) return { missing: `${name} için güncel bakiyeyi yazar mısınız? Örn. "${bank ?? 'Ziraat'} vadesiz hesabım var, bakiyesi 85 bin TL"` };
    let balance = money?.amount ?? 0;
    if (accountType === 'kredi_karti' && balance > 0 && /borç|borcu/.test(q)) balance = -balance;
    return { action: { type: 'account', name, accountType, bank, currency, balance } };
  }

  // Planlı ödeme / tahsilat
  const future = /öde(yeceğim|necek|nmesi)|tahsil ede(ceğim|cek)|alaca(ğım|k)|vade|planla|hatırlat|her ay|taksit|çek /.test(q);
  if (future) {
    if (!money) return { missing: 'Tutarı da yazar mısınız? Örn. "15 Kasım’da Demir Çelik’e 40 bin TL ödeme planla"' };
    const kind: ScheduledKind = /tahsil|alaca|müşteri.*öde(yecek|me yapacak)/.test(q) ? 'tahsilat' : 'odeme';
    const dueDate = extractDate(q, ref);
    if (!dueDate) return { missing: 'Vade tarihini yazar mısınız? Örn. "25.11", "15 Aralık" ya da "30 gün sonra".' };
    const contactId = findContact(data, q);
    const categoryId = findCategory(data, q, kind === 'tahsilat' ? 'gelir' : 'gider');
    const recurrence: Recurrence = /her ay|aylık/.test(q) ? 'aylik' : /her hafta|haftalık/.test(q) ? 'haftalik' : /her yıl|yıllık/.test(q) ? 'yillik' : 'yok';
    const cat = data.categories.find((c) => c.id === categoryId);
    const contact = data.contacts.find((c) => c.id === contactId);
    const title = quoted(text) ?? cat?.name ?? (contact ? `${contact.name} ${kind === 'tahsilat' ? 'tahsilatı' : 'ödemesi'}` : kind === 'tahsilat' ? 'Planlı tahsilat' : 'Planlı ödeme');
    return { action: { type: 'scheduled', kind, title, amount: money.amount, currency: money.currency, dueDate, contactId, categoryId, recurrence } };
  }

  // Gelir / gider işlemi
  const kind: 'gelir' | 'gider' | undefined = /gider|harca|ödedim|ödeme yaptım|aldım|satın|fatura/.test(q) ? 'gider' : /gelir|tahsil ettim|kazandım|sattım|satış|ödeme aldım|geldi/.test(q) ? 'gelir' : undefined;
  if (kind) {
    if (!money) return { missing: 'Tutarı da yazar mısınız? Örn. "Dün akaryakıta 2.400 TL harcadım, ekle"' };
    const accountId = findAccount(data, q) ?? data.accounts.find((a) => !a.archived && a.currency === money.currency)?.id ?? data.accounts.find((a) => !a.archived)?.id;
    if (!accountId) return { missing: 'Önce bir hesap eklemeniz gerekiyor. Örn. "Ziraat vadesiz hesabım var, bakiyesi 50 bin TL"' };
    const categoryId = findCategory(data, q, kind);
    const description = quoted(text) ?? text.replace(/\s*(,?\s*(lütfen|bunu)?\s*(ekle|kaydet|gir|yaz)(r misin)?\.?)\s*$/i, '').trim().slice(0, 80);
    return { action: { type: 'transaction', kind, amount: money.amount, accountId, categoryId, contactId: findContact(data, q), description, date: extractDate(q, ref) ?? ref } };
  }

  return { missing: 'Ne eklemek istediğinizi tam anlayamadım. Örnekler: “Garanti’de vadesiz hesabım var, bakiyesi 120 bin TL, ekle” · “Dün 2.400 TL akaryakıt harcadım” · “15 Aralık’ta 45 bin TL kira ödemesi planla”.' };
}

/* ------------------------------------------- Model çıktısını doğrulama */

/** Yerel modelin JSON çıktısını güvenli bir öneriye dönüştürür; geçersizse undefined. */
export function normalizeModelAction(raw: unknown, data: AppData, ref: string): ProposedAction | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const num = (v: unknown) => (typeof v === 'number' ? v : typeof v === 'string' ? parseAmount(v) : NaN);
  const cur = (v: unknown): Currency => (v === 'USD' || v === 'EUR' ? v : 'TRY');
  const date = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
  const lower = (s: string) => s.toLocaleLowerCase('tr');
  const accountByName = (n: string) => data.accounts.find((a) => !a.archived && n && (lower(a.name).includes(lower(n)) || lower(n).includes(lower(a.name))))?.id;
  const contactByName = (n: string) => data.contacts.find((c) => n && (lower(c.name).includes(lower(n)) || lower(n).includes(lower(c.name).split(' ')[0])))?.id;
  const categoryByName = (n: string, kind: 'gelir' | 'gider') => data.categories.find((c) => c.kind === kind && n && lower(c.name).includes(lower(n)))?.id;

  switch (r.type) {
    case 'account': {
      const name = str(r.name);
      const balance = num(r.balance);
      if (!name || !isFinite(balance)) return undefined;
      const t = r.accountType === 'kasa' || r.accountType === 'kredi_karti' ? r.accountType : 'banka';
      return { type: 'account', name: name.slice(0, 60), accountType: t, bank: str(r.bank) || undefined, currency: cur(r.currency), balance };
    }
    case 'transaction': {
      const kind = r.kind === 'gelir' ? 'gelir' : r.kind === 'gider' ? 'gider' : undefined;
      const amount = num(r.amount);
      if (!kind || !(amount > 0)) return undefined;
      const accountId = accountByName(str(r.account)) ?? data.accounts.find((a) => !a.archived)?.id;
      if (!accountId) return undefined;
      return { type: 'transaction', kind, amount, accountId, categoryId: categoryByName(str(r.category), kind), contactId: contactByName(str(r.contact)), description: str(r.description).slice(0, 80) || (kind === 'gelir' ? 'Gelir' : 'Gider'), date: date(r.date) ?? ref };
    }
    case 'scheduled': {
      const kind = r.kind === 'tahsilat' ? 'tahsilat' : r.kind === 'odeme' ? 'odeme' : undefined;
      const amount = num(r.amount);
      const dueDate = date(r.dueDate);
      if (!kind || !(amount > 0) || !dueDate) return undefined;
      const rec = r.recurrence === 'aylik' || r.recurrence === 'haftalik' || r.recurrence === 'yillik' ? r.recurrence : 'yok';
      return { type: 'scheduled', kind, title: str(r.title).slice(0, 60) || (kind === 'tahsilat' ? 'Planlı tahsilat' : 'Planlı ödeme'), amount, currency: cur(r.currency), dueDate, contactId: contactByName(str(r.contact)), categoryId: categoryByName(str(r.category), kind === 'tahsilat' ? 'gelir' : 'gider'), recurrence: rec };
    }
    case 'contact': {
      const name = str(r.name);
      if (!name) return undefined;
      const t = r.contactType === 'tedarikci' || r.contactType === 'diger' ? r.contactType : 'musteri';
      return { type: 'contact', name: name.slice(0, 80), contactType: t };
    }
  }
  return undefined;
}

/** Yerel modele verilecek çıkarım talimatı ve JSON şeması. */
export function modelExtractionPrompt(data: AppData, ref: string) {
  const system = [
    'Kullanıcının Türkçe isteğinden eklenecek TEK bir kaydı çıkar ve yalnızca JSON döndür.',
    'type: "account" (banka hesabı/kasa/kredi kartı ve bakiyesi), "transaction" (gerçekleşmiş gelir/gider), "scheduled" (ileri tarihli ödeme/tahsilat), "contact" (müşteri/tedarikçi).',
    `Bugün ${ref}. Tarihleri YYYY-MM-DD yaz. Tutarları sayı yaz ("85 bin" = 85000). Para birimi TRY, USD veya EUR.`,
    'Uydurma yapma: kullanıcının söylemediği alanları boş bırak.',
    `Mevcut hesaplar: ${data.accounts.filter((a) => !a.archived).map((a) => a.name).join(', ') || 'yok'}.`,
    `Gider kategorileri: ${data.categories.filter((c) => c.kind === 'gider').map((c) => c.name).join(', ')}. Gelir kategorileri: ${data.categories.filter((c) => c.kind === 'gelir').map((c) => c.name).join(', ')}.`,
    `Cariler: ${data.contacts.map((c) => c.name).join(', ') || 'yok'}.`,
  ].join('\n');
  const schema = {
    type: 'object',
    properties: {
      type: { type: 'string', enum: ['account', 'transaction', 'scheduled', 'contact'] },
      name: { type: 'string' },
      accountType: { type: 'string', enum: ['banka', 'kasa', 'kredi_karti'] },
      bank: { type: 'string' },
      balance: { type: 'number' },
      kind: { type: 'string', enum: ['gelir', 'gider', 'tahsilat', 'odeme'] },
      amount: { type: 'number' },
      currency: { type: 'string', enum: ['TRY', 'USD', 'EUR'] },
      account: { type: 'string' },
      category: { type: 'string' },
      contact: { type: 'string' },
      contactType: { type: 'string', enum: ['musteri', 'tedarikci', 'diger'] },
      description: { type: 'string' },
      title: { type: 'string' },
      date: { type: 'string' },
      dueDate: { type: 'string' },
      recurrence: { type: 'string', enum: ['yok', 'haftalik', 'aylik', 'yillik'] },
    },
    required: ['type'],
  };
  return { system, schema };
}
