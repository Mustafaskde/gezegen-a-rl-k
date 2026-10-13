import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { Screen } from '../../components/Screen';
import { Card, Chip, SectionHeader, Segmented } from '../../components/ui';
import type { Language, Market, Sector } from '../../data/types';
import { sectorKey } from '../../lib/i18n';
import { space } from '../../lib/theme';
import { useApp, type ThemePref } from '../../state/AppState';

const SECTORS: Sector[] = ['defense', 'aviation', 'energy', 'food', 'banking', 'technology', 'health', 'automotive'];
const QUIET_STARTS = ['22:00', '23:00', '00:00'];
const QUIET_ENDS = ['07:00', '08:00', '09:00'];

export default function ProfileScreen() {
  const { colors, prefs, t, update } = useApp();

  const toggleMarket = (m: Market) => {
    const has = prefs.markets.includes(m);
    if (has && prefs.markets.length === 1) return; // en az bir piyasa kalmalı
    update({ markets: has ? prefs.markets.filter((x) => x !== m) : [...prefs.markets, m] });
  };

  const toggleSector = (s: Sector) => {
    const sectors = prefs.radar.sectors.includes(s) ? prefs.radar.sectors.filter((x) => x !== s) : [...prefs.radar.sectors, s];
    update({ radar: { ...prefs.radar, sectors } });
  };

  return (
    <Screen>
      <Text style={{ color: colors.text, fontSize: 32, fontWeight: '800' }}>{t('profile.title')}</Text>

      <SectionHeader title={t('profile.language').toLocaleUpperCase(prefs.language)} />
      <Segmented<Language>
        options={[
          { value: 'tr', label: 'Türkçe' },
          { value: 'en', label: 'English' },
        ]}
        value={prefs.language}
        onChange={(language) => update({ language })}
      />

      <SectionHeader title={t('profile.theme').toLocaleUpperCase(prefs.language)} />
      <Segmented<ThemePref>
        options={[
          { value: 'dark', label: t('profile.theme.dark') },
          { value: 'light', label: t('profile.theme.light') },
          { value: 'system', label: t('profile.theme.system') },
        ]}
        value={prefs.theme}
        onChange={(theme) => update({ theme })}
      />

      <SectionHeader title={t('profile.markets').toLocaleUpperCase(prefs.language)} />
      <View style={styles.wrap}>
        <Chip label="🇹🇷 BIST" active={prefs.markets.includes('BIST')} onPress={() => toggleMarket('BIST')} />
        <Chip label={`🇺🇸 ${t('market.US')}`} active={prefs.markets.includes('US')} onPress={() => toggleMarket('US')} />
      </View>

      <SectionHeader title={t('profile.notifications').toLocaleUpperCase(prefs.language)} />
      <Card style={{ gap: space.lg }}>
        <ToggleRow
          title={t('profile.radar')}
          body={t('profile.radarBody')}
          value={prefs.radar.enabled}
          onChange={(enabled) => update({ radar: { ...prefs.radar, enabled } })}
        />
        {prefs.radar.enabled ? (
          <View style={{ gap: space.sm }}>
            {prefs.plan === 'free' ? <Text style={{ color: colors.accent, fontSize: 13 }}>{t('profile.radarFree')}</Text> : null}
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>{t('profile.radarSectors')}</Text>
            <View style={styles.wrap}>
              {SECTORS.map((s) => (
                <Chip key={s} label={t(sectorKey(s))} active={prefs.radar.sectors.includes(s)} onPress={() => toggleSector(s)} />
              ))}
            </View>
          </View>
        ) : null}
        <Divider />
        <ToggleRow
          title={t('profile.quiet')}
          body={t('profile.quietRange', { start: prefs.quietHours.start, end: prefs.quietHours.end })}
          value={prefs.quietHours.enabled}
          onChange={(enabled) => update({ quietHours: { ...prefs.quietHours, enabled } })}
        />
        {prefs.quietHours.enabled ? (
          <View style={{ gap: space.sm }}>
            <View style={styles.wrap}>
              {QUIET_STARTS.map((s) => (
                <Chip key={s} label={s} active={prefs.quietHours.start === s} onPress={() => update({ quietHours: { ...prefs.quietHours, start: s } })} />
              ))}
            </View>
            <View style={styles.wrap}>
              {QUIET_ENDS.map((e) => (
                <Chip key={e} label={e} active={prefs.quietHours.end === e} onPress={() => update({ quietHours: { ...prefs.quietHours, end: e } })} />
              ))}
            </View>
          </View>
        ) : null}
        <Divider />
        <View style={{ gap: 4 }}>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{t('profile.channels')}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>{t('profile.channelsNote')}</Text>
        </View>
      </Card>

      <SectionHeader title={t('profile.plan').toLocaleUpperCase(prefs.language)} />
      <Card style={{ gap: space.sm }}>
        <ToggleRow
          title={prefs.plan === 'premium' ? t('profile.plan.premium') : t('profile.plan.free')}
          body={t('profile.planNote')}
          value={prefs.plan === 'premium'}
          onChange={(on) => update({ plan: on ? 'premium' : 'free' })}
        />
      </Card>

      <SectionHeader title={t('profile.legal').toLocaleUpperCase(prefs.language)} />
      <Card>
        <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 20 }}>{t('profile.legalBody')}</Text>
      </Card>

      <Pressable
        onPress={() => {
          update({ onboarded: false });
          router.replace('/onboarding');
        }}
        style={{ paddingVertical: space.xl, alignItems: 'center' }}
      >
        <Text style={{ color: colors.textFaint }}>{t('profile.reset')}</Text>
      </Pressable>
    </Screen>
  );
}

function ToggleRow({ title, body, value, onChange }: { title: string; body: ReactNode; value: boolean; onChange: (v: boolean) => void }) {
  const { colors } = useApp();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{title}</Text>
        <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 18 }}>{body}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.accent, false: colors.surfaceAlt }} thumbColor="#fff" />
    </View>
  );
}

function Divider() {
  const { colors } = useApp();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />;
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
