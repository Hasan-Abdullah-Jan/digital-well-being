/** Web: Firebase keeps the anonymous session in the browser (IndexedDB). */
import type { FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

export function createAuth(app: FirebaseApp): Auth {
  return getAuth(app);
}
