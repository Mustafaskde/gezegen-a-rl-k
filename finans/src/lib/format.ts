import type { Currency } from '../types';

const moneyFormatters = new Map<string, Intl.NumberFormat>();

export function money(value: number, currency: Currency = 'TRY', opts: { compact?: boolean; sign?: boolean } = {}): string {
  const key = `${currency}-${opts.compact ? 'c' : 'f'}-${opts.sign ? 's' : 'n'}`;
  let f = moneyFormatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency,
      notation: opts.compact ? 'compact' : 'standard',
      maximumFractionDigits: opts.compact ? 1 : 2,
      minimumFractionDigits: opts.compact ? 0 : 2,
      signDisplay: opts.sign ? 'exceptZero' : 'auto',
    });
    moneyFormatters.set(key, f);
  }
  // -0,00 gösterimini önle
  return f.format(Math.abs(value) < 0.005 ? 0 : value);
}

const dateFmt = new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
const shortDateFmt = new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short', timeZone: 'UTC' });
const monthFmt = new Intl.DateTimeFormat('tr-TR', { month: 'short', year: '2-digit', timeZone: 'UTC' });
const longMonthFmt = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric', timeZone: 'UTC' });

function parse(d: string): Date {
  return new Date(d.length === 7 ? `${d}-01T00:00:00Z` : `${d}T00:00:00Z`);
}

export const fmtDate = (d: string) => dateFmt.format(parse(d));
export const fmtShortDate = (d: string) => shortDateFmt.format(parse(d));
export const fmtMonth = (m: string) => monthFmt.format(parse(m));
export const fmtLongMonth = (m: string) => longMonthFmt.format(parse(m));

export function percent(v: number): string {
  if (!isFinite(v)) return '—';
  return new Intl.NumberFormat('tr-TR', { style: 'percent', maximumFractionDigits: 1, signDisplay: 'exceptZero' }).format(v);
}

export function relativeDays(n: number): string {
  if (n === 0) return 'Bugün';
  if (n === 1) return 'Yarın';
  if (n === -1) return 'Dün';
  return n > 0 ? `${n} gün sonra` : `${-n} gün gecikti`;
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

/** "1.234,56" veya "1234.56" girdilerini sayıya çevirir. */
export function parseAmount(input: string): number {
  const s = input.trim().replace(/\s/g, '').replace(/[₺$€]/g, '');
  if (!s) return NaN;
  let normalized = s;
  if (s.includes(',')) normalized = s.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) normalized = s.replace(/\./g, ''); // 1.250.000
  return Number(normalized);
}

export const CURRENCY_SYMBOL: Record<Currency, string> = { TRY: '₺', USD: '$', EUR: '€' };
