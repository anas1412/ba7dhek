import { useConvexAuth } from 'convex/react';
import { Redirect, Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/theme';

export default function TabsLayout() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { isLoading, isAuthenticated } = useConvexAuth();

  // Signing out anywhere inside the tabs lands back on the gate.
  if (!isLoading && !isAuthenticated) return <Redirect href="/" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.brand,
        tabBarInactiveTintColor: theme.colors.inkMuted,
        tabBarStyle: { backgroundColor: theme.colors.surfaceRaised, borderTopColor: theme.colors.line },
        tabBarLabelStyle: theme.text.label,
        // No icon set is chosen yet (see docs/06-design/design-system.md), so tabs are text only.
        tabBarIconStyle: { display: 'none' },
        tabBarLabelPosition: 'beside-icon',
        sceneStyle: { backgroundColor: theme.colors.surface },
      }}>
      <Tabs.Screen name="home" options={{ title: t('tabs.home') }} />
      <Tabs.Screen name="settings" options={{ title: t('tabs.settings') }} />
    </Tabs>
  );
}
