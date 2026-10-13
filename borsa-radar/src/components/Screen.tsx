import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { space } from '../lib/theme';
import { useApp } from '../state/AppState';

/** Güvenli alan boşluklu, kaydırılabilir ekran iskeleti. */
export function Screen({ children, header }: { children: ReactNode; header?: ReactNode }) {
  const { colors } = useApp();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + space.sm }}>
      {header}
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.xl }} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </View>
  );
}
