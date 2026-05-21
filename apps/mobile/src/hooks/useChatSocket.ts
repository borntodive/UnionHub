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

  // Keep callback refs stable so the effect dep array stays [accessToken]
  // without capturing stale closures.
  const onNewMessageRef = useRef(onNewMessage);
  const onMessageDeletedRef = useRef(onMessageDeleted);
  const onMessagePinnedRef = useRef(onMessagePinned);
  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
  }, [onNewMessage]);
  useEffect(() => {
    onMessageDeletedRef.current = onMessageDeleted;
  }, [onMessageDeleted]);
  useEffect(() => {
    onMessagePinnedRef.current = onMessagePinned;
  }, [onMessagePinned]);

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
    socket.on("new_message", (msg: ChatMessage) =>
      onNewMessageRef.current(msg),
    );
    socket.on(
      "message_deleted",
      (data: { messageId: string; roomId: string }) =>
        onMessageDeletedRef.current(data),
    );
    socket.on(
      "message_pinned",
      (data: { messageId: string; roomId: string; isPinned: boolean }) =>
        onMessagePinnedRef.current(data),
    );

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken]); // reconnect only when token changes

  const sendMessage = useCallback(
    (content: string | undefined, attachmentIds: string[] = []): boolean => {
      if (!socketRef.current?.connected) return false;
      socketRef.current.emit("send_message", {
        roomId,
        content,
        attachmentIds,
      });
      return true;
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
