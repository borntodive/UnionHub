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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import { chatApi, ChatMessage } from "../../api/chat";
import { QUERY_KEYS } from "../../api/queryKeys";
import { useAuthStore } from "../../store/authStore";
import { useChatSocket } from "../../hooks/useChatSocket";
import { UserRole } from "../../types";
import { useTranslation } from "react-i18next";
import { colors, spacing, typography, borderRadius } from "../../theme";

interface Props {
  navigation: any;
  route: { params: { roomId: string; roomName: string } };
}

export function ChatRoomScreen({ navigation, route }: Props) {
  const { roomId, roomName } = route.params;
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { accessToken, user } = useAuthStore();
  const queryClient = useQueryClient();
  const [inputText, setInputText] = useState("");
  const [pendingSend, setPendingSend] = useState<{
    content?: string;
    attachmentIds: string[];
  } | null>(null);
  const [sendFailed, setSendFailed] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    uri: string;
    mimeType: string;
    name: string;
  } | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const { data: history, isLoading } = useQuery({
    queryKey: QUERY_KEYS.chatMessages(roomId),
    queryFn: () => chatApi.getMessages(roomId),
  });

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  React.useEffect(() => {
    if (history) setMessages(history);
  }, [history]);

  const pinnedMessage = useMemo(
    () => [...messages].reverse().find((m) => m.isPinned && !m.deletedAt),
    [messages],
  );
  const isAdmin =
    user?.role === UserRole.ADMIN || user?.role === UserRole.SUPERADMIN;

  const onNewMessage = useCallback(
    (msg: ChatMessage) => {
      if (msg.roomId !== roomId) return;
      setMessages((prev) => [...prev, msg]);
      setTimeout(
        () => flatListRef.current?.scrollToEnd({ animated: true }),
        100,
      );
    },
    [roomId],
  );

  const onMessageDeleted = useCallback(
    ({
      messageId,
      roomId: eventRoomId,
    }: {
      messageId: string;
      roomId: string;
    }) => {
      if (eventRoomId !== roomId) return;
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      queryClient.setQueryData<ChatMessage[]>(
        QUERY_KEYS.chatMessages(roomId),
        (old) => (old ? old.filter((m) => m.id !== messageId) : old),
      );
    },
    [queryClient, roomId],
  );

  const onMessagePinned = useCallback(
    ({
      messageId,
      isPinned,
      roomId: eventRoomId,
    }: {
      messageId: string;
      roomId: string;
      isPinned: boolean;
    }) => {
      if (eventRoomId !== roomId) return;
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, isPinned } : m)),
      );
    },
    [roomId],
  );

  const { isConnected, sendMessage, deleteMessage } = useChatSocket({
    accessToken,
    roomId,
    onNewMessage,
    onMessageDeleted,
    onMessagePinned,
  });

  const handleRetrySend = useCallback(() => {
    if (!pendingSend || !isConnected) return;
    const ok = sendMessage(pendingSend.content, pendingSend.attachmentIds);
    if (ok) {
      setInputText("");
      setPendingSend(null);
      setSendFailed(false);
    } else {
      setSendFailed(true);
    }
  }, [pendingSend, isConnected, sendMessage]);

  const handleSend = () => {
    const text = inputText.trim();
    if (!text) return;
    if (!isConnected) {
      setPendingSend({ content: text, attachmentIds: [] });
      setSendFailed(true);
      return;
    }
    const ok = sendMessage(text, []);
    if (!ok) {
      setPendingSend({ content: text, attachmentIds: [] });
      setSendFailed(true);
      return;
    }
    setInputText("");
    setPendingSend(null);
    setSendFailed(false);
  };

  useEffect(() => {
    if (!isConnected || !pendingSend) return;
    const ok = sendMessage(pendingSend.content, pendingSend.attachmentIds);
    if (ok) {
      setInputText("");
      setPendingSend(null);
      setSendFailed(false);
    } else {
      setSendFailed(true);
    }
  }, [isConnected]);

  const uploadAsset = async (uri: string, name: string, type: string) => {
    if (!isConnected) {
      Alert.alert(t("unionChat.attachmentTitle"), t("unionChat.disconnected"));
      return;
    }
    setIsUploading(true);
    try {
      const { attachmentId } = await chatApi.uploadAttachment(roomId, {
        uri,
        name,
        type,
      });
      const content = inputText.trim() || undefined;
      const ok = sendMessage(content, [attachmentId]);
      if (!ok) {
        setPendingSend({ content, attachmentIds: [attachmentId] });
        setSendFailed(true);
        return;
      }
      setInputText("");
      setPendingSend(null);
      setSendFailed(false);
    } catch {
      Alert.alert(t("unionChat.attachmentTitle"), t("unionChat.uploadFailed"));
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

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isOwn = item.sender.id === user?.id;
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
          style={[styles.bubble, isOwn && styles.bubbleOwn]}
          onLongPress={() => isAdmin && handleDeleteMessage(item.id)}
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
          <Text style={[styles.timestamp, isOwn && styles.timestampOwn]}>
            {new Date(item.createdAt).toLocaleTimeString("it-IT", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (isLoading) {
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
            data={messages.filter((m) => !m.deletedAt)}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: false })
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
            <TouchableOpacity onPress={handleSend} disabled={!isConnected}>
              <Text
                style={[
                  styles.sendIcon,
                  !isConnected && styles.sendIconDisabled,
                ]}
              >
                ➤
              </Text>
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
  sendIconDisabled: { color: colors.textTertiary },
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
