import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { getCompany } from '../data/repository';
import type { Company, Disclosure, Sentiment } from '../data/types';
import { eventKey, sentimentKey } from '../lib/i18n';
import { relativeTime } from '../lib/format';
import { radius, space } from '../lib/theme';
import { useApp } from '../state/AppState';

const AVATAR_COLORS = ['#2F5DA8', '#8A3FA0', '#1F7A6C', '#B0532B', '#3D4FA0', '#7A6A1F', '#A03F5C', '#2C7A3D'];

export function Avatar({ company, size = 44 }: { company: Company; size?: number }) {
  let hash = 0;
  for (const ch of company.ticker) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const bg = AVATAR_COLORS[hash % AVATAR_COLORS.length];
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.32, letterSpacing: 0.5 }}>{company.ticker.slice(0, 2)}</Text>
    </View>
  );
}

export function ScoreBadge({ score, large }: { score: number; large?: boolean }) {
  const { colors, t } = useApp();
  const tier = score >= 8 ? 'high' : score >= 5 ? 'mid' : 'low';
  const bg = tier === 'high' ? colors.scoreHighBg : tier === 'mid' ? colors.scoreMidBg : colors.surfaceAlt;
  const fg = tier === 'high' ? colors.scoreHighText : tier === 'mid' ? colors.scoreMidText : colors.textMuted;
  if (large) {
    return (
      <View style={[styles.badgeLarge, { backgroundColor: bg }]}>
        <Text style={{ color: fg, fontSize: 11, fontWeight: '600' }}>{t('detail.importance')}</Text>
        <Text style={{ color: fg, fontSize: 18, fontWeight: '800' }}>{score}/10</Text>
      </View>
    );
  }
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={{ color: fg, fontWeight: '800', fontSize: 13 }}>{score}</Text>
    </View>
  );
}

export function SentimentPill({ sentiment }: { sentiment: Sentiment }) {
  const { colors, t } = useApp();
  const bg = sentiment === 'positive' ? colors.positiveBg : sentiment === 'negative' ? colors.negativeBg : colors.surfaceAlt;
  const fg = sentiment === 'positive' ? colors.positiveText : sentiment === 'negative' ? colors.negativeText : colors.textMuted;
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={{ color: fg, fontSize: 12, fontWeight: '600' }}>{t(sentimentKey(sentiment))}</Text>
    </View>
  );
}

export function Tag({ label, icon }: { label: string; icon?: keyof typeof Ionicons.glyphMap }) {
  const { colors } = useApp();
  return (
    <View style={[styles.pill, { backgroundColor: colors.surfaceAlt, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
      {icon ? <Ionicons name={icon} size={12} color={colors.textMuted} /> : null}
      <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { colors } = useApp();
  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>{children}</View>;
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const { colors } = useApp();
  return (
    <View style={styles.sectionHeader}>
      <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: '700', letterSpacing: 0.8 }}>{title}</Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ color: colors.accent, fontSize: 14, fontWeight: '600' }}>{action}</Text>
          {onAction ? <Ionicons name="chevron-forward" size={14} color={colors.accent} /> : null}
        </Pressable>
      ) : null}
    </View>
  );
}

export function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const { colors } = useApp();
  return (
    <View style={[styles.segmented, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.segment, active && { backgroundColor: colors.accentSoft, borderColor: colors.accent }]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={{ color: active ? colors.accent : colors.textMuted, fontWeight: active ? '700' : '500', fontSize: 15 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  const { colors } = useApp();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        { borderColor: active ? colors.accent : colors.border, backgroundColor: active ? colors.accentSoft : colors.surface },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
    >
      <Text style={{ color: active ? colors.accent : colors.textMuted, fontWeight: '600', fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

export function ChipRow({ children }: { children: ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.lg }} style={{ flexGrow: 0 }}>
      {children}
    </ScrollView>
  );
}

export function Disclaimer() {
  const { colors, t } = useApp();
  return (
    <View style={styles.disclaimer}>
      <Ionicons name="information-circle-outline" size={16} color={colors.textFaint} />
      <Text style={{ color: colors.textFaint, fontSize: 12, flex: 1 }}>{t('disclaimer')}</Text>
    </View>
  );
}

export function DemoBadge() {
  const { colors, t } = useApp();
  return (
    <View style={[styles.pill, { backgroundColor: colors.accentSoft, alignSelf: 'flex-start' }]}>
      <Text style={{ color: colors.accent, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 }}>{t('demo')}</Text>
    </View>
  );
}

const openDisclosure = (id: string) => router.push({ pathname: '/disclosure/[id]', params: { id } });

/** Akıştaki büyük duyuru kartı. */
export function DisclosureCard({ d }: { d: Disclosure }) {
  const { colors, prefs, t } = useApp();
  const company = getCompany(d.companyId);
  if (!company) return null;
  const a = d.analysis[prefs.language];
  return (
    <Pressable onPress={() => openDisclosure(d.id)} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
      <Card style={{ flexDirection: 'row', gap: space.md }}>
        <Avatar company={company} />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Tag label={company.exchange} />
            <ScoreBadge score={d.analysis.score} />
            <SentimentPill sentiment={d.analysis.sentiment} />
            <Text style={{ color: colors.textFaint, fontSize: 12, marginLeft: 'auto' }}>{relativeTime(d.publishedAt, prefs.language)}</Text>
          </View>
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }} numberOfLines={1}>
            {company.ticker}
            <Text style={{ color: colors.textMuted, fontWeight: '500' }}> · {company.name}</Text>
          </Text>
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>{t(eventKey(d.analysis.eventType))}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 20 }} numberOfLines={3}>
            {a.shortSummary}
          </Text>
          {d.session === 'pre_market' || d.session === 'after_hours' ? (
            <View style={{ flexDirection: 'row' }}>
              <Tag icon="time-outline" label={t(d.session === 'pre_market' ? 'session.pre_market' : 'session.after_hours')} />
            </View>
          ) : null}
        </View>
      </Card>
    </Pressable>
  );
}

/** Özet ekranındaki "öne çıkanlar" kartı. */
export function HighlightCard({ d, width }: { d: Disclosure; width: number }) {
  const { colors, prefs, t } = useApp();
  const company = getCompany(d.companyId);
  if (!company) return null;
  const a = d.analysis[prefs.language];
  return (
    <Pressable onPress={() => openDisclosure(d.id)} style={({ pressed }) => [{ width, opacity: pressed ? 0.85 : 1 }]}>
      <Card style={{ gap: 8, flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Avatar company={company} size={40} />
          <ScoreBadge score={d.analysis.score} />
        </View>
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>
          {company.ticker} <Text style={{ color: colors.textMuted, fontWeight: '500' }}>· {company.exchange}</Text>
        </Text>
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }} numberOfLines={2}>
          {a.title}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 18, flex: 1 }} numberOfLines={3}>
          {a.shortSummary}
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <SentimentPill sentiment={d.analysis.sentiment} />
          <Text style={{ color: colors.textFaint, fontSize: 12 }}>{relativeTime(d.publishedAt, prefs.language)}</Text>
        </View>
        <Text style={{ color: colors.textFaint, fontSize: 11 }}>{t(eventKey(d.analysis.eventType))}</Text>
      </Card>
    </Pressable>
  );
}

/** Kompakt liste satırı (Özet > Takip ettiklerim). */
export function DisclosureRow({ d, last }: { d: Disclosure; last?: boolean }) {
  const { colors, prefs } = useApp();
  const company = getCompany(d.companyId);
  if (!company) return null;
  return (
    <Pressable
      onPress={() => openDisclosure(d.id)}
      style={({ pressed }) => [styles.row, { borderBottomColor: colors.border, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth, opacity: pressed ? 0.85 : 1 }]}
    >
      <Avatar company={company} size={40} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>
          {company.ticker} <Text style={{ color: colors.textMuted, fontWeight: '500' }}>· {company.exchange}</Text>
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 13 }} numberOfLines={1}>
          {d.analysis[prefs.language].title}
        </Text>
      </View>
      <ScoreBadge score={d.analysis.score} />
      <SentimentPill sentiment={d.analysis.sentiment} />
      <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: space.lg },
  badge: { minWidth: 30, height: 26, paddingHorizontal: 8, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  badgeLarge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.md, alignItems: 'center' },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space.xl, marginBottom: space.md },
  segmented: { flexDirection: 'row', borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, padding: 4 },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.pill, borderWidth: 1, borderColor: 'transparent' },
  chip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: radius.pill, borderWidth: 1 },
  disclaimer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: space.xl, marginBottom: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
});
