import { ConvexError } from 'convex/values';
import type { TFunction } from 'i18next';

/** Turns an error from the backend into a sentence the person can act on. */
export function formErrorMessage(error: unknown, t: TFunction, fallbackKey: string): string {
  if (error instanceof ConvexError) {
    const code = (error.data as { code?: string } | undefined)?.code;
    switch (code) {
      case 'blocked_text':
        return t('errors.blockedText');
      case 'too_short':
        return t('errors.tooShort');
      case 'too_long':
        return t('errors.tooLong');
      case 'outside_tunisia':
      case 'invalid_location':
        return t('location.outsideTunisia');
      case 'invalid_pay':
        return t('job.needPay');
    }
  }
  return t(fallbackKey);
}
