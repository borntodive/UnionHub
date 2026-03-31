import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import {
  Menu,
  Send,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from "lucide-react-native";
import { colors, spacing, typography, borderRadius } from "../../theme";
import { ragApi, AskResponse, Citation } from "../../api/rag";

interface QaEntry {
  question: string;
  response: AskResponse;
}

const CitationCard: React.FC<{ citation: Citation; index: number }> = ({
  citation,
  index,
}) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <TouchableOpacity
      style={styles.citationCard}
      onPress={() => setExpanded((v) => !v)}
      activeOpacity={0.8}
    >
      <View style={styles.citationHeader}>
        <View style={styles.citationBadge}>
          <Text style={styles.citationBadgeText}>{index + 1}</Text>
        </View>
        <View style={styles.citationMeta}>
          <Text style={styles.citationTitle} numberOfLines={1}>
            {citation.documentTitle}
          </Text>
          {citation.sectionTitle ? (
            <Text style={styles.citationSection} numberOfLines={1}>
              {citation.sectionCode ? `§${citation.sectionCode} — ` : ""}
              {citation.sectionTitle}
            </Text>
          ) : null}
          {citation.pageStart != null ? (
            <Text style={styles.citationPage}>
              p.{citation.pageStart}
              {citation.pageEnd && citation.pageEnd !== citation.pageStart
                ? `–${citation.pageEnd}`
                : ""}
            </Text>
          ) : null}
        </View>
        {expanded ? (
          <ChevronUp size={16} color={colors.textSecondary} />
        ) : (
          <ChevronDown size={16} color={colors.textSecondary} />
        )}
      </View>
      {expanded && citation.quote ? (
        <Text style={styles.citationQuote}>{citation.quote}</Text>
      ) : null}
    </TouchableOpacity>
  );
};

const QaBlock: React.FC<{ entry: QaEntry }> = ({ entry }) => {
  const { t } = useTranslation();
  return (
    <View style={styles.qaBlock}>
      {/* Question bubble */}
      <View style={styles.questionBubble}>
        <Text style={styles.questionText}>{entry.question}</Text>
      </View>

      {/* Answer */}
      <View style={styles.answerBlock}>
        <View style={styles.answerIconRow}>
          <BookOpen size={14} color={colors.primary} />
          <Text style={styles.answerLabel}>{t("rag.answer")}</Text>
        </View>
        <Text style={styles.answerText}>{entry.response.answer}</Text>

        {entry.response.citations.length > 0 && (
          <View style={styles.citationsSection}>
            <Text style={styles.citationsLabel}>{t("rag.sources")}</Text>
            {entry.response.citations.map((c, i) => (
              <CitationCard key={c.chunkId} citation={c} index={i} />
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

export const RagAskScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<QaEntry[]>([]);

  const { mutate, isPending } = useMutation({
    mutationFn: (q: string) =>
      ragApi.ask({ question: q, retrievalMode: "hybrid" }),
    onSuccess: (response, q) => {
      setHistory((prev) => [...prev, { question: q, response }]);
      setQuestion("");
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    },
    onError: (err: any) => {
      const isTimeout = err?.code === "ECONNABORTED";
      Alert.alert(
        t("common.error"),
        isTimeout ? t("rag.errorTimeout") : t("rag.errorGeneric"),
      );
    },
  });

  const handleSend = () => {
    const q = question.trim();
    if (!q || isPending) return;
    mutate(q);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => (navigation as any).openDrawer()}
        >
          <Menu size={24} color={colors.textInverse} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <BookOpen size={18} color={colors.textInverse} />
          <Text style={styles.headerTitle}>{t("rag.title")}</Text>
        </View>
        <View style={styles.headerButton} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={insets.top + 56}
      >
        {/* Conversation */}
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            history.length === 0 && styles.scrollContentEmpty,
          ]}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: false })
          }
        >
          {history.length === 0 ? (
            <View style={styles.emptyState}>
              <BookOpen size={48} color={colors.border} />
              <Text style={styles.emptyTitle}>{t("rag.emptyTitle")}</Text>
              <Text style={styles.emptySubtitle}>{t("rag.emptySubtitle")}</Text>
            </View>
          ) : (
            history.map((entry, i) => <QaBlock key={i} entry={entry} />)
          )}
          {isPending && (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>{t("rag.thinking")}</Text>
            </View>
          )}
        </ScrollView>

        {/* Input bar */}
        <View
          style={[
            styles.inputBar,
            { paddingBottom: Math.max(insets.bottom, spacing.sm) },
          ]}
        >
          <TextInput
            style={styles.textInput}
            value={question}
            onChangeText={setQuestion}
            placeholder={t("rag.placeholder")}
            placeholderTextColor={colors.textTertiary}
            multiline
            maxLength={500}
            editable={!isPending}
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!question.trim() || isPending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!question.trim() || isPending}
          >
            <Send size={20} color={colors.textInverse} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  header: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    height: 56,
    paddingHorizontal: spacing.md,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  headerTitle: {
    color: colors.textInverse,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.lg,
  },
  scrollContentEmpty: {
    flex: 1,
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textTertiary,
    textAlign: "center",
    paddingHorizontal: spacing.xl,
    lineHeight: 20,
  },
  qaBlock: {
    gap: spacing.sm,
  },
  questionBubble: {
    alignSelf: "flex-end",
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxWidth: "80%",
  },
  questionText: {
    color: colors.textInverse,
    fontSize: typography.sizes.base,
    lineHeight: 22,
  },
  answerBlock: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderTopLeftRadius: borderRadius.xs,
    padding: spacing.md,
    gap: spacing.sm,
  },
  answerIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  answerLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  answerText: {
    fontSize: typography.sizes.base,
    color: colors.text,
    lineHeight: 24,
  },
  citationsSection: {
    gap: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  citationsLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  citationCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  citationHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  citationBadge: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  citationBadgeText: {
    fontSize: typography.sizes.xs,
    color: colors.textInverse,
    fontWeight: typography.weights.bold,
  },
  citationMeta: {
    flex: 1,
    gap: 2,
  },
  citationTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  citationSection: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  citationPage: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
  },
  citationQuote: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontStyle: "italic",
    lineHeight: 18,
    paddingLeft: spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
    marginTop: spacing.xs,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  loadingText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontStyle: "italic",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.base,
    color: colors.text,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
