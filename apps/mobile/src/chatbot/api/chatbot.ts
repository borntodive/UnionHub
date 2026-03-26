import apiClient from "../../api/client";
import { ChatMessageLocal } from "../store/useChatStore";

export interface ChatResponse {
  response: string;
  sources: Array<{ title: string; accessLevel: string }>;
  conversationId: string;
}

export const chatbotApi = {
  chat: (message: string, conversationId: string) =>
    apiClient.post<ChatResponse>("/chatbot/chat", { message, conversationId }),

  getHistory: (conversationId: string) =>
    apiClient.get<ChatMessageLocal[]>(`/chatbot/history/${conversationId}`),

  clearHistory: (conversationId: string) =>
    apiClient.delete(`/chatbot/history/${conversationId}`),
};

/**
 * Streaming chat via Server-Sent Events.
 *
 * Uses XMLHttpRequest with onprogress instead of fetch + ReadableStream.
 * React Native's fetch does not expose response.body as a live ReadableStream
 * on iOS — it buffers the entire response before resolving. XHR.onprogress
 * fires incrementally as bytes arrive, which is the reliable streaming
 * primitive in React Native.
 *
 * SSE frame format: `data: <JSON>\n\n`
 *   { t: string }                               — token fragment
 *   { done: true, sources, conversationId }      — generation complete
 *   { error: string }                            — generation error
 */
export function chatStream(
  message: string,
  conversationId: string,
  accessToken: string,
  baseUrl: string,
  onToken: (t: string) => void,
  onDone: (
    sources: Array<{ title: string; accessLevel: string }>,
    conversationId: string,
  ) => void,
  onError: (msg: string) => void,
): Promise<void> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${baseUrl}/chatbot/chat/stream`, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    // No timeout — let Cloudflare/server decide; generation can take minutes
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
          // skip malformed line
        }
      }
    };

    xhr.onprogress = () => {
      // responseText grows cumulatively; slice out only the new chunk
      const newText = xhr.responseText.slice(lastIndex);
      lastIndex = xhr.responseText.length;
      if (newText) parseBuffer(newText);
    };

    xhr.onload = () => {
      // Process any data that arrived after the last onprogress event
      const remaining = xhr.responseText.slice(lastIndex);
      if (remaining) parseBuffer(remaining);
      resolve();
    };

    xhr.onerror = () => {
      onError("Network error");
      resolve();
    };

    xhr.ontimeout = () => {
      onError("Request timed out");
      resolve();
    };

    xhr.send(JSON.stringify({ message, conversationId }));
  });
}
