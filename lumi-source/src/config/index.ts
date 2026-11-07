/**
 * Runtime configuration, read from app.config.ts `extra` (which reads config/.env).
 * Nothing secret is hard-coded here: missing values simply switch features off.
 */
import Constants from 'expo-constants';

type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

type Extra = {
  firebase?: Partial<FirebaseConfig>;
  useFirebaseEmulators?: boolean;
  emulatorHost?: string;
  help?: {
    contact?: string;
    name?: string;
    textNumber?: string;
    website?: string;
    emergencyNumber?: string;
    directoryUrl?: string;
  };
  organisation?: { name?: string; privacyEmail?: string };
  features?: { peerSpace?: boolean; demoOnly?: boolean };
};

const extra: Extra = (Constants.expoConfig?.extra as Extra | undefined) ?? {};

const fb = extra.firebase ?? {};

export const firebaseConfig: FirebaseConfig | null =
  fb.apiKey && fb.projectId && fb.appId
    ? {
        apiKey: fb.apiKey,
        authDomain: fb.authDomain || `${fb.projectId}.firebaseapp.com`,
        projectId: fb.projectId,
        storageBucket: fb.storageBucket || '',
        messagingSenderId: fb.messagingSenderId || '',
        appId: fb.appId,
      }
    : null;

export const appConfig = {
  firebase: firebaseConfig,
  useEmulators: extra.useFirebaseEmulators === true,
  emulatorHost: extra.emulatorHost || '127.0.0.1',
  help: {
    contact: extra.help?.contact ?? '',
    name: extra.help?.name ?? '',
    textNumber: extra.help?.textNumber ?? '',
    website: extra.help?.website ?? '',
    emergencyNumber: extra.help?.emergencyNumber ?? '',
    directoryUrl: extra.help?.directoryUrl || 'https://findahelpline.com',
  },
  organisation: {
    name: extra.organisation?.name ?? '',
    privacyEmail: extra.organisation?.privacyEmail ?? '',
  },
  features: {
    peerSpace: extra.features?.peerSpace !== false,
    demoOnly: extra.features?.demoOnly === true,
  },
  version: Constants.expoConfig?.version ?? '1.0.0',
};

/** True when real cloud features can be used (keys present and not demo-only). */
export const cloudAvailable = !!firebaseConfig && !appConfig.features.demoOnly;
