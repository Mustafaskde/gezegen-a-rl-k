import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Card, Disclaimer, ScoreBadge, SentimentPill, Tag } from '../../components/ui';
import { FREE_WATCHLIST_LIMIT, getCompany, getDisclosure, revenueRatioPct } from '../../data/repository';
import { eventKey, sessionKey } from '../../lib/i18n';
import { formatDateTime, formatMoneyCompact, formatMoneyFull, formatPercent } from '../../lib/format';
import { radius, space } from '../../lib/theme';
import { useApp } from '../../state/AppState';

export default function DisclosureScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, prefs, t, isFollowing, follow } = useApp();
  const insets = useSafeAreaInsets();

  const d = id ? getDisclosure(id) : undefined;
  const company = d ? getCompany(d.companyId) : undefined;

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
      <Pressable onPress={back} hitSlop={10} style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} accessibilityLabel="Back">
        <Ionicons name="chevron-back" size={22} color={colors.text} />
      </Pressable>
      <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700' }}>{t('detail.title')}</Text>
    </View>
  );

  if (!d || !company) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        {header}
        <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 40 }}>{t('detail.notFound')}</Text>
      </View>
    );
  }

  const lang = prefs.language;
  const a = d.analysis[lang];
  const ratio = revenueRatioPct(d);
  const following = isFollowing(company.id);

  const onFollow = () => {
    if (following) return;
    if (!follow(company.id)) Alert.alert(t('watch.limitTitle'), t('watch.limitBody', { limit: FREE_WATCHLIST_LIMIT }));
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {header}
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: insets.bottom + space.xl, gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <Avatar company={company} size={56} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>
              {company.ticker} <Text style={{ color: colors.textMuted, fontWeight: '500' }}>· {company.exchange}</Text>
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 14 }} numberOfLines={1}>
              {company.name}
            </Text>
          </View>
          <ScoreBadge score={d.analysis.score} large />
        </View>

        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800', lineHeight: 28 }}>{a.title}</Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          <Tag label={t(eventKey(d.analysis.eventType))} />
          <SentimentPill sentiment={d.analysis.sentiment} />
          <Tag icon="time-outline" label={t(sessionKey(d.session))} />
          <Tag icon="document-text-outline" label={d.formType ? `${d.source} · ${d.formType}` : d.source} />
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>{formatDateTime(d.publishedAt, lang)}</Text>

        {d.analysis.isRoutine ? (
          <Card>
            <Text style={{ color: colors.text, fontSize: 15, lineHeight: 22 }}>{a.summary}</Text>
            <Text style={{ color: colors.textFaint, fontSize: 13, marginTop: space.sm }}>{t('detail.routine')}</Text>
          </Card>
        ) : (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="sparkles-outline" size={14} color={colors.accent} />
              <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '700' }}>{t('detail.aiLabel')}</Text>
            </View>
            <Section icon="document-text-outline" title={t('detail.aiSummary')}>
              <Body>{a.summary}</Body>
            </Section>
            <Section icon="bar-chart-outline" title={t('detail.why')}>
              <Body>{a.whyItMatters}</Body>
            </Section>
            {a.risks.length > 0 ? (
              <Section icon="warning-outline" title={t('detail.risks')}>
                {a.risks.map((r) => (
                  <View key={r} style={{ flexDirection: 'row', gap: 8 }}>
                    <Text style={{ color: colors.textMuted, fontSize: 15 }}>•</Text>
                    <Body>{r}</Body>
                  </View>
                ))}
              </Section>
            ) : null}
            {d.language !== lang ? <Text style={{ color: colors.textFaint, fontSize: 12 }}>{t('detail.translated')}</Text> : null}
          </>
        )}

        {d.analysis.amount != null && d.analysis.amountCurrency ? (
          <Card style={{ paddingVertical: space.xs }}>
            <KeyValue label={t('detail.amount')} value={formatMoneyFull(d.analysis.amount, d.analysis.amountCurrency, lang)} />
            {ratio != null ? (
              <>
                <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />
                <KeyValue label={t('detail.ratio')} value={formatPercent(ratio, lang)} />
                <Text style={{ color: colors.textFaint, fontSize: 12, paddingBottom: space.md }}>
                  {t('detail.ratioNote', { year: company.fiscalYear, revenue: formatMoneyCompact(company.annualRevenue, company.currency, lang) })}
                </Text>
              </>
            ) : null}
          </Card>
        ) : null}

        <Pressable
          onPress={() => Linking.openURL(d.url)}
          style={({ pressed }) => [styles.outlineBtn, { borderColor: colors.accent, backgroundColor: colors.accentSoft, opacity: pressed ? 0.8 : 1 }]}
        >
          <Ionicons name="open-outline" size={18} color={colors.accent} />
          <Text style={{ color: colors.accent, fontSize: 16, fontWeight: '700' }}>{t('detail.openSource', { source: d.source })}</Text>
        </Pressable>

        <Pressable
          onPress={onFollow}
          disabled={following}
          style={({ pressed }) => [styles.outlineBtn, { borderColor: colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.8 : 1 }]}
        >
          <Ionicons name={following ? 'star' : 'star-outline'} size={18} color={following ? colors.accent : colors.text} />
          <Text style={{ color: following ? colors.textMuted : colors.text, fontSize: 16, fontWeight: '600' }}>
            {following ? t('detail.following') : t('detail.follow')}
          </Text>
        </Pressable>

        <Disclaimer />
      </ScrollView>
    </View>
  );
}

function Section({ icon, title, children }: { icon: keyof typeof Ionicons.glyphMap; title: string; children: ReactNode }) {
  const { colors } = useApp();
  return (
    <Card style={{ gap: space.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name={icon} size={20} color={colors.textMuted} />
        <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>{title}</Text>
      </View>
      {children}
    </Card>
  );
}

function Body({ children }: { children: ReactNode }) {
  const { colors } = useApp();
  return <Text style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22, flex: 1 }}>{children}</Text>;
}

function KeyValue({ label, value }: { label: string; value: string }) {
  const { colors } = useApp();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: space.md }}>
      <Text style={{ color: colors.textMuted, fontSize: 15 }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingBottom: space.md },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  outlineBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: radius.lg, borderWidth: 1 },
});
