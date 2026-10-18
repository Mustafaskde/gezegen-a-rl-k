export type Currency = 'TRY' | 'USD' | 'EUR';

export type AccountType = 'banka' | 'kasa' | 'kredi_karti';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  bank?: string;
  iban?: string;
  currency: Currency;
  openingBalance: number;
  openingDate: string; // YYYY-MM-DD
  archived?: boolean;
}

export type ContactType = 'musteri' | 'tedarikci' | 'diger';

export interface Contact {
  id: string;
  name: string;
  type: ContactType;
  taxNo?: string;
  phone?: string;
  email?: string;
  note?: string;
}

export type CategoryKind = 'gelir' | 'gider';

export interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
  /** Gider kategorisi zorunlu (kira, maaş, vergi…) mi; değilse isteğe bağlı sayılır. */
  essential?: boolean;
  /** Aylık bütçe limiti (TL). */
  budget?: number;
}

export type TransactionKind = 'gelir' | 'gider' | 'transfer';

export interface Transaction {
  id: string;
  kind: TransactionKind;
  date: string; // YYYY-MM-DD
  /** Hesabın para biriminde tutar (her zaman pozitif). */
  amount: number;
  accountId: string;
  /** Transfer hedefi */
  toAccountId?: string;
  /** Hedef hesabın para biriminde tutar (farklı döviz transferleri için). */
  toAmount?: number;
  categoryId?: string;
  contactId?: string;
  description: string;
  /** Bu işlem bir vadeli kaydı kapatıyorsa ilgili kayıt. */
  scheduledId?: string;
  /** Vadeli kaydın para biriminde, kapatılan tutar. */
  scheduledAmount?: number;
}

export type ScheduledKind = 'tahsilat' | 'odeme';

export type Recurrence = 'yok' | 'haftalik' | 'aylik' | 'yillik';

export interface Scheduled {
  id: string;
  kind: ScheduledKind;
  title: string;
  contactId?: string;
  categoryId?: string;
  amount: number;
  currency: Currency;
  issueDate: string; // kayıt / fatura tarihi
  dueDate: string; // vade tarihi
  paidAmount: number;
  recurrence: Recurrence;
  recurrenceEnd?: string;
  /** Tekrarlayan kayıt kapanınca bir sonraki dönem oluşturulduysa true. */
  nextSpawned?: boolean;
  note?: string;
}

/** Asistan cevaplarını Ollama'da çalışan yerel model yazar. */
export interface AiSettings {
  ollamaUrl: string;
  ollamaModel: string;
}

export interface Settings {
  companyName: string;
  rates: Record<Currency, number>;
  theme: 'system' | 'light' | 'dark';
  ai: AiSettings;
}

export interface AppData {
  version: number;
  accounts: Account[];
  contacts: Contact[];
  categories: Category[];
  transactions: Transaction[];
  scheduled: Scheduled[];
  settings: Settings;
  updatedAt: string;
}

export type ScheduledStatus = 'bekliyor' | 'gecikmis' | 'kismi' | 'tamamlandi';
