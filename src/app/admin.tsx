import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { Redirect } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Screen } from '@/components/Screen';
import { ListSkeleton } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';
import { currentLanguage } from '@/i18n';
import { formatRelativeTime } from '@/lib/format';
import { useTheme } from '@/theme';

const REASON_KEY: Record<string, string> = {
  asks_money: 'report.reasonAsksMoney',
  fake: 'report.reasonFake',
  inappropriate: 'report.reasonInappropriate',
  harassment: 'chat.reasonHarassment',
  scam: 'chat.reasonScam',
  other: 'report.reasonOther',
};

function Card({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <View
      style={{
        gap: theme.space[2],
        padding: theme.space[4],
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.line,
      }}>
      {children}
    </View>
  );
}

/**
 * The review screen, for the one account marked as admin: businesses waiting
 * to be approved, and reports waiting for a decision. Every function behind it
 * checks the admin flag again on the server; hiding the screen is not the lock.
 */
export default function Admin() {
  const { t } = useTranslation();
  const theme = useTheme();
  const toast = useToast();
  const language = currentLanguage();
  const me = useQuery(api.users.me);
  const isAdmin = me?.isAdmin === true;
  const companies = useQuery(api.companies.pending, isAdmin ? {} : 'skip');
  const reports = useQuery(api.reports.open, isAdmin ? {} : 'skip');
  const approve = useMutation(api.companies.approve);
  const reject = useMutation(api.companies.reject);
  const resolve = useMutation(api.reports.resolve);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  if (me === undefined) return null;
  if (!isAdmin) return <Redirect href="/" />;

  async function run(id: string, action: () => Promise<unknown>) {
    setBusyId(id);
    try {
      await action();
      toast.show(t('admin.done'), 'info');
    } catch {
      toast.show(t('errors.generic'), 'error');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Screen scroll underHeader>
      <AppText variant="display">{t('admin.title')}</AppText>

      <AppText variant="heading">{t('admin.companies', { count: companies?.length ?? 0 })}</AppText>
      {!companies ? (
        <ListSkeleton rows={1} />
      ) : companies.length === 0 ? (
        <AppText color="inkMuted">{t('admin.noCompanies')}</AppText>
      ) : (
        companies.map((company) => (
          <Card key={company._id}>
            <AppText variant="bodyStrong">{company.name}</AppText>
            <AppText color="inkMuted">{company.address}</AppText>
            <AppText variant="caption" color="inkMuted">
              {/* Shown as stored: the tax ID is what the business is checked against. */}
              {company.kind === 'business' ? (company.taxId ?? t('admin.noTaxId')) : t('company.kindIndividual')}
            </AppText>
            <AppText variant="caption" color="inkMuted">
              {[company.ownerName, company.ownerEmail].filter(Boolean).join(' · ')}
            </AppText>
            <View style={{ flexDirection: 'row', gap: theme.space[2] }}>
              <View style={{ flex: 1 }}>
                <Button
                  label={t('admin.reject')}
                  variant="danger"
                  disabled={busyId === company._id}
                  onPress={() => run(company._id, () => reject({ companyId: company._id, reason: 'Not verified' }))}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label={t('admin.approve')}
                  loading={busyId === company._id}
                  onPress={() => run(company._id, () => approve({ companyId: company._id }))}
                />
              </View>
            </View>
          </Card>
        ))
      )}

      <AppText variant="heading">{t('admin.reports', { count: reports?.length ?? 0 })}</AppText>
      {!reports ? (
        <ListSkeleton rows={1} />
      ) : reports.length === 0 ? (
        <AppText color="inkMuted">{t('admin.noReports')}</AppText>
      ) : (
        reports.map((report) => (
          <Card key={report._id}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2] }}>
              <Chip label={t(report.kind === 'job' ? 'admin.kindJob' : 'admin.kindPerson')} />
              <Chip label={t(REASON_KEY[report.reason] ?? 'report.reasonOther')} />
              {report.reportCount > 1 ? <Chip label={t('admin.reportCount', { count: report.reportCount })} /> : null}
              {report.kind === 'job' && report.hidden ? <Chip icon="eye-off" label={t('employer.statusHidden')} /> : null}
            </View>
            <AppText variant="bodyStrong">{report.title ?? t('admin.gone')}</AppText>
            {report.kind === 'job' && report.companyName ? <AppText color="inkMuted">{report.companyName}</AppText> : null}
            {report.kind === 'job' && report.description ? (
              <AppText color="inkMuted" numberOfLines={4}>
                {report.description}
              </AppText>
            ) : null}
            {report.note ? <AppText>{report.note}</AppText> : null}
            <AppText variant="caption" color="inkMuted">
              {[report.reporterName ?? t('chat.deletedUser'), formatRelativeTime(report.reportedAt, now, language)].join(' · ')}
            </AppText>
            <View style={{ flexDirection: 'row', gap: theme.space[2] }}>
              <View style={{ flex: 1 }}>
                <Button
                  label={t('admin.dismiss')}
                  variant="neutral"
                  disabled={busyId === report._id}
                  onPress={() => run(report._id, () => resolve({ reportId: report._id as Id<'reports'>, action: 'dismiss' }))}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label={t(report.kind === 'job' ? 'admin.removeJob' : 'admin.banPerson')}
                  variant="danger"
                  loading={busyId === report._id}
                  onPress={() => run(report._id, () => resolve({ reportId: report._id as Id<'reports'>, action: 'remove' }))}
                />
              </View>
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}
