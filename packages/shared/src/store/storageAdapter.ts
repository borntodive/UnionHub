/**
 * Platform-agnostic async key-value storage interface.
 * Mobile: AsyncStorage  |  Web: localStorage wrapper
 */
export interface StorageAdapter {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

/**
 * Secure storage for sensitive values (tokens, credentials).
 * Mobile: expo-secure-store  |  Web: sessionStorage or encrypted localStorage
 */
export interface SecureStorageAdapter {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
}
