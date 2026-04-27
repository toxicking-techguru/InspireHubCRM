'use client';

import React, { useEffect, useState } from 'react';
import { initializeFirebase } from './index';
import { FirebaseProvider } from './provider';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, getDoc } from 'firebase/firestore';
import { Auth, onAuthStateChanged } from 'firebase/auth';
import { useAuthStore } from '@/store/useAuthStore';

export const FirebaseClientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebase, setFirebase] = useState<{
    firebaseApp: FirebaseApp;
    firestore: Firestore;
    auth: Auth;
  } | null>(null);
  const { setAuth, setInitializing } = useAuthStore();

  useEffect(() => {
    const instances = initializeFirebase();
    setFirebase(instances);

    // Global Auth State Listener
    const unsubscribe = onAuthStateChanged(instances.auth, async (fbUser) => {
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

    return () => unsubscribe();
  }, [setAuth, setInitializing]);

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
