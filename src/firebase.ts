import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import {
  doc,
  getDocFromServer,
  getFirestore,
  initializeFirestore,
  type Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

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
  code?: string;
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

const isPlaceholderConfig =
  !firebaseConfig?.apiKey ||
  !firebaseConfig?.projectId ||
  firebaseConfig.projectId === 'remixed-project-id';

export const isFirebaseConfigured = !isPlaceholderConfig;

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

function createFirestoreInstance(firebaseApp: FirebaseApp): Firestore {
  const databaseId = firebaseConfig.firestoreDatabaseId || undefined;
  try {
    // Auto-detect long polling prevents WebChannel RPC 'Listen' stream transport failures
    // behind proxies, mobile carrier networks, VPNs, and privacy shields.
    return initializeFirestore(
      firebaseApp,
      {
        experimentalAutoDetectLongPolling: true,
      },
      databaseId
    );
  } catch {
    return databaseId ? getFirestore(firebaseApp, databaseId) : getFirestore(firebaseApp);
  }
}

export function isTransientFirestoreError(error: unknown): boolean {
  const code = (error as { code?: string })?.code ?? '';
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    code === 'unavailable' ||
    code === 'aborted' ||
    code === 'deadline-exceeded' ||
    code === 'cancelled' ||
    code === 'internal' ||
    message.includes('the client is offline') ||
    message.includes('webchannel') ||
    message.includes('transport errored') ||
    message.includes('network')
  );
}

export async function verifyFirestoreConnection(): Promise<'connected' | 'offline' | 'unconfigured'> {
  if (!db) return 'unconfigured';
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return 'connected';
  } catch (error) {
    const code = (error as { code?: string })?.code ?? '';
    // /test/connection is default-denied by firestore.rules; permission-denied proves server reachability
    if (code === 'permission-denied') {
      return 'connected';
    }
    if (isTransientFirestoreError(error)) {
      console.warn('Firestore connection check could not reach server cleanly:', code || error);
      return 'offline';
    }
    return 'connected';
  }
}

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig);
  db = createFirestoreInstance(app);
  auth = getAuth(app);

  // Startup connection validation
  void verifyFirestoreConnection();
}

export { app, db, auth, firebaseConfig };

export function buildFirestoreErrorInfo(
  error: unknown,
  operationType: OperationType,
  path: string | null
): FirestoreErrorInfo {
  const code = (error as { code?: string })?.code;
  return {
    error: error instanceof Error ? error.message : String(error),
    ...(code ? { code } : {}),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo:
        auth?.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
}

export function logFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): FirestoreErrorInfo {
  const errInfo = buildFirestoreErrorInfo(error, operationType, path);
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo = logFirestoreError(error, operationType, path);
  throw new Error(JSON.stringify(errInfo));
}
