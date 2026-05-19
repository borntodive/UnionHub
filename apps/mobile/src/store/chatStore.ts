import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ChatMessage, OutgoingStatus } from "../api/chat";

// Keep at most this many confirmed messages per room in persistent storage.
// The cap is applied only when persisting (see `partialize`) so that
// older-message pagination is not defeated by an in-memory slice.
const MAX_PERSISTED_PER_ROOM = 200;

export interface OutgoingMessage {
  clientMsgId: string;
  roomId: string;
  content?: string;
  attachmentIds: string[];
  createdAt: string;
  status: OutgoingStatus;
  sender: { id: string; nome: string; cognome: string };
}

export interface ChatState {
  messagesByRoom: Record<string, ChatMessage[]>;
  outboxByRoom: Record<string, OutgoingMessage[]>;

  /** Replace a room's confirmed messages (deduped, sorted, capped). */
  setRoomMessages: (roomId: string, messages: ChatMessage[]) => void;
  /** Merge messages into a room (used for live, latest-page and older-page). */
  mergeRoomMessages: (roomId: string, messages: ChatMessage[]) => void;
  removeRoomMessage: (roomId: string, messageId: string) => void;
  updateRoomMessage: (
    roomId: string,
    messageId: string,
    patch: Partial<ChatMessage>,
  ) => void;

  enqueueOutbox: (message: OutgoingMessage) => void;
  setOutboxStatus: (
    roomId: string,
    clientMsgId: string,
    status: OutgoingStatus,
  ) => void;
  resolveOutbox: (roomId: string, clientMsgId: string) => void;
}

function normalize(messages: ChatMessage[]): ChatMessage[] {
  const byId = new Map<string, ChatMessage>();
  for (const m of messages) byId.set(m.id, m);
  return Array.from(byId.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      messagesByRoom: {},
      outboxByRoom: {},

      setRoomMessages: (roomId, messages) =>
        set((state) => ({
          messagesByRoom: {
            ...state.messagesByRoom,
            [roomId]: normalize(messages),
          },
        })),

      mergeRoomMessages: (roomId, messages) =>
        set((state) => ({
          messagesByRoom: {
            ...state.messagesByRoom,
            [roomId]: normalize([
              ...(state.messagesByRoom[roomId] ?? []),
              ...messages,
            ]),
          },
        })),

      removeRoomMessage: (roomId, messageId) =>
        set((state) => ({
          messagesByRoom: {
            ...state.messagesByRoom,
            [roomId]: (state.messagesByRoom[roomId] ?? []).filter(
              (m) => m.id !== messageId,
            ),
          },
        })),

      updateRoomMessage: (roomId, messageId, patch) =>
        set((state) => ({
          messagesByRoom: {
            ...state.messagesByRoom,
            [roomId]: (state.messagesByRoom[roomId] ?? []).map((m) =>
              m.id === messageId ? { ...m, ...patch } : m,
            ),
          },
        })),

      enqueueOutbox: (message) =>
        set((state) => {
          const current = state.outboxByRoom[message.roomId] ?? [];
          if (current.some((o) => o.clientMsgId === message.clientMsgId))
            return state;
          return {
            outboxByRoom: {
              ...state.outboxByRoom,
              [message.roomId]: [...current, message],
            },
          };
        }),

      setOutboxStatus: (roomId, clientMsgId, status) =>
        set((state) => ({
          outboxByRoom: {
            ...state.outboxByRoom,
            [roomId]: (state.outboxByRoom[roomId] ?? []).map((o) =>
              o.clientMsgId === clientMsgId ? { ...o, status } : o,
            ),
          },
        })),

      resolveOutbox: (roomId, clientMsgId) =>
        set((state) => ({
          outboxByRoom: {
            ...state.outboxByRoom,
            [roomId]: (state.outboxByRoom[roomId] ?? []).filter(
              (o) => o.clientMsgId !== clientMsgId,
            ),
          },
        })),
    }),
    {
      name: "chat-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        messagesByRoom: Object.fromEntries(
          Object.entries(state.messagesByRoom).map(([roomId, msgs]) => [
            roomId,
            msgs.slice(-MAX_PERSISTED_PER_ROOM),
          ]),
        ),
        outboxByRoom: state.outboxByRoom,
      }),
    },
  ),
);
