'use client';

import { useState, useEffect } from 'react';
import { Query, onSnapshot, QuerySnapshot, DocumentData, FirestoreError } from 'firebase/firestore';

/**
 * Hook to subscribe to a Firestore collection or query.
 * Optimized to keep previous data while loading background updates to prevent layout flickering.
 */
export function useCollection<T = DocumentData>(query: Query<T> | null) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  useEffect(() => {
    if (!query) {
      setLoading(false);
      setData(null);
      return;
    }

    // Reset loading state for a new query if we don't have cached data for it
    setLoading(true);

    const unsubscribe = onSnapshot(
      query,
      (snapshot: QuerySnapshot<T>) => {
        const items = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        } as unknown as T));
        
        setData(items);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.warn('Firestore useCollection error:', err.message, err.code);
        // If we get an index error, we still want to stop loading
        setError(err);
        setLoading(false);
        // Ensure data is at least an empty array if it fails so the UI can render
        if (!data) setData([]);
      }
    );

    return () => unsubscribe();
  }, [query]);

  return { data, loading, error };
}
