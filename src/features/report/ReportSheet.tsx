import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ChoiceChips } from '@/components/ChoiceChips';
import { useTheme } from '@/theme';

type Props<R extends string> = {
  visible: boolean;
  title: string;
  body: string;
  /** The fixed list of reasons, already translated. */
  reasons: readonly { value: R; label: string }[];
  onSend: (reason: R) => void;
  onClose: () => void;
};

/** A Material 3 bottom sheet that asks why something is being reported: one reason, then send. */
export function ReportSheet<R extends string>({ visible, title, body, reasons, onSend, onClose }: Props<R>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [reason, setReason] = useState<R | null>(null);

  function close() {
    setReason(null);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable
        accessibilityLabel={t('common.close')}
        onPress={close}
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>
        {/* A press inside the sheet must not fall through and close it. */}
        <Pressable
          onPress={() => {}}
          style={{
            gap: theme.space[4],
            padding: theme.space[6],
            borderTopLeftRadius: theme.radius.xl,
            borderTopRightRadius: theme.radius.xl,
            backgroundColor: theme.colors.surfaceRaised,
          }}>
          <AppText variant="title">{title}</AppText>
          <AppText color="inkMuted">{body}</AppText>
          <ChoiceChips label={t('report.reason')} options={reasons} value={reason} onChange={setReason} />
          <Button
            label={t('report.send')}
            variant="danger"
            disabled={reason === null}
            onPress={() => {
              if (reason) onSend(reason);
              close();
            }}
          />
          <Button label={t('common.cancel')} variant="neutral" onPress={close} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
