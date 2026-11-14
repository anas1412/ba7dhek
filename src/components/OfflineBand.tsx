import { useConvexConnectionState } from 'convex/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

import { AppText } from './AppText';
import { Icon } from './Icon';

// A connection that drops for a moment and returns is not worth a banner.
const GRACE_MS = 2500;

/**
 * A thin band at the top while the app cannot reach the backend. Without it,
 * a screen that is not updating looks the same as one with nothing new.
 */
export function OfflineBand() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { isWebSocketConnected, hasEverConnected } = useConvexConnectionState();
  const disconnected = hasEverConnected && !isWebSocketConnected;
  // True once the connection has been down for longer than the grace period.
  const [overdue, setOverdue] = useState(false);

  useEffect(() => {
    if (!disconnected) return;
    const timer = setTimeout(() => setOverdue(true), GRACE_MS);
    return () => {
      clearTimeout(timer);
      setOverdue(false);
    };
  }, [disconnected]);

  if (!disconnected || !overdue) return null;

  return (
    <Animated.View
      entering={FadeInUp.duration(200)}
      exiting={FadeOutUp.duration(160)}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.space[2],
        paddingTop: insets.top + theme.space[1],
        paddingBottom: theme.space[1],
        backgroundColor: theme.colors.ink,
      }}>
      <Icon name="alert-circle" size={16} color="surface" />
      <AppText variant="label" color="surface">
        {t('errors.offline')}
      </AppText>
    </Animated.View>
  );
}
