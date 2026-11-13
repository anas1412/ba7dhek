import { useConvexAuth } from 'convex/react';
import { Redirect, Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/Icon';
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
        sceneStyle: { backgroundColor: theme.colors.surface },
      }}>
      <Tabs.Screen
        name="home"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ focused }) => <Icon name="home" color={focused ? 'brand' : 'inkMuted'} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarIcon: ({ focused }) => <Icon name="settings" color={focused ? 'brand' : 'inkMuted'} />,
        }}
      />
    </Tabs>
  );
}
