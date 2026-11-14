import { api } from '@convex/_generated/api';
import { useConvexAuth, useQuery } from 'convex/react';
import { Redirect, Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/Icon';
import { PushManager } from '@/features/push/PushManager';
import { useTheme } from '@/theme';

/**
 * A destination in the Material 3 navigation bar: the icon sits in a pill that
 * fills in when its tab is the active one.
 */
function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  const theme = useTheme();
  return (
    <View
      style={{
        width: 64,
        height: 32,
        borderRadius: theme.radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: focused ? theme.colors.brandSoft : 'transparent',
      }}>
      <Icon name={name} color={focused ? 'onBrandSoft' : 'inkMuted'} />
    </View>
  );
}

export default function TabsLayout() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const me = useQuery(api.users.me, isAuthenticated ? {} : 'skip');
  const unread = useQuery(api.matches.unreadCount, me?.role ? {} : 'skip');

  // Signing out anywhere inside the tabs lands back on the gate.
  if (!isLoading && !isAuthenticated) return <Redirect href="/" />;

  const candidate = me?.role === 'candidate';

  return (
    <>
      {/* Signed in and past the role choice: the phone can be registered for notifications. */}
      {me?.role ? <PushManager role={me.role} /> : null}
      <Tabs
        screenOptions={{
          headerShown: false,
          // The active tab is told by its filled pill and darker label, not by a brand tint.
          tabBarActiveTintColor: theme.colors.ink,
          tabBarInactiveTintColor: theme.colors.inkMuted,
          tabBarStyle: {
            // 80 is the bar itself; the system navigation bar (gesture line or buttons) sits below it.
            height: 80 + insets.bottom,
            paddingTop: 12,
            paddingBottom: insets.bottom,
            backgroundColor: theme.colors.surfaceContainer,
            borderTopWidth: 0,
          },
          tabBarLabelStyle: { fontFamily: theme.text.label.fontFamily, fontSize: 12, lineHeight: 16, marginTop: 4 },
          sceneStyle: { backgroundColor: theme.colors.surface },
        }}>
        <Tabs.Screen
          name="home"
          options={{
            title: t('tabs.home'),
            tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="applications"
          options={{
            title: t('tabs.applications'),
            // Only candidates apply to jobs, so employers do not get this tab.
            href: candidate ? undefined : null,
            tabBarIcon: ({ focused }) => <TabIcon name="briefcase" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="chats"
          options={{
            title: t('tabs.chats'),
            // A number on the tab says there is something to read without opening it.
            tabBarBadge: unread ? unread : undefined,
            tabBarBadgeStyle: { backgroundColor: theme.colors.danger, color: theme.colors.surface },
            tabBarIcon: ({ focused }) => <TabIcon name="message-circle" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: t('tabs.settings'),
            tabBarIcon: ({ focused }) => <TabIcon name="settings" focused={focused} />,
          }}
        />
      </Tabs>
    </>
  );
}
