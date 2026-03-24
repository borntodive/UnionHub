import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import { Menu, Send, Trash2, BookOpen } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import Constants from "expo-constants";
import { colors, spacing, typography, borderRadius } from "../../theme";
import { chatbotApi, chatStream } from "../api/chatbot";
import { useChatStore, ChatMessageLocal } from "../store/useChatStore";
import { useAuthStore } from "../../store/authStore";

const API_BASE_URL =
  Constants.expoConfig?.extra?.apiUrl ||
  (__DEV__
    ? "http://localhost:3000/api/v1"
    : "https://api.unionhub.app/api/v1");

type Nav = DrawerNavigationProp<any>;

export const ChatbotScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();
  const [headerHeight, setHeaderHeight] = useState(0);

  const {
    conversationId,
    messages,
    addMessage,
    updateLastAssistantMessage,
    resetConversation,
  } = useChatStore();

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Set<string>>(
    new Set(),
  );

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setInput("");
    addMessage({ role: "user", content: text });
    // Empty string = waiting for first token; spinner shown by renderMessage
    addMessage({ role: "assistant", content: "", sources: [] });
    setIsLoading(true);

    const { accessToken } = useAuthStore.getState();

    try {
      await chatStream(
        text,
        conversationId,
        accessToken ?? "",
        API_BASE_URL,
        (token) => {
          // Append each token to the current accumulated content
          updateLastAssistantMessage((prev: string) => prev + token, undefined);
        },
        (sources) => {
          // Stream complete — lock in sources
          updateLastAssistantMessage(undefined, sources);
        },
        () => {
          updateLastAssistantMessage(t("chatbot.errorResponse"), []);
        },
      );
    } catch {
      updateLastAssistantMessage(t("chatbot.errorResponse"), []);
    } finally {
      setIsLoading(false);
    }
  }, [
    input,
    isLoading,
    conversationId,
    addMessage,
    updateLastAssistantMessage,
    t,
  ]);

  const handleClear = () => {
    Alert.alert(t("chatbot.clearTitle"), t("chatbot.clearMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("chatbot.clearConfirm"),
        style: "destructive",
        onPress: async () => {
          try {
            await chatbotApi.clearHistory(conversationId);
          } catch {
            // ignore — local clear still happens
          }
          resetConversation();
        },
      },
    ]);
  };

  const toggleSources = (msgId: string) => {
    setExpandedSources((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) {
        next.delete(msgId);
      } else {
        next.add(msgId);
      }
      return next;
    });
  };

  const renderMessage = ({ item }: { item: ChatMessageLocal }) => {
    const isUser = item.role === "user";
    const isPlaceholder = item.content === "" && isLoading;
    const hasSources = !isUser && item.sources && item.sources.length > 0;

    return (
      <View
        style={[styles.messageRow, isUser ? styles.rowRight : styles.rowLeft]}
      >
        <View
          style={[
            styles.bubble,
            isUser ? styles.bubbleUser : styles.bubbleAssistant,
          ]}
        >
          {isPlaceholder ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={isUser ? styles.textUser : styles.textAssistant}>
              {item.content}
            </Text>
          )}

          {hasSources && (
            <TouchableOpacity
              style={styles.sourcesButton}
              onPress={() => toggleSources(item.id)}
            >
              <BookOpen size={12} color={colors.primary} />
              <Text style={styles.sourcesButtonText}>
                {expandedSources.has(item.id)
                  ? t("chatbot.hideSources")
                  : t("chatbot.showSources", { count: item.sources!.length })}
              </Text>
            </TouchableOpacity>
          )}

          {hasSources && expandedSources.has(item.id) && (
            <View style={styles.sourcesList}>
              {item.sources!.map((s, i) => (
                <Text key={i} style={styles.sourceItem}>
                  • {s.title}
                </Text>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  const showOnboarding = messages.length === 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        {/* Header */}
        <View
          style={styles.header}
          onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
        >
          <TouchableOpacity
            onPress={() => navigation.openDrawer()}
            style={styles.headerButton}
          >
            <Menu size={24} color={colors.textInverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("chatbot.title")}</Text>
          <TouchableOpacity onPress={handleClear} style={styles.headerButton}>
            <Trash2 size={20} color={colors.textInverse} />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={insets.top + headerHeight}
        >
          {showOnboarding ? (
            <View style={styles.onboarding}>
              <BookOpen size={48} color={colors.primary} />
              <Text style={styles.onboardingTitle}>
                {t("chatbot.onboardingTitle")}
              </Text>
              <Text style={styles.onboardingText}>
                {t("chatbot.onboardingText")}
              </Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderMessage}
              contentContainerStyle={styles.listContent}
              onContentSizeChange={() =>
                flatListRef.current?.scrollToEnd({ animated: true })
              }
            />
          )}

          {/* Input bar */}
          <View
            style={[
              styles.inputBar,
              { paddingBottom: insets.bottom + spacing.sm },
            ]}
          >
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder={t("chatbot.inputPlaceholder")}
              placeholderTextColor={colors.textTertiary}
              multiline
              maxLength={2000}
              editable={!isLoading}
              onSubmitEditing={handleSend}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!input.trim() || isLoading) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!input.trim() || isLoading}
            >
              <Send size={20} color={colors.textInverse} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.primary },
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerButton: {
    padding: spacing.sm,
    minWidth: 44,
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: colors.textInverse,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  messageRow: {
    marginBottom: spacing.sm,
    flexDirection: "row",
  },
  rowRight: { justifyContent: "flex-end" },
  rowLeft: { justifyContent: "flex-start" },
  bubble: {
    maxWidth: "82%",
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  bubbleUser: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textUser: {
    color: colors.textInverse,
    fontSize: typography.sizes.base,
    lineHeight: 22,
  },
  textAssistant: {
    color: colors.text,
    fontSize: typography.sizes.base,
    lineHeight: 22,
  },
  sourcesButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
    gap: 4,
  },
  sourcesButtonText: {
    color: colors.primary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  sourcesList: {
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sourceItem: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    marginBottom: 2,
  },
  onboarding: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  onboardingTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    textAlign: "center",
  },
  onboardingText: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.base,
    color: colors.text,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
