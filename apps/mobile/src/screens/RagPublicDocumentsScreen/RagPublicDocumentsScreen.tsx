import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  FileText,
  Calendar,
  Hash,
  CheckCircle2,
  XCircle,
  Clock,
  Loader,
} from "lucide-react-native";
import { colors, spacing, typography, borderRadius } from "../../theme";
import {
  ragApi,
  RAG_QUERY_KEYS,
  RagDocument,
  IngestionJob,
} from "../../api/rag";

// ── Status helpers ─────────────────────────────────────────────────────────────

const stepOrder = ["parse", "chunk", "embed", "index"];

const getCurrentStepLabel = (
  job: IngestionJob | undefined,
  t: (key: string) => string,
): string | null => {
  if (!job || !job.steps || job.steps.length === 0) return null;
  const jobStatus = job.status?.toUpperCase();
  if (jobStatus === "COMPLETED") return t("rag.admin.status.completed");
  if (jobStatus === "FAILED") return t("rag.admin.status.failed");

  const runningStep = job.steps.find(
    (s) => s.status?.toUpperCase() === "RUNNING",
  );
  if (runningStep) {
    return `${t("rag.publicDocuments.step")} ${stepOrder.indexOf(runningStep.stepName) + 1}/${stepOrder.length}: ${runningStep.stepName}`;
  }

  const pendingStep = job.steps.find(
    (s) => s.status?.toUpperCase() === "PENDING",
  );
  if (pendingStep) {
    return `${t("rag.publicDocuments.step")} ${stepOrder.indexOf(pendingStep.stepName) + 1}/${stepOrder.length}: ${pendingStep.stepName}`;
  }

  return t("rag.publicDocuments.processing");
};

const getStatusColor = (status?: string): string => {
  const upper = status?.toUpperCase();
  switch (upper) {
    case "COMPLETED":
      return colors.success;
    case "FAILED":
      return colors.error;
    case "RUNNING":
    case "RETRYING":
      return colors.warning;
    default:
      return colors.textTertiary;
  }
};

const StatusBadge: React.FC<{
  job?: IngestionJob;
}> = ({ job }) => {
  const { t } = useTranslation();
  const statusUpper = job?.status?.toUpperCase();

  if (!job) {
    return (
      <View
        style={[
          styles.statusBadge,
          { backgroundColor: `${colors.textTertiary}15` },
        ]}
      >
        <Clock size={12} color={colors.textTertiary} />
        <Text style={[styles.statusText, { color: colors.textTertiary }]}>
          {t("rag.admin.notIngested")}
        </Text>
      </View>
    );
  }

  const color = getStatusColor(job.status);
  const isActive =
    statusUpper === "RUNNING" ||
    statusUpper === "RETRYING" ||
    statusUpper === "PENDING";

  return (
    <View style={[styles.statusBadge, { backgroundColor: `${color}15` }]}>
      {isActive ? (
        <Loader size={12} color={color} />
      ) : statusUpper === "COMPLETED" ? (
        <CheckCircle2 size={12} color={color} />
      ) : (
        <XCircle size={12} color={color} />
      )}
      <Text style={[styles.statusText, { color }]}>
        {t(`rag.admin.status.${job.status.toLowerCase()}`)}
      </Text>
    </View>
  );
};

// ── Document Card ─────────────────────────────────────────────────────────────

const DocumentCard: React.FC<{ document: RagDocument }> = ({ document }) => {
  const { t } = useTranslation();
  const latestJob = document.ingestionJobs?.[document.ingestionJobs.length - 1];
  const statusUpper = latestJob?.status?.toUpperCase();
  const isActive =
    statusUpper === "RUNNING" ||
    statusUpper === "RETRYING" ||
    statusUpper === "PENDING";

  const stepLabel = getCurrentStepLabel(latestJob, t);

  return (
    <TouchableOpacity style={styles.documentCard} activeOpacity={0.7}>
      <View style={styles.documentHeader}>
        <View style={styles.iconWrapper}>
          {isActive ? (
            <ActivityIndicator size={16} color={colors.primary} />
          ) : (
            <FileText size={18} color={colors.primary} />
          )}
        </View>
        <View style={styles.documentMeta}>
          <View style={styles.titleRow}>
            <Text style={styles.documentTitle} numberOfLines={2}>
              {document.title}
            </Text>
            <StatusBadge job={latestJob} />
          </View>
          <View style={styles.documentInfo}>
            <View style={styles.infoRow}>
              <Hash size={12} color={colors.textSecondary} />
              <Text style={styles.documentCode}>{document.code}</Text>
            </View>
            <View style={styles.infoRow}>
              <Calendar size={12} color={colors.textSecondary} />
              <Text style={styles.documentDate}>
                {new Date(document.createdAt).toLocaleDateString("it-IT")}
              </Text>
            </View>
          </View>
          {isActive && stepLabel && (
            <Text style={styles.stepText}>{stepLabel}</Text>
          )}
        </View>
      </View>
      {document.manualPart && (
        <Text style={styles.documentPart}>{document.manualPart}</Text>
      )}
    </TouchableOpacity>
  );
};

export function RagPublicDocumentsScreen() {
  const { t } = useTranslation();

  const {
    data: documents,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: RAG_QUERY_KEYS.publicDocuments,
    queryFn: () => ragApi.getPublicDocuments(),
    refetchInterval: 10000, // Poll every 10s for status updates
  });

  // Count processing documents
  const processingCount = documents?.filter((d) =>
    d.ingestionJobs?.some((j) => {
      const status = j.status?.toUpperCase();
      return (
        status === "PENDING" || status === "RUNNING" || status === "RETRYING"
      );
    }),
  ).length;

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t("rag.publicDocuments.title")}</Text>
        <Text style={styles.headerSubtitle}>
          {t("rag.publicDocuments.subtitle")}
        </Text>
      </View>

      {processingCount > 0 && (
        <View style={styles.processingBanner}>
          <Loader size={14} color={colors.warning} />
          <Text style={styles.processingText}>
            {t("rag.admin.processing", { count: processingCount })}
          </Text>
        </View>
      )}

      <FlatList
        data={documents}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <DocumentCard document={item} />}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <FileText size={48} color={colors.textTertiary} />
              <Text style={styles.emptyTitle}>
                {t("rag.publicDocuments.empty")}
              </Text>
              <Text style={styles.emptySubtitle}>
                {t("rag.publicDocuments.emptySubtitle")}
              </Text>
            </View>
          ) : null
        }
      />

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semiBold,
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  processingBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: `${colors.warning}15`,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: borderRadius.md,
  },
  processingText: {
    fontSize: typography.sizes.sm,
    color: colors.warning,
    fontWeight: typography.weights.medium,
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  documentCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  documentHeader: {
    flexDirection: "row",
    gap: spacing.md,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  documentMeta: {
    flex: 1,
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  documentTitle: {
    flex: 1,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  documentInfo: {
    flexDirection: "row",
    gap: spacing.md,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  documentCode: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  documentDate: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  stepText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontStyle: "italic",
  },
  documentPart: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    marginTop: spacing.sm,
    fontWeight: typography.weights.medium,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxl * 2,
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semiBold,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textTertiary,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
});
