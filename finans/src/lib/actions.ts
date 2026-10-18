// Asistanın kullanıcı isteğiyle kayıt eklemesi. İsteği yerel model bir kayda çevirir; bu modül
// modelin çıktısını doğrular ve bir ÖNERİ üretir. Kayıt, kullanıcı onay kartındaki "Ekle"
// düğmesine bastığında yazılır.
import type { AccountType, AppData, ContactType, Currency, Recurrence, ScheduledKind, TransactionKind } from '../types';
import { parseAmount } from './format';

export type ProposedAction =
  | { type: 'account'; name: string; accountType: AccountType; bank?: string; currency: Currency; balance: number }
  | { type: 'transaction'; kind: Exclude<TransactionKind, 'transfer'>; amount: number; accountId: string; categoryId?: string; contactId?: string; description: string; date: string }
  | { type: 'scheduled'; kind: ScheduledKind; title: string; amount: number; currency: Currency; dueDate: string; contactId?: string; categoryId?: string; recurrence: Recurrence }
  | { type: 'contact'; name: string; contactType: ContactType };

const ADD_VERB = /(?<![\p{L}\p{N}])(ekle|ekler misin|ekleyebilir|oluştur|kaydet|kayıt (et|aç)|gir(er misin)?|tanımla|aç(ar mısın)?|yaz(ar mısın)?)(?![\p{L}\p{N}])/u;

export function isActionRequest(question: string): boolean {
  const q = question.toLocaleLowerCase('tr');
  if (/\?$/.test(q.trim()) && !/(ekler|oluşturur|kaydeder|girer|açar|yazar) m[ıi]s[ıi]n/.test(q)) return false;
  return ADD_VERB.test(q) || /harcadım|ödedim|tahsil ettim|aldım|kazandım|sattım/.test(q);
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
    'Uydurma yapma: kullanıcının söylemediği alanları boş bırak. Tutar, tarih veya ad gibi zorunlu bir bilgi eksikse ya da istek bir kayıt eklemek değilse type: "none" döndür.',
    `Mevcut hesaplar: ${data.accounts.filter((a) => !a.archived).map((a) => a.name).join(', ') || 'yok'}.`,
    `Gider kategorileri: ${data.categories.filter((c) => c.kind === 'gider').map((c) => c.name).join(', ')}. Gelir kategorileri: ${data.categories.filter((c) => c.kind === 'gelir').map((c) => c.name).join(', ')}.`,
    `Cariler: ${data.contacts.map((c) => c.name).join(', ') || 'yok'}.`,
  ].join('\n');
  const schema = {
    type: 'object',
    properties: {
      type: { type: 'string', enum: ['account', 'transaction', 'scheduled', 'contact', 'none'] },
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
