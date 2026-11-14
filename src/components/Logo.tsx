import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/theme';

const MARK = require('../../assets/images/logo-mark.png');
const MARK_DARK = require('../../assets/images/logo-mark-dark.png');

/**
 * The Ba7dhek mark: a pin with an amber dot beside it, "next to you".
 * It does not mirror in Arabic. Rules and source files: docs/06-design/logo.md.
 */
export function Logo({ size = 72 }: { size?: number }) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <Image
      source={theme.dark ? MARK_DARK : MARK}
      accessibilityLabel={t('common.appName')}
      style={{ width: size, height: size }}
      contentFit="contain"
    />
  );
}
