import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import { Screen } from '../../components/Screen';
import { Card, DemoBadge, Disclaimer, DisclosureRow, HighlightCard, SectionHeader, Segmented } from '../../components/ui';
import { getDigest, getDisclosures, isImportant, isWithinHours, marketOf, meetsThreshold } from '../../data/repository';
import type { Market } from '../../data/types';
import { space } from '../../lib/theme';
import { useApp } from '../../state/AppState';

type MarketFilter = 'all' | Market;

export default function SummaryScreen() {
  const { colors, prefs, t } = useApp();
  const { width } = useWindowDimensions();
  const [filter, setFilter] = useState<MarketFilter>('all');

  const markets: Market[] = filter === 'all' ? prefs.markets : [filter];

  const { important, perMarket, followed, highlights } = useMemo(() => {
    const recent = getDisclosures().filter((d) => isWithinHours(d, 24) && markets.includes(marketOf(d)));
    const important = recent.filter(isImportant);
    const thresholds = new Map(prefs.watchlist.map((w) => [w.companyId, w.threshold]));
    const followed = recent.filter((d) => {
      const th = thresholds.get(d.companyId);
      return th !== undefined && meetsThreshold(d, th);
    });
    return {
      important,
      perMarket: {
        BIST: important.filter((d) => marketOf(d) === 'BIST').length,
        US: important.filter((d) => marketOf(d) === 'US').length,
      },
      followed,
      highlights: [...important].sort((a, b) => b.analysis.score - a.analysis.score).slice(0, 3),
    };
  }, [markets.join(','), prefs.watchlist]);

  const segmentOptions: { value: MarketFilter; label: string }[] = [
    { value: 'all', label: t('market.all') },
    ...prefs.markets.map((m) => ({ value: m as MarketFilter, label: t(m === 'BIST' ? 'market.BIST' : 'market.US') })),
  ];
  const cardWidth = (width - space.lg * 2 - space.md) / 2;

  return (
    <Screen>
      {prefs.markets.length > 1 ? <Segmented options={segmentOptions} value={filter} onChange={setFilter} /> : null}

      <Card style={{ marginTop: space.lg, gap: space.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: '700', letterSpacing: 0.8 }}>{t('summary.eyebrow')}</Text>
          <DemoBadge />
        </View>
        <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800' }}>
          {t('summary.headlinePre')} <Text style={{ color: colors.accent, fontSize: 34 }}>{important.length}</Text> {t('summary.headlinePost')}
        </Text>
        <View style={{ flexDirection: 'row', gap: space.lg, flexWrap: 'wrap' }}>
          {filter === 'all' && prefs.markets.length > 1 ? (
            <Row icon="document-text-outline" text={t('summary.split', { bist: perMarket.BIST, us: perMarket.US })} />
          ) : null}
          <Row
            icon="star-outline"
            text={followed.length > 0 ? t('summary.personal', { n: followed.length }) : t('summary.personalNone')}
            highlight={followed.length > 0}
          />
        </View>
        {markets.map((m) => {
          const digest = getDigest(m);
          if (!digest) return null;
          return (
            <View key={m} style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: space.md, gap: 4 }}>
              <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '700' }}>
                {t('summary.digest', { market: t(m === 'BIST' ? 'market.BIST' : 'market.US') })}
              </Text>
              <Text style={{ color: colors.text, fontSize: 14, lineHeight: 21 }}>{digest[prefs.language]}</Text>
            </View>
          );
        })}
      </Card>

      {highlights.length > 0 ? (
        <>
          <SectionHeader title={t('summary.highlights')} action={t('seeAll')} onAction={() => router.navigate({ pathname: '/feed', params: { tab: 'all' } })} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.md }} style={{ marginHorizontal: -space.lg }}>
            <View style={{ width: space.lg - space.md }} />
            {highlights.map((d) => (
              <HighlightCard key={d.id} d={d} width={cardWidth} />
            ))}
            <View style={{ width: space.lg - space.md }} />
          </ScrollView>
        </>
      ) : null}

      <SectionHeader
        title={t('summary.following')}
        action={prefs.watchlist.length > 0 ? t('seeAll') : undefined}
        onAction={() => router.navigate({ pathname: '/feed', params: { tab: 'following' } })}
      />
      {prefs.watchlist.length === 0 ? (
        <Card style={{ alignItems: 'center', gap: space.sm }}>
          <Ionicons name="star-outline" size={28} color={colors.accent} />
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>{t('summary.emptyTitle')}</Text>
          <Text style={{ color: colors.textMuted, textAlign: 'center' }}>{t('summary.emptyBody')}</Text>
          <Pressable onPress={() => router.navigate('/watchlist')} style={{ marginTop: space.sm, backgroundColor: colors.accent, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999 }}>
            <Text style={{ color: colors.accentText, fontWeight: '700' }}>{t('summary.emptyCta')}</Text>
          </Pressable>
        </Card>
      ) : followed.length === 0 ? (
        <Card>
          <Text style={{ color: colors.textMuted }}>{t('summary.followingEmpty')}</Text>
        </Card>
      ) : (
        <Card style={{ paddingVertical: space.xs }}>
          {followed.map((d, i) => (
            <DisclosureRow key={d.id} d={d} last={i === followed.length - 1} />
          ))}
        </Card>
      )}

      <Disclaimer />
    </Screen>
  );
}

function Row({ icon, text, highlight }: { icon: keyof typeof Ionicons.glyphMap; text: string; highlight?: boolean }) {
  const { colors } = useApp();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Ionicons name={icon} size={16} color={highlight ? colors.accent : colors.textMuted} />
      <Text style={{ color: highlight ? colors.text : colors.textMuted, fontSize: 14, fontWeight: highlight ? '600' : '400' }}>{text}</Text>
    </View>
  );
}
