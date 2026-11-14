import type { ErrorBoundaryProps } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from './AppText';
import { Button } from './Button';
import { Icon } from './Icon';

/**
 * Shown in place of a blank page when a screen throws. It says what happened
 * in plain words and offers one way forward. The technical message is shown
 * to developers only.
 */
export function CrashScreen({ error, retry }: ErrorBoundaryProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        gap: theme.space[4],
        padding: theme.space[6],
        backgroundColor: theme.colors.surface,
      }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: theme.radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.brandSoft,
        }}>
        <Icon name="alert-circle" size={28} color="danger" />
      </View>
      <View style={{ gap: theme.space[2] }}>
        <AppText variant="title">{t('crash.title')}</AppText>
        <AppText color="inkMuted">{t('crash.body')}</AppText>
        {__DEV__ ? (
          <AppText variant="caption" color="danger">
            {error.message}
          </AppText>
        ) : null}
      </View>
      <Button label={t('crash.reload')} onPress={() => void retry()} />
    </View>
  );
}
