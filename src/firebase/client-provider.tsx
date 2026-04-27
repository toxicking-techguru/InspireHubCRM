'use client';

import React, { useEffect, useState } from 'react';
import { initializeFirebase } from './index';
import { FirebaseProvider } from './provider';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { Auth, onAuthStateChanged } from 'firebase/auth';
import { useAuthStore } from '@/store/useAuthStore';

export const FirebaseClientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebase, setFirebase] = useState<{
    firebaseApp: FirebaseApp;
    firestore: Firestore;
    auth: Auth;
  } | null>(null);
  const { setAuth, setConfig, setInitializing } = useAuthStore();

  useEffect(() => {
    const instances = initializeFirebase();
    setFirebase(instances);

    // Global Config Listener
    const configUnsub = onSnapshot(doc(instances.firestore, 'system', 'config'), (snap) => {
      if (snap.exists()) {
        setConfig(snap.data() as any);
      }
    });

    // Global Auth State Listener
    const authUnsubscribe = onAuthStateChanged(instances.auth, async (fbUser) => {
      if (fbUser) {
        try {
          const userDoc = await getDoc(doc(instances.firestore, 'agents', fbUser.uid));
          if (userDoc.exists()) {
            setAuth({ id: userDoc.id, ...userDoc.data() } as any);
          } else {
            setInitializing(false);
          }
        } catch (err) {
          console.error("Session sync failed:", err);
          setInitializing(false);
        }
      } else {
        setAuth(null);
      }
    });

    return () => {
      authUnsubscribe();
      configUnsub();
    };
  }, [setAuth, setConfig, setInitializing]);

  if (!firebase) {
    return null; 
  }

  return (
    <FirebaseProvider
      firebaseApp={firebase.firebaseApp}
      firestore={firebase.firestore}
      auth={firebase.auth}
    >
      {children}
    </FirebaseProvider>
  );
};
