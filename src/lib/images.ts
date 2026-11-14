import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

// Every image is shrunk on the device before it is sent: smaller uploads on
// mobile data, and less to store. The backend refuses anything over 1 MB.
const STEPS = [
  { longestSide: 1280, quality: 0.7 },
  { longestSide: 1024, quality: 0.55 },
  { longestSide: 800, quality: 0.45 },
] as const;
const TARGET_BYTES = 400_000;

export type PickedImage = { blob: Blob; previewUri: string };

/**
 * Opens the phone's photo library for one image. Resolves to null when the
 * person backs out. Only the chosen photo is read; the app does not ask for
 * access to the whole library.
 */
export async function pickImage(options?: { square?: boolean }): Promise<PickedImage | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: false,
    allowsEditing: Boolean(options?.square),
    aspect: options?.square ? [1, 1] : undefined,
    quality: 1,
  });
  if (result.canceled || result.assets.length === 0) return null;
  const asset = result.assets[0];
  return await compress(asset.uri, asset.width, asset.height);
}

/**
 * Resizes and re-encodes as JPEG, stepping down until the file is small.
 * JPEG also strips the photo's embedded data, such as where it was taken.
 */
async function compress(uri: string, width: number, height: number): Promise<PickedImage> {
  let last: PickedImage | null = null;
  for (const step of STEPS) {
    const context = ImageManipulator.manipulate(uri);
    const longest = Math.max(width, height);
    if (longest > step.longestSide) {
      // Scale by the longer side so portrait and landscape end up the same size class.
      context.resize(width >= height ? { width: step.longestSide } : { height: step.longestSide });
    }
    const rendered = await context.renderAsync();
    const saved = await rendered.saveAsync({ compress: step.quality, format: SaveFormat.JPEG });
    const blob = await (await fetch(saved.uri)).blob();
    last = { blob, previewUri: saved.uri };
    if (blob.size <= TARGET_BYTES) break;
  }
  // STEPS is never empty, so `last` is always set.
  return last as PickedImage;
}

/** Sends a compressed image to an upload address and returns the id the backend gave it. */
export async function uploadImage(uploadUrl: string, image: PickedImage): Promise<string> {
  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'image/jpeg' },
    body: image.blob,
  });
  if (!response.ok) throw new Error(`Upload failed with status ${response.status}`);
  const { storageId } = (await response.json()) as { storageId: string };
  return storageId;
}
