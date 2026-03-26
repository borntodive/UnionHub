import apiClient from "./client";
import { useAuthStore } from "../store/authStore";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface ChatResponse {
  response: string;
  sources: Array<{ title: string; accessLevel: string }>;
  conversationId: string;
}

export const chatbotApi = {
  getHistory: async (conversationId: string): Promise<ChatMessage[]> => {
    const res = await apiClient.get<ChatMessage[]>(
      `/chatbot/history/${conversationId}`,
    );
    return res.data;
  },

  clearHistory: async (conversationId: string): Promise<void> => {
    await apiClient.delete(`/chatbot/history/${conversationId}`);
  },
};

/**
 * SSE streaming chat using XHR + onprogress.
 * Web can use fetch + ReadableStream, but we reuse the same XHR pattern
 * from mobile to keep consistency.
 */
export function chatStream(
  message: string,
  conversationId: string,
  baseUrl: string,
  onToken: (t: string) => void,
  onDone: (
    sources: Array<{ title: string; accessLevel: string }>,
    conversationId: string,
  ) => void,
  onError: (msg: string) => void,
): () => void {
  const accessToken = useAuthStore.getState().accessToken;
  const xhr = new XMLHttpRequest();
  xhr.open("POST", `${baseUrl}/chatbot/chat/stream`, true);
  xhr.setRequestHeader("Content-Type", "application/json");
  if (accessToken)
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
  xhr.timeout = 0;

  let buffer = "";
  let lastIndex = 0;

  const parseBuffer = (incoming: string) => {
    buffer += incoming;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (!json) continue;
      try {
        const event = JSON.parse(json) as
          | { t: string }
          | {
              done: true;
              sources: Array<{ title: string; accessLevel: string }>;
              conversationId: string;
            }
          | { error: string };
        if ("t" in event) {
          onToken(event.t);
        } else if ("done" in event) {
          onDone(event.sources, event.conversationId);
        } else if ("error" in event) {
          onError(event.error);
        }
      } catch {
        // skip malformed
      }
    }
  };

  xhr.onprogress = () => {
    const newText = xhr.responseText.slice(lastIndex);
    lastIndex = xhr.responseText.length;
    if (newText) parseBuffer(newText);
  };

  xhr.onload = () => {
    const remaining = xhr.responseText.slice(lastIndex);
    if (remaining) parseBuffer(remaining);
  };

  xhr.onerror = () => onError("Network error");
  xhr.ontimeout = () => onError("Request timed out");

  xhr.send(JSON.stringify({ message, conversationId }));

  return () => xhr.abort();
}
