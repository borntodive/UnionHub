import { createAuthStore } from "@unionhub/shared/store";
import {
  localStorageAdapter,
  webSecureStorageAdapter,
} from "./localStorageAdapter";

export const useAuthStore = createAuthStore(
  localStorageAdapter,
  webSecureStorageAdapter,
);

export type { AuthState } from "@unionhub/shared/store";
