import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { FREE_WATCHLIST_LIMIT } from '../data/repository';
import type { Language, Market, Sector } from '../data/types';
import { translate, type TranslationKey } from '../lib/i18n';
import { dark, light, type Palette } from '../lib/theme';

export type Threshold = '8' | '6' | 'all';
export type ThemePref = 'dark' | 'light' | 'system';

export interface WatchItem {
  companyId: string;
  threshold: Threshold;
}

export interface Prefs {
  onboarded: boolean;
  disclaimerAcceptedAt: string | null;
  language: Language;
  theme: ThemePref;
  markets: Market[];
  watchlist: WatchItem[];
  radar: { enabled: boolean; sectors: Sector[] };
  quietHours: { enabled: boolean; start: string; end: string };
  plan: 'free' | 'premium';
}

const STORAGE_KEY = 'borsa-radar:prefs:v1';

function defaultPrefs(): Prefs {
  const deviceLang = getLocales()[0]?.languageCode;
  return {
    onboarded: false,
    disclaimerAcceptedAt: null,
    language: deviceLang === 'tr' ? 'tr' : 'en',
    theme: 'dark',
    markets: ['BIST', 'US'],
    watchlist: [
      { companyId: 'c_mvsvn', threshold: '8' },
      { companyId: 'c_nwdx', threshold: '6' },
      { companyId: 'c_egbnk', threshold: 'all' },
    ],
    radar: { enabled: true, sectors: [] },
    quietHours: { enabled: true, start: '23:00', end: '08:00' },
    plan: 'free',
  };
}

interface AppStateValue {
  ready: boolean;
  prefs: Prefs;
  colors: Palette;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
  update: (patch: Partial<Prefs>) => void;
  isFollowing: (companyId: string) => boolean;
  /** Takibe ekler; ücretsiz plan sınırı doluysa false döner. */
  follow: (companyId: string) => boolean;
  unfollow: (companyId: string) => void;
  setThreshold: (companyId: string, threshold: Threshold) => void;
  canFollowMore: boolean;
}

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(defaultPrefs);
  const [ready, setReady] = useState(false);
  const systemScheme = useColorScheme();

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setPrefs({ ...defaultPrefs(), ...(JSON.parse(raw) as Partial<Prefs>) });
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (ready) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)).catch(() => {});
  }, [prefs, ready]);

  const update = useCallback((patch: Partial<Prefs>) => setPrefs((p) => ({ ...p, ...patch })), []);

  const canFollowMore = prefs.plan === 'premium' || prefs.watchlist.length < FREE_WATCHLIST_LIMIT;

  const value = useMemo<AppStateValue>(() => {
    const scheme = prefs.theme === 'system' ? (systemScheme === 'light' ? 'light' : 'dark') : prefs.theme;
    return {
      ready,
      prefs,
      colors: scheme === 'light' ? light : dark,
      t: (key, vars) => translate(prefs.language, key, vars),
      update,
      canFollowMore,
      isFollowing: (id) => prefs.watchlist.some((w) => w.companyId === id),
      follow: (id) => {
        if (prefs.watchlist.some((w) => w.companyId === id)) return true;
        if (!canFollowMore) return false;
        setPrefs((p) => ({ ...p, watchlist: [...p.watchlist, { companyId: id, threshold: '6' }] }));
        return true;
      },
      unfollow: (id) => setPrefs((p) => ({ ...p, watchlist: p.watchlist.filter((w) => w.companyId !== id) })),
      setThreshold: (id, threshold) =>
        setPrefs((p) => ({
          ...p,
          watchlist: p.watchlist.map((w) => (w.companyId === id ? { ...w, threshold } : w)),
        })),
    };
  }, [prefs, ready, systemScheme, update, canFollowMore]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useApp(): AppStateValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useApp must be used inside AppStateProvider');
  return ctx;
}
