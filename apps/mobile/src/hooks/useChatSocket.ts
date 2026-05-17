import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { ChatMessage } from "../api/chat";
import { API_BASE_URL } from "../api/client";

const API_BASE = API_BASE_URL.replace("/api/v1", "");

interface UseChatSocketOptions {
  accessToken: string | null;
  roomId: string;
  onNewMessage: (message: ChatMessage) => void;
  onMessageDeleted: (data: { messageId: string; roomId: string }) => void;
  onMessagePinned: (data: {
    messageId: string;
    roomId: string;
    isPinned: boolean;
  }) => void;
}

export function useChatSocket({
  accessToken,
  roomId,
  onNewMessage,
  onMessageDeleted,
  onMessagePinned,
}: UseChatSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!accessToken) return;

    const socket = io(`${API_BASE}/chat`, {
      auth: { token: accessToken },
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));
    socket.on("new_message", onNewMessage);
    socket.on("message_deleted", onMessageDeleted);
    socket.on("message_pinned", onMessagePinned);

    return () => {
      socket.off("new_message", onNewMessage);
      socket.off("message_deleted", onMessageDeleted);
      socket.off("message_pinned", onMessagePinned);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken]); // reconnect only when token changes

  const sendMessage = useCallback(
    (content: string | undefined, attachmentIds: string[] = []) => {
      if (!socketRef.current?.connected) return;
      socketRef.current.emit("send_message", {
        roomId,
        content,
        attachmentIds,
      });
    },
    [roomId],
  );

  const deleteMessage = useCallback(
    (messageId: string) => {
      if (!socketRef.current?.connected) return;
      socketRef.current.emit("delete_message", { messageId, roomId });
    },
    [roomId],
  );

  const pinMessage = useCallback((messageId: string, pin: boolean) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit("pin_message", { messageId, pin });
  }, []);

  return { isConnected, sendMessage, deleteMessage, pinMessage };
}
