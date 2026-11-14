import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { useMutation, usePaginatedQuery, useQuery } from 'convex/react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Platform, Pressable, Share, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { ChoiceChips } from '@/components/ChoiceChips';
import { Icon } from '@/components/Icon';
import { ListSkeleton } from '@/components/Skeleton';
import { TextField } from '@/components/TextField';
import { useToast } from '@/components/Toast';
import { currentLanguage } from '@/i18n';
import { formatClock, formatDay, formatNumber, formatPay, formatRelativeTime } from '@/lib/format';
import { useTheme } from '@/theme';

import { DailyBars } from './DailyBars';

export type StaffRole = 'admin' | 'moderator';

/** How many rows each "load more" brings. */
const PAGE_SIZE = 20;

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
  read_chat: 'admin.logReadChat',
  export: 'admin.logExport',
};

type Paged = 'LoadingFirstPage' | 'CanLoadMore' | 'LoadingMore' | 'Exhausted';

/* ---------- shared pieces ---------- */

type CardProps = {
  children: ReactNode;
  /** When given, the card shows a tick box for choosing it in a bulk action. */
  selected?: boolean;
  onToggle?: () => void;
  selectLabel?: string;
};

function Card({ children, selected, onToggle, selectLabel }: CardProps) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: theme.space[2],
        padding: theme.space[4],
        borderRadius: theme.radius.md,
        borderWidth: selected ? 2 : 1,
        margin: selected ? 0 : 1,
        borderColor: selected ? theme.colors.brand : theme.colors.line,
      }}>
      {onToggle ? (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel={selectLabel}
          accessibilityState={{ checked: Boolean(selected) }}
          hitSlop={12}
          onPress={onToggle}
          style={{ paddingTop: 2 }}>
          <Icon name={selected ? 'check-square' : 'square'} color={selected ? 'brand' : 'inkMuted'} />
        </Pressable>
      ) : null}
      <View style={{ flex: 1, gap: theme.space[2] }}>{children}</View>
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
  const shown = children.filter(Boolean);
  if (shown.length === 0) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2], marginTop: theme.space[1] }}>
      {shown.map((child, index) => (
        <View key={index} style={{ flexGrow: 1, flexBasis: 120 }}>
          {child}
        </View>
      ))}
    </View>
  );
}

function Empty({ text }: { text: string }) {
  return <AppText color="inkMuted">{text}</AppText>;
}

/** The foot of a paged list: the way to the next page, or word that the list is complete. */
function ListFoot({ status, count, loadMore }: { status: Paged; count: number; loadMore: (n: number) => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  if (status === 'LoadingMore') return <ActivityIndicator color={theme.colors.brand} />;
  if (status === 'CanLoadMore') return <Button label={t('admin.loadMore')} variant="neutral" onPress={() => loadMore(PAGE_SIZE)} />;
  if (status === 'Exhausted' && count > 0) {
    return (
      <AppText variant="caption" color="inkMuted" center>
        {t('admin.endOfList', { count })}
      </AppText>
    );
  }
  return null;
}

/** Runs back-office actions, one or many, and always says how it ended. */
function useAct() {
  const { t } = useTranslation();
  const toast = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

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

  /** The same action on each chosen row, one after the other, so each is checked and logged on its own. */
  async function actOnMany(ids: string[], action: (id: string) => Promise<unknown>) {
    setBulkBusy(true);
    let failed = 0;
    for (const id of ids) {
      try {
        await action(id);
      } catch {
        failed += 1;
      }
    }
    setBulkBusy(false);
    if (failed === 0) toast.show(t('admin.bulkDone', { count: ids.length }), 'info');
    else toast.show(t('admin.bulkPartly', { done: ids.length - failed, failed }), 'error');
  }

  return { busyId, bulkBusy, act, actOnMany };
}

function useSelection() {
  const [chosen, setChosen] = useState<ReadonlySet<string>>(new Set());
  return {
    chosen,
    count: chosen.size,
    has: (id: string) => chosen.has(id),
    toggle: (id: string) =>
      setChosen((current) => {
        const next = new Set(current);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    setAll: (ids: string[]) => setChosen(new Set(ids)),
    clear: () => setChosen(new Set()),
  };
}

type BulkAction = { label: string; variant?: 'primary' | 'neutral' | 'danger'; run: () => void };

/** Sits above a list: choose every row shown, then act on the chosen ones together. */
function BulkBar({ count, shown, busy, onSelectAll, onClear, actions }: {
  count: number;
  shown: number;
  busy: boolean;
  onSelectAll: () => void;
  onClear: () => void;
  actions: BulkAction[];
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  if (shown === 0) return null;
  return (
    <View
      style={{
        gap: theme.space[2],
        padding: theme.space[4],
        borderRadius: theme.radius.md,
        backgroundColor: count > 0 ? theme.colors.brandSoft : theme.colors.surfaceRaised,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[2] }}>
        <AppText variant="label" color={count > 0 ? 'onBrandSoft' : 'inkMuted'} style={{ flex: 1 }}>
          {count > 0 ? t('admin.selected', { count }) : t('admin.selectHint')}
        </AppText>
        {busy ? <ActivityIndicator color={theme.colors.brand} /> : null}
      </View>
      <Actions>
        {[
          count < shown ? (
            <Button key="all" label={t('admin.selectAll', { count: shown })} variant="neutral" disabled={busy} onPress={onSelectAll} />
          ) : null,
          count > 0 ? <Button key="clear" label={t('admin.clearSelection')} variant="neutral" disabled={busy} onPress={onClear} /> : null,
          ...(count > 0
            ? actions.map((action) => (
                <Button key={action.label} label={action.label} variant={action.variant ?? 'neutral'} disabled={busy} onPress={action.run} />
              ))
            : []),
        ]}
      </Actions>
    </View>
  );
}

/** Hands the admin a spreadsheet file of one list: a download in a browser, the share sheet on a phone. */
function ExportButton({ kind }: { kind: 'people' | 'businesses' | 'jobs' | 'activity' }) {
  const { t } = useTranslation();
  const toast = useToast();
  const exportCsv = useMutation(api.staff.exportCsv);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const file = await exportCsv({ kind });
      const name = `ba7dhek-${kind}-${new Date().toISOString().slice(0, 10)}.csv`;
      if (Platform.OS === 'web') {
        // The mark at the start tells spreadsheet programs the file is UTF-8, so Arabic names open correctly.
        const url = URL.createObjectURL(new Blob(['﻿', file.text], { type: 'text/csv;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = name;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        await Share.share({ title: name, message: file.text });
      }
      toast.show(t(file.capped ? 'admin.exportCapped' : 'admin.exported', { count: file.count }), 'info');
    } catch {
      toast.show(t('errors.generic'), 'error');
    } finally {
      setBusy(false);
    }
  }

  return <Button label={t('admin.export')} variant="neutral" loading={busy} onPress={run} />;
}

function useNow() {
  const [now] = useState(() => Date.now());
  return now;
}

/* ---------- sections ---------- */

/** The numbers that say how the pilot is doing and what is waiting, then the last two weeks day by day. */
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
    ['admin.statCandidates', data.candidates],
    ['admin.statEmployers', data.employers],
    ['admin.statBusinesses', data.businessesApproved],
    ['admin.statChats', data.conversations],
    ['admin.statBanned', data.banned],
  ];
  return (
    <>
      {data.capped ? <AppText variant="caption">{t('admin.capped')}</AppText> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2] }}>
        {figures.map(([key, value]) => (
          <View
            key={key}
            style={{
              flexBasis: '30%',
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
      {/* Three measures on three scales, so three small charts, never two scales on one. */}
      <DailyBars title={t('admin.chartAccounts')} data={data.daily.accounts} />
      <DailyBars title={t('admin.chartJobs')} data={data.daily.jobs} />
      <DailyBars title={t('admin.chartApplications')} data={data.daily.applications} />
    </>
  );
}

const APPROVALS = ['pending', 'approved', 'rejected'] as const;

/** Businesses by state. Approving one lets its jobs go live. */
export function Businesses({ role }: { role: StaffRole }) {
  const { t } = useTranslation();
  const [approval, setApproval] = useState<(typeof APPROVALS)[number]>('pending');
  const [reason, setReason] = useState('');
  const { results, status, loadMore } = usePaginatedQuery(api.staff.companies, { approval }, { initialNumItems: PAGE_SIZE });
  const approve = useMutation(api.companies.approve);
  const reject = useMutation(api.companies.reject);
  const { busyId, bulkBusy, act, actOnMany } = useAct();
  const selection = useSelection();
  const rejectReason = reason.trim() || t('admin.rejectDefault');
  const chosen = results.filter((company) => selection.has(company._id)).map((company) => company._id);

  function bulk(action: (id: Id<'companies'>) => Promise<unknown>) {
    void actOnMany(chosen, (id) => action(id as Id<'companies'>)).then(selection.clear);
  }

  return (
    <>
      <ChoiceChips
        label={t('admin.show')}
        options={APPROVALS.map((value) => ({ value, label: t(`admin.business_${value}`) }))}
        value={approval}
        onChange={(value) => {
          setApproval(value);
          selection.clear();
        }}
      />
      {approval !== 'rejected' ? (
        <TextField label={t('admin.rejectReason')} hint={t('admin.rejectReasonHint')} value={reason} onChangeText={setReason} maxLength={200} />
      ) : null}
      {role === 'admin' ? <ExportButton kind="businesses" /> : null}
      <BulkBar
        count={chosen.length}
        shown={results.length}
        busy={bulkBusy}
        onSelectAll={() => selection.setAll(results.map((company) => company._id))}
        onClear={selection.clear}
        actions={[
          ...(approval !== 'approved' ? [{ label: t('admin.approve'), variant: 'primary' as const, run: () => bulk((companyId) => approve({ companyId })) }] : []),
          ...(approval !== 'rejected' ? [{ label: t('admin.reject'), variant: 'danger' as const, run: () => bulk((companyId) => reject({ companyId, reason: rejectReason })) }] : []),
        ]}
      />
      {status === 'LoadingFirstPage' ? (
        <ListSkeleton rows={1} />
      ) : results.length === 0 && status === 'Exhausted' ? (
        <Empty text={t('admin.nothing')} />
      ) : (
        results.map((company) => (
          <Card key={company._id} selected={selection.has(company._id)} onToggle={() => selection.toggle(company._id)} selectLabel={company.name}>
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
                <Button label={t('admin.reject')} variant="danger" disabled={busyId === company._id} onPress={() => act(company._id, () => reject({ companyId: company._id, reason: rejectReason }))} />
              ) : null}
              {company.approval !== 'approved' ? (
                <Button label={t('admin.approve')} loading={busyId === company._id} onPress={() => act(company._id, () => approve({ companyId: company._id }))} />
              ) : null}
            </Actions>
          </Card>
        ))
      )}
      <ListFoot status={status} count={results.length} loadMore={loadMore} />
    </>
  );
}

const JOB_FILTERS = ['open', 'hidden', 'closed', 'draft'] as const;

/** Every job, with the three things staff can do to one: hide it, bring it back, remove it. */
export function Jobs({ role }: { role: StaffRole }) {
  const { t } = useTranslation();
  const language = currentLanguage();
  const [filter, setFilter] = useState<(typeof JOB_FILTERS)[number]>('open');
  const [search, setSearch] = useState('');
  const { results, status, loadMore } = usePaginatedQuery(api.staff.jobs, { filter, search }, { initialNumItems: PAGE_SIZE });
  const hide = useMutation(api.staff.hideJob);
  const unhide = useMutation(api.staff.unhideJob);
  const remove = useMutation(api.staff.removeJob);
  const { busyId, bulkBusy, act, actOnMany } = useAct();
  const selection = useSelection();
  const chosen = results.filter((job) => selection.has(job._id)).map((job) => job._id);

  function bulk(action: (jobId: Id<'jobs'>) => Promise<unknown>) {
    void actOnMany(chosen, (id) => action(id as Id<'jobs'>)).then(selection.clear);
  }

  return (
    <>
      <ChoiceChips
        label={t('admin.show')}
        options={JOB_FILTERS.map((value) => ({ value, label: t(`admin.job_${value}`) }))}
        value={filter}
        onChange={(value) => {
          setFilter(value);
          selection.clear();
        }}
      />
      <TextField label={t('admin.search')} hint={t('admin.searchJobsHint')} value={search} onChangeText={setSearch} maxLength={60} />
      {role === 'admin' ? <ExportButton kind="jobs" /> : null}
      <BulkBar
        count={chosen.length}
        shown={results.length}
        busy={bulkBusy}
        onSelectAll={() => selection.setAll(results.map((job) => job._id))}
        onClear={selection.clear}
        actions={[
          ...(filter === 'open' ? [{ label: t('admin.hide'), run: () => bulk((jobId) => hide({ jobId })) }] : []),
          ...(filter === 'hidden' ? [{ label: t('admin.unhide'), run: () => bulk((jobId) => unhide({ jobId })) }] : []),
          ...(filter !== 'closed' ? [{ label: t('admin.removeJob'), variant: 'danger' as const, run: () => bulk((jobId) => remove({ jobId })) }] : []),
        ]}
      />
      {status === 'LoadingFirstPage' ? (
        <ListSkeleton rows={1} />
      ) : results.length === 0 && status === 'Exhausted' ? (
        <Empty text={t('admin.nothing')} />
      ) : (
        results.map((job) => (
          <Card key={job._id} selected={selection.has(job._id)} onToggle={() => selection.toggle(job._id)} selectLabel={job.title}>
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
      <ListFoot status={status} count={results.length} loadMore={loadMore} />
    </>
  );
}

type ReadChat = {
  jobTitle: string | null;
  candidateName: string | null;
  companyName: string | null;
  reportedSide: 'candidate' | 'employer';
  messages: { _id: string; body: string; sentAt: number; from: 'candidate' | 'employer' }[];
};

/** A reported conversation, shown to staff as it was written. Read-only. */
function ChatEvidence({ chat }: { chat: ReadChat }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const language = currentLanguage();
  const nameOf = (side: 'candidate' | 'employer') =>
    (side === 'candidate' ? chat.candidateName : chat.companyName) ?? t('chat.deletedUser');
  return (
    <View style={{ gap: theme.space[2], padding: theme.space[4], borderRadius: theme.radius.sm, backgroundColor: theme.colors.surfaceRaised }}>
      <AppText variant="caption" color="inkMuted">
        {t('admin.chatLogged')}
      </AppText>
      {chat.messages.length === 0 ? <Empty text={t('chat.noMessages')} /> : null}
      {chat.messages.map((message) => (
        <View key={message._id} style={{ gap: 2 }}>
          <AppText variant="caption" color={message.from === chat.reportedSide ? 'danger' : 'inkMuted'}>
            {[nameOf(message.from), formatDay(message.sentAt, language), formatClock(message.sentAt, language)].join(' · ')}
            {message.from === chat.reportedSide ? ` · ${t('admin.reportedSide')}` : ''}
          </AppText>
          <AppText>{message.body}</AppText>
        </View>
      ))}
    </View>
  );
}

/** Reports waiting for a decision, oldest first. */
export function Reports() {
  const { t } = useTranslation();
  const language = currentLanguage();
  const toast = useToast();
  const now = useNow();
  const { results, status, loadMore } = usePaginatedQuery(api.reports.open, {}, { initialNumItems: PAGE_SIZE });
  const resolve = useMutation(api.reports.resolve);
  const readChat = useMutation(api.staff.readReportedChat);
  const { busyId, bulkBusy, act, actOnMany } = useAct();
  const selection = useSelection();
  const [chats, setChats] = useState<Record<string, ReadChat>>({});
  const [reading, setReading] = useState<string | null>(null);
  const chosen = results.filter((report) => selection.has(report._id)).map((report) => report._id);

  async function openChat(reportId: Id<'reports'>) {
    setReading(reportId);
    try {
      const chat = await readChat({ reportId });
      setChats((current) => ({ ...current, [reportId]: chat }));
    } catch {
      toast.show(t('errors.generic'), 'error');
    } finally {
      setReading(null);
    }
  }

  if (status === 'LoadingFirstPage') return <ListSkeleton rows={1} />;
  if (results.length === 0 && status === 'Exhausted') return <Empty text={t('admin.noReports')} />;
  return (
    <>
      <BulkBar
        count={chosen.length}
        shown={results.length}
        busy={bulkBusy}
        onSelectAll={() => selection.setAll(results.map((report) => report._id))}
        onClear={selection.clear}
        // Only the harmless decision is offered in bulk. Removing a job or banning a person is decided one at a time.
        actions={[
          {
            label: t('admin.dismiss'),
            run: () =>
              void actOnMany(chosen, (id) => resolve({ reportId: id as Id<'reports'>, action: 'dismiss' })).then(selection.clear),
          },
        ]}
      />
      {results.map((report) => {
        const chat = chats[report._id];
        return (
          <Card key={report._id} selected={selection.has(report._id)} onToggle={() => selection.toggle(report._id)} selectLabel={report.title ?? ''}>
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
            {report.kind === 'user' && report.hasChat && !chat ? (
              <Button label={t('admin.readChat')} variant="neutral" loading={reading === report._id} onPress={() => openChat(report._id as Id<'reports'>)} />
            ) : null}
            {chat ? <ChatEvidence chat={chat} /> : null}
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
        );
      })}
      <ListFoot status={status} count={results.length} loadMore={loadMore} />
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
  const { results, status, loadMore } = usePaginatedQuery(api.staff.people, { filter, search }, { initialNumItems: PAGE_SIZE });
  const ban = useMutation(api.staff.ban);
  const unban = useMutation(api.staff.unban);
  const setModerator = useMutation(api.staff.setModerator);
  const { busyId, bulkBusy, act, actOnMany } = useAct();
  const selection = useSelection();
  const admin = role === 'admin';
  // Staff and one's own account cannot be chosen: nothing in bulk applies to them.
  const selectable = results.filter((person) => !person.isMe && person.staffRole === null);
  const chosen = selectable.filter((person) => selection.has(person._id)).map((person) => person._id);

  function bulk(action: (userId: Id<'users'>) => Promise<unknown>) {
    void actOnMany(chosen, (id) => action(id as Id<'users'>)).then(selection.clear);
  }

  return (
    <>
      <ChoiceChips
        label={t('admin.show')}
        options={PEOPLE_FILTERS.map((value) => ({ value, label: t(`admin.people_${value}`) }))}
        value={filter}
        onChange={(value) => {
          setFilter(value);
          selection.clear();
        }}
      />
      <TextField
        label={t('admin.search')}
        hint={t(admin ? 'admin.searchPeopleAdminHint' : 'admin.searchPeopleHint')}
        value={search}
        onChangeText={setSearch}
        maxLength={60}
      />
      {admin ? <ExportButton kind="people" /> : null}
      <BulkBar
        count={chosen.length}
        shown={selectable.length}
        busy={bulkBusy}
        onSelectAll={() => selection.setAll(selectable.map((person) => person._id))}
        onClear={selection.clear}
        actions={[
          ...(filter !== 'banned' ? [{ label: t('admin.banPerson'), variant: 'danger' as const, run: () => bulk((userId) => ban({ userId })) }] : []),
          ...(filter === 'banned' && admin ? [{ label: t('admin.unban'), run: () => bulk((userId) => unban({ userId })) }] : []),
        ]}
      />
      {status === 'LoadingFirstPage' ? (
        <ListSkeleton rows={1} />
      ) : results.length === 0 && status === 'Exhausted' ? (
        <Empty text={t('admin.nothing')} />
      ) : (
        results.map((person) => {
          const canSelect = !person.isMe && person.staffRole === null;
          return (
            <Card
              key={person._id}
              selected={selection.has(person._id)}
              onToggle={canSelect ? () => selection.toggle(person._id) : undefined}
              selectLabel={person.name ?? ''}>
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
          );
        })
      )}
      <ListFoot status={status} count={results.length} loadMore={loadMore} />
    </>
  );
}

/** What staff did, newest first. Admins only. */
export function Activity() {
  const { t } = useTranslation();
  const language = currentLanguage();
  const now = useNow();
  const { results, status, loadMore } = usePaginatedQuery(api.staff.activity, {}, { initialNumItems: PAGE_SIZE });
  if (status === 'LoadingFirstPage') return <ListSkeleton rows={1} />;
  return (
    <>
      <ExportButton kind="activity" />
      {results.length === 0 ? <Empty text={t('admin.noActivity')} /> : null}
      {results.map((row) => (
        <Card key={row._id}>
          <AppText variant="bodyStrong">{t(ACTION_KEY[row.action] ?? 'admin.logOther')}</AppText>
          {row.label ? <AppText color="inkMuted">{row.label}</AppText> : null}
          <AppText variant="caption" color="inkMuted">
            {[row.by ?? t('chat.deletedUser'), formatRelativeTime(row.at, now, language)].join(' · ')}
          </AppText>
        </Card>
      ))}
      <ListFoot status={status} count={results.length} loadMore={loadMore} />
    </>
  );
}
