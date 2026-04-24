import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { firebaseConfig } from './config';

let app: FirebaseApp;
let db: Firestore;
let firebaseAuth: Auth;

export function initializeFirebase(): {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
} {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    firebaseAuth = getAuth(app);
  } else {
    app = getApp();
    db = getFirestore(app);
    firebaseAuth = getAuth(app);
  }

  return { firebaseApp: app, firestore: db, auth: firebaseAuth };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './auth/use-user';
export * from './utils';
