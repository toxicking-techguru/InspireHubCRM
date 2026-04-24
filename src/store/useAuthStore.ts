import { create } from 'zustand';
import { Agent } from '@/types/crm';

interface AuthState {
  user: Agent | null;
  isAuthenticated: boolean;
  setAuth: (user: Agent | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  setAuth: (user) => set({ user, isAuthenticated: !!user }),
  logout: () => set({ user: null, isAuthenticated: false }),
}));
