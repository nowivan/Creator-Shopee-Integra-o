import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth();

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

export let isFirestoreQuotaExceeded = false;

if (typeof window !== 'undefined') {
  const exceededStr = localStorage.getItem('robizin_quota_exceeded');
  const exceededTimeStr = localStorage.getItem('robizin_quota_exceeded_time');
  if (exceededStr === 'true' && exceededTimeStr) {
    const exceededTime = parseInt(exceededTimeStr, 10);
    // If exceeded less than 12 hours ago, keep it true
    if (Date.now() - exceededTime < 12 * 60 * 60 * 1000) {
      isFirestoreQuotaExceeded = true;
    } else {
      localStorage.removeItem('robizin_quota_exceeded');
      localStorage.removeItem('robizin_quota_exceeded_time');
    }
  }
}

export function setFirestoreQuotaExceeded(val: boolean) {
  isFirestoreQuotaExceeded = val;
  if (typeof window !== 'undefined') {
    if (val) {
      localStorage.setItem('robizin_quota_exceeded', 'true');
      localStorage.setItem('robizin_quota_exceeded_time', Date.now().toString());
    } else {
      localStorage.removeItem('robizin_quota_exceeded');
      localStorage.removeItem('robizin_quota_exceeded_time');
    }
    window.dispatchEvent(new CustomEvent('firestore-quota-exceeded-changed', { detail: val }));
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
  const code = (error as any)?.code;
  
  if (
    code === 'resource-exhausted' || 
    errMsg.toLowerCase().includes('quota') || 
    errMsg.toLowerCase().includes('resource-exhausted') || 
    errMsg.toLowerCase().includes('exhausted') ||
    errMsg.toLowerCase().includes('quota exceeded')
  ) {
    if (!isFirestoreQuotaExceeded) {
      console.warn('[FIREBASE] Quota Limit Exceeded detected! Suspending all Firestore calls and falling back to Local Offline storage mode.');
      setFirestoreQuotaExceeded(true);
    }
  }

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.warn('Firestore Operation failed (graceful local fallback activated): ', JSON.stringify(errInfo));
}

// Validation function as per skill guidelines to test connection on boot
export async function testConnection() {
  if (isFirestoreQuotaExceeded) {
    console.log('[FIREBASE] Skipping connection check on boot, since Firestore Quota is known to be Exceeded.');
    return;
  }
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[FIREBASE] Connection validated successfully.');
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const code = (error as any)?.code;
    
    if (
      code === 'resource-exhausted' || 
      errMsg.toLowerCase().includes('quota') || 
      errMsg.toLowerCase().includes('resource-exhausted') || 
      errMsg.toLowerCase().includes('exhausted') ||
      errMsg.toLowerCase().includes('quota exceeded')
    ) {
      if (!isFirestoreQuotaExceeded) {
        console.warn('[FIREBASE] Quota Limit Exceeded detected on boot check! Suspending all Firestore calls and falling back to Local Offline storage mode.');
        setFirestoreQuotaExceeded(true);
      }
    } else if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

// Google Authentication Flow using signInWithPopup as recommended
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error('[AUTH] Google Sign-In Error:', error);
    throw error;
  }
}

export async function signOutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('[AUTH] Sign-Out Error:', error);
    throw error;
  }
}
