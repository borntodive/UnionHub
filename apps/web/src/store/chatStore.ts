import { createChatStore } from "@unionhub/shared/store";
import { localStorageAdapter } from "./localStorageAdapter";

export const useChatStore = createChatStore(localStorageAdapter);

export type { ChatMessageLocal, ChatState } from "@unionhub/shared/store";
