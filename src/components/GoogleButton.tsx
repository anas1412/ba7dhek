import { Image } from 'expo-image';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';

import { AppText } from './AppText';

// Cut from Google's own pre-approved button images, unaltered, one for each ground.
const LOGO_LIGHT = require('../../assets/images/google-g-light.png');
const LOGO_DARK = require('../../assets/images/google-g-dark.png');

// Google's branding guidelines for a custom "Sign in with Google" button, read on 2026-11-14:
// https://developers.google.com/identity/branding-guidelines
// These colours are Google's, not the app's, so they do not come from the theme.
const LIGHT = { fill: '#FFFFFF', stroke: '#747775', text: '#1F1F1F', pressed: '#F2F2F2' };
const DARK = { fill: '#131314', stroke: '#8E918F', text: '#E3E3E3', pressed: '#2A2A2C' };

type Props = {
  /** One of Google's approved phrases, translated: "Sign in with Google". */
  label: string;
  loading?: boolean;
  onPress: () => void;
};

/**
 * The sign-in button, drawn the way Google requires: its "G" in full colour and
 * untouched, on white or near-black, with Google's own outline and text colours.
 * The one departure is the typeface: Google's is Google Sans, this uses the app's.
 */
export function GoogleButton({ label, loading, onPress }: Props) {
  const theme = useTheme();
  const colours = theme.dark ? DARK : LIGHT;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(loading), busy: Boolean(loading) }}
      disabled={loading}
      onPressIn={() => haptic.tap()}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 52,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        paddingHorizontal: theme.space[4],
        // The pill is one of Google's two allowed shapes.
        borderRadius: theme.radius.full,
        borderWidth: 1,
        borderColor: colours.stroke,
        backgroundColor: pressed ? colours.pressed : colours.fill,
        opacity: loading ? 0.7 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}>
      {loading ? (
        <ActivityIndicator color={colours.text} />
      ) : (
        <>
          {/* The logo keeps its own left and right in Arabic; only its place in the row follows the language. */}
          <View style={{ width: 22, height: 22 }}>
            <Image
              source={theme.dark ? LOGO_DARK : LOGO_LIGHT}
              style={{ width: 22, height: 22 }}
              contentFit="contain"
              accessible={false}
            />
          </View>
          <AppText variant="bodyStrong" style={{ color: colours.text }}>
            {label}
          </AppText>
        </>
      )}
    </Pressable>
  );
}
