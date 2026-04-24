import { create } from 'zustand';
import { Agent, Role } from '@/types/crm';
import { AGENTS } from '@/lib/mock-data';

interface AuthState {
  user: Agent | null;
  isAuthenticated: boolean;
  login: (email: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  login: (email: string) => {
    const foundUser = AGENTS.find(a => a.email === email);
    if (foundUser) {
      set({ user: foundUser, isAuthenticated: true });
    }
  },
  logout: () => set({ user: null, isAuthenticated: false }),
}));
