import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  setLogLevel,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import appletFirebaseConfig from '../firebase-applet-config.json';

setLogLevel('silent');

export const firebaseConfig = {
  apiKey: appletFirebaseConfig.apiKey || 'AIzaSyC52g5zyvwkpuqYuP2SlW9yqU50KXxm3DE',
  authDomain:
    appletFirebaseConfig.authDomain || 'advance-sandbox-gmzf6.firebaseapp.com',
  projectId: appletFirebaseConfig.projectId || 'advance-sandbox-gmzf6',
  storageBucket:
    appletFirebaseConfig.storageBucket ||
    'advance-sandbox-gmzf6.firebasestorage.app',
  messagingSenderId: appletFirebaseConfig.messagingSenderId || '448261670736',
  appId:
    appletFirebaseConfig.appId ||
    '1:448261670736:web:b9c2a2ffea58dfe8ce0e55',
  firestoreDatabaseId: appletFirebaseConfig.firestoreDatabaseId || '(default)',
};

export const app = initializeApp(firebaseConfig);
export const db =
  firebaseConfig.firestoreDatabaseId &&
  firebaseConfig.firestoreDatabaseId !== '(default)'
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

let firestoreCheckPromise: Promise<boolean> | null = null;

export function checkFirestoreDatabaseExists(forceRefresh = false): Promise<boolean> {
  if (typeof window === 'undefined') {
    return Promise.resolve(false);
  }
  if (!firestoreCheckPromise || forceRefresh) {
    const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
    const probeUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      firebaseConfig.projectId
    )}/databases/${encodeURIComponent(dbId)}/documents/test/connection?key=${encodeURIComponent(
      firebaseConfig.apiKey
    )}`;
    firestoreCheckPromise = fetch(probeUrl)
      .then(async (resp) => {
        if (resp.status === 404) {
          const text = await resp.text().catch(() => '');
          if (text.includes('does not exist for project')) {
            return false;
          }
        }
        return true;
      })
      .catch(() => false);
  }
  return firestoreCheckPromise;
}

async function testConnection() {
  try {
    const dbExists = await checkFirestoreDatabaseExists();
    if (!dbExists) {
      return;
    }
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch {
    // Ignore transient offline or permission errors on test/connection probe
  }
}

if (typeof window !== 'undefined') {
  testConnection();
}
