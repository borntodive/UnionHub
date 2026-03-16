import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, AuthResponse } from '../types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  biometricEnabled: boolean;
  biometricCredentials: { crewcode: string; password: string } | null; // Stored for biometric login
  setAuth: (data: Partial<AuthResponse>) => void;
  logout: () => void;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  enableBiometric: (crewcode: string, password: string) => void;
  disableBiometric: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,
      biometricEnabled: false,
      biometricRefreshToken: null,

      setAuth: (data) =>
        set({
          user: data.user ?? null,
          accessToken: data.accessToken ?? null,
          refreshToken: data.refreshToken ?? null,
          isAuthenticated: !!data.accessToken,
          isLoading: false,
        }),

      logout: async () => {
        // Clear main auth data but keep biometric credentials if enabled
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
          // Keep biometricEnabled and biometricCredentials for biometric login
        });
        console.log('[AuthStore] Logout complete');
      },

      setUser: (user) => set({ user }),
      setLoading: (isLoading) => set({ isLoading }),
      enableBiometric: (crewcode: string, password: string) => {
        console.log('[AuthStore] Enabling biometric for:', crewcode);
        set({ 
          biometricEnabled: true,
          biometricCredentials: { crewcode, password }
        });
      },
      disableBiometric: () => set({ 
        biometricEnabled: false,
        biometricCredentials: null 
      }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        biometricEnabled: state.biometricEnabled,
        biometricCredentials: state.biometricCredentials,
      }),
    }
  )
);
