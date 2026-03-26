import { createOfflineStore } from "@unionhub/shared/store";
import { localStorageAdapter } from "./localStorageAdapter";

export const useOfflineStore = createOfflineStore(localStorageAdapter);

export type {
  PendingIssue,
  StoredNotification,
  NotificationPrefs,
  OfflineState,
} from "@unionhub/shared/store";
