import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  collection,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  runTransaction,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  disableNetwork,
  enableNetwork,
  type Firestore,
} from 'firebase/firestore';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type Auth,
  type User as FirebaseUser,
} from 'firebase/auth';
import firebaseAppletConfig from '../../firebase-applet-config.json';

export const FIREBASE_PROJECT_NAME = 'PANIPRO-ADRIANA';

const env = (import.meta as any).env || {};

const resolvedConfig = {
  projectId: env.VITE_FIREBASE_PROJECT_ID || firebaseAppletConfig.projectId || 'panipro-adriana',
  appId: env.VITE_FIREBASE_APP_ID || firebaseAppletConfig.appId || '',
  apiKey: env.VITE_FIREBASE_API_KEY || firebaseAppletConfig.apiKey || '',
  authDomain:
    env.VITE_FIREBASE_AUTH_DOMAIN ||
    firebaseAppletConfig.authDomain ||
    'panipro-adriana.firebaseapp.com',
  firestoreDatabaseId:
    env.VITE_FIREBASE_DATABASE_ID || firebaseAppletConfig.firestoreDatabaseId || '(default)',
  storageBucket:
    env.VITE_FIREBASE_STORAGE_BUCKET ||
    firebaseAppletConfig.storageBucket ||
    'panipro-adriana.firebasestorage.app',
  messagingSenderId:
    env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseAppletConfig.messagingSenderId || '',
  measurementId: firebaseAppletConfig.measurementId || '',
};

export const FIREBASE_PROJECT_ID = resolvedConfig.projectId;
export const FIREBASE_AUTH_DOMAIN = resolvedConfig.authDomain;
export const FIREBASE_DATABASE_ID = resolvedConfig.firestoreDatabaseId;

const QUOTA_STORAGE_KEY = 'panipro_quota_exceeded_v1';

export function isFirestoreQuotaExceeded(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(QUOTA_STORAGE_KEY);
    if (!raw) return false;
    const hours = (Date.now() - parseInt(raw, 10)) / (1000 * 60 * 60);
    if (hours < 24) return true;
    localStorage.removeItem(QUOTA_STORAGE_KEY);
    return false;
  } catch {
    return false;
  }
}

export function markFirestoreQuotaExceeded(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(QUOTA_STORAGE_KEY, String(Date.now()));
  } catch {}
  if (firestoreInstance) {
    try {
      disableNetwork(firestoreInstance).catch(() => {});
    } catch {}
  }
}

/**
 * True only when valid Firebase Web SDK credentials for panipro-adriana are present.
 * Prevents FirebaseError (auth/invalid-api-key) crashes when running in local/offline preview mode.
 */
export const isFirebaseCloudConfigured = Boolean(
  resolvedConfig.apiKey &&
    resolvedConfig.apiKey.trim().length > 10 &&
    !resolvedConfig.apiKey.includes('MY_')
);

let app: FirebaseApp | null = null;
let firestoreInstance: Firestore | null = null;
let authInstance: Auth | null = null;

if (isFirebaseCloudConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(resolvedConfig) : getApp();
    firestoreInstance =
      resolvedConfig.firestoreDatabaseId && resolvedConfig.firestoreDatabaseId !== '(default)'
        ? getFirestore(app, resolvedConfig.firestoreDatabaseId)
        : getFirestore(app);
    authInstance = getAuth(app);

    // If quota was already marked as exceeded, immediately disable network to prevent backoff retry loops
    if (isFirestoreQuotaExceeded() && firestoreInstance) {
      disableNetwork(firestoreInstance).catch(() => {});
    }
  } catch (err) {
    console.warn('Firebase initialization fallback to local storage mode:', err);
    app = null;
    firestoreInstance = null;
    authInstance = null;
  }
}

export const db: Firestore | null = firestoreInstance;
export const auth: Auth | null = authInstance;

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

let isConnected = false;
let connectionTested = false;

/**
 * Validates connection to Firestore backend for project panipro-adriana.
 */
export async function testConnection(): Promise<boolean> {
  if (!isFirebaseCloudConfigured || !db || isFirestoreQuotaExceeded()) {
    connectionTested = true;
    isConnected = false;
    return false;
  }

  if (connectionTested && isConnected) return isConnected;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    isConnected = true;
    connectionTested = true;
    return true;
  } catch (error: any) {
    if (error?.code === 'resource-exhausted' || error?.message?.includes('Quota limit exceeded')) {
      markFirestoreQuotaExceeded();
      isConnected = false;
      connectionTested = true;
      return false;
    }
    if (error?.code === 'permission-denied') {
      console.warn('Firestore permission note:', error.message);
    } else {
      console.warn('Firestore connection check:', error?.message || error);
    }
    if (error?.code !== 'unavailable' && !error?.message?.includes('offline')) {
      isConnected = true;
      connectionTested = true;
      return true;
    }
    return false;
  }
}

if (!isFirestoreQuotaExceeded()) {
  testConnection().catch((e) => console.log('Firestore init status:', e));
}

export {
  doc,
  getDoc,
  collection,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  runTransaction,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type FirebaseUser,
};
