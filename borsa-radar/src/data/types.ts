export type Language = 'tr' | 'en';
export type Market = 'BIST' | 'US';
export type Exchange = 'BIST' | 'NYSE' | 'NASDAQ';
export type Currency = 'TRY' | 'USD' | 'EUR';
export type Sentiment = 'positive' | 'negative' | 'neutral';
export type Session = 'regular' | 'pre_market' | 'after_hours' | 'closed';

export type Sector =
  | 'defense'
  | 'aviation'
  | 'energy'
  | 'food'
  | 'banking'
  | 'technology'
  | 'health'
  | 'automotive';

export type EventType =
  | 'contract'
  | 'tender'
  | 'earnings'
  | 'guidance'
  | 'bonus_issue'
  | 'rights_issue'
  | 'dividend'
  | 'buyback'
  | 'merger_acquisition'
  | 'litigation_penalty'
  | 'management_change'
  | 'debt_financing'
  | 'regulatory_approval'
  | 'recall'
  | 'routine'
  | 'other';

export interface Company {
  id: string;
  market: Market;
  exchange: Exchange;
  ticker: string;
  name: string;
  sector: Sector;
  currency: Currency;
  /** Son yıllık gelir, şirketin raporlama para biriminde. Oran hesabı bu değerle KODDA yapılır. */
  annualRevenue: number;
  fiscalYear: number;
}

/** AI'nın tek bir dil için ürettiği metinler. */
export interface LocalizedAnalysis {
  title: string;
  shortSummary: string;
  summary: string;
  whyItMatters: string;
  risks: string[];
  notificationText: string;
}

export interface Analysis {
  stage: 'screen' | 'deep';
  eventType: EventType;
  isRoutine: boolean;
  score: number;
  sentiment: Sentiment;
  /** AI sadece duyurudaki tutarı çıkarır; gelire oranı kod hesaplar. */
  amount: number | null;
  amountCurrency: Currency | null;
  tr: LocalizedAnalysis;
  en: LocalizedAnalysis;
}

export interface Disclosure {
  id: string;
  companyId: string;
  source: 'KAP' | 'SEC';
  formType?: string;
  url: string;
  language: Language;
  publishedAt: string;
  session: Session;
  analysis: Analysis;
}

export interface MarketDigest {
  market: Market;
  tr: string;
  en: string;
}
