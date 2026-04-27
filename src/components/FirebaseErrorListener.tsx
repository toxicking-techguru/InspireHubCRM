'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';

export function FirebaseErrorListener() {
  useEffect(() => {
    const handlePermissionError = (error: any) => {
      // Re-throw to be caught by the Next.js development overlay or error boundary
      console.error('Caught Firestore Permission Error:', error);
      // In development, this helps surface the error clearly
      if (process.env.NODE_ENV === 'development') {
        // We throw it after a tick to ensure it's "uncaught" by the listener context
        setTimeout(() => {
          throw error;
        }, 0);
      }
    };

    errorEmitter.on('permission-error', handlePermissionError);
    return () => errorEmitter.off('permission-error', handlePermissionError);
  }, []);

  return null;
}
