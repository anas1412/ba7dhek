import { api } from '@convex/_generated/api';
import { useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { ListSkeleton } from '@/components/Skeleton';
import { ChatsList } from '@/features/chat/ChatsList';
import { chatHref } from '@/lib/routes';

/** Every conversation the person has. A conversation opens when an employer accepts an applicant. */
export default function Chats() {
  const { t } = useTranslation();
  const router = useRouter();
  const me = useQuery(api.users.me);
  const chats = useQuery(api.matches.mine, me?.role ? {} : 'skip');
  const [now] = useState(() => Date.now());

  return (
    <Screen scroll>
      <AppText variant="display">{t('chat.title')}</AppText>
      {chats && me ? (
        <ChatsList
          chats={chats}
          now={now}
          otherKind={me.role === 'candidate' ? 'business' : 'person'}
          onOpen={(matchId) => router.push(chatHref(matchId))}
        />
      ) : (
        <ListSkeleton />
      )}
    </Screen>
  );
}
