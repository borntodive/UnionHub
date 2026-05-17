import React, { useState, useCallback, useRef } from "react";
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
  Linking,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import { chatApi, ChatMessage } from "../../api/chat";
import { QUERY_KEYS } from "../../api/queryKeys";
import { useAuthStore } from "../../store/authStore";
import { useChatSocket } from "../../hooks/useChatSocket";
import { UserRole } from "../../types";

interface Props {
  navigation: any;
  route: { params: { roomId: string; roomName: string } };
}

export function ChatRoomScreen({ navigation, route }: Props) {
  const { roomId, roomName } = route.params;
  const insets = useSafeAreaInsets();
  const { accessToken, user } = useAuthStore();
  const [inputText, setInputText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const { data: history, isLoading } = useQuery({
    queryKey: QUERY_KEYS.chatMessages(roomId),
    queryFn: () => chatApi.getMessages(roomId),
  });

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  React.useEffect(() => {
    if (history) setMessages(history);
  }, [history]);

  const pinnedMessage = [...messages]
    .reverse()
    .find((m) => m.isPinned && !m.deletedAt);
  const isAdmin =
    user?.role === UserRole.ADMIN || user?.role === UserRole.SUPERADMIN;

  const onNewMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const onMessageDeleted = useCallback(
    ({ messageId }: { messageId: string; roomId: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    },
    [],
  );

  const onMessagePinned = useCallback(
    ({
      messageId,
      isPinned,
    }: {
      messageId: string;
      roomId: string;
      isPinned: boolean;
    }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, isPinned } : m)),
      );
    },
    [],
  );

  const { isConnected, sendMessage, deleteMessage } = useChatSocket({
    accessToken,
    roomId,
    onNewMessage,
    onMessageDeleted,
    onMessagePinned,
  });

  const handleSend = () => {
    const text = inputText.trim();
    if (!text) return;
    sendMessage(text, []);
    setInputText("");
  };

  const handleAttachment = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    setIsUploading(true);
    try {
      const { attachmentId } = await chatApi.uploadAttachment(roomId, {
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType ?? "application/octet-stream",
      });
      sendMessage(inputText.trim() || undefined, [attachmentId]);
      setInputText("");
    } catch {
      Alert.alert("Errore", "Upload fallito, riprova.");
    } finally {
      setIsUploading(false);
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
            <Text style={styles.messageText}>{item.content}</Text>
          ) : null}
          {item.attachments?.map((att) => (
            <TouchableOpacity
              key={att.id}
              style={styles.attachmentCard}
              onPress={() => Linking.openURL(chatApi.getAttachmentUrl(att.id))}
            >
              <Text style={styles.attachmentIcon}>📄</Text>
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
          <Text style={styles.timestamp}>
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
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={insets.top + 56}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
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

        <View style={styles.inputBar}>
          <TouchableOpacity onPress={handleAttachment} disabled={isUploading}>
            <Text style={styles.attachIcon}>{isUploading ? "⏳" : "📎"}</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Scrivi un messaggio…"
            placeholderTextColor="#6c757d"
            multiline
            maxLength={4000}
          />
          <TouchableOpacity onPress={handleSend} disabled={!isConnected}>
            <Text
              style={[styles.sendIcon, !isConnected && styles.sendIconDisabled]}
            >
              ➤
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f1923" },
  center: { justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1e2a4a",
  },
  backIcon: { color: "#748ffc", fontSize: 22, width: 28 },
  headerTitle: { flex: 1, color: "#fff", fontSize: 16, fontWeight: "700" },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotOnline: { backgroundColor: "#51cf66" },
  dotOffline: { backgroundColor: "#6c757d" },
  pinnedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1e3a2f",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#2d5a40",
  },
  pinnedIcon: { fontSize: 14 },
  pinnedText: { flex: 1, color: "#adb5bd", fontSize: 13 },
  messagesList: { padding: 12, gap: 8 },
  messageRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  messageRowOwn: { flexDirection: "row-reverse" },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#3b5bdb",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  avatarText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  bubble: {
    maxWidth: "75%",
    backgroundColor: "#1e2a4a",
    borderRadius: 12,
    padding: 10,
  },
  bubbleOwn: { backgroundColor: "#2d5a9e" },
  senderName: {
    color: "#748ffc",
    fontSize: 11,
    marginBottom: 3,
    fontWeight: "600",
  },
  messageText: { color: "#e9ecef", fontSize: 14, lineHeight: 20 },
  attachmentCard: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    backgroundColor: "#0f1923",
    borderRadius: 8,
    padding: 8,
    marginTop: 4,
  },
  attachmentIcon: { fontSize: 22 },
  attachmentName: { color: "#e9ecef", fontSize: 12, maxWidth: 180 },
  attachmentSize: { color: "#6c757d", fontSize: 10, marginTop: 1 },
  timestamp: {
    color: "#6c757d",
    fontSize: 10,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#1e2a4a",
    backgroundColor: "#0f1923",
  },
  attachIcon: { color: "#748ffc", fontSize: 22, paddingBottom: 4 },
  input: {
    flex: 1,
    backgroundColor: "#1e2a4a",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: "#e9ecef",
    fontSize: 14,
    maxHeight: 120,
  },
  sendIcon: { color: "#748ffc", fontSize: 22, paddingBottom: 4 },
  sendIconDisabled: { color: "#3a4a6a" },
});
