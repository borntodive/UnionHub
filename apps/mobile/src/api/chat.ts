import apiClient, { API_BASE_URL } from "./client";

export interface ChatRoom {
  id: string;
  name: string;
}

export interface ChatAttachment {
  id: string;
  originalName: string;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  sender: { id: string; nome: string; cognome: string };
  content: string | null;
  isPinned: boolean;
  deletedAt: string | null;
  createdAt: string;
  attachments: ChatAttachment[];
  // Echoed back by the server on `new_message` for the original sender so it
  // can reconcile its optimistic copy. Not persisted server-side.
  clientMsgId?: string;
}

export type OutgoingStatus = "sending" | "failed";

// Client-side message used for optimistic rendering. `_status` is present
// only while a locally-created message is unconfirmed.
export type DisplayMessage = ChatMessage & { _status?: OutgoingStatus };

export interface GetMessagesParams {
  before?: string;
  limit?: number;
}

export const chatApi = {
  getRooms: async (): Promise<ChatRoom[]> =>
    (await apiClient.get<ChatRoom[]>("/chat/rooms")).data,

  getMessages: async (
    roomId: string,
    params?: GetMessagesParams,
  ): Promise<ChatMessage[]> =>
    (
      await apiClient.get<ChatMessage[]>(`/chat/rooms/${roomId}/messages`, {
        params,
      })
    ).data,

  uploadAttachment: async (
    roomId: string,
    file: { uri: string; name: string; type: string },
  ): Promise<{ attachmentId: string }> => {
    const formData = new FormData();
    formData.append("file", {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as any);
    return (
      await apiClient.post<{ attachmentId: string }>(
        `/chat/rooms/${roomId}/attachments`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      )
    ).data;
  },

  deleteMessage: async (messageId: string): Promise<void> =>
    void (await apiClient.delete(`/chat/messages/${messageId}`)),

  pinMessage: async (messageId: string): Promise<ChatMessage> =>
    (await apiClient.patch<ChatMessage>(`/chat/messages/${messageId}/pin`))
      .data,

  getAttachmentUrl: (attachmentId: string): string =>
    `${API_BASE_URL}/chat/attachments/${attachmentId}`,
};
