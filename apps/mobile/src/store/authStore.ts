import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { createAuthStore } from "@unionhub/shared/store";
import type {
  StorageAdapter,
  SecureStorageAdapter,
} from "@unionhub/shared/store";

// Adatta AsyncStorage all'interfaccia StorageAdapter
const asyncStorageAdapter: StorageAdapter = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};

// Adatta expo-secure-store all'interfaccia SecureStorageAdapter
const secureStoreAdapter: SecureStorageAdapter = {
  getItemAsync: (key) => SecureStore.getItemAsync(key),
  setItemAsync: (key, value) => SecureStore.setItemAsync(key, value),
  deleteItemAsync: (key) => SecureStore.deleteItemAsync(key),
};

export const useAuthStore = createAuthStore(
  asyncStorageAdapter,
  secureStoreAdapter,
);
