import AsyncStorage from "@react-native-async-storage/async-storage";
import { createOfflineStore } from "@unionhub/shared/store";
import type { StorageAdapter } from "@unionhub/shared/store";

const asyncStorageAdapter: StorageAdapter = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};

export const useOfflineStore = createOfflineStore(asyncStorageAdapter);

// Re-export types for convenience
export type {
  PendingIssue,
  StoredNotification,
  NotificationPrefs,
  OfflineState,
} from "@unionhub/shared/store";
