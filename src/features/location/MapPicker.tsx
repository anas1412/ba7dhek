import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';

import { HAMMAMET, inTunisia, type Point } from './geo';
import { MapPin } from './MapPin';
import { MapView } from './MapView';
import type { MapViewHandle } from './MapView.types';
import { useCurrentLocation } from './useCurrentLocation';

type Props = {
  visible: boolean;
  /** Where the map opens. Without it, the map opens on the pilot city. */
  value: Point | null;
  title: string;
  onConfirm: (point: Point) => void;
  onClose: () => void;
};

/**
 * Chooses one exact point. The marker stays in the middle of the screen and the
 * person moves the map under it, which is more precise with a thumb than
 * dragging a pin, and works the same in every language.
 */
export function MapPicker({ visible, value, title, onConfirm, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {/* Mounted only while open, so each opening starts from the current value. */}
      {visible ? <PickerBody value={value} title={title} onConfirm={onConfirm} onClose={onClose} /> : null}
    </Modal>
  );
}

function PickerBody({ value, title, onConfirm, onClose }: Omit<Props, 'visible'>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const map = useRef<MapViewHandle>(null);
  const start = value ?? HAMMAMET;
  const [centre, setCentre] = useState<Point>(start);
  const { busy, problem, locate, clearProblem } = useCurrentLocation();
  const outside = !inTunisia(centre);

  async function goToMe() {
    const point = await locate();
    if (point) {
      setCentre(point);
      map.current?.moveTo(point);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.space[2],
          paddingHorizontal: theme.space[2],
          paddingVertical: theme.space[1],
        }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          hitSlop={8}
          onPress={onClose}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: theme.radius.full,
            backgroundColor: pressed ? theme.colors.brandSoft : 'transparent',
          })}>
          <Icon name="x" />
        </Pressable>
        <AppText variant="heading" style={{ flex: 1 }}>
          {title}
        </AppText>
      </View>

      {/* A map is a picture of the ground, so it keeps its own left and right in Arabic. */}
      <View style={{ flex: 1, direction: 'ltr', backgroundColor: theme.colors.line }}>
        <MapView
          ref={map}
          initialCenter={start}
          onCenterChange={(point) => {
            setCentre(point);
            clearProblem();
          }}
        />
        <MapPin />
      </View>

      <View style={{ gap: theme.space[2], padding: theme.space[4] }}>
        {outside || problem ? (
          <AppText variant="caption" color="danger">
            {t(`location.${outside ? 'outsideTunisia' : problem}`)}
          </AppText>
        ) : (
          <AppText variant="caption" color="inkMuted">
            {t('location.pickerHint')}
          </AppText>
        )}
        <Button
          label={busy ? t('location.locating') : t('location.useCurrent')}
          variant="neutral"
          loading={busy}
          onPress={goToMe}
        />
        <Button
          label={t('location.usePlace')}
          disabled={outside}
          onPress={() => {
            haptic.success();
            onConfirm(centre);
          }}
        />
      </View>
    </SafeAreaView>
  );
}
