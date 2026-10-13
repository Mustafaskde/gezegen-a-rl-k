// Uygulamanın veri erişim katmanı. Şu an demo verisini döndürüyor;
// backend (Supabase) hazır olduğunda yalnızca bu dosya değişecek.
import { companies, digests, disclosures } from './mock';
import type { Company, Currency, Disclosure, Market, MarketDigest } from './types';

/** Önem eşiği: bu skorun altındaki veya rutin duyurular "önemli" sayılmaz. */
export const IMPORTANT_SCORE = 6;
export const RADAR_SCORE = 9;
export const FREE_WATCHLIST_LIMIT = 3;

/** Demo kurları. Gerçek uygulamada günlük kur servisinden gelecek. */
const FX_TO_TRY: Record<Currency, number> = { TRY: 1, USD: 41.5, EUR: 48.4 };

const companyById = new Map(companies.map((c) => [c.id, c]));

export function getCompanies(): Company[] {
  return companies;
}

export function getCompany(id: string): Company | undefined {
  return companyById.get(id);
}

export function getDisclosures(): Disclosure[] {
  return [...disclosures].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function getDisclosure(id: string): Disclosure | undefined {
  return disclosures.find((d) => d.id === id);
}

export function getDigest(market: Market): MarketDigest | undefined {
  return digests.find((d) => d.market === market);
}

export function marketOf(d: Disclosure): Market {
  return getCompany(d.companyId)?.market ?? 'BIST';
}

export function isImportant(d: Disclosure): boolean {
  return !d.analysis.isRoutine && d.analysis.score >= IMPORTANT_SCORE;
}

/** Kullanıcının hisse bazındaki bildirim eşiğini karşılıyor mu? */
export function meetsThreshold(d: Disclosure, threshold: '8' | '6' | 'all'): boolean {
  return threshold === 'all' || d.analysis.score >= Number(threshold);
}

export function isWithinHours(d: Disclosure, hours: number): boolean {
  return Date.now() - new Date(d.publishedAt).getTime() <= hours * 3_600_000;
}

/**
 * Duyurudaki tutarın şirketin son yıllık gelirine oranı (%).
 * Bu hesap bilerek AI'ya bırakılmıyor: AI sadece tutarı çıkarır, oran burada hesaplanır.
 */
export function revenueRatioPct(d: Disclosure): number | null {
  const company = getCompany(d.companyId);
  const { amount, amountCurrency } = d.analysis;
  if (!company || amount == null || amountCurrency == null || company.annualRevenue <= 0) return null;
  const amountInTry = amount * FX_TO_TRY[amountCurrency];
  const revenueInTry = company.annualRevenue * FX_TO_TRY[company.currency];
  return (amountInTry / revenueInTry) * 100;
}
