import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { StorageAdapter } from "./storageAdapter";

const uuidv4 = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });

export interface ChatMessageLocal {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Array<{ title: string; accessLevel: string }>;
  createdAt: string;
}

export interface ChatState {
  conversationId: string;
  messages: ChatMessageLocal[];
  addMessage: (msg: Omit<ChatMessageLocal, "id" | "createdAt">) => void;
  updateLastAssistantMessage: (
    content: string | ((prev: string) => string) | undefined,
    sources: Array<{ title: string; accessLevel: string }> | undefined,
  ) => void;
  clearMessages: () => void;
  resetConversation: () => void;
}

export function createChatStore(storage: StorageAdapter) {
  return create<ChatState>()(
    persist(
      (set) => ({
        conversationId: uuidv4(),
        messages: [],

        addMessage: (msg) =>
          set((state) => ({
            messages: [
              ...state.messages,
              { ...msg, id: uuidv4(), createdAt: new Date().toISOString() },
            ],
          })),

        updateLastAssistantMessage: (content, sources) =>
          set((state) => {
            const msgs = [...state.messages];
            for (let i = msgs.length - 1; i >= 0; i--) {
              if (msgs[i].role === "assistant") {
                const prev = msgs[i];
                msgs[i] = {
                  ...prev,
                  content:
                    content === undefined
                      ? prev.content
                      : typeof content === "function"
                        ? content(prev.content)
                        : content,
                  sources: sources !== undefined ? sources : prev.sources,
                };
                break;
              }
            }
            return { messages: msgs };
          }),

        clearMessages: () => set({ messages: [] }),
        resetConversation: () =>
          set({ conversationId: uuidv4(), messages: [] }),
      }),
      {
        name: "chatbot-store",
        storage: createJSONStorage(() => storage),
      },
    ),
  );
}
