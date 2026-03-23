import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
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

interface ChatState {
  conversationId: string;
  messages: ChatMessageLocal[];
  addMessage: (msg: Omit<ChatMessageLocal, "id" | "createdAt">) => void;
  updateLastAssistantMessage: (
    content: string,
    sources: Array<{ title: string; accessLevel: string }>,
  ) => void;
  clearMessages: () => void;
  resetConversation: () => void;
}

export const useChatStore = create<ChatState>()(
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
              msgs[i] = { ...msgs[i], content, sources };
              break;
            }
          }
          return { messages: msgs };
        }),

      clearMessages: () => set({ messages: [] }),

      resetConversation: () => set({ conversationId: uuidv4(), messages: [] }),
    }),
    {
      name: "chatbot-store",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
