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
        paddingTop: insets.top + theme.space[2],
        paddingBottom: theme.space[1],
        paddingHorizontal: theme.space[2],
        backgroundColor: theme.colors.surface,
        flexDirection: 'row',
      }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(kind === 'close' ? 'common.close' : 'common.back')}
        hitSlop={8}
        onPress={leave}
        style={({ pressed }) => ({
          width: 44,
          height: 44,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: theme.radius.full,
          backgroundColor: pressed ? theme.colors.brandSoft : 'transparent',
        })}>
        <Icon name={kind === 'close' ? 'x' : 'arrow-left'} directional={kind === 'back'} />
      </Pressable>
    </View>
  );
}
