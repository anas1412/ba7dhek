import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Appear } from '@/components/Appear';
import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme';

export type GridImage = { id: string; url: string };

type Props = {
  images: GridImage[];
  /** How many images are allowed in total. */
  max: number;
  /** True while a new image is being compressed and sent. */
  adding: boolean;
  /** The image currently being removed or moved, if any. */
  busyId: string | null;
  onAdd: () => void;
  onRemove: (image: GridImage) => void;
  onMakeMain: (image: GridImage) => void;
};

/**
 * A business's images: up to four tiles, the first marked as the main one. An
 * empty tile adds another until the limit is reached, then it disappears, so
 * the limit is seen and never hit.
 */
export function ImageGrid({ images, max, adding, busyId, onAdd, onRemove, onMakeMain }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const canAdd = images.length < max;
  const tile = { width: '47%' as const, aspectRatio: 1, borderRadius: theme.radius.sm, overflow: 'hidden' as const };

  return (
    <View style={{ gap: theme.space[2] }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[4] }}>
        {images.map((image, index) => {
          const busy = busyId === image.id;
          return (
            <Appear key={image.id} index={index} style={[tile, { backgroundColor: theme.colors.line }]}>
              <Image source={{ uri: image.url }} style={{ flex: 1 }} contentFit="cover" transition={200} />

              {index === 0 ? (
                <View
                  style={{
                    position: 'absolute',
                    top: theme.space[2],
                    start: theme.space[2],
                    paddingHorizontal: theme.space[2],
                    paddingVertical: theme.space[1],
                    borderRadius: theme.radius.full,
                    backgroundColor: theme.colors.brand,
                  }}>
                  <AppText variant="label" color="onBrand">
                    {t('images.main')}
                  </AppText>
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('images.makeMain')}
                  disabled={busy}
                  onPress={() => onMakeMain(image)}
                  style={{
                    position: 'absolute',
                    bottom: theme.space[2],
                    start: theme.space[2],
                    paddingHorizontal: theme.space[2],
                    paddingVertical: theme.space[1],
                    borderRadius: theme.radius.full,
                    backgroundColor: theme.colors.surfaceRaised,
                  }}>
                  <AppText variant="label">{t('images.makeMain')}</AppText>
                </Pressable>
              )}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('images.remove')}
                disabled={busy}
                hitSlop={8}
                onPress={() => onRemove(image)}
                style={{
                  position: 'absolute',
                  top: theme.space[2],
                  end: theme.space[2],
                  width: 36,
                  height: 36,
                  borderRadius: theme.radius.full,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.colors.surfaceRaised,
                }}>
                {busy ? <ActivityIndicator color={theme.colors.ink} /> : <Icon name="x" size={20} />}
              </Pressable>
            </Appear>
          );
        })}

        {canAdd ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('images.add')}
            disabled={adding}
            onPress={onAdd}
            style={({ pressed }) => [
              tile,
              {
                alignItems: 'center',
                justifyContent: 'center',
                gap: theme.space[1],
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: theme.colors.outline,
                backgroundColor: pressed ? theme.colors.brandSoft : theme.colors.surfaceRaised,
              },
            ]}>
            {adding ? <ActivityIndicator color={theme.colors.brand} /> : <Icon name="plus" size={28} color="brand" />}
            <AppText variant="label" color="inkMuted">
              {t(adding ? 'images.adding' : 'images.add')}
            </AppText>
          </Pressable>
        ) : null}
      </View>

      <AppText variant="caption" color="inkMuted">
        {t('images.count', { count: images.length, max })}
      </AppText>
    </View>
  );
}
