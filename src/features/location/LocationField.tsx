import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme';

import type { Point } from './geo';
import { MapPicker } from './MapPicker';
import { MapPreview } from './MapPreview';
import { useCurrentLocation } from './useCurrentLocation';

export type { Point } from './geo';

type Props = {
  value: Point | null;
  onChange: (point: Point | null) => void;
  /** The heading of the map screen, which says what is being placed. */
  pickerTitle: string;
  /**
   * private: a candidate's starting point, which nobody else ever sees.
   * public: a business or a job, whose place is shown to candidates.
   */
  visibility: 'private' | 'public';
};

/**
 * Sets one exact point, on a map or from the phone's position read once.
 * Once set, the point is shown on a small map so a mistake is seen at a glance.
 */
export function LocationField({ value, onChange, pickerTitle, visibility }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [picking, setPicking] = useState(false);
  const { busy, problem, locate } = useCurrentLocation();

  const picker = (
    <MapPicker
      visible={picking}
      value={value}
      title={pickerTitle}
      onClose={() => setPicking(false)}
      onConfirm={(point) => {
        onChange(point);
        setPicking(false);
      }}
    />
  );
  const note = t(visibility === 'private' ? 'location.privacy' : 'location.publicNote');

  if (value) {
    return (
      <View style={{ gap: theme.space[2] }}>
        <MapPreview point={value} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[2] }}>
          <Icon name="check" size={20} color="success" />
          <AppText variant="bodyStrong" style={{ flex: 1 }}>
            {t('location.set')}
          </AppText>
        </View>
        <Button label={t('location.change')} variant="neutral" onPress={() => setPicking(true)} />
        <AppText variant="caption" color="inkMuted">
          {note}
        </AppText>
        {picker}
      </View>
    );
  }

  return (
    <View style={{ gap: theme.space[2] }}>
      <Button label={t('location.chooseOnMap')} variant="neutral" onPress={() => setPicking(true)} />
      <Button
        label={busy ? t('location.locating') : t('location.useCurrent')}
        variant="neutral"
        loading={busy}
        onPress={async () => {
          const point = await locate();
          if (point) onChange(point);
        }}
      />
      {problem ? (
        <AppText variant="caption" color="danger">
          {t(`location.${problem}`)}
        </AppText>
      ) : (
        <AppText variant="caption" color="inkMuted">
          {note}
        </AppText>
      )}
      {picker}
    </View>
  );
}
