/**
 * Your data, your control: export everything as a file, or delete it.
 */
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { appConfig } from '@/config';
import { guard } from '@/native/guard';
import { getCommunity } from '@/services/community';
import { cancelAllNotifications } from '@/services/notifications';
import { useApp } from '@/store/app';
import { useCommunityLocal } from '@/store/community';
import { useEvidence } from '@/store/evidence';
import { useHabits } from '@/store/habits';
import { useProgress } from '@/store/progress';
import { hydrateAll } from '@/store/registry';
import { useSettings } from '@/store/settings';
import { clearNamespace, isDemoNamespace } from '@/store/storage';
import { useWellbeing } from '@/store/wellbeing';
import { dateKey } from '@/utils/time';

function plain<T extends object>(state: T): Partial<T> {
  return Object.fromEntries(Object.entries(state).filter(([, v]) => typeof v !== 'function')) as Partial<T>;
}

export function buildExport(): Record<string, unknown> {
  const community = useCommunityLocal.getState();
  return {
    app: 'Lumi',
    version: appConfig.version,
    exportedAt: new Date().toISOString(),
    demoData: useApp.getState().demoMode,
    note: 'Everything Lumi stores on this device. Posts and anonymous notes in the cloud can be deleted from Settings > Your data.',
    settings: plain(useSettings.getState()),
    wellbeing: plain(useWellbeing.getState()),
    habits: plain(useHabits.getState()),
    progress: plain(useProgress.getState()),
    evidence: useEvidence.getState().entries.map((e) => ({ ...e, images: e.images.map((uri) => uri.split('/').pop()) })),
    community: {
      reactions: community.reactions,
      reported: community.reported,
      interestedEvents: community.interestedEvents,
    },
  };
}

/** Saves a JSON file and opens the share sheet (or downloads it on the web). */
export async function exportData(): Promise<'shared' | 'downloaded' | 'unavailable'> {
  const json = JSON.stringify(buildExport(), null, 2);
  const name = `lumi-export-${dateKey()}.json`;
  if (Platform.OS === 'web') {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
    return 'downloaded';
  }
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  await file.write(json);
  if (!(await Sharing.isAvailableAsync())) return 'unavailable';
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: name, UTI: 'public.json' });
  return 'shared';
}

export function evidenceDirectory(): Directory {
  const dir = new Directory(Paths.document, isDemoNamespace() ? 'demo-evidence' : 'evidence');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

function deleteEvidenceFiles() {
  if (Platform.OS === 'web') return;
  try {
    const dir = new Directory(Paths.document, isDemoNamespace() ? 'demo-evidence' : 'evidence');
    if (dir.exists) dir.delete();
  } catch {
    // Nothing to delete.
  }
}

/** Deletes cloud posts/notes/reactions made by this anonymous account, then the account. */
export async function deleteCloudData(): Promise<void> {
  const service = getCommunity();
  const local = useCommunityLocal.getState();
  if (service) {
    await service.deleteMyCloudData({
      reactedPostIds: Object.keys(local.reactions),
      reportedPostIds: Object.keys(local.reported),
    });
  }
  useCommunityLocal.getState().patch({ reactions: {}, reported: {} });
  useSettings.getState().update({ communityConsent: null });
  useApp.getState().setStaff(null);
}

/** Deletes all on-device data of the current data space (real or demo). */
export async function deleteLocalData(): Promise<void> {
  deleteEvidenceFiles();
  await cancelAllNotifications();
  guard.stopGuard();
  await clearNamespace(isDemoNamespace());
  await hydrateAll();
}

/** Everything: cloud first (needs the anonymous ID that lives on the phone), then the phone. */
export async function deleteEverything(): Promise<{ cloudError?: string }> {
  let cloudError: string | undefined;
  if (useSettings.getState().communityConsent?.granted) {
    try {
      await deleteCloudData();
    } catch (error) {
      cloudError = error instanceof Error ? error.message : String(error);
    }
  }
  await deleteLocalData();
  return { cloudError };
}
