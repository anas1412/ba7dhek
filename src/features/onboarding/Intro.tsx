import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { Logo } from '@/components/Logo';
import { CardStack } from '@/features/jobs/CardStack';
import { sampleJobs } from '@/features/jobs/sampleJobs';
import { currentLanguage } from '@/i18n';
import { formatDistance } from '@/lib/format';
import { useTheme } from '@/theme';

import { Pager } from './Pager';

const PAGE_COUNT = 3;
const LAST = PAGE_COUNT - 1;
// The practice card is written in the reader's language.
const PRACTICE_JOB = { fr: 0, ar: 1, en: 2 } as const;

type Props = {
  /** Skip the two teaching pages for someone who has seen them. */
  startAtEnd: boolean;
  /** Called the first time the last page is reached. */
  onSeen: () => void;
  /** What sits on the last page: the sign-in button and its messages. */
  signIn: ReactNode;
};

/**
 * The first thing a new person sees: what the app does, the one gesture it
 * relies on (tried on a real card), then sign-in. Each page is a swipe away,
 * so the swipe is learned before the first job appears.
 */
export function Intro({ startAtEnd, onSeen, signIn }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const language = currentLanguage();
  const [index, setIndex] = useState(startAtEnd ? LAST : 0);
  const [now] = useState(() => Date.now());
  // Bumped after a left swipe so the practice card comes back for another try.
  const [attempt, setAttempt] = useState(0);
  const [practice, setPractice] = useState<'waiting' | 'passed' | 'applied'>('waiting');

  function goTo(next: number) {
    setIndex(next);
    if (next === LAST) onSeen();
  }

  const practiceJob = sampleJobs(now)[PRACTICE_JOB[language]];

  const pages = [
    <View key="near" style={{ flex: 1, justifyContent: 'center', gap: theme.space[6], padding: theme.space[4] }}>
      <View
        style={{
          gap: theme.space[2],
          padding: theme.space[6],
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          borderColor: theme.colors.line,
          backgroundColor: theme.colors.surfaceRaised,
        }}>
        <Chip
          variant="near"
          large
          icon="map-pin"
          label={t('distance.fromYou', { distance: formatDistance(650, language, t) })}
        />
        <AppText variant="title">{t('intro.nearExample')}</AppText>
      </View>
      <View style={{ gap: theme.space[2] }}>
        <AppText variant="display">{t('intro.nearTitle')}</AppText>
        <AppText color="inkMuted">{t('intro.nearBody')}</AppText>
      </View>
    </View>,

    <View key="swipe" style={{ flex: 1, gap: theme.space[4], padding: theme.space[4] }}>
      <View style={{ gap: theme.space[1] }}>
        <AppText variant="display">{t('intro.swipeTitle')}</AppText>
        <AppText color={practice === 'passed' ? 'ink' : 'inkMuted'}>
          {t(practice === 'applied' ? 'intro.swipeApplied' : practice === 'passed' ? 'intro.swipePassed' : 'intro.swipeBody')}
        </AppText>
      </View>
      <View style={{ flex: 1 }}>
        {practice === 'applied' ? null : (
          <CardStack
            key={attempt}
            jobs={[practiceJob]}
            now={now}
            onSwipe={(_job, direction) => {
              if (direction === 'right') {
                setPractice('applied');
              } else {
                setPractice('passed');
                setAttempt((value) => value + 1);
              }
            }}
          />
        )}
      </View>
    </View>,

    <View key="start" style={{ flex: 1, justifyContent: 'center', gap: theme.space[2], padding: theme.space[4] }}>
      <Logo size={96} />
      {/* The tile already spells the name in Arabic; repeating it underneath would say it twice. */}
      {language === 'ar' ? null : <AppText variant="display">{t('common.appName')}</AppText>}
      <AppText variant="title" color="brand">
        {t('welcome.tagline')}
      </AppText>
      <AppText color="inkMuted">{t('welcome.pitch')}</AppText>
    </View>,
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <View style={{ paddingTop: theme.space[4], paddingHorizontal: theme.space[4] }}>
        <LanguageSwitch />
      </View>

      <Pager
        pages={pages}
        index={index}
        onIndexChange={goTo}
        // The practice card owns the swipe on its page until it has been used.
        swipeEnabled={!(index === 1 && practice !== 'applied')}
      />

      <View style={{ gap: theme.space[4], padding: theme.space[4] }}>
        <View
          accessibilityRole="tablist"
          accessibilityLabel={t('intro.page', { current: index + 1, total: PAGE_COUNT })}
          // The dots run left to right in every language, matching the pages they stand for.
          style={{ direction: 'ltr', flexDirection: 'row', justifyContent: 'center', gap: theme.space[2] }}>
          {pages.map((_, dot) => (
            <Pressable
              key={dot}
              accessibilityRole="tab"
              accessibilityState={{ selected: dot === index }}
              accessibilityLabel={t('intro.page', { current: dot + 1, total: PAGE_COUNT })}
              hitSlop={12}
              onPress={() => goTo(dot)}
              style={{
                width: dot === index ? 24 : 8,
                height: 8,
                borderRadius: theme.radius.full,
                backgroundColor: dot === index ? theme.colors.brand : theme.colors.line,
              }}
            />
          ))}
        </View>

        {index === LAST ? (
          signIn
        ) : (
          <View style={{ gap: theme.space[2] }}>
            <Button label={t('common.next')} onPress={() => goTo(index + 1)} />
            <Button label={t('common.skip')} variant="neutral" onPress={() => goTo(LAST)} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
