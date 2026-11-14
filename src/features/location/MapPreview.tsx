import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/theme';

import type { Point } from './geo';
import { MapPin } from './MapPin';
import { MapView } from './MapView';

/** A small map that shows one point and cannot be moved. */
export function MapPreview({ point, height = 160 }: { point: Point; height?: number }) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={t('location.mapOf')}
      // Touches pass through, so the page under a finger still scrolls.
      pointerEvents="none"
      style={{
        height,
        direction: 'ltr',
        overflow: 'hidden',
        borderRadius: theme.radius.sm,
        borderWidth: 1,
        borderColor: theme.colors.line,
        backgroundColor: theme.colors.line,
      }}>
      {/* Keyed by the point: a new place gets a fresh map instead of an animated journey. */}
      <MapView key={`${point.latitude},${point.longitude}`} initialCenter={point} interactive={false} />
      <MapPin />
    </View>
  );
}
