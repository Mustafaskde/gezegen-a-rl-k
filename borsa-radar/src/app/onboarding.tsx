import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, Chip, Segmented } from '../components/ui';
import type { Language, Market } from '../data/types';
import { radius, space } from '../lib/theme';
import { useApp } from '../state/AppState';

export default function OnboardingScreen() {
  const { colors, prefs, t, update } = useApp();
  const insets = useSafeAreaInsets();

  const toggleMarket = (m: Market) =>
    update({ markets: prefs.markets.includes(m) ? prefs.markets.filter((x) => x !== m) : [...prefs.markets, m] });

  const canContinue = prefs.markets.length > 0;

  const accept = () => {
    if (!canContinue) return;
    update({ onboarded: true, disclaimerAcceptedAt: new Date().toISOString() });
    router.replace('/');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingTop: insets.top + space.xl, gap: space.lg }}>
        <View style={[styles.logo, { backgroundColor: colors.accentSoft }]}>
          <Ionicons name="radio-outline" size={36} color={colors.accent} />
        </View>
        <Text style={{ color: colors.text, fontSize: 30, fontWeight: '800' }}>{t('onb.welcome')}</Text>
        <Text style={{ color: colors.textMuted, fontSize: 16, lineHeight: 23 }}>{t('onb.tagline')}</Text>

        <Text style={[styles.label, { color: colors.textMuted }]}>{t('onb.language')}</Text>
        <Segmented<Language>
          options={[
            { value: 'tr', label: 'Türkçe' },
            { value: 'en', label: 'English' },
          ]}
          value={prefs.language}
          onChange={(language) => update({ language })}
        />

        <Text style={[styles.label, { color: colors.textMuted }]}>{t('onb.markets')}</Text>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Chip label="🇹🇷 BIST" active={prefs.markets.includes('BIST')} onPress={() => toggleMarket('BIST')} />
          <Chip label={`🇺🇸 ${t('market.US')}`} active={prefs.markets.includes('US')} onPress={() => toggleMarket('US')} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <Text style={{ color: colors.text, fontSize: 15, flex: 1, lineHeight: 21 }}>{t('onb.radar')}</Text>
          <Switch
            value={prefs.radar.enabled}
            onValueChange={(enabled) => update({ radar: { ...prefs.radar, enabled } })}
            trackColor={{ true: colors.accent, false: colors.surfaceAlt }}
            thumbColor="#fff"
          />
        </View>

        <Card style={{ gap: space.sm, borderColor: colors.accent }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.accent} />
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>{t('onb.legalTitle')}</Text>
          </View>
          <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 20 }}>{t('onb.legal')}</Text>
        </Card>
      </ScrollView>

      <View style={{ padding: space.lg, paddingBottom: insets.bottom + space.lg }}>
        <Pressable
          onPress={accept}
          disabled={!canContinue}
          style={({ pressed }) => [styles.cta, { backgroundColor: canContinue ? colors.accent : colors.surfaceAlt, opacity: pressed ? 0.85 : 1 }]}
        >
          <Text style={{ color: canContinue ? colors.accentText : colors.textFaint, fontSize: 17, fontWeight: '800' }}>
            {canContinue ? t('onb.accept') : t('onb.pickMarket')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  logo: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 13, fontWeight: '700', letterSpacing: 0.6, marginBottom: -space.sm },
  cta: { paddingVertical: 16, borderRadius: radius.lg, alignItems: 'center' },
});
