import AsyncStorage from "@react-native-async-storage/async-storage";
import { createChatStore } from "@unionhub/shared/store";
import type { StorageAdapter } from "@unionhub/shared/store";

const asyncStorageAdapter: StorageAdapter = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};

export const useChatStore = createChatStore(asyncStorageAdapter);

// Re-export types
export type { ChatMessageLocal, ChatState } from "@unionhub/shared/store";
