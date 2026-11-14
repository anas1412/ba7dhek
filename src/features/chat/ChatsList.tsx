import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Appear } from '@/components/Appear';
import { AppText } from '@/components/AppText';
import { EmptyState } from '@/components/EmptyState';
import { currentLanguage } from '@/i18n';
import { formatRelativeTime } from '@/lib/format';
import { useTheme } from '@/theme';

import { Avatar } from './Avatar';

export type ChatSummary = {
  _id: string;
  jobTitle: string | null;
  other: { name: string | null; imageUrl: string | null };
  lastMessagePreview: string | null;
  lastActivityAt: number;
  lastFromMe: boolean;
  unread: boolean;
  blocked: boolean;
};

type Props = {
  chats: ChatSummary[];
  now: number;
  /** A candidate talks to businesses; an employer talks to people. */
  otherKind: 'person' | 'business';
  onOpen: (matchId: string) => void;
};

/** Every conversation, the most recently active first. Unread ones carry a dot and bolder text. */
export function ChatsList({ chats, now, otherKind, onOpen }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const language = currentLanguage();

  if (chats.length === 0) {
    return (
      <View style={{ minHeight: 320 }}>
        <EmptyState
          icon="message-circle"
          title={t('chat.empty')}
          body={t(otherKind === 'business' ? 'chat.emptyCandidate' : 'chat.emptyEmployer')}
        />
      </View>
    );
  }

  return (
    <View style={{ gap: theme.space[2] }}>
      {chats.map((chat, index) => {
        const preview = chat.blocked
          ? t('chat.closed')
          : chat.lastMessagePreview === null
            ? t('chat.noMessages')
            : chat.lastFromMe
              ? t('chat.you', { text: chat.lastMessagePreview })
              : chat.lastMessagePreview;
        return (
          <Appear key={chat._id} index={index}>
            <Pressable
              accessibilityRole="button"
              onPress={() => onOpen(chat._id)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.space[4],
                padding: theme.space[4],
                borderRadius: theme.radius.md,
                borderWidth: 1,
                borderColor: theme.colors.line,
                backgroundColor: pressed ? theme.colors.brandSoft : theme.colors.surfaceRaised,
              })}>
              <Avatar url={chat.other.imageUrl} kind={otherKind} />
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[2] }}>
                  <AppText variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
                    {chat.other.name ?? t('chat.deletedUser')}
                  </AppText>
                  <AppText variant="caption" color="inkMuted">
                    {formatRelativeTime(chat.lastActivityAt, now, language)}
                  </AppText>
                </View>
                {chat.jobTitle ? (
                  <AppText variant="caption" color="inkMuted" numberOfLines={1}>
                    {chat.jobTitle}
                  </AppText>
                ) : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[2] }}>
                  <AppText
                    variant={chat.unread ? 'bodyStrong' : 'body'}
                    color={chat.unread ? 'ink' : 'inkMuted'}
                    numberOfLines={1}
                    style={{ flex: 1 }}>
                    {preview}
                  </AppText>
                  {chat.unread ? (
                    <View
                      accessibilityLabel={t('chat.unread')}
                      style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: theme.colors.brand }}
                    />
                  ) : null}
                </View>
              </View>
            </Pressable>
          </Appear>
        );
      })}
    </View>
  );
}
