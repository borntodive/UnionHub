import React, {
  useState,
  useCallback,
  useRef,
  useMemo,
  useEffect,
} from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ActionSheetIOS,
  Modal,
  Image,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useQuery } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import { chatApi, ChatMessage, DisplayMessage } from "../../api/chat";
import { QUERY_KEYS } from "../../api/queryKeys";
import { useAuthStore } from "../../store/authStore";
import { useChatStore, OutgoingMessage } from "../../store/chatStore";
import { useChatSocket } from "../../hooks/useChatSocket";
import { UserRole } from "../../types";
import { colors, spacing, typography, borderRadius } from "../../theme";

interface Props {
  navigation: any;
  route: { params: { roomId: string; roomName: string } };
}

const EMPTY_MESSAGES: ChatMessage[] = [];
const EMPTY_OUTBOX: OutgoingMessage[] = [];
const PAGE_SIZE = 50;
const SEND_TIMEOUT_MS = 10000;

const makeClientId = () =>
  `c_${Date.now()}_${Math.random().toString(36).slice(2)}`;

export function ChatRoomScreen({ navigation, route }: Props) {
  const { roomId, roomName } = route.params;
  const insets = useSafeAreaInsets();
  const { accessToken, user } = useAuthStore();
  const [inputText, setInputText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [preview, setPreview] = useState<{
    uri: string;
    mimeType: string;
    name: string;
  } | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const loadingOlderRef = useRef(false);
  const timeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const confirmed =
    useChatStore((s) => s.messagesByRoom[roomId]) ?? EMPTY_MESSAGES;
  const outbox = useChatStore((s) => s.outboxByRoom[roomId]) ?? EMPTY_OUTBOX;
  const mergeRoomMessages = useChatStore((s) => s.mergeRoomMessages);
  const removeRoomMessage = useChatStore((s) => s.removeRoomMessage);
  const updateRoomMessage = useChatStore((s) => s.updateRoomMessage);
  const enqueueOutbox = useChatStore((s) => s.enqueueOutbox);
  const setOutboxStatus = useChatStore((s) => s.setOutboxStatus);
  const resolveOutbox = useChatStore((s) => s.resolveOutbox);

  // Latest page from the server. The cache renders instantly; this merges in
  // any messages received while the app was closed.
  const { data: latest, isLoading } = useQuery({
    queryKey: QUERY_KEYS.chatMessages(roomId),
    queryFn: () => chatApi.getMessages(roomId, { limit: PAGE_SIZE }),
  });

  useEffect(() => {
    if (latest) mergeRoomMessages(roomId, latest);
  }, [latest, roomId, mergeRoomMessages]);

  useEffect(() => {
    const timeouts = timeoutsRef.current;
    return () => {
      Object.values(timeouts).forEach(clearTimeout);
    };
  }, []);

  const isAdmin =
    user?.role === UserRole.ADMIN || user?.role === UserRole.SUPERADMIN;

  const visibleConfirmed = useMemo(
    () => confirmed.filter((m) => !m.deletedAt),
    [confirmed],
  );

  const pinnedMessage = useMemo(
    () => [...visibleConfirmed].reverse().find((m) => m.isPinned),
    [visibleConfirmed],
  );

  // Newest-first for the inverted FlatList: confirmed messages + still-pending
  // optimistic ones.
  const data: DisplayMessage[] = useMemo(() => {
    const pending: DisplayMessage[] = outbox.map((o) => ({
      id: o.clientMsgId,
      roomId: o.roomId,
      sender: o.sender,
      content: o.content ?? null,
      isPinned: false,
      deletedAt: null,
      createdAt: o.createdAt,
      attachments: [],
      clientMsgId: o.clientMsgId,
      _status: o.status,
    }));
    return [...visibleConfirmed, ...pending].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [visibleConfirmed, outbox]);

  const scheduleTimeout = useCallback(
    (clientMsgId: string) => {
      const existing = timeoutsRef.current[clientMsgId];
      if (existing) clearTimeout(existing);
      timeoutsRef.current[clientMsgId] = setTimeout(() => {
        delete timeoutsRef.current[clientMsgId];
        const ob = useChatStore.getState().outboxByRoom[roomId] ?? [];
        if (ob.some((o) => o.clientMsgId === clientMsgId)) {
          setOutboxStatus(roomId, clientMsgId, "failed");
        }
      }, SEND_TIMEOUT_MS);
    },
    [roomId, setOutboxStatus],
  );

  const clearTimeoutFor = useCallback((clientMsgId: string) => {
    const t = timeoutsRef.current[clientMsgId];
    if (t) {
      clearTimeout(t);
      delete timeoutsRef.current[clientMsgId];
    }
  }, []);

  const onNewMessage = useCallback(
    (msg: ChatMessage) => {
      if (msg.clientMsgId) {
        clearTimeoutFor(msg.clientMsgId);
        resolveOutbox(roomId, msg.clientMsgId);
      }
      mergeRoomMessages(roomId, [msg]);
      setTimeout(
        () =>
          flatListRef.current?.scrollToOffset({ offset: 0, animated: true }),
        50,
      );
    },
    [roomId, mergeRoomMessages, resolveOutbox, clearTimeoutFor],
  );

  const onMessageDeleted = useCallback(
    ({ messageId }: { messageId: string; roomId: string }) => {
      removeRoomMessage(roomId, messageId);
    },
    [roomId, removeRoomMessage],
  );

  const onMessagePinned = useCallback(
    ({ messageId, isPinned }: { messageId: string; isPinned: boolean }) => {
      updateRoomMessage(roomId, messageId, { isPinned });
    },
    [roomId, updateRoomMessage],
  );

  const onSocketError = useCallback(() => {
    const ob = useChatStore.getState().outboxByRoom[roomId] ?? [];
    ob.forEach((o) => {
      if (o.status === "sending") {
        clearTimeoutFor(o.clientMsgId);
        setOutboxStatus(roomId, o.clientMsgId, "failed");
      }
    });
  }, [roomId, setOutboxStatus, clearTimeoutFor]);

  // Assigned after `flushOutbox` is defined (it depends on `sendMessage`
  // returned by the hook below, so the ref breaks the cycle).
  const flushOutboxRef = useRef<() => void>(() => {});

  const { isConnected, sendMessage, deleteMessage } = useChatSocket({
    accessToken,
    roomId,
    onNewMessage,
    onMessageDeleted,
    onMessagePinned,
    onError: onSocketError,
    onConnect: () => flushOutboxRef.current(),
  });

  // Re-send everything still queued once the socket (re)connects.
  const flushOutbox = useCallback(() => {
    const ob = useChatStore.getState().outboxByRoom[roomId] ?? [];
    ob.forEach((item) => {
      setOutboxStatus(roomId, item.clientMsgId, "sending");
      const emitted = sendMessage(
        item.content,
        item.attachmentIds,
        item.clientMsgId,
      );
      if (!emitted) setOutboxStatus(roomId, item.clientMsgId, "failed");
      else scheduleTimeout(item.clientMsgId);
    });
  }, [roomId, sendMessage, setOutboxStatus, scheduleTimeout]);

  useEffect(() => {
    flushOutboxRef.current = flushOutbox;
  }, [flushOutbox]);

  const queueAndSend = useCallback(
    (content?: string, attachmentIds: string[] = []) => {
      if (!user) return;
      const clientMsgId = makeClientId();
      enqueueOutbox({
        clientMsgId,
        roomId,
        content,
        attachmentIds,
        createdAt: new Date().toISOString(),
        status: "sending",
        sender: {
          id: user.id,
          nome: user.nome ?? "",
          cognome: user.cognome ?? "",
        },
      });
      const emitted = sendMessage(content, attachmentIds, clientMsgId);
      if (!emitted) setOutboxStatus(roomId, clientMsgId, "failed");
      else scheduleTimeout(clientMsgId);
      setTimeout(
        () =>
          flatListRef.current?.scrollToOffset({ offset: 0, animated: true }),
        50,
      );
    },
    [
      user,
      roomId,
      enqueueOutbox,
      sendMessage,
      setOutboxStatus,
      scheduleTimeout,
    ],
  );

  const retryOutbox = useCallback(
    (clientMsgId: string) => {
      const ob = useChatStore.getState().outboxByRoom[roomId] ?? [];
      const item = ob.find((o) => o.clientMsgId === clientMsgId);
      if (!item) return;
      setOutboxStatus(roomId, clientMsgId, "sending");
      const emitted = sendMessage(
        item.content,
        item.attachmentIds,
        clientMsgId,
      );
      if (!emitted) setOutboxStatus(roomId, clientMsgId, "failed");
      else scheduleTimeout(clientMsgId);
    },
    [roomId, sendMessage, setOutboxStatus, scheduleTimeout],
  );

  const handleSend = () => {
    const text = inputText.trim();
    if (!text) return;
    queueAndSend(text, []);
    setInputText("");
  };

  const loadOlder = useCallback(async () => {
    if (loadingOlderRef.current || !hasMore) return;
    const oldest = confirmed[0];
    if (!oldest) return;
    loadingOlderRef.current = true;
    setIsLoadingOlder(true);
    try {
      const older = await chatApi.getMessages(roomId, {
        before: oldest.createdAt,
        limit: PAGE_SIZE,
      });
      if (older.length < PAGE_SIZE) setHasMore(false);
      if (older.length) mergeRoomMessages(roomId, older);
    } catch {
      // Keep silent: the cached page is still shown; user can retry by
      // scrolling again.
    } finally {
      loadingOlderRef.current = false;
      setIsLoadingOlder(false);
    }
  }, [hasMore, confirmed, roomId, mergeRoomMessages]);

  const uploadAsset = async (uri: string, name: string, type: string) => {
    setIsUploading(true);
    try {
      const { attachmentId } = await chatApi.uploadAttachment(roomId, {
        uri,
        name,
        type,
      });
      queueAndSend(inputText.trim() || undefined, [attachmentId]);
      setInputText("");
    } catch {
      Alert.alert("Errore", "Upload fallito, riprova.");
    } finally {
      setIsUploading(false);
    }
  };

  const handlePickFromLibrary = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/*", "video/*"],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    await uploadAsset(
      asset.uri,
      asset.name,
      asset.mimeType ?? "application/octet-stream",
    );
  };

  const handlePickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    await uploadAsset(
      asset.uri,
      asset.name,
      asset.mimeType ?? "application/octet-stream",
    );
  };

  const handleAttachment = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Annulla", "Scegli dalla libreria", "Allega file"],
          cancelButtonIndex: 0,
        },
        (index) => {
          if (index === 1) handlePickFromLibrary();
          else if (index === 2) handlePickFile();
        },
      );
    } else {
      Alert.alert("Allegato", "Scegli un'opzione", [
        { text: "Annulla", style: "cancel" },
        { text: "Scegli dalla libreria", onPress: handlePickFromLibrary },
        { text: "Allega file", onPress: handlePickFile },
      ]);
    }
  };

  const handleOpenAttachment = async (
    attId: string,
    originalName: string,
    mimeType: string,
  ) => {
    if (downloadingId) return;
    setDownloadingId(attId);
    try {
      const url = chatApi.getAttachmentUrl(attId);
      const ext = originalName.includes(".")
        ? originalName.slice(originalName.lastIndexOf("."))
        : "";
      const localUri =
        (FileSystem.cacheDirectory ?? "") + `chat_att_${attId}${ext}`;
      const { status } = await FileSystem.downloadAsync(url, localUri, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (status !== 200) {
        Alert.alert("Errore", `Download fallito (HTTP ${status}).`);
        return;
      }
      if (mimeType.startsWith("image/")) {
        setPreview({ uri: localUri, mimeType, name: originalName });
      } else {
        await Sharing.shareAsync(localUri, {
          mimeType,
          dialogTitle: originalName,
        });
      }
    } catch (e: any) {
      Alert.alert("Errore", e?.message ?? "Impossibile aprire l'allegato.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    Alert.alert("Elimina messaggio", "Sei sicuro?", [
      { text: "Annulla", style: "cancel" },
      {
        text: "Elimina",
        style: "destructive",
        onPress: () => deleteMessage(messageId),
      },
    ]);
  };

  const renderMessage = ({ item }: { item: DisplayMessage }) => {
    const isOwn = item.sender.id === user?.id;
    const isPending = !!item._status;
    return (
      <View style={[styles.messageRow, isOwn && styles.messageRowOwn]}>
        {!isOwn && (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.sender.nome[0]}
              {item.sender.cognome[0]}
            </Text>
          </View>
        )}
        <TouchableOpacity
          style={[
            styles.bubble,
            isOwn && styles.bubbleOwn,
            isPending && styles.bubblePending,
          ]}
          onLongPress={() =>
            isAdmin && !isPending && handleDeleteMessage(item.id)
          }
        >
          {!isOwn && (
            <Text style={styles.senderName}>
              {item.sender.nome} {item.sender.cognome}
            </Text>
          )}
          {item.content ? (
            <Text style={[styles.messageText, isOwn && styles.messageTextOwn]}>
              {item.content}
            </Text>
          ) : isPending ? (
            <Text style={[styles.messageText, isOwn && styles.messageTextOwn]}>
              📎 Invio allegato…
            </Text>
          ) : null}
          {item.attachments?.map((att) => (
            <TouchableOpacity
              key={att.id}
              style={styles.attachmentCard}
              onPress={() =>
                handleOpenAttachment(att.id, att.originalName, att.mimeType)
              }
              disabled={downloadingId === att.id}
            >
              <Text style={styles.attachmentIcon}>
                {downloadingId === att.id ? "⏳" : "📄"}
              </Text>
              <View>
                <Text style={styles.attachmentName} numberOfLines={1}>
                  {att.originalName}
                </Text>
                <Text style={styles.attachmentSize}>
                  {(att.size / 1024).toFixed(0)} KB
                </Text>
              </View>
            </TouchableOpacity>
          ))}
          {isPending ? (
            item._status === "failed" ? (
              <TouchableOpacity
                onPress={() =>
                  item.clientMsgId && retryOutbox(item.clientMsgId)
                }
              >
                <Text style={styles.statusFailed}>
                  ⚠ Invio fallito · Tocca per riprovare
                </Text>
              </TouchableOpacity>
            ) : (
              <Text
                style={[styles.statusSending, isOwn && styles.messageTextOwn]}
              >
                Invio…
              </Text>
            )
          ) : (
            <Text style={[styles.timestamp, isOwn && styles.timestampOwn]}>
              {new Date(item.createdAt).toLocaleTimeString("it-IT", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  if (isLoading && data.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <View style={[styles.statusBarHack, { height: insets.top }]} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={insets.top + 56}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}># {roomName}</Text>
            <View
              style={[
                styles.dot,
                isConnected ? styles.dotOnline : styles.dotOffline,
              ]}
            />
          </View>

          {pinnedMessage && (
            <View style={styles.pinnedBanner}>
              <Text style={styles.pinnedIcon}>📌</Text>
              <Text style={styles.pinnedText} numberOfLines={1}>
                {pinnedMessage.content ?? "📎 allegato"}
              </Text>
            </View>
          )}

          <FlatList
            ref={flatListRef}
            inverted
            data={data}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesList}
            onEndReached={loadOlder}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              isLoadingOlder ? (
                <View style={styles.olderLoader}>
                  <ActivityIndicator color={colors.primary} size="small" />
                </View>
              ) : null
            }
          />

          <View
            style={[
              styles.inputBar,
              { paddingBottom: insets.bottom || spacing.sm },
            ]}
          >
            <TouchableOpacity onPress={handleAttachment} disabled={isUploading}>
              <Text style={styles.attachIcon}>{isUploading ? "⏳" : "📎"}</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Scrivi un messaggio…"
              placeholderTextColor={colors.textTertiary}
              multiline
              maxLength={4000}
            />
            <TouchableOpacity onPress={handleSend}>
              <Text style={styles.sendIcon}>➤</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={!!preview}
        animationType="slide"
        onRequestClose={() => setPreview(null)}
      >
        <SafeAreaView
          style={styles.previewContainer}
          edges={["top", "bottom", "left", "right"]}
        >
          <View style={styles.previewHeader}>
            <TouchableOpacity onPress={() => setPreview(null)}>
              <Text style={styles.previewClose}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.previewTitle} numberOfLines={1}>
              {preview?.name}
            </Text>
            <TouchableOpacity
              onPress={() =>
                preview &&
                Sharing.shareAsync(preview.uri, {
                  mimeType: preview.mimeType,
                  dialogTitle: preview.name,
                })
              }
            >
              <Text style={styles.previewShare}>⬆</Text>
            </TouchableOpacity>
          </View>
          <Image
            source={{ uri: preview?.uri ?? "" }}
            style={styles.previewImage}
            resizeMode="contain"
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  statusBarHack: { backgroundColor: colors.primary },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  backIcon: { color: colors.textInverse, fontSize: 22, width: 28 },
  headerTitle: {
    flex: 1,
    color: colors.textInverse,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotOnline: { backgroundColor: colors.success },
  dotOffline: { backgroundColor: colors.textTertiary },
  pinnedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "#e8f5ee",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pinnedIcon: { fontSize: 13 },
  pinnedText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
  },
  messagesList: { padding: spacing.md, gap: spacing.sm },
  olderLoader: { paddingVertical: spacing.md },
  messageRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  messageRowOwn: { flexDirection: "row-reverse" },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  avatarText: {
    color: colors.textInverse,
    fontSize: 11,
    fontWeight: typography.weights.bold,
  },
  bubble: {
    maxWidth: "75%",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  bubbleOwn: { backgroundColor: colors.primary },
  bubblePending: { opacity: 0.7 },
  senderName: {
    color: colors.primary,
    fontSize: 11,
    marginBottom: 3,
    fontWeight: typography.weights.semibold,
  },
  messageText: {
    color: colors.text,
    fontSize: typography.sizes.sm,
    lineHeight: 20,
  },
  messageTextOwn: { color: colors.textInverse },
  attachmentCard: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginTop: 4,
  },
  attachmentIcon: { fontSize: 22 },
  attachmentName: { color: colors.text, fontSize: 12, maxWidth: 180 },
  attachmentSize: { color: colors.textTertiary, fontSize: 10, marginTop: 1 },
  timestamp: {
    color: colors.textTertiary,
    fontSize: 10,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  timestampOwn: { color: "rgba(255,255,255,0.7)" },
  statusSending: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 10,
    marginTop: 4,
    alignSelf: "flex-end",
    fontStyle: "italic",
  },
  statusFailed: {
    color: colors.error,
    fontSize: 11,
    marginTop: 4,
    alignSelf: "flex-end",
    fontWeight: typography.weights.semibold,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  attachIcon: { color: colors.primary, fontSize: 22, paddingBottom: 4 },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: typography.sizes.sm,
    maxHeight: 120,
  },
  sendIcon: { color: colors.primary, fontSize: 22, paddingBottom: 4 },
  previewContainer: { flex: 1, backgroundColor: colors.background },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  previewClose: { color: colors.textInverse, fontSize: 20, width: 28 },
  previewTitle: {
    flex: 1,
    color: colors.textInverse,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  previewShare: {
    color: colors.textInverse,
    fontSize: 22,
    width: 28,
    textAlign: "right",
  },
  previewImage: { flex: 1, width: "100%", backgroundColor: colors.background },
});
