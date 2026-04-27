'use client';

import React, { useEffect, useState } from 'react';
import { initializeFirebase } from './index';
import { FirebaseProvider } from './provider';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, getDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { Auth, onAuthStateChanged } from 'firebase/auth';
import { useAuthStore } from '@/store/useAuthStore';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { errorEmitter } from './error-emitter';
import { FirestorePermissionError } from './errors';

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

    let configUnsub: Unsubscribe | null = null;

    // Global Auth State Listener
    const authUnsubscribe = onAuthStateChanged(instances.auth, async (fbUser) => {
      if (fbUser) {
        try {
          const userDoc = await getDoc(doc(instances.firestore, 'agents', fbUser.uid));
          if (userDoc.exists()) {
            setAuth({ id: userDoc.id, ...userDoc.data() } as any);
            
            // Start config listener ONLY after we are authenticated
            if (!configUnsub) {
              const configRef = doc(instances.firestore, 'system', 'config');
              configUnsub = onSnapshot(configRef, (snap) => {
                if (snap.exists()) {
                  setConfig(snap.data() as any);
                }
              }, async (err) => {
                const permissionError = new FirestorePermissionError({
                  path: configRef.path,
                  operation: 'get',
                });
                errorEmitter.emit('permission-error', permissionError);
              });
            }
          } else {
            setInitializing(false);
          }
        } catch (err) {
          console.error("Session sync failed:", err);
          setInitializing(false);
        }
      } else {
        setAuth(null);
        if (configUnsub) {
          configUnsub();
          configUnsub = null;
        }
      }
    });

    return () => {
      authUnsubscribe();
      if (configUnsub) configUnsub();
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
      <FirebaseErrorListener />
      {children}
    </FirebaseProvider>
  );
};
