import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Screen } from '../../components/Screen';
import { Avatar, Card, Chip, SectionHeader } from '../../components/ui';
import { FREE_WATCHLIST_LIMIT, getCompanies, getCompany } from '../../data/repository';
import type { Company } from '../../data/types';
import { radius, space } from '../../lib/theme';
import { useApp, type Threshold } from '../../state/AppState';

const THRESHOLDS: Threshold[] = ['8', '6', 'all'];
const thresholdKey = (th: Threshold) => (th === '8' ? 'watch.threshold.8' : th === '6' ? 'watch.threshold.6' : 'watch.threshold.all');

function normalize(s: string) {
  return s.toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i');
}

export default function WatchlistScreen() {
  const { colors, prefs, t, isFollowing, follow, unfollow, setThreshold, canFollowMore } = useApp();
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [limitHit, setLimitHit] = useState(false);

  const q = normalize(query.trim());
  const results: Company[] = q
    ? getCompanies().filter((c) => prefs.markets.includes(c.market) && (normalize(c.ticker).includes(q) || normalize(c.name).includes(q)))
    : [];

  const onAdd = (id: string) => {
    if (follow(id)) {
      setLimitHit(false);
      setQuery('');
    } else setLimitHit(true);
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 32, fontWeight: '800' }}>{t('watch.title')}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 14, marginTop: 4 }}>{t('watch.subtitle')}</Text>
        </View>
      </View>

      <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search" size={20} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('watch.search')}
          placeholderTextColor={colors.textFaint}
          style={{ flex: 1, color: colors.text, fontSize: 16, paddingVertical: 12 }}
          autoCorrect={false}
          autoCapitalize="characters"
          clearButtonMode="while-editing"
        />
      </View>

      {limitHit ? (
        <Card style={{ marginTop: space.md, borderColor: colors.accent }}>
          <Text style={{ color: colors.text, fontWeight: '700' }}>{t('watch.limitTitle')}</Text>
          <Text style={{ color: colors.textMuted, marginTop: 4 }}>{t('watch.limitBody', { limit: FREE_WATCHLIST_LIMIT })}</Text>
        </Card>
      ) : null}

      {q ? (
        <>
          <SectionHeader title={t('watch.results')} />
          <Card style={{ paddingVertical: space.xs }}>
            {results.length === 0 ? <Text style={{ color: colors.textMuted, paddingVertical: space.md }}>{t('watch.noResults')}</Text> : null}
            {results.map((c, i) => {
              const added = isFollowing(c.id);
              return (
                <View key={c.id} style={[styles.row, { borderBottomColor: colors.border, borderBottomWidth: i === results.length - 1 ? 0 : StyleSheet.hairlineWidth }]}>
                  <Avatar company={c} size={40} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>
                      {c.ticker} <Text style={{ color: colors.textMuted, fontWeight: '500' }}>· {c.exchange}</Text>
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 13 }}>{c.name}</Text>
                  </View>
                  <Pressable
                    disabled={added}
                    onPress={() => onAdd(c.id)}
                    style={[styles.addBtn, { backgroundColor: added ? colors.surfaceAlt : colors.accent }]}
                  >
                    <Text style={{ color: added ? colors.textMuted : colors.accentText, fontWeight: '700' }}>{added ? t('watch.added') : t('watch.add')}</Text>
                  </Pressable>
                </View>
              );
            })}
          </Card>
        </>
      ) : null}

      <SectionHeader title={t('watch.yours')} action={prefs.plan === 'free' ? `${prefs.watchlist.length}/${FREE_WATCHLIST_LIMIT}` : undefined} />
      <Card style={{ paddingVertical: space.xs }}>
        {prefs.watchlist.length === 0 ? <Text style={{ color: colors.textMuted, paddingVertical: space.md }}>{t('watch.empty')}</Text> : null}
        {prefs.watchlist.map((w, i) => {
          const c = getCompany(w.companyId);
          if (!c) return null;
          const open = expanded === c.id;
          return (
            <View key={c.id} style={{ borderBottomColor: colors.border, borderBottomWidth: i === prefs.watchlist.length - 1 ? 0 : StyleSheet.hairlineWidth }}>
              <Pressable style={styles.row} onPress={() => setExpanded(open ? null : c.id)}>
                <Avatar company={c} size={44} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>
                    {c.ticker} <Text style={{ color: colors.textMuted, fontWeight: '500' }}>· {c.exchange}</Text>
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: 13 }}>{c.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <Ionicons name={w.threshold === 'all' ? 'notifications-outline' : 'notifications'} size={14} color={w.threshold === 'all' ? colors.textMuted : colors.accent} />
                    <Text style={{ color: colors.text, fontSize: 13 }}>{t(thresholdKey(w.threshold))}</Text>
                  </View>
                </View>
                <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textFaint} />
              </Pressable>
              {open ? (
                <View style={{ paddingBottom: space.md, gap: space.sm }}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                    {THRESHOLDS.map((th) => (
                      <Chip key={th} label={t(thresholdKey(th))} active={w.threshold === th} onPress={() => setThreshold(c.id, th)} />
                    ))}
                  </View>
                  <Pressable
                    onPress={() => {
                      unfollow(c.id);
                      setExpanded(null);
                      setLimitHit(false);
                    }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 6 }}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.negativeText} />
                    <Text style={{ color: colors.negativeText, fontWeight: '600' }}>{t('watch.remove')}</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          );
        })}
      </Card>

      <Pressable onPress={() => router.navigate('/profile')}>
        <Card style={{ marginTop: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View style={[styles.crown, { backgroundColor: colors.accentSoft }]}>
            <Ionicons name="ribbon" size={22} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            {prefs.plan === 'free' ? (
              <>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{t('watch.planFree', { limit: FREE_WATCHLIST_LIMIT, used: prefs.watchlist.length })}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 2 }}>{t('watch.planFreeSub')}</Text>
              </>
            ) : (
              <Text style={{ color: colors.text, fontWeight: '700' }}>{t('watch.planPremium')}</Text>
            )}
          </View>
          {!canFollowMore ? <Ionicons name="chevron-forward" size={16} color={colors.textFaint} /> : null}
        </Card>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: space.sm, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: space.lg, marginTop: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  addBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.pill },
  crown: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
