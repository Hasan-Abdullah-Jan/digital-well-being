/**
 * Lumi — Expo app configuration.
 *
 * All keys live in ONE file: config/.env (copy config/.env.example to create it).
 * Values are read here at build time and passed to the app through `extra`.
 * Real environment variables (for example from GitHub Actions or EAS) win over the file,
 * so you never need to commit secrets.
 *
 * If a value is missing or still a placeholder like "[PASTE HERE]", the related feature
 * switches off gracefully and the app runs in demo/offline mode.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { ConfigContext, ExpoConfig } from 'expo/config';

const PROJECT_ROOT = __dirname || process.cwd();

function readEnvFile(): Record<string, string> {
  const file = path.join(PROJECT_ROOT, 'config', '.env');
  const values: Record<string, string> = {};
  if (!fs.existsSync(file)) return values;
  for (const rawLine of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    // Allow inline comments after a space: KEY=value  # comment
    const hash = value.search(/\s#/);
    if (hash !== -1) value = value.slice(0, hash).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

const fileEnv = readEnvFile();

/** Returns a trimmed value, or '' when missing or still a placeholder. */
function env(key: string): string {
  const value = (process.env[key] ?? fileEnv[key] ?? '').trim();
  if (!value) return '';
  if (/PASTE|YOUR[_ ]|^\[.*\]$|^<.*>$|^x{4,}$/i.test(value)) return '';
  return value;
}

function bool(key: string, fallback: boolean): boolean {
  const value = env(key).toLowerCase();
  if (value === 'true' || value === '1' || value === 'yes') return true;
  if (value === 'false' || value === '0' || value === 'no') return false;
  return fallback;
}

const firebase = {
  apiKey: env('FIREBASE_API_KEY'),
  authDomain: env('FIREBASE_AUTH_DOMAIN'),
  projectId: env('FIREBASE_PROJECT_ID'),
  storageBucket: env('FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: env('FIREBASE_MESSAGING_SENDER_ID'),
  appId: env('FIREBASE_APP_ID'),
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Lumi',
  slug: 'lumi-wellbeing',
  scheme: 'lumi',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  backgroundColor: '#FAF6F0',
  ios: {
    supportsTablet: true,
    bundleIdentifier: env('IOS_BUNDLE_ID') || 'app.digitalwellbeing.lumi',
    infoPlist: {
      NSFaceIDUsageDescription: 'Lumi can use Face ID to keep your journal and mood notes private.',
    },
  },
  android: {
    // Must match the package name registered in Firebase (google-services.json).
    package: env('ANDROID_PACKAGE') || 'digital_wellbeing.app',
    versionCode: 1,
    adaptiveIcon: {
      backgroundColor: '#2A6B66',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    // Only what Lumi needs. Usage access, overlay and boot permissions are declared by the
    // local Android module in modules/lumi-guard and are requested with plain-language
    // explanations only when you switch on a feature that needs them.
    blockedPermissions: [
      'android.permission.CAMERA',
      'android.permission.RECORD_AUDIO',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.READ_MEDIA_VIDEO',
      'android.permission.READ_MEDIA_AUDIO',
      'android.permission.READ_MEDIA_VISUAL_USER_SELECTED',
      'android.permission.ACCESS_MEDIA_LOCATION',
    ],
  },
  web: {
    favicon: './assets/favicon.png',
    output: 'single',
    bundler: 'metro',
    name: 'Lumi — feel good on and off screen',
    shortName: 'Lumi',
    themeColor: '#2A6B66',
    backgroundColor: '#FAF6F0',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#FAF6F0',
        image: './assets/splash-icon.png',
        imageWidth: 120,
        dark: { backgroundColor: '#0F141A', image: './assets/splash-icon.png' },
      },
    ],
    'expo-localization',
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#2A6B66',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission:
          'Lumi lets you attach screenshots to your private evidence log. They stay on your phone.',
        cameraPermission: false,
        microphonePermission: false,
      },
    ],
    [
      'expo-local-authentication',
      {
        faceIDPermission: 'Lumi can use Face ID to keep your journal and mood notes private.',
      },
    ],
    [
      'expo-build-properties',
      {
        android: {
          minSdkVersion: 24,
        },
      },
    ],
    'expo-sharing',
    'expo-web-browser',
  ],
  extra: {
    firebase,
    useFirebaseEmulators: bool('USE_FIREBASE_EMULATORS', false),
    emulatorHost: env('FIREBASE_EMULATOR_HOST') || '127.0.0.1',
    help: {
      contact: env('HELPLINE_OR_TRUSTED_CONTACT'),
      name: env('HELPLINE_NAME'),
      textNumber: env('HELPLINE_TEXT_NUMBER'),
      website: env('HELPLINE_WEBSITE'),
      emergencyNumber: env('EMERGENCY_NUMBER'),
      directoryUrl: env('HELPLINE_DIRECTORY_URL') || 'https://findahelpline.com',
    },
    organisation: {
      name: env('ORGANISATION_NAME'),
      privacyEmail: env('PRIVACY_CONTACT_EMAIL'),
    },
    features: {
      peerSpace: bool('PEER_SPACE_ENABLED', true),
      demoOnly: bool('DEMO_MODE_ONLY', false),
    },
  },
  experiments: {
    typedRoutes: false,
  },
});
