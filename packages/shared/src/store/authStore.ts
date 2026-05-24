import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { User, AuthResponse } from "../types";
import { StorageAdapter, SecureStorageAdapter } from "./storageAdapter";

const SECURE_ACCESS_TOKEN_KEY = "auth_access_token";
const SECURE_REFRESH_TOKEN_KEY = "auth_refresh_token";
const SECURE_BIOMETRIC_TOKEN_KEY = "biometric_token";
const BIOMETRIC_ENABLED_KEY = "biometric_enabled";
// Legacy key — written by previous app versions; cleaned up on first launch
const LEGACY_BIOMETRIC_CREDENTIALS_KEY = "biometric_credentials";

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  biometricEnabled: boolean;
  setAuth: (data: Partial<AuthResponse>) => void;
  logout: () => void;
  logoutAll: () => Promise<void>;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  enableBiometric: (biometricToken?: string) => Promise<void>;
  disableBiometric: () => Promise<void>;
  getBiometricToken: () => Promise<string | null>;
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
          if (data.biometricToken) {
            secureStorage
              .setItemAsync(SECURE_BIOMETRIC_TOKEN_KEY, data.biometricToken)
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
          // biometric_token and biometric_enabled intentionally preserved
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
          });
        },

        logoutAll: async () => {
          await Promise.allSettled([
            secureStorage.deleteItemAsync(SECURE_ACCESS_TOKEN_KEY),
            secureStorage.deleteItemAsync(SECURE_REFRESH_TOKEN_KEY),
            secureStorage.deleteItemAsync(SECURE_BIOMETRIC_TOKEN_KEY),
            secureStorage.setItemAsync(BIOMETRIC_ENABLED_KEY, "false"),
          ]);
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
            biometricEnabled: false,
          });
        },

        setUser: (user) => set({ user }),
        setLoading: (isLoading) => set({ isLoading }),

        enableBiometric: async (biometricToken?: string) => {
          await secureStorage.setItemAsync(BIOMETRIC_ENABLED_KEY, "true");
          if (biometricToken) {
            await secureStorage
              .setItemAsync(SECURE_BIOMETRIC_TOKEN_KEY, biometricToken)
              .catch((err) => {
                console.warn(
                  "[authStore] Failed to save biometric token:",
                  err,
                );
              });
          }
          set({ biometricEnabled: true });
        },

        disableBiometric: async () => {
          await Promise.allSettled([
            secureStorage.deleteItemAsync(SECURE_BIOMETRIC_TOKEN_KEY),
            secureStorage.setItemAsync(BIOMETRIC_ENABLED_KEY, "false"),
          ]);
          set({ biometricEnabled: false });
        },

        getBiometricToken: async () => {
          try {
            return await secureStorage.getItemAsync(SECURE_BIOMETRIC_TOKEN_KEY);
          } catch {
            return null;
          }
        },
      }),
      {
        name: "auth-storage",
        storage: createJSONStorage(() => storage),
        partialize: (state) => ({
          isAuthenticated: state.isAuthenticated,
          biometricEnabled: state.biometricEnabled,
          user: state.user,
        }),
        onRehydrateStorage: () => async (state) => {
          try {
            // One-time migration: detect legacy biometric_credentials key
            const legacyCredentials = await secureStorage
              .getItemAsync(LEGACY_BIOMETRIC_CREDENTIALS_KEY)
              .catch(() => null);

            if (legacyCredentials !== null && legacyCredentials !== undefined) {
              // Force logout and disable biometric — user must re-enable after login
              await Promise.allSettled([
                secureStorage.deleteItemAsync(LEGACY_BIOMETRIC_CREDENTIALS_KEY),
                secureStorage.deleteItemAsync(SECURE_ACCESS_TOKEN_KEY),
                secureStorage.deleteItemAsync(SECURE_REFRESH_TOKEN_KEY),
                secureStorage.setItemAsync(BIOMETRIC_ENABLED_KEY, "false"),
              ]);
              store.setState({
                isAuthenticated: false,
                biometricEnabled: false,
                user: null,
                accessToken: null,
                refreshToken: null,
              });
              if (state) state.setLoading(false);
              else store.getState().setLoading(false);
              return;
            }

            const [accessToken, refreshToken, biometricEnabledRaw] =
              await Promise.all([
                secureStorage.getItemAsync(SECURE_ACCESS_TOKEN_KEY),
                secureStorage.getItemAsync(SECURE_REFRESH_TOKEN_KEY),
                secureStorage.getItemAsync(BIOMETRIC_ENABLED_KEY),
              ]);

            const biometricEnabled = biometricEnabledRaw === "true";

            if (accessToken && refreshToken) {
              store.setState({
                accessToken,
                refreshToken,
                isAuthenticated: true,
                biometricEnabled,
              });
            } else {
              store.setState({
                isAuthenticated: false,
                user: null,
                accessToken: null,
                refreshToken: null,
                biometricEnabled,
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
