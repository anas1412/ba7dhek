import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { ChoiceChips } from '@/components/ChoiceChips';
import { ListSkeleton } from '@/components/Skeleton';
import { TextField } from '@/components/TextField';
import { useToast } from '@/components/Toast';
import { currentLanguage } from '@/i18n';
import { formatNumber, formatPay, formatRelativeTime } from '@/lib/format';
import { useTheme } from '@/theme';

export type StaffRole = 'admin' | 'moderator';

const REASON_KEY: Record<string, string> = {
  asks_money: 'report.reasonAsksMoney',
  fake: 'report.reasonFake',
  inappropriate: 'report.reasonInappropriate',
  harassment: 'chat.reasonHarassment',
  scam: 'chat.reasonScam',
  other: 'report.reasonOther',
};

const ACTION_KEY: Record<string, string> = {
  approve_business: 'admin.logApprove',
  reject_business: 'admin.logReject',
  hide_job: 'admin.logHide',
  unhide_job: 'admin.logUnhide',
  remove_job: 'admin.logRemove',
  ban: 'admin.logBan',
  unban: 'admin.logUnban',
  add_moderator: 'admin.logAddModerator',
  remove_moderator: 'admin.logRemoveModerator',
  dismiss_report: 'admin.logDismiss',
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

function Row({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2] }}>{children}</View>;
}

/** Buttons side by side, each taking an equal share. */
function Actions({ children }: { children: ReactNode[] }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: theme.space[2], marginTop: theme.space[1] }}>
      {children.filter(Boolean).map((child, index) => (
        <View key={index} style={{ flex: 1 }}>
          {child}
        </View>
      ))}
    </View>
  );
}

function Empty({ text }: { text: string }) {
  return <AppText color="inkMuted">{text}</AppText>;
}

/** Runs a back-office action and always says how it ended. */
function useAct() {
  const { t } = useTranslation();
  const toast = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  async function act(id: string, action: () => Promise<unknown>) {
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
  return { busyId, act };
}

function useNow() {
  const [now] = useState(() => Date.now());
  return now;
}

/** The numbers that say how the pilot is doing and what is waiting. */
export function Overview() {
  const { t } = useTranslation();
  const theme = useTheme();
  const language = currentLanguage();
  const data = useQuery(api.staff.overview);
  if (!data) return <ListSkeleton rows={2} />;

  const figures: [string, number][] = [
    ['admin.statReports', data.reportsOpen],
    ['admin.statPending', data.businessesPending],
    ['admin.statHidden', data.jobsHidden],
    ['admin.statJobsOpen', data.jobsOpen],
    ['admin.statJobsWeek', data.jobsThisWeek],
    ['admin.statCandidates', data.candidates],
    ['admin.statEmployers', data.employers],
    ['admin.statNewPeople', data.newPeopleThisWeek],
    ['admin.statBusinesses', data.businessesApproved],
    ['admin.statChats', data.conversations],
    ['admin.statBanned', data.banned],
  ];
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2] }}>
      {figures.map(([key, value]) => (
        <View
          key={key}
          style={{
            width: '48%',
            flexGrow: 1,
            gap: theme.space[1],
            padding: theme.space[4],
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.surfaceRaised,
          }}>
          <AppText variant="title">{formatNumber(value, language, 0)}</AppText>
          <AppText variant="caption" color="inkMuted">
            {t(key)}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const APPROVALS = ['pending', 'approved', 'rejected'] as const;

/** Businesses by state. Approving one lets its jobs go live. */
export function Businesses() {
  const { t } = useTranslation();
  const [approval, setApproval] = useState<(typeof APPROVALS)[number]>('pending');
  const [reason, setReason] = useState('');
  const list = useQuery(api.staff.companies, { approval });
  const approve = useMutation(api.companies.approve);
  const reject = useMutation(api.companies.reject);
  const { busyId, act } = useAct();

  return (
    <>
      <ChoiceChips
        label={t('admin.show')}
        options={APPROVALS.map((value) => ({ value, label: t(`admin.business_${value}`) }))}
        value={approval}
        onChange={setApproval}
      />
      {approval === 'pending' ? (
        <TextField label={t('admin.rejectReason')} hint={t('admin.rejectReasonHint')} value={reason} onChangeText={setReason} maxLength={200} />
      ) : null}
      {!list ? (
        <ListSkeleton rows={1} />
      ) : list.length === 0 ? (
        <Empty text={t('admin.nothing')} />
      ) : (
        list.map((company) => (
          <Card key={company._id}>
            <AppText variant="bodyStrong">{company.name}</AppText>
            <AppText color="inkMuted">{company.address}</AppText>
            <Row>
              <Chip label={t(`categories.${company.category}`)} />
              <Chip label={company.kind === 'business' ? (company.taxId ?? t('admin.noTaxId')) : t('company.kindIndividual')} />
            </Row>
            <AppText variant="caption" color="inkMuted">
              {[company.ownerName, company.ownerEmail].filter(Boolean).join(' · ')}
            </AppText>
            {company.rejectionReason ? <AppText variant="caption">{company.rejectionReason}</AppText> : null}
            <Actions>
              {company.approval !== 'rejected' ? (
                <Button
                  label={t('admin.reject')}
                  variant="danger"
                  disabled={busyId === company._id}
                  onPress={() =>
                    act(company._id, () => reject({ companyId: company._id, reason: reason.trim() || t('admin.rejectDefault') }))
                  }
                />
              ) : null}
              {company.approval !== 'approved' ? (
                <Button
                  label={t('admin.approve')}
                  loading={busyId === company._id}
                  onPress={() => act(company._id, () => approve({ companyId: company._id }))}
                />
              ) : null}
            </Actions>
          </Card>
        ))
      )}
    </>
  );
}

const JOB_FILTERS = ['open', 'hidden', 'closed', 'draft'] as const;

/** Every job, with the three things staff can do to one: hide it, bring it back, remove it. */
export function Jobs() {
  const { t } = useTranslation();
  const language = currentLanguage();
  const [filter, setFilter] = useState<(typeof JOB_FILTERS)[number]>('open');
  const [search, setSearch] = useState('');
  const list = useQuery(api.staff.jobs, { filter, search });
  const hide = useMutation(api.staff.hideJob);
  const unhide = useMutation(api.staff.unhideJob);
  const remove = useMutation(api.staff.removeJob);
  const { busyId, act } = useAct();

  return (
    <>
      <ChoiceChips
        label={t('admin.show')}
        options={JOB_FILTERS.map((value) => ({ value, label: t(`admin.job_${value}`) }))}
        value={filter}
        onChange={setFilter}
      />
      <TextField label={t('admin.search')} hint={t('admin.searchJobsHint')} value={search} onChangeText={setSearch} maxLength={60} />
      {!list ? (
        <ListSkeleton rows={1} />
      ) : list.length === 0 ? (
        <Empty text={t('admin.nothing')} />
      ) : (
        list.map((job) => (
          <Card key={job._id}>
            <AppText variant="bodyStrong">{job.title}</AppText>
            <AppText color="inkMuted">
              {[job.companyName, formatPay(job.payAmount, job.payPeriod, language, t)].filter(Boolean).join(' · ')}
            </AppText>
            {job.description ? (
              <AppText variant="caption" color="inkMuted" numberOfLines={3}>
                {job.description}
              </AppText>
            ) : null}
            {job.reportCount > 0 ? (
              <Row>
                <Chip icon="flag" label={t('admin.reportCount', { count: job.reportCount })} />
              </Row>
            ) : null}
            <Actions>
              {job.hidden && job.status !== 'closed' ? (
                <Button label={t('admin.unhide')} variant="neutral" disabled={busyId === job._id} onPress={() => act(job._id, () => unhide({ jobId: job._id }))} />
              ) : null}
              {!job.hidden && job.status === 'open' ? (
                <Button label={t('admin.hide')} variant="neutral" disabled={busyId === job._id} onPress={() => act(job._id, () => hide({ jobId: job._id }))} />
              ) : null}
              {job.status !== 'closed' ? (
                <Button label={t('admin.removeJob')} variant="danger" loading={busyId === job._id} onPress={() => act(job._id, () => remove({ jobId: job._id }))} />
              ) : null}
            </Actions>
          </Card>
        ))
      )}
    </>
  );
}

/** Reports waiting for a decision, oldest first. */
export function Reports() {
  const { t } = useTranslation();
  const language = currentLanguage();
  const now = useNow();
  const list = useQuery(api.reports.open);
  const resolve = useMutation(api.reports.resolve);
  const { busyId, act } = useAct();

  if (!list) return <ListSkeleton rows={1} />;
  if (list.length === 0) return <Empty text={t('admin.noReports')} />;
  return (
    <>
      {list.map((report) => (
        <Card key={report._id}>
          <Row>
            <Chip label={t(report.kind === 'job' ? 'admin.kindJob' : 'admin.kindPerson')} />
            <Chip icon="flag" label={t(REASON_KEY[report.reason] ?? 'report.reasonOther')} />
            {report.reportCount > 1 ? <Chip label={t('admin.reportCount', { count: report.reportCount })} /> : null}
            {report.kind === 'job' && report.hidden ? <Chip icon="eye-off" label={t('employer.statusHidden')} /> : null}
          </Row>
          <AppText variant="bodyStrong">{report.title ?? t('admin.gone')}</AppText>
          {report.kind === 'job' && report.companyName ? <AppText color="inkMuted">{report.companyName}</AppText> : null}
          {report.kind === 'job' && report.description ? (
            <AppText variant="caption" color="inkMuted" numberOfLines={4}>
              {report.description}
            </AppText>
          ) : null}
          {report.note ? <AppText>{report.note}</AppText> : null}
          <AppText variant="caption" color="inkMuted">
            {[report.reporterName ?? t('chat.deletedUser'), formatRelativeTime(report.reportedAt, now, language)].join(' · ')}
          </AppText>
          <Actions>
            <Button
              label={t('admin.dismiss')}
              variant="neutral"
              disabled={busyId === report._id}
              onPress={() => act(report._id, () => resolve({ reportId: report._id as Id<'reports'>, action: 'dismiss' }))}
            />
            <Button
              label={t(report.kind === 'job' ? 'admin.removeJob' : 'admin.banPerson')}
              variant="danger"
              loading={busyId === report._id}
              onPress={() => act(report._id, () => resolve({ reportId: report._id as Id<'reports'>, action: 'remove' }))}
            />
          </Actions>
        </Card>
      ))}
    </>
  );
}

const PEOPLE_FILTERS = ['all', 'banned', 'staff'] as const;

/** Everyone with an account. Moderators ban; admins also lift bans and choose the moderators. */
export function People({ role }: { role: StaffRole }) {
  const { t } = useTranslation();
  const language = currentLanguage();
  const now = useNow();
  const [filter, setFilter] = useState<(typeof PEOPLE_FILTERS)[number]>('all');
  const [search, setSearch] = useState('');
  const list = useQuery(api.staff.people, { filter, search });
  const ban = useMutation(api.staff.ban);
  const unban = useMutation(api.staff.unban);
  const setModerator = useMutation(api.staff.setModerator);
  const { busyId, act } = useAct();
  const admin = role === 'admin';

  return (
    <>
      <ChoiceChips
        label={t('admin.show')}
        options={PEOPLE_FILTERS.map((value) => ({ value, label: t(`admin.people_${value}`) }))}
        value={filter}
        onChange={setFilter}
      />
      <TextField
        label={t('admin.search')}
        hint={t(admin ? 'admin.searchPeopleAdminHint' : 'admin.searchPeopleHint')}
        value={search}
        onChangeText={setSearch}
        maxLength={60}
      />
      {!list ? (
        <ListSkeleton rows={1} />
      ) : list.length === 0 ? (
        <Empty text={t('admin.nothing')} />
      ) : (
        list.map((person) => (
          <Card key={person._id}>
            <AppText variant="bodyStrong">{person.name ?? t('admin.noName')}</AppText>
            {person.email ? <AppText color="inkMuted">{person.email}</AppText> : null}
            <Row>
              {person.role ? <Chip label={t(person.role === 'candidate' ? 'admin.roleCandidate' : 'admin.roleEmployer')} /> : null}
              {person.staffRole ? <Chip icon="shield" label={t(person.staffRole === 'admin' ? 'admin.roleAdmin' : 'admin.roleModerator')} /> : null}
              {person.banned ? <Chip icon="slash" label={t('admin.isBanned')} /> : null}
            </Row>
            <AppText variant="caption" color="inkMuted">
              {t('admin.joined', { time: formatRelativeTime(person.joinedAt, now, language) })}
            </AppText>
            {/* Nobody acts on their own account, and staff are not banned from here. */}
            {person.isMe ? null : (
              <Actions>
                {person.banned && admin ? (
                  <Button label={t('admin.unban')} variant="neutral" loading={busyId === person._id} onPress={() => act(person._id, () => unban({ userId: person._id }))} />
                ) : null}
                {!person.banned && person.staffRole === null ? (
                  <Button label={t('admin.banPerson')} variant="danger" disabled={busyId === person._id} onPress={() => act(person._id, () => ban({ userId: person._id }))} />
                ) : null}
                {admin && !person.banned && person.staffRole === null ? (
                  <Button label={t('admin.makeModerator')} variant="neutral" disabled={busyId === person._id} onPress={() => act(person._id, () => setModerator({ userId: person._id, moderator: true }))} />
                ) : null}
                {admin && person.staffRole === 'moderator' ? (
                  <Button label={t('admin.removeModerator')} variant="danger" disabled={busyId === person._id} onPress={() => act(person._id, () => setModerator({ userId: person._id, moderator: false }))} />
                ) : null}
              </Actions>
            )}
          </Card>
        ))
      )}
    </>
  );
}

/** What staff did, newest first. Admins only. */
export function Activity() {
  const { t } = useTranslation();
  const language = currentLanguage();
  const now = useNow();
  const list = useQuery(api.staff.activity);
  if (!list) return <ListSkeleton rows={1} />;
  if (list.length === 0) return <Empty text={t('admin.noActivity')} />;
  return (
    <>
      {list.map((row) => (
        <Card key={row._id}>
          <AppText variant="bodyStrong">{t(ACTION_KEY[row.action] ?? 'admin.logOther')}</AppText>
          {row.label ? <AppText color="inkMuted">{row.label}</AppText> : null}
          <AppText variant="caption" color="inkMuted">
            {[row.by ?? t('chat.deletedUser'), formatRelativeTime(row.at, now, language)].join(' · ')}
          </AppText>
        </Card>
      ))}
    </>
  );
}
