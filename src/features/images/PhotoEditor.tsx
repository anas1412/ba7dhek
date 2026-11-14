import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme';

type Props = {
  photoUrl: string | null;
  /** True when the photo shown is one the person uploaded, not the one from their account. */
  hasOwnPhoto: boolean;
  busy: boolean;
  onChange: () => void;
  onRemove: () => void;
  onUseAccountPhoto: () => void;
};

/**
 * A person's photo and what they can do with it: replace it, show none, or go
 * back to the one from their Google account. A photo is never required.
 */
export function PhotoEditor({ photoUrl, hasOwnPhoto, busy, onChange, onRemove, onUseAccountPhoto }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View style={{ gap: theme.space[4] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[4] }}>
        <View
          style={{
            width: 88,
            height: 88,
            borderRadius: theme.radius.full,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors.brandSoft,
          }}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={{ width: 88, height: 88 }} contentFit="cover" transition={200} />
          ) : (
            <Icon name="user" size={28} color="brand" />
          )}
        </View>
        <AppText color="inkMuted" style={{ flex: 1 }}>
          {t(photoUrl ? 'photo.shownNote' : 'photo.noneNote')}
        </AppText>
      </View>

      <View style={{ gap: theme.space[2] }}>
        <Button label={t(photoUrl ? 'photo.change' : 'photo.add')} variant="neutral" loading={busy} onPress={onChange} />
        {photoUrl ? (
          <Button label={t('photo.remove')} variant="danger" disabled={busy} onPress={onRemove} />
        ) : null}
        {hasOwnPhoto || !photoUrl ? (
          <Button label={t('photo.useAccount')} variant="neutral" disabled={busy} onPress={onUseAccountPhoto} />
        ) : null}
      </View>
    </View>
  );
}
