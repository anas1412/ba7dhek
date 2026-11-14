import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';

const MARK = require('../../assets/images/logo-mark.png');

/**
 * The Ba7dhek mark in its blue tile: the name بحذاك with the dot under the ب in amber.
 * The tile is the same in light and dark mode, and the mark never mirrors.
 * Rules and source files: docs/06-design/logo.md.
 */
export function Logo({ size = 72 }: { size?: number }) {
  const { t } = useTranslation();
  return (
    <Image
      source={MARK}
      accessibilityLabel={t('common.appName')}
      style={{ width: size, height: size }}
      contentFit="contain"
    />
  );
}
