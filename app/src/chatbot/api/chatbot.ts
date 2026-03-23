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
