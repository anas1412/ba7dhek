import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';

import { AppText } from './AppText';
import { Icon } from './Icon';

type ToastKind = 'success' | 'error' | 'info';
type Toast = { id: number; message: string; kind: ToastKind };

type ToastApi = {
  /** A short result message at the bottom of the screen: "Draft saved". */
  show: (message: string, kind?: ToastKind) => void;
};

const ToastContext = createContext<ToastApi>({ show: () => {} });

const VISIBLE_MS = 3200;
const ERROR_VISIBLE_MS = 5000;

/**
 * One place for every "it worked" and "it did not" message, so an action never
 * ends in silence. On a form, the error also appears beside the field; this is
 * never the only place an error is shown.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextId = useRef(1);

  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setToast(null);
  }, []);

  const show = useCallback((message: string, kind: ToastKind = 'success') => {
    // Felt as well as seen: one vibration for done, another for a problem, none for plain information.
    if (kind === 'success') haptic.success();
    else if (kind === 'error') haptic.error();
    if (timer.current) clearTimeout(timer.current);
    // A new id restarts the entrance, so a second message is noticed.
    setToast({ id: nextId.current++, message, kind });
    timer.current = setTimeout(() => setToast(null), kind === 'error' ? ERROR_VISIBLE_MS : VISIBLE_MS);
  }, []);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const api = useMemo(() => ({ show }), [show]);

  const error = toast?.kind === 'error';

  return (
    <ToastContext.Provider value={api}>
      {children}
      <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, styles.layer]}>
        {toast ? (
          <Animated.View
            key={toast.id}
            entering={FadeInDown.duration(220)}
            exiting={FadeOutDown.duration(180)}
            // Read out by screen readers as soon as it appears.
            accessibilityLiveRegion={error ? 'assertive' : 'polite'}
            accessibilityRole="alert"
            style={{
              marginHorizontal: theme.space[4],
              // Clear of the tab bar and the phone's bottom edge.
              marginBottom: insets.bottom + 72,
              maxWidth: 480,
              alignSelf: 'center',
            }}>
            <Pressable
              onPress={dismiss}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.space[2],
                paddingVertical: theme.space[2] + theme.space[1],
                paddingHorizontal: theme.space[4],
                minHeight: 48,
                borderRadius: theme.radius.xs,
                // A Material 3 snackbar: inverted against the page, lifted above it.
                backgroundColor: theme.colors.inverseSurface,
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3), 0 4px 8px 3px rgba(0, 0, 0, 0.15)',
              }}>
              {/* The icon says which kind of message this is, so it is not told by wording alone. */}
              <Icon name={error ? 'alert-circle' : toast.kind === 'success' ? 'check' : 'info'} size={20} color="onInverseSurface" />
              <AppText color="onInverseSurface" style={{ flexShrink: 1 }}>
                {toast.message}
              </AppText>
            </Pressable>
          </Animated.View>
        ) : null}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  return useContext(ToastContext);
}

const styles = StyleSheet.create({
  layer: { justifyContent: 'flex-end' },
});
