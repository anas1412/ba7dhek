import { useRef, useState, type ComponentRef } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ChoiceChips } from '@/components/ChoiceChips';
import { Icon, type IconName } from '@/components/Icon';
import { currentLanguage } from '@/i18n';
import { formatClock, formatDay } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';

import { Avatar } from './Avatar';

export const REPORT_REASONS = ['harassment', 'scam', 'asks_money', 'other'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
const REASON_KEY = {
  harassment: 'chat.reasonHarassment',
  scam: 'chat.reasonScam',
  asks_money: 'chat.reasonAsksMoney',
  other: 'chat.reasonOther',
} as const;

export type ChatMessage = { _id: string; body: string; sentAt: number; mine: boolean };

export type ChatHeader = {
  /** Which side the reader is on. A candidate talks to a business, an employer to a person. */
  side: 'candidate' | 'employer';
  jobTitle: string | null;
  other: { name: string | null; imageUrl: string | null };
  blocked: boolean;
  blockedByMe: boolean;
};

type Props = {
  header: ChatHeader;
  messages: ChatMessage[];
  /** Rejects with a sentence to show when the message was not sent. */
  onSend: (body: string) => Promise<void>;
  onBack: () => void;
  onOpenJob?: () => void;
  onBlock: () => void;
  onUnblock: () => void;
  onReport: (reason: ReportReason) => void;
};

const MAX_LENGTH = 1000;

function HeaderButton({ icon, label, onPress, directional }: { icon: IconName; label: string; onPress: () => void; directional?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: theme.radius.full,
        backgroundColor: pressed ? theme.colors.brandSoft : 'transparent',
      })}>
      <Icon name={icon} directional={directional} />
    </Pressable>
  );
}

/** One conversation: who it is with, what was said, and a field to answer. */
export function Conversation({ header, messages, onSend, onBack, onOpenJob, onBlock, onUnblock, onReport }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const language = currentLanguage();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [menu, setMenu] = useState<'closed' | 'open' | 'report'>('closed');
  const [reason, setReason] = useState<ReportReason | null>(null);

  const text = draft.trim();

  async function send() {
    if (!text || sending) return;
    setSending(true);
    setProblem(null);
    try {
      await onSend(text);
      setDraft('');
      haptic.tap();
    } catch (caught) {
      // The text stays in the field, so nothing typed is lost.
      setProblem(caught instanceof Error ? caught.message : t('chat.sendFailed'));
      haptic.error();
    } finally {
      setSending(false);
    }
  }

  function closeMenu() {
    setMenu('closed');
    setReason(null);
  }

  // A date line is shown above the first message of each day.
  const days = messages.map((message) => formatDay(message.sentAt, language));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.space[2],
          paddingHorizontal: theme.space[2],
          paddingVertical: theme.space[1],
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.line,
        }}>
        <HeaderButton icon="arrow-left" directional label={t('common.back')} onPress={onBack} />
        <Avatar url={header.other.imageUrl} size={40} kind={header.side === 'candidate' ? 'business' : 'person'} />
        <View style={{ flex: 1 }}>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {header.other.name ?? t('chat.deletedUser')}
          </AppText>
          {header.jobTitle ? (
            <AppText variant="caption" color="inkMuted" numberOfLines={1}>
              {header.jobTitle}
            </AppText>
          ) : null}
        </View>
        <HeaderButton icon="more-vertical" label={t('chat.menu')} onPress={() => setMenu('open')} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scroll}
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          // The newest message is always in view: on opening, and each time one arrives.
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}
          contentContainerStyle={{ padding: theme.space[4], gap: theme.space[2] }}>
          <View
            style={{
              flexDirection: 'row',
              gap: theme.space[2],
              padding: theme.space[4],
              borderRadius: theme.radius.sm,
              backgroundColor: theme.colors.brandSoft,
            }}>
            <Icon name="shield" size={20} color="inkMuted" />
            <AppText variant="caption" style={{ flex: 1 }}>
              {t('chat.safety')}
            </AppText>
          </View>

          {messages.length === 0 ? (
            <AppText color="inkMuted" center style={{ marginTop: theme.space[6] }}>
              {t('chat.start')}
            </AppText>
          ) : null}

          {messages.map((message, index) => {
            const day = days[index];
            const newDay = index === 0 || day !== days[index - 1];
            return (
              <View key={message._id} style={{ gap: theme.space[2] }}>
                {newDay ? (
                  <AppText variant="caption" color="inkMuted" center style={{ marginTop: theme.space[2] }}>
                    {day}
                  </AppText>
                ) : null}
                <View
                  style={{
                    maxWidth: '82%',
                    // Own messages sit at the end of the line, the other side's at the start.
                    alignSelf: message.mine ? 'flex-end' : 'flex-start',
                    paddingHorizontal: theme.space[4],
                    paddingVertical: theme.space[2],
                    borderRadius: theme.radius.lg,
                    borderWidth: message.mine ? 0 : 1,
                    borderColor: theme.colors.line,
                    backgroundColor: message.mine ? theme.colors.brand : theme.colors.surfaceRaised,
                  }}>
                  {/* Shown as written, in whatever language the person used. */}
                  <AppText color={message.mine ? 'onBrand' : 'ink'}>{message.body}</AppText>
                  <AppText variant="caption" color={message.mine ? 'onBrand' : 'inkMuted'} style={{ opacity: 0.8 }}>
                    {formatClock(message.sentAt, language)}
                  </AppText>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {header.blocked ? (
          <View style={{ gap: theme.space[2], padding: theme.space[4], borderTopWidth: 1, borderTopColor: theme.colors.line }}>
            <AppText color="inkMuted" center>
              {t(header.blockedByMe ? 'chat.blockedByMe' : 'chat.closedLong')}
            </AppText>
            {header.blockedByMe ? <Button label={t('chat.unblock')} variant="neutral" onPress={onUnblock} /> : null}
          </View>
        ) : (
          <View style={{ gap: theme.space[1], padding: theme.space[2], borderTopWidth: 1, borderTopColor: theme.colors.line }}>
            {problem ? (
              <AppText variant="caption" color="danger" style={{ paddingHorizontal: theme.space[2] }}>
                {problem}
              </AppText>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: theme.space[2] }}>
              <TextInput
                accessibilityLabel={t('chat.placeholder')}
                placeholder={t('chat.placeholder')}
                placeholderTextColor={theme.colors.inkMuted}
                value={draft}
                onChangeText={setDraft}
                maxLength={MAX_LENGTH}
                multiline
                style={[
                  theme.text.body,
                  {
                    flex: 1,
                    minHeight: 48,
                    maxHeight: 132,
                    paddingHorizontal: theme.space[4],
                    paddingVertical: theme.space[2] + theme.space[1],
                    borderRadius: theme.radius.lg,
                    borderWidth: 1,
                    borderColor: theme.colors.inkMuted,
                    color: theme.colors.ink,
                    backgroundColor: theme.colors.surfaceRaised,
                  },
                ]}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('chat.send')}
                accessibilityState={{ disabled: !text || sending }}
                disabled={!text || sending}
                onPress={send}
                style={({ pressed }) => ({
                  width: 48,
                  height: 48,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 24,
                  backgroundColor: theme.colors.brand,
                  opacity: !text || sending ? 0.4 : pressed ? 0.85 : 1,
                  transform: [{ scale: pressed ? 0.94 : 1 }],
                })}>
                <Icon name="send" size={20} color="onBrand" directional />
              </Pressable>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>

      <Modal visible={menu !== 'closed'} transparent animationType="fade" onRequestClose={closeMenu}>
        <Pressable
          accessibilityLabel={t('common.close')}
          onPress={closeMenu}
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20, 32, 46, 0.45)' }}>
          {/* A press inside the panel must not fall through and close it. */}
          <Pressable
            onPress={() => {}}
            style={{
              gap: theme.space[2],
              padding: theme.space[4],
              paddingBottom: theme.space[6],
              borderTopLeftRadius: theme.radius.lg,
              borderTopRightRadius: theme.radius.lg,
              backgroundColor: theme.colors.surface,
            }}>
            {menu === 'report' ? (
              <>
                <AppText variant="heading">{t('chat.reportTitle')}</AppText>
                <AppText color="inkMuted">{t('chat.reportBody')}</AppText>
                <ChoiceChips
                  label={t('chat.reportReason')}
                  options={REPORT_REASONS.map((value) => ({ value, label: t(REASON_KEY[value]) }))}
                  value={reason}
                  onChange={setReason}
                />
                <Button
                  label={t('chat.reportSend')}
                  variant="danger"
                  disabled={reason === null}
                  onPress={() => {
                    if (reason) onReport(reason);
                    closeMenu();
                  }}
                />
                <Button label={t('common.cancel')} variant="neutral" onPress={closeMenu} />
              </>
            ) : (
              <>
                {onOpenJob ? (
                  <Button
                    label={t('chat.seeJob')}
                    variant="neutral"
                    onPress={() => {
                      closeMenu();
                      onOpenJob();
                    }}
                  />
                ) : null}
                {header.blocked ? null : (
                  <Button
                    label={t('chat.block')}
                    variant="danger"
                    onPress={() => {
                      closeMenu();
                      onBlock();
                    }}
                  />
                )}
                <Button label={t('chat.report')} variant="danger" onPress={() => setMenu('report')} />
                <Button label={t('common.cancel')} variant="neutral" onPress={closeMenu} />
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
