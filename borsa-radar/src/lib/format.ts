import type { Currency, Language } from '../data/types';

const SYMBOL: Record<Currency, string> = { TRY: '₺', USD: '$', EUR: '€' };

function decimal(value: number, lang: Language, digits = 1): string {
  const fixed = value.toFixed(digits).replace(/\.0+$/, '');
  return lang === 'tr' ? fixed.replace('.', ',') : fixed;
}

/** "9,3 milyar ₺" / "₺9.3B" gibi kısa para gösterimi. */
export function formatMoneyCompact(amount: number, currency: Currency, lang: Language): string {
  const units =
    lang === 'tr'
      ? [
          { v: 1e9, s: 'milyar' },
          { v: 1e6, s: 'milyon' },
        ]
      : [
          { v: 1e9, s: 'B' },
          { v: 1e6, s: 'M' },
        ];
  const unit = units.find((u) => amount >= u.v);
  const sym = SYMBOL[currency];
  if (!unit) return lang === 'tr' ? `${formatInteger(amount, lang)} ${sym}` : `${sym}${formatInteger(amount, lang)}`;
  const n = decimal(amount / unit.v, lang);
  return lang === 'tr' ? `${n} ${unit.s} ${sym}` : `${sym}${n}${unit.s}`;
}

/** "9.300.000.000 ₺" / "$1,100,000,000" gibi tam gösterim. */
export function formatMoneyFull(amount: number, currency: Currency, lang: Language): string {
  const sym = SYMBOL[currency];
  return lang === 'tr' ? `${formatInteger(amount, lang)} ${sym}` : `${sym}${formatInteger(amount, lang)}`;
}

function formatInteger(n: number, lang: Language): string {
  const sep = lang === 'tr' ? '.' : ',';
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, sep);
}

export function formatPercent(value: number, lang: Language): string {
  const digits = value < 10 ? 1 : 0;
  const n = decimal(value, lang, digits);
  return lang === 'tr' ? `~%${n}` : `~${n}%`;
}

export function relativeTime(iso: string, lang: Language): string {
  const diffMin = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (diffMin < 1) return lang === 'tr' ? 'şimdi' : 'just now';
  if (diffMin < 60) return lang === 'tr' ? `${diffMin} dk önce` : `${diffMin}m ago`;
  const h = Math.floor(diffMin / 60);
  if (h < 24) return lang === 'tr' ? `${h} sa önce` : `${h}h ago`;
  const d = Math.floor(h / 24);
  return lang === 'tr' ? `${d} gün önce` : `${d}d ago`;
}

const MONTHS: Record<Language, string[]> = {
  tr: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

/** Cihazın saat diliminde tarih ve saat: "13 Eki 2026, 14:05" / "Oct 13, 2026, 2:05 PM". */
export function formatDateTime(iso: string, lang: Language): string {
  const d = new Date(iso);
  const mon = MONTHS[lang][d.getMonth()];
  const mm = String(d.getMinutes()).padStart(2, '0');
  if (lang === 'tr') return `${d.getDate()} ${mon} ${d.getFullYear()}, ${String(d.getHours()).padStart(2, '0')}:${mm}`;
  const h12 = d.getHours() % 12 || 12;
  const ampm = d.getHours() < 12 ? 'AM' : 'PM';
  return `${mon} ${d.getDate()}, ${d.getFullYear()}, ${h12}:${mm} ${ampm}`;
}
