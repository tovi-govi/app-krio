import Constants from "expo-constants";
import { FirebaseApp, getApps, initializeApp } from "firebase/app";
import { Auth, getAuth } from "firebase/auth";
import { Firestore, getFirestore } from "firebase/firestore";
import { FirebaseStorage, getStorage } from "firebase/storage";

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || extra.firebaseApiKey,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || extra.firebaseAuthDomain,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || extra.firebaseProjectId,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || extra.firebaseStorageBucket,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || extra.firebaseMessagingSenderId,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || extra.firebaseAppId,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.storageBucket &&
  firebaseConfig.messagingSenderId &&
  firebaseConfig.appId
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

if (isFirebaseConfigured) {
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
}

export { app, auth, db, storage };
