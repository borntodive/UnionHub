import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { ArrowLeft, RefreshCw, FileText, Package } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { colors, spacing, typography, borderRadius } from "../../theme";
import { ragApi, type ReindexProgress } from "../../api/rag";
import { UserRole } from "../../types";
import { useAuthStore } from "../../store/authStore";

export const RagAdminScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [progress, setProgress] = useState<ReindexProgress | null>(null);
  const [isReindexing, setIsReindexing] = useState(false);

  // Check if user is superadmin
  const isSuperAdmin = user?.role === UserRole.SUPERADMIN;

  const {
    data: status,
    isLoading: statusLoading,
    refetch: refetchStatus,
  } = useQuery({
    queryKey: ["ragStatus"],
    queryFn: ragApi.getStatus,
    enabled: isSuperAdmin,
  });

  const {
    data: documents,
    isLoading: documentsLoading,
    refetch: refetchDocuments,
  } = useQuery({
    queryKey: ["ragDocuments"],
    queryFn: ragApi.getDocuments,
    enabled: isSuperAdmin,
  });

  const reindexMutation = useMutation({
    mutationFn: ragApi.reindex,
    onSuccess: () => {
      // Started successfully, polling will track progress
      setIsReindexing(true);
    },
    onError: () => {
      setFeedback({ type: "error", message: "Errore avvio reindex" });
      setTimeout(() => setFeedback(null), 3000);
    },
  });

  // Poll progress during reindex
  useEffect(() => {
    if (!isReindexing) {
      return;
    }

    const pollProgress = async () => {
      try {
        const p = await ragApi.getProgress();
        setProgress(p);

        // If done or error, refresh status and documents
        if (p.phase === "done") {
          setIsReindexing(false);
          setFeedback({
            type: "success",
            message: `Reindex completato: ${p.total} chunk indicizzati`,
          });
          queryClient.invalidateQueries({ queryKey: ["ragStatus"] });
          queryClient.invalidateQueries({ queryKey: ["ragDocuments"] });
          setTimeout(() => setFeedback(null), 5000);
        } else if (p.phase === "error") {
          setIsReindexing(false);
          setFeedback({
            type: "error",
            message: `Reindex fallito: ${p.message}`,
          });
          setTimeout(() => setFeedback(null), 5000);
        }
      } catch (error) {
        console.error("Error fetching progress:", error);
      }
    };

    // Initial poll
    pollProgress();

    // Poll every 2 seconds
    const interval = setInterval(pollProgress, 2000);

    return () => clearInterval(interval);
  }, [isReindexing, queryClient]);

  const handleRefresh = async () => {
    await Promise.all([refetchStatus(), refetchDocuments()]);
  };

  const handleReindex = () => {
    reindexMutation.mutate();
  };

  const getPhaseLabel = (phase: string): string => {
    switch (phase) {
      case "discovering":
        return "Scoperta categorie...";
      case "loading":
        return "Caricamento documenti...";
      case "splitting":
        return "Divisione in chunk...";
      case "embedding":
        return "Generazione embedding...";
      case "inserting":
        return "Salvataggio nel database...";
      case "done":
        return "Completato!";
      case "error":
        return "Errore";
      default:
        return phase;
    }
  };

  const formatTimeRemaining = (seconds: number): string => {
    if (seconds < 60) {
      return `~${seconds}s rimanenti`;
    } else if (seconds < 3600) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `~${mins}m ${secs}s rimanenti`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      return `~${hours}h ${mins}m rimanenti`;
    }
  };

  // Permission denied view
  if (!isSuperAdmin) {
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
            <Text style={styles.headerTitle}>{t("ragAdmin.title")}</Text>
            <View style={styles.headerPlaceholder} />
          </View>

          <View style={styles.deniedContainer}>
            <Text style={styles.deniedTitle}>
              {t("ragAdmin.permissionDenied")}
            </Text>
            <Text style={styles.deniedText}>
              {t("ragAdmin.permissionDeniedText")}
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const isLoading = statusLoading || documentsLoading;

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
          <Text style={styles.headerTitle}>{t("ragAdmin.title")}</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={handleRefresh} />
          }
        >
          {/* Status Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t("ragAdmin.status")}</Text>

            {isLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : status ? (
              <>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>
                    {t("ragAdmin.totalChunks")}
                  </Text>
                  <Text style={styles.statValue}>{status.totalChunks}</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>
                    {t("ragAdmin.lastReindex")}
                  </Text>
                  <Text style={styles.statValue}>
                    {status.lastReindexAt
                      ? new Date(status.lastReindexAt).toLocaleString()
                      : t("ragAdmin.never")}
                  </Text>
                </View>
              </>
            ) : null}
          </View>

          {/* Reindex Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t("ragAdmin.actions")}</Text>

            <TouchableOpacity
              style={[
                styles.reindexButton,
                isReindexing && styles.reindexButtonDisabled,
              ]}
              onPress={handleReindex}
              disabled={isReindexing}
            >
              {isReindexing ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <>
                  <RefreshCw size={20} color={colors.textInverse} />
                  <Text style={styles.reindexButtonText}>
                    {t("ragAdmin.reindex")}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Progress UI */}
            {isReindexing && progress && (
              <View style={styles.progressContainer}>
                <Text style={styles.progressPhase}>
                  {getPhaseLabel(progress.phase)}
                </Text>
                <Text style={styles.progressMessage}>{progress.message}</Text>

                {progress.total > 0 && (
                  <>
                    <View style={styles.progressBarContainer}>
                      <View
                        style={[
                          styles.progressBarFill,
                          { width: `${progress.percent}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.progressText}>
                      {progress.current} / {progress.total} ({progress.percent}
                      %)
                      {progress.estimatedTimeRemaining > 0 &&
                        ` • ${formatTimeRemaining(progress.estimatedTimeRemaining)}`}
                    </Text>
                  </>
                )}
              </View>
            )}

            {feedback && (
              <Text
                style={[
                  styles.feedbackText,
                  feedback.type === "success"
                    ? styles.successText
                    : styles.errorText,
                ]}
              >
                {feedback.message}
              </Text>
            )}
          </View>

          {/* Documents Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t("ragAdmin.knowledgeBase")}</Text>

            {isLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : documents?.categories ? (
              documents.categories.map((category) => (
                <View key={category.name} style={styles.categoryBlock}>
                  <View style={styles.categoryHeader}>
                    <Package size={18} color={colors.primary} />
                    <Text style={styles.categoryName}>{category.name}</Text>
                    <Text style={styles.categoryCount}>
                      {category.files.length} {t("ragAdmin.files")}
                    </Text>
                  </View>

                  {category.files.length > 0 ? (
                    category.files.map((file) => (
                      <View key={file} style={styles.fileRow}>
                        <FileText size={16} color={colors.textSecondary} />
                        <Text style={styles.fileName}>{file}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noFilesText}>
                      {t("ragAdmin.noFiles")}
                    </Text>
                  )}
                </View>
              ))
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
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
  headerPlaceholder: {
    width: 40,
  },
  headerTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
    flex: 1,
    textAlign: "center",
  },
  scrollContent: {
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statLabel: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
  },
  statValue: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  reindexButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
  },
  reindexButtonDisabled: {
    backgroundColor: colors.border,
  },
  reindexButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.textInverse,
  },
  feedbackText: {
    marginTop: spacing.md,
    fontSize: typography.sizes.sm,
    textAlign: "center",
  },
  successText: {
    color: colors.success,
  },
  errorText: {
    color: colors.error,
  },
  categoryBlock: {
    marginBottom: spacing.md,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  categoryName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    flex: 1,
  },
  categoryCount: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginLeft: spacing.lg,
  },
  fileName: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  noFilesText: {
    fontSize: typography.sizes.sm,
    color: colors.textTertiary,
    marginLeft: spacing.lg,
    fontStyle: "italic",
  },
  deniedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  deniedTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  deniedText: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    textAlign: "center",
  },
  progressContainer: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  progressPhase: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  progressMessage: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: spacing.xs,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: colors.primary,
  },
  progressText: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
    textAlign: "center",
  },
});
