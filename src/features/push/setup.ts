import Constants from 'expo-constants';
import type { Href } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import { chatHref, jobHref } from '@/lib/routes';

/** A browser has no Expo push address, so everything here is for phones only. */
export const PUSH_SUPPORTED = Platform.OS !== 'web';

// While the app is open, a push still shows as a banner and in the list.
if (PUSH_SUPPORTED) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export type ChannelNames = { jobs: string; messages: string; activity: string };

/**
 * Android groups notifications into channels the person can silence one by
 * one in the phone's settings. The ids must match convex/notify.ts.
 */
export async function ensureChannels(names: ChannelNames): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('jobs', { name: names.jobs, importance: AndroidImportance.DEFAULT });
  await Notifications.setNotificationChannelAsync('messages', { name: names.messages, importance: AndroidImportance.HIGH });
  await Notifications.setNotificationChannelAsync('activity', { name: names.activity, importance: AndroidImportance.DEFAULT });
}

export type Permission = 'granted' | 'denied' | 'undetermined';

export async function readPermission(): Promise<Permission> {
  if (!PUSH_SUPPORTED) return 'denied';
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return 'granted';
  // "Denied but may ask again" still counts as not yet decided.
  return current.canAskAgain ? 'undetermined' : 'denied';
}

/** Shows the phone's own permission question. Only called after the app's own explanation. */
export async function askPermission(): Promise<Permission> {
  if (!PUSH_SUPPORTED) return 'denied';
  const answer = await Notifications.requestPermissionsAsync();
  if (answer.granted) return 'granted';
  return answer.canAskAgain ? 'undetermined' : 'denied';
}

/**
 * The phone's push address, or null when there is none to be had: no
 * permission, an emulator without Google services, or a build without push
 * credentials. Never throws: the app works the same without push.
 */
export async function getPushToken(): Promise<string | null> {
  if (!PUSH_SUPPORTED) return null;
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return null;
    return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch {
    return null;
  }
}

/** Where a tap on a notification leads. The data comes from convex/notify.ts. */
export function routeFor(data: unknown): Href | null {
  if (!data || typeof data !== 'object') return null;
  const { type, jobId, matchId } = data as { type?: string; jobId?: string; matchId?: string };
  switch (type) {
    case 'new_job':
      return jobId ? jobHref(jobId) : null;
    case 'applicants':
      return jobId ? ({ pathname: '/job/[jobId]/applicants', params: { jobId } } as Href) : null;
    case 'match':
    case 'message':
      return matchId ? chatHref(matchId) : null;
    case 'digest':
    case 'company_approved':
    case 'account_expiry':
      return '/';
    default:
      return null;
  }
}
