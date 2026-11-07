/**
 * Android / iOS: keep the anonymous session in AsyncStorage so the same anonymous
 * ID survives app restarts (needed to delete your own posts later).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FirebaseApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';

type RNPersistenceFactory = (storage: typeof AsyncStorage) => FirebaseAuth.Persistence;

// `getReactNativePersistence` is only exported by Firebase's React Native build, which Metro
// picks automatically. TypeScript only sees the web typings, so we look it up by name.
const getReactNativePersistence = (FirebaseAuth as unknown as { getReactNativePersistence?: RNPersistenceFactory })
  .getReactNativePersistence;

export function createAuth(app: FirebaseApp): FirebaseAuth.Auth {
  try {
    if (getReactNativePersistence) {
      return FirebaseAuth.initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
    }
    return FirebaseAuth.initializeAuth(app);
  } catch {
    // initializeAuth throws if auth was already created (e.g. after a fast refresh).
    return FirebaseAuth.getAuth(app);
  }
}
