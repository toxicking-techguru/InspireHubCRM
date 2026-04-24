'use client';

import { useMemo } from 'react';

/**
 * Stable hook for memoizing Firebase queries or references.
 * Ensures the reference is only updated when dependencies change.
 */
export function useMemoFirebase<T>(factory: () => T, deps: any[]): T {
  return useMemo(factory, deps);
}
