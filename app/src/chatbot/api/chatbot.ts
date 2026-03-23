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
 * Uses native fetch (not Axios) — Axios doesn't support streaming in RN.
 * Parses `data: <JSON>\n\n` SSE frames and calls the appropriate callback.
 *   onToken(t)            — each text fragment as it arrives from Ollama
 *   onDone(sources, id)   — generation complete, sources available
 *   onError(msg)          — network or generation error
 */
export async function chatStream(
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
  let res: Response;
  try {
    res = await fetch(`${baseUrl}/chatbot/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ message, conversationId }),
    });
  } catch (err: any) {
    onError(err.message ?? "Network error");
    return;
  }

  if (!res.ok || !res.body) {
    onError(`HTTP ${res.status}`);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    let chunk: ReadableStreamReadResult<Uint8Array>;
    try {
      chunk = await reader.read();
    } catch {
      break;
    }
    if (chunk.done) break;

    buffer += decoder.decode(chunk.value, { stream: true });
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
        // skip malformed SSE line
      }
    }
  }
}
