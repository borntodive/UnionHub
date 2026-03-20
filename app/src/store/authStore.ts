import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { User, AuthResponse } from "../types";

const BIOMETRIC_CREDENTIALS_KEY = "biometric_credentials";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  biometricEnabled: boolean;
  biometricCredentials: { crewcode: string; password: string } | null;
  setAuth: (data: Partial<AuthResponse>) => void;
  logout: () => void;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  enableBiometric: (crewcode: string, password: string) => Promise<void>;
  disableBiometric: () => Promise<void>;
  loadBiometricCredentials: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,
      biometricEnabled: false,
      biometricCredentials: null,

      setAuth: (data) =>
        set({
          user: data.user ?? null,
          accessToken: data.accessToken ?? null,
          refreshToken: data.refreshToken ?? null,
          isAuthenticated: !!data.accessToken,
          isLoading: false,
        }),

      logout: async () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
          // Keep biometricEnabled and biometricCredentials for biometric login
        });
        console.log("[AuthStore] Logout complete");
      },

      setUser: (user) => set({ user }),
      setLoading: (isLoading) => set({ isLoading }),

      enableBiometric: async (crewcode: string, password: string) => {
        console.log("[AuthStore] Enabling biometric for:", crewcode);
        await SecureStore.setItemAsync(
          BIOMETRIC_CREDENTIALS_KEY,
          JSON.stringify({ crewcode, password }),
        );
        set({
          biometricEnabled: true,
          biometricCredentials: { crewcode, password },
        });
      },

      disableBiometric: async () => {
        await SecureStore.deleteItemAsync(BIOMETRIC_CREDENTIALS_KEY);
        set({
          biometricEnabled: false,
          biometricCredentials: null,
        });
      },

      loadBiometricCredentials: async () => {
        try {
          const raw = await SecureStore.getItemAsync(BIOMETRIC_CREDENTIALS_KEY);
          if (raw) {
            const credentials = JSON.parse(raw) as {
              crewcode: string;
              password: string;
            };
            set({ biometricCredentials: credentials });
          } else {
            set({ biometricCredentials: null, biometricEnabled: false });
          }
        } catch {
          set({ biometricCredentials: null, biometricEnabled: false });
        }
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        biometricEnabled: state.biometricEnabled,
        // biometricCredentials intentionally excluded — stored in SecureStore
      }),
      onRehydrateStorage: () => (state) => {
        // Always unblock the UI once AsyncStorage hydration is done (success or fail).
        // If state is undefined (rehydration error), the store keeps its initial values
        // (isAuthenticated: false) which is safe — user will need to log in again.
        state?.setLoading(false);
      },
    },
  ),
);
