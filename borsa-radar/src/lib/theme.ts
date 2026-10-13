export interface Palette {
  scheme: 'dark' | 'light';
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  textFaint: string;
  accent: string;
  accentText: string;
  accentSoft: string;
  scoreHighBg: string;
  scoreHighText: string;
  scoreMidBg: string;
  scoreMidText: string;
  positiveBg: string;
  positiveText: string;
  negativeBg: string;
  negativeText: string;
  tabBar: string;
}

// Lacivert + kehribar. Yeşil/kırmızı sadece duygu etiketlerinde, düşük doygunlukta.
export const dark: Palette = {
  scheme: 'dark',
  bg: '#08101D',
  surface: '#101B2D',
  surfaceAlt: '#17253B',
  border: '#22324B',
  text: '#E9EEF6',
  textMuted: '#93A1B7',
  textFaint: '#66758D',
  accent: '#F5A524',
  accentText: '#1C1305',
  accentSoft: 'rgba(245,165,36,0.14)',
  scoreHighBg: '#D48C0A',
  scoreHighText: '#1C1305',
  scoreMidBg: '#F6D58C',
  scoreMidText: '#3A2905',
  positiveBg: 'rgba(76,201,143,0.14)',
  positiveText: '#6FD6A6',
  negativeBg: 'rgba(240,96,96,0.14)',
  negativeText: '#F29595',
  tabBar: '#0D1626',
};

export const light: Palette = {
  scheme: 'light',
  bg: '#F3F5F9',
  surface: '#FFFFFF',
  surfaceAlt: '#EBEFF5',
  border: '#DCE2EB',
  text: '#0D1B2E',
  textMuted: '#55657C',
  textFaint: '#8693A6',
  accent: '#C77C02',
  accentText: '#FFFFFF',
  accentSoft: 'rgba(199,124,2,0.12)',
  scoreHighBg: '#D48C0A',
  scoreHighText: '#1C1305',
  scoreMidBg: '#F9E2AD',
  scoreMidText: '#4A3507',
  positiveBg: 'rgba(28,140,90,0.12)',
  positiveText: '#16784C',
  negativeBg: 'rgba(200,50,50,0.10)',
  negativeText: '#B23434',
  tabBar: '#FFFFFF',
};

export const radius = { sm: 10, md: 14, lg: 20, pill: 999 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
