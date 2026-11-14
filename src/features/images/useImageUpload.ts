import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { useMutation } from 'convex/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useToast } from '@/components/Toast';
import { pickImage, uploadImage } from '@/lib/images';

type Attach = (storageId: Id<'_storage'>) => Promise<{ ok: true } | { ok: false; problem: string }>;

const PROBLEM_KEY: Record<string, string> = {
  invalid_image: 'images.invalid',
  too_large: 'images.tooLarge',
  too_many: 'images.tooMany',
};

/**
 * One flow for every image in the app: pick, shrink, send, attach. `attach`
 * is the backend call that keeps the upload (a profile photo, or one of a
 * business's images). Problems are reported in a message; nothing throws.
 */
export function useImageUpload(attach: Attach, options?: { square?: boolean; doneKey?: string }) {
  const { t } = useTranslation();
  const toast = useToast();
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const [busy, setBusy] = useState(false);

  async function pickAndUpload() {
    if (busy) return;
    setBusy(true);
    try {
      const image = await pickImage({ square: options?.square });
      // The person backed out of the photo library; nothing to say.
      if (!image) return;
      const uploadUrl = await generateUploadUrl();
      const storageId = (await uploadImage(uploadUrl, image)) as Id<'_storage'>;
      const result = await attach(storageId);
      if (result.ok) toast.show(t(options?.doneKey ?? 'images.added'));
      else toast.show(t(PROBLEM_KEY[result.problem] ?? 'images.failed'), 'error');
    } catch {
      toast.show(t('images.failed'), 'error');
    } finally {
      setBusy(false);
    }
  }

  return { busy, pickAndUpload };
}
