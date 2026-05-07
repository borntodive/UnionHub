import React, { useState, useEffect, useRef } from "react";
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
import { ArrowLeft, RefreshCw } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { colors, spacing, typography, borderRadius } from "../../theme";
import { kbApi, type KbIngestProgress } from "../../api/rag";
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
  const [progress, setProgress] = useState<KbIngestProgress | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isSuperAdmin = user?.role === UserRole.SUPERADMIN;

  const {
    data: status,
    isLoading: statusLoading,
    refetch: refetchStatus,
  } = useQuery({
    queryKey: ["kbStatus"],
    queryFn: kbApi.getStatus,
    enabled: isSuperAdmin,
  });

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const startPolling = () => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const p = await kbApi.getIngestProgress();
        setProgress(p);
        if (p.phase === "done") {
          stopPolling();
          setFeedback({ type: "success", message: p.message });
          queryClient.invalidateQueries({ queryKey: ["kbStatus"] });
          setTimeout(() => setFeedback(null), 6000);
        } else if (p.phase === "error") {
          stopPolling();
          setFeedback({ type: "error", message: p.message });
          setTimeout(() => setFeedback(null), 5000);
        }
      } catch {
        // ignore transient poll errors
      }
    }, 2000);
  };

  useEffect(() => () => stopPolling(), []);

  const ingestMutation = useMutation({
    mutationFn: kbApi.ingest,
    onSuccess: (data) => {
      if (data.started) {
        setProgress(null);
        startPolling();
      } else {
        setFeedback({ type: "error", message: data.message });
        setTimeout(() => setFeedback(null), 3000);
      }
    },
    onError: () => {
      setFeedback({ type: "error", message: "Errore avvio ingest" });
      setTimeout(() => setFeedback(null), 3000);
    },
  });

  const isRunning = progress?.isRunning ?? false;

  const getPhaseLabel = (phase: KbIngestProgress["phase"]): string => {
    switch (phase) {
      case "discovering":
        return "Scoperta file...";
      case "embedding":
        return "Generazione embedding...";
      case "saving":
        return "Salvataggio nel database...";
      case "done":
        return "Completato!";
      case "error":
        return "Errore";
      default:
        return phase;
    }
  };

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
            <RefreshControl
              refreshing={statusLoading}
              onRefresh={refetchStatus}
            />
          }
        >
          {/* Status Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t("ragAdmin.status")}</Text>
            {statusLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : status ? (
              <>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>
                    {t("ragAdmin.totalPages")}
                  </Text>
                  <Text style={styles.statValue}>{status.totalPages}</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Servizio embedding</Text>
                  <Text
                    style={[
                      styles.statValue,
                      status.pythonServiceReady
                        ? styles.statusOk
                        : styles.statusError,
                    ]}
                  >
                    {status.pythonServiceReady ? "Online" : "Offline"}
                  </Text>
                </View>
              </>
            ) : null}
          </View>

          {/* Actions Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t("ragAdmin.actions")}</Text>

            <TouchableOpacity
              style={[
                styles.actionButton,
                (isRunning || ingestMutation.isPending) &&
                  styles.actionButtonDisabled,
              ]}
              onPress={() => ingestMutation.mutate()}
              disabled={isRunning || ingestMutation.isPending}
            >
              {isRunning || ingestMutation.isPending ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <>
                  <RefreshCw size={20} color={colors.textInverse} />
                  <Text style={styles.actionButtonText}>
                    {t("ragAdmin.ingest")}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Progress UI */}
            {progress && progress.phase !== "idle" && (
              <View style={styles.progressContainer}>
                <Text style={styles.progressPhase}>
                  {getPhaseLabel(progress.phase)}
                </Text>
                {progress.message ? (
                  <Text style={styles.progressMessage}>{progress.message}</Text>
                ) : null}
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
  headerPlaceholder: { width: 40 },
  headerTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
    flex: 1,
    textAlign: "center",
  },
  scrollContent: { padding: spacing.md },
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
  statLabel: { fontSize: typography.sizes.base, color: colors.textSecondary },
  statValue: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  statusOk: { color: colors.success },
  statusError: { color: colors.error },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
  },
  actionButtonDisabled: { backgroundColor: colors.border },
  actionButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.textInverse,
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
  feedbackText: {
    marginTop: spacing.md,
    fontSize: typography.sizes.sm,
    textAlign: "center",
  },
  successText: { color: colors.success },
  errorText: { color: colors.error },
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
});
