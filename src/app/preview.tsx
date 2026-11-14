import { changeLanguage } from 'i18next';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { GoogleButton } from '@/components/GoogleButton';
import { EmptyState } from '@/components/EmptyState';
import { RoundButton } from '@/components/RoundButton';
import { CardStack, type CardStackHandle } from '@/features/jobs/CardStack';
import { sampleJobs } from '@/features/jobs/sampleJobs';
import { PREVIEW_VIEWS, PreviewViewScreen, type PreviewView } from '@/features/preview/PreviewViews';
import { LANGUAGES, formatLocale } from '@/i18n/languages';
import { formatDistance } from '@/lib/format';
import { currentLanguage } from '@/i18n';
import { useTheme } from '@/theme';

const VIEW_TITLE = {
  setup: 'setup.title',
  company: 'company.title',
  job: 'job.title',
  detail: 'preview.detail',
  filters: 'preview.filters',
  chats: 'preview.chats',
  chat: 'preview.chat',
  push: 'push.title',
  delete: 'account.delete',
  report: 'report.job',
  charts: 'admin.section_overview',
  applicants: 'applicants.title',
  applications: 'applications.title',
  images: 'images.title',
  photo: 'photo.title',
  loading: 'common.loading',
} as const;

function isPreviewView(value: unknown): value is PreviewView {
  return typeof value === 'string' && (PREVIEW_VIEWS as readonly string[]).includes(value);
}

/**
 * A development-only page that shows the interface pieces with sample data, so
 * they can be looked at without signing in. It is not reachable in a release build.
 */
export default function Preview() {
  const { t } = useTranslation();
  const theme = useTheme();
  const stack = useRef<CardStackHandle>(null);
  const [now] = useState(() => Date.now());
  const [round, setRound] = useState(0);
  const [last, setLast] = useState<string | null>(null);
  const [left, setLeft] = useState(() => sampleJobs(now).length);
  const router = useRouter();
  const { view } = useLocalSearchParams<{ view?: string }>();

  if (!__DEV__) return <Redirect href="/" />;

  // "/preview?view=job" shows one whole screen instead of the gallery.
  if (isPreviewView(view)) return <PreviewViewScreen view={view} />;

  const jobs = sampleJobs(now);
  const language = currentLanguage();

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <ScrollView contentContainerStyle={{ padding: theme.space[4], gap: theme.space[6] }}>
        <View style={{ gap: theme.space[2] }}>
          <AppText variant="display">{t('preview.title')}</AppText>
          <AppText variant="caption" color="inkMuted">
            {t('preview.note')}
          </AppText>
          <View style={{ flexDirection: 'row', gap: theme.space[2] }}>
            {LANGUAGES.map((code) => (
              <View key={code} style={{ flex: 1 }}>
                <Button
                  label={t(`languages.${code}`)}
                  variant={code === language ? 'primary' : 'neutral'}
                  // Language only: the right-to-left flip needs the reload that Settings does.
                  onPress={() => changeLanguage(code)}
                />
              </View>
            ))}
          </View>
          <AppText variant="caption" color="inkMuted">
            {formatLocale(language)}
          </AppText>
        </View>

        <View style={{ gap: theme.space[4] }}>
          <AppText variant="heading">{t('preview.stack')}</AppText>
          <View style={{ height: 500 }}>
            {left > 0 ? (
              <CardStack
                key={round}
                ref={stack}
                jobs={jobs}
                now={now}
                onOpen={() => router.push({ pathname: '/preview', params: { view: 'detail' } })}
                onSwipe={(job, direction) => {
                  setLeft((count) => count - 1);
                  setLast(
                    t('preview.last', {
                      direction: t(direction === 'right' ? 'jobs.apply' : 'jobs.pass'),
                      title: job.title,
                    }),
                  );
                }}
              />
            ) : (
              <EmptyState
                icon="map-pin"
                title={t('jobs.emptyTitle', { distance: formatDistance(5000, language, t) })}
                body={t('jobs.emptyBody')}>
                <Button
                  label={t('preview.reset')}
                  onPress={() => {
                    setRound((value) => value + 1);
                    setLeft(jobs.length);
                    setLast(null);
                  }}
                />
              </EmptyState>
            )}
          </View>
          {left > 0 ? (
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: theme.space[6] * 2 }}>
              <RoundButton icon="x" label={t('jobs.pass')} variant="neutral" onPress={() => stack.current?.swipe('left')} />
              <RoundButton icon="check" label={t('jobs.apply')} variant="primary" onPress={() => stack.current?.swipe('right')} />
            </View>
          ) : null}
          {last ? (
            <AppText variant="caption" color="inkMuted" center>
              {last}
            </AppText>
          ) : null}
        </View>

        <View style={{ gap: theme.space[4] }}>
          <AppText variant="heading">{t('preview.components')}</AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2] }}>
            <Chip variant="near" icon="map-pin" label={formatDistance(650, language, t)} />
            <Chip variant="near" large icon="map-pin" label={formatDistance(1240, language, t)} />
            <Chip label={t('contracts.part_time')} />
            <Chip label={t('categories.hospitality')} />
            <Chip label={t('employer.applicants', { count: 3 })} />
          </View>
          <GoogleButton label={t('welcome.google')} onPress={() => {}} />
          <Button label={t('common.cancel')} variant="neutral" onPress={() => {}} />
          <Button label={t('employer.close')} variant="danger" onPress={() => {}} />
          <Button label={t('common.loading')} loading onPress={() => {}} />
        </View>

        <View style={{ gap: theme.space[2] }}>
          <AppText variant="heading">{t('preview.forms')}</AppText>
          {PREVIEW_VIEWS.map((name) => (
            <Button
              key={name}
              label={t(VIEW_TITLE[name])}
              variant="neutral"
              onPress={() => router.push({ pathname: '/preview', params: { view: name } })}
            />
          ))}
        </View>

        <View style={{ gap: theme.space[4], minHeight: 320 }}>
          <AppText variant="heading">{t('preview.empty')}</AppText>
          <EmptyState icon="navigation" title={t('jobs.noHomeTitle')} body={t('jobs.noHomeBody')}>
            <Button label={t('common.continue')} onPress={() => {}} />
          </EmptyState>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
