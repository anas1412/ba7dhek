import * as Location from 'expo-location';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme';

export type Point = { latitude: number; longitude: number };

// The same rough box the backend uses to keep points inside Tunisia.
const TUNISIA = { west: 7.4, south: 30.1, east: 11.7, north: 37.7 };
const inTunisia = (p: Point) =>
  p.latitude >= TUNISIA.south && p.latitude <= TUNISIA.north && p.longitude >= TUNISIA.west && p.longitude <= TUNISIA.east;

// Central Hammamet, for the development shortcut only.
const HAMMAMET: Point = { latitude: 36.4, longitude: 10.6167 };

type Props = {
  value: Point | null;
  onChange: (point: Point | null) => void;
};

/**
 * Sets one point from the phone's location, read once when the person taps.
 * The app never tracks movement and never asks for background location.
 * A map to place the point by hand comes with the native map library.
 */
export function LocationField({ value, onChange }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<'denied' | 'failed' | 'outsideTunisia' | null>(null);

  async function useCurrent() {
    setBusy(true);
    setProblem(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setProblem('denied');
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const point = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      if (!inTunisia(point)) {
        setProblem('outsideTunisia');
        return;
      }
      onChange(point);
    } catch {
      setProblem('failed');
    } finally {
      setBusy(false);
    }
  }

  if (value) {
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.space[2],
          padding: theme.space[4],
          borderRadius: theme.radius.sm,
          backgroundColor: theme.colors.brandSoft,
        }}>
        <Icon name="check" size={20} color="success" />
        <AppText variant="bodyStrong" style={{ flex: 1 }}>
          {t('location.set')}
        </AppText>
        <AppText variant="bodyStrong" color="brand" accessibilityRole="button" onPress={() => onChange(null)}>
          {t('location.change')}
        </AppText>
      </View>
    );
  }

  return (
    <View style={{ gap: theme.space[2] }}>
      <Button
        label={busy ? t('location.locating') : t('location.useCurrent')}
        variant="neutral"
        loading={busy}
        onPress={useCurrent}
      />
      {problem ? (
        <AppText variant="caption" color="danger">
          {t(`location.${problem}`)}
        </AppText>
      ) : (
        <AppText variant="caption" color="inkMuted">
          {t('location.privacy')}
        </AppText>
      )}
      {__DEV__ ? <Button label={t('jobs.devHome')} variant="neutral" onPress={() => onChange(HAMMAMET)} /> : null}
    </View>
  );
}
