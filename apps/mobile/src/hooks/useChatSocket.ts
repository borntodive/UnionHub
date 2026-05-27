import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { ChatMessage, ReactionCount } from "../api/chat";
import { API_BASE_URL } from "../api/client";

const API_BASE = API_BASE_URL.replace("/api/v1", "");

export interface TypingUser {
  userId: string;
  nome: string;
  cognome: string;
}

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
  onUserTyping?: (user: TypingUser) => void;
  onUserStoppedTyping?: (data: { userId: string }) => void;
  onReactionUpdated?: (data: {
    messageId: string;
    reactions: ReactionCount[];
  }) => void;
}

export function useChatSocket({
  accessToken,
  roomId,
  onNewMessage,
  onMessageDeleted,
  onMessagePinned,
  onUserTyping,
  onUserStoppedTyping,
  onReactionUpdated,
}: UseChatSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const onNewMessageRef = useRef(onNewMessage);
  const onMessageDeletedRef = useRef(onMessageDeleted);
  const onMessagePinnedRef = useRef(onMessagePinned);
  const onUserTypingRef = useRef(onUserTyping);
  const onUserStoppedTypingRef = useRef(onUserStoppedTyping);
  const onReactionUpdatedRef = useRef(onReactionUpdated);

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
    onUserTypingRef.current = onUserTyping;
  }, [onUserTyping]);
  useEffect(() => {
    onUserStoppedTypingRef.current = onUserStoppedTyping;
  }, [onUserStoppedTyping]);
  useEffect(() => {
    onReactionUpdatedRef.current = onReactionUpdated;
  }, [onReactionUpdated]);

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
    socket.on("user_typing", (user: TypingUser) =>
      onUserTypingRef.current?.(user),
    );
    socket.on("user_stopped_typing", (data: { userId: string }) =>
      onUserStoppedTypingRef.current?.(data),
    );
    socket.on(
      "reaction_updated",
      (data: { messageId: string; reactions: ReactionCount[] }) =>
        onReactionUpdatedRef.current?.(data),
    );

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken]);

  const sendMessage = useCallback(
    (
      content: string | undefined,
      attachmentIds: string[] = [],
      replyToId?: string,
    ): boolean => {
      if (!socketRef.current?.connected) return false;
      socketRef.current.emit("send_message", {
        roomId,
        content,
        attachmentIds,
        replyToId,
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

  const emitTypingStart = useCallback(() => {
    socketRef.current?.emit("typing_start", { roomId });
  }, [roomId]);

  const emitTypingStop = useCallback(() => {
    socketRef.current?.emit("typing_stop", { roomId });
  }, [roomId]);

  const emitAddReaction = useCallback(
    (messageId: string, emoji: string) => {
      socketRef.current?.emit("add_reaction", { messageId, roomId, emoji });
    },
    [roomId],
  );

  const emitRemoveReaction = useCallback(
    (messageId: string, emoji: string) => {
      socketRef.current?.emit("remove_reaction", { messageId, roomId, emoji });
    },
    [roomId],
  );

  return {
    isConnected,
    sendMessage,
    deleteMessage,
    pinMessage,
    emitTypingStart,
    emitTypingStop,
    emitAddReaction,
    emitRemoveReaction,
  };
}
