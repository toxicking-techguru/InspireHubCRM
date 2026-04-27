import { create } from 'zustand';
import { Agent } from '@/types/crm';

interface SystemConfig {
  appName: string;
  timezone: string;
  currency: 'KES' | 'USD' | 'GBP';
  idleThreshold: number;
  withdrawalDays: string;
}

interface AuthState {
  user: Agent | null;
  config: SystemConfig | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  setAuth: (user: Agent | null) => void;
  setConfig: (config: SystemConfig | null) => void;
  setInitializing: (val: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  config: null,
  isAuthenticated: false,
  isInitializing: true,
  setAuth: (user) => set({ user, isAuthenticated: !!user, isInitializing: false }),
  setConfig: (config) => set({ config }),
  setInitializing: (val) => set({ isInitializing: val }),
  logout: () => set({ user: null, isAuthenticated: false, isInitializing: false }),
}));
