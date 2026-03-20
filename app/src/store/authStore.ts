import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { User, AuthResponse } from "../types";

const BIOMETRIC_CREDENTIALS_KEY = "biometric_credentials";
const SECURE_ACCESS_TOKEN_KEY = "auth_access_token";
const SECURE_REFRESH_TOKEN_KEY = "auth_refresh_token";

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

      setAuth: (data) => {
        if (data.accessToken) {
          SecureStore.setItemAsync(
            SECURE_ACCESS_TOKEN_KEY,
            data.accessToken,
          ).catch(() => {});
        }
        if (data.refreshToken) {
          SecureStore.setItemAsync(
            SECURE_REFRESH_TOKEN_KEY,
            data.refreshToken,
          ).catch(() => {});
        }
        set({
          user: data.user ?? null,
          accessToken: data.accessToken ?? null,
          refreshToken: data.refreshToken ?? null,
          isAuthenticated: !!data.accessToken,
          isLoading: false,
        });
      },

      logout: () => {
        SecureStore.deleteItemAsync(SECURE_ACCESS_TOKEN_KEY).catch(() => {});
        SecureStore.deleteItemAsync(SECURE_REFRESH_TOKEN_KEY).catch(() => {});
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
          // Keep biometricEnabled and biometricCredentials for biometric login
        });
      },

      setUser: (user) => set({ user }),
      setLoading: (isLoading) => set({ isLoading }),

      enableBiometric: async (crewcode: string, password: string) => {
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
        // Tokens are NOT persisted in AsyncStorage — stored in SecureStore instead
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        biometricEnabled: state.biometricEnabled,
        // biometricCredentials intentionally excluded — stored in SecureStore
      }),
      onRehydrateStorage: () => async (state) => {
        // Restore tokens from SecureStore (encrypted storage)
        try {
          const [accessToken, refreshToken] = await Promise.all([
            SecureStore.getItemAsync(SECURE_ACCESS_TOKEN_KEY),
            SecureStore.getItemAsync(SECURE_REFRESH_TOKEN_KEY),
          ]);
          if (accessToken && refreshToken) {
            useAuthStore.setState({ accessToken, refreshToken });
          } else {
            // No tokens in SecureStore → force logged-out state
            useAuthStore.setState({
              isAuthenticated: false,
              user: null,
              accessToken: null,
              refreshToken: null,
            });
          }
        } catch {
          useAuthStore.setState({
            isAuthenticated: false,
            user: null,
            accessToken: null,
            refreshToken: null,
          });
        } finally {
          state?.setLoading(false);
        }
      },
    },
  ),
);
