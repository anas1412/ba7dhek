import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// A browser has nothing to vibrate, and a phone may refuse (battery saver,
// vibration switched off). Either way the app carries on without a word.
function run(effect: () => Promise<void>) {
  if (Platform.OS === 'web') return;
  effect().catch(() => {});
}

/**
 * The app's few vibrations, named for what happened rather than how they feel.
 * Always alongside something visible, never the only sign.
 */
export const haptic = {
  /** A button or a chip was pressed. */
  tap: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** One choice among several changed. */
  select: () => run(() => Haptics.selectionAsync()),
  /** Something was done and saved: applied, published, place chosen. */
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /** Something did not work. */
  error: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
