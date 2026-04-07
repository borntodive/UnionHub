import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { User, AuthResponse } from "../types";
import { StorageAdapter, SecureStorageAdapter } from "./storageAdapter";

const BIOMETRIC_CREDENTIALS_KEY = "biometric_credentials";
const SECURE_ACCESS_TOKEN_KEY = "auth_access_token";
const SECURE_REFRESH_TOKEN_KEY = "auth_refresh_token";

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  biometricEnabled: boolean;
  biometricCredentials: { crewcode: string; refreshToken: string } | null;
  setAuth: (data: Partial<AuthResponse>) => void;
  logout: () => void;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  enableBiometric: (crewcode: string, refreshToken: string) => Promise<void>;
  disableBiometric: () => Promise<void>;
  loadBiometricCredentials: () => Promise<void>;
}

export function createAuthStore(
  storage: StorageAdapter,
  secureStorage: SecureStorageAdapter,
) {
  const store = create<AuthState>()(
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
            secureStorage
              .setItemAsync(SECURE_ACCESS_TOKEN_KEY, data.accessToken)
              .catch(() => {});
          }
          if (data.refreshToken) {
            secureStorage
              .setItemAsync(SECURE_REFRESH_TOKEN_KEY, data.refreshToken)
              .catch(() => {});
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
          secureStorage
            .deleteItemAsync(SECURE_ACCESS_TOKEN_KEY)
            .catch(() => {});
          secureStorage
            .deleteItemAsync(SECURE_REFRESH_TOKEN_KEY)
            .catch(() => {});
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
          });
        },

        setUser: (user) => set({ user }),
        setLoading: (isLoading) => set({ isLoading }),

        enableBiometric: async (crewcode: string, refreshToken: string) => {
          await secureStorage.setItemAsync(
            BIOMETRIC_CREDENTIALS_KEY,
            JSON.stringify({ crewcode, refreshToken }),
          );
          set({
            biometricEnabled: true,
            biometricCredentials: { crewcode, refreshToken },
          });
        },

        disableBiometric: async () => {
          await secureStorage.deleteItemAsync(BIOMETRIC_CREDENTIALS_KEY);
          set({ biometricEnabled: false, biometricCredentials: null });
        },

        loadBiometricCredentials: async () => {
          try {
            const raw = await secureStorage.getItemAsync(
              BIOMETRIC_CREDENTIALS_KEY,
            );
            if (raw) {
              const credentials = JSON.parse(raw) as {
                crewcode: string;
                refreshToken: string;
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
        storage: createJSONStorage(() => storage),
        partialize: (state) => ({
          isAuthenticated: state.isAuthenticated,
          biometricEnabled: state.biometricEnabled,
        }),
        onRehydrateStorage: () => async (state) => {
          try {
            const [accessToken, refreshToken] = await Promise.all([
              secureStorage.getItemAsync(SECURE_ACCESS_TOKEN_KEY),
              secureStorage.getItemAsync(SECURE_REFRESH_TOKEN_KEY),
            ]);
            if (accessToken && refreshToken) {
              store.setState({
                accessToken,
                refreshToken,
                isAuthenticated: true,
              });
            } else {
              store.setState({
                isAuthenticated: false,
                user: null,
                accessToken: null,
                refreshToken: null,
              });
            }
          } catch {
            store.setState({
              isAuthenticated: false,
              user: null,
              accessToken: null,
              refreshToken: null,
            });
          } finally {
            if (state) {
              state.setLoading(false);
            } else {
              store.getState().setLoading(false);
            }
          }
        },
      },
    ),
  );
  return store;
}
