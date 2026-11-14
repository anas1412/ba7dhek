import { api } from '@convex/_generated/api';
import { useConvexAuth, useQuery } from 'convex/react';
import { Redirect, Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme';

export default function TabsLayout() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const me = useQuery(api.users.me, isAuthenticated ? {} : 'skip');
  const unread = useQuery(api.matches.unreadCount, me?.role ? {} : 'skip');

  // Signing out anywhere inside the tabs lands back on the gate.
  if (!isLoading && !isAuthenticated) return <Redirect href="/" />;

  const candidate = me?.role === 'candidate';

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
        name="applications"
        options={{
          title: t('tabs.applications'),
          // Only candidates apply to jobs, so employers do not get this tab.
          href: candidate ? undefined : null,
          tabBarIcon: ({ focused }) => <Icon name="briefcase" color={focused ? 'brand' : 'inkMuted'} />,
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: t('tabs.chats'),
          // A number on the tab says there is something to read without opening it.
          tabBarBadge: unread ? unread : undefined,
          tabBarBadgeStyle: { backgroundColor: theme.colors.brand, color: theme.colors.onBrand },
          tabBarIcon: ({ focused }) => <Icon name="message-circle" color={focused ? 'brand' : 'inkMuted'} />,
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
