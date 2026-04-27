import { create } from 'zustand';
import { Agent } from '@/types/crm';

interface AuthState {
  user: Agent | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  setAuth: (user: Agent | null) => void;
  setInitializing: (val: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isInitializing: true,
  setAuth: (user) => set({ user, isAuthenticated: !!user, isInitializing: false }),
  setInitializing: (val) => set({ isInitializing: val }),
  logout: () => set({ user: null, isAuthenticated: false, isInitializing: false }),
}));
