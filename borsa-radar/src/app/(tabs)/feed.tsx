import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip, ChipRow, Disclaimer, DisclosureCard, Segmented } from '../../components/ui';
import { getDisclosures, marketOf } from '../../data/repository';
import type { EventType, Market } from '../../data/types';
import { eventKey } from '../../lib/i18n';
import { space } from '../../lib/theme';
import { useApp } from '../../state/AppState';

type FeedTab = 'following' | 'all';
const SCORE_OPTIONS = [0, 5, 6, 8] as const;

export default function FeedScreen() {
  const { colors, prefs, t } = useApp();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tab?: string }>();

  const [tab, setTab] = useState<FeedTab>(params.tab === 'all' ? 'all' : 'following');
  const [market, setMarket] = useState<'all' | Market>('all');
  const [minScore, setMinScore] = useState<number>(6);
  const [eventType, setEventType] = useState<EventType | null>(null);

  useEffect(() => {
    if (params.tab === 'all' || params.tab === 'following') setTab(params.tab);
  }, [params.tab]);

  const followedIds = useMemo(() => new Set(prefs.watchlist.map((w) => w.companyId)), [prefs.watchlist]);

  const base = useMemo(
    () =>
      getDisclosures().filter((d) => {
        const m = marketOf(d);
        if (!prefs.markets.includes(m)) return false;
        if (market !== 'all' && m !== market) return false;
        if (tab === 'following' && !followedIds.has(d.companyId)) return false;
        if (minScore > 0 && (d.analysis.isRoutine || d.analysis.score < minScore)) return false;
        return true;
      }),
    [tab, market, minScore, followedIds, prefs.markets],
  );

  const eventTypes = useMemo(() => [...new Set(base.map((d) => d.analysis.eventType))], [base]);
  const items = eventType ? base.filter((d) => d.analysis.eventType === eventType) : base;

  const empty = tab === 'following' && followedIds.size === 0 ? t('feed.emptyFollowing') : t('feed.empty');

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + space.sm }}>
      <View style={{ paddingHorizontal: space.lg }}>
        <Segmented
          options={[
            { value: 'following', label: t('feed.following') },
            { value: 'all', label: t('feed.all') },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>
      <View style={{ gap: space.sm, marginTop: space.md, marginBottom: space.sm }}>
        <ChipRow>
          {prefs.markets.length > 1 ? (
            <>
              <Chip label={t('market.all')} active={market === 'all'} onPress={() => setMarket('all')} />
              {prefs.markets.map((m) => (
                <Chip key={m} label={t(m === 'BIST' ? 'market.BIST' : 'market.US')} active={market === m} onPress={() => setMarket(m)} />
              ))}
              <View style={{ width: 1, backgroundColor: colors.border, marginHorizontal: 2 }} />
            </>
          ) : null}
          {SCORE_OPTIONS.map((s) => (
            <Chip key={s} label={s === 0 ? t('feed.anyScore') : t('feed.minScore', { n: s })} active={minScore === s} onPress={() => setMinScore(s)} />
          ))}
        </ChipRow>
        {eventTypes.length > 1 ? (
          <ChipRow>
            <Chip label={t('feed.allTypes')} active={eventType === null} onPress={() => setEventType(null)} />
            {eventTypes.map((e) => (
              <Chip key={e} label={t(eventKey(e))} active={eventType === e} onPress={() => setEventType(eventType === e ? null : e)} />
            ))}
          </ChipRow>
        ) : null}
      </View>
      <FlatList
        data={items}
        keyExtractor={(d) => d.id}
        renderItem={({ item }) => <DisclosureCard d={item} />}
        contentContainerStyle={{ paddingHorizontal: space.lg, paddingTop: space.sm, gap: space.md }}
        ListEmptyComponent={<Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: space.xl }}>{empty}</Text>}
        ListFooterComponent={
          <View>
            {minScore > 0 ? <Text style={{ color: colors.textFaint, fontSize: 12, marginTop: space.sm }}>{t('feed.routineNote')}</Text> : null}
            <Disclaimer />
          </View>
        }
      />
    </View>
  );
}
