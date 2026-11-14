import { Image } from 'expo-image';
import { View } from 'react-native';

import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme';

/** The other side of a conversation: their photo or logo, or a plain figure when there is none. */
export function Avatar({ url, size = 48, kind }: { url: string | null; size?: number; kind: 'person' | 'business' }) {
  const theme = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        // A person is round, a business is a rounded square, as on the job card.
        borderRadius: kind === 'person' ? size / 2 : theme.radius.sm,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.brandSoft,
      }}>
      {url ? (
        <Image source={{ uri: url }} style={{ width: size, height: size }} contentFit="cover" transition={200} />
      ) : (
        <Icon name={kind === 'person' ? 'user' : 'briefcase'} size={size >= 48 ? 24 : 20} color="inkMuted" />
      )}
    </View>
  );
}
