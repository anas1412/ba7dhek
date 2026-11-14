import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

import { Icon } from './Icon';

type Props = {
  /** A sheet is dismissed with a cross; a pushed screen is left with a back arrow. */
  kind: 'back' | 'close';
};

/**
 * The bar above every screen that is not a tab. It holds one thing: the way
 * out. Screens keep their own large title in the page, so the bar stays quiet.
 * The arrow points the other way in Arabic.
 */
export function AppHeader({ kind }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  function leave() {
    // Opened directly (a link, or a reload in the browser): there is nothing to go back to.
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  return (
    <View
      style={{
        // A Material 3 small top app bar: 64 high, with its icon button 4 from the edge.
        paddingTop: insets.top + theme.space[2],
        paddingBottom: theme.space[2],
        paddingHorizontal: theme.space[1],
        backgroundColor: theme.colors.surface,
        flexDirection: 'row',
      }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(kind === 'close' ? 'common.close' : 'common.back')}
        hitSlop={8}
        onPress={leave}
        style={({ pressed }) => ({
          width: 48,
          height: 48,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: theme.radius.full,
          backgroundColor: pressed ? theme.colors.surfaceContainerHigh : 'transparent',
        })}>
        <Icon name={kind === 'close' ? 'x' : 'arrow-left'} directional={kind === 'back'} />
      </Pressable>
    </View>
  );
}
