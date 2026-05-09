import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import RenderHtml from "react-native-render-html";

import { colors, spacing, typography, borderRadius } from "../../theme";
import { kbApi } from "../../api/kb";

type ChatRequestDetailRouteParams = {
  ChatRequestDetail: { requestId: string };
};

export const ChatRequestDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<ChatRequestDetailRouteParams, "ChatRequestDetail">>();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const { requestId } = route.params;

  const { data, isLoading, error } = useQuery({
    queryKey: ["adminChatRequest", requestId],
    queryFn: () => kbApi.getRequest(requestId),
  });

  const userLabel = data?.user
    ? `${data.user.crewcode} — ${data.user.nome} ${data.user.cognome}`
    : t("chatRequests.deletedUser");

  const formattedDate = data
    ? `${new Date(data.createdAt).toLocaleDateString(i18n.language)} ${new Date(
        data.createdAt,
      ).toLocaleTimeString(i18n.language, {
        hour: "2-digit",
        minute: "2-digit",
      })}`
    : "";

  return (
    <View style={styles.wrapper}>
      <View style={[styles.statusBarHack, { height: insets.top }]} />
      <SafeAreaView
        style={styles.container}
        edges={["bottom", "left", "right"]}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.headerButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={24} color={colors.textInverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {t("chatRequests.detailTitle")}
          </Text>
          <View style={styles.headerButton} />
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error || !data ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.errorText}>{t("chatRequests.loadError")}</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>{t("chatRequests.user")}</Text>
              <Text style={styles.metaValue}>{userLabel}</Text>
              <Text style={[styles.metaLabel, styles.metaSpacer]}>
                {t("chatRequests.date")}
              </Text>
              <Text style={styles.metaValue}>{formattedDate}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {t("chatRequests.question")}
              </Text>
              <View style={styles.questionBubble}>
                <Text style={styles.questionText}>{data.question}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {t("chatRequests.answer")}
              </Text>
              <View style={styles.answerBubble}>
                <RenderHtml
                  contentWidth={width - spacing.md * 4}
                  source={{ html: data.answer }}
                  tagsStyles={htmlTagStyles}
                />
              </View>
            </View>

            {data.citations && data.citations.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {t("chatRequests.sources")} ({data.citations.length})
                </Text>
                <View style={styles.citationsList}>
                  {data.citations.map((c, i) => (
                    <Text key={i} style={styles.citationItem}>
                      • {c.document_title}
                      {c.section ? ` — ${c.section}` : ""}
                    </Text>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
};

const htmlTagStyles = {
  p: {
    fontSize: typography.sizes.base,
    color: colors.text,
    lineHeight: 22,
    marginTop: 0,
    marginBottom: 6,
  },
  strong: { fontWeight: typography.weights.bold as any },
  em: { fontStyle: "italic" as const },
  ul: { marginVertical: 4 },
  ol: { marginVertical: 4 },
  li: {
    fontSize: typography.sizes.base,
    color: colors.text,
    lineHeight: 22,
    marginBottom: 2,
  },
  code: {
    fontFamily: "monospace",
    backgroundColor: colors.border,
    paddingHorizontal: 4,
    borderRadius: 3,
    fontSize: typography.sizes.sm,
  },
  pre: {
    backgroundColor: colors.border,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginVertical: 4,
  },
  h1: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold as any,
    marginBottom: 6,
  },
  h2: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
    marginBottom: 4,
  },
  h3: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold as any,
    marginBottom: 4,
  },
};

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.primary },
  statusBarHack: { backgroundColor: colors.primary },
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    minHeight: 56,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
    flex: 1,
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontSize: typography.sizes.base,
    color: colors.error,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  metaCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metaLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
    fontWeight: typography.weights.bold,
  },
  metaSpacer: {
    marginTop: spacing.sm,
  },
  metaValue: {
    fontSize: typography.sizes.base,
    color: colors.text,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  questionBubble: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  questionText: {
    fontSize: typography.sizes.base,
    color: colors.textInverse,
    lineHeight: 22,
  },
  answerBubble: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  citationsList: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  citationItem: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
  },
});
