import type {
  StorageAdapter,
  SecureStorageAdapter,
} from "@unionhub/shared/store";

/**
 * StorageAdapter backed by localStorage (synchronous ops wrapped as Promises).
 */
export const localStorageAdapter: StorageAdapter = {
  getItem: (key) => Promise.resolve(localStorage.getItem(key)),
  setItem: (key, value) => {
    localStorage.setItem(key, value);
    return Promise.resolve();
  },
  removeItem: (key) => {
    localStorage.removeItem(key);
    return Promise.resolve();
  },
};

/**
 * SecureStorageAdapter for web — uses localStorage (no native secure enclave).
 * Tokens are stored in memory-first via Zustand; localStorage is persistence only.
 * For production consider sessionStorage or an encrypted approach.
 */
export const webSecureStorageAdapter: SecureStorageAdapter = {
  getItemAsync: (key) => Promise.resolve(localStorage.getItem(key)),
  setItemAsync: (key, value) => {
    localStorage.setItem(key, value);
    return Promise.resolve();
  },
  deleteItemAsync: (key) => {
    localStorage.removeItem(key);
    return Promise.resolve();
  },
};
