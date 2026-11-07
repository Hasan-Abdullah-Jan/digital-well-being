/**
 * Lazily initialises Firebase. Nothing happens until a cloud feature is used,
 * and only after the user has agreed to the community consent screen.
 */
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';

import { appConfig, firebaseConfig } from '@/config';

import { createAuth } from './auth';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

export function isFirebaseConfigured(): boolean {
  return !!firebaseConfig;
}

export function getFirebase(): { app: FirebaseApp; auth: Auth; db: Firestore } {
  if (!firebaseConfig) throw new Error('Firebase is not configured. Add your keys to config/.env.');
  if (!app) {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }
  if (!auth) {
    auth = createAuth(app);
    if (appConfig.useEmulators) {
      connectAuthEmulator(auth, `http://${appConfig.emulatorHost}:9099`, { disableWarnings: true });
    }
  }
  if (!db) {
    db = getFirestore(app);
    if (appConfig.useEmulators) connectFirestoreEmulator(db, appConfig.emulatorHost, 8080);
  }
  return { app, auth, db };
}
