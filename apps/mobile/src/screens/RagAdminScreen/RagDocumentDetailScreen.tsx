import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Play,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Loader,
  FileText,
  Hash,
  Calendar,
  Trash2,
} from "lucide-react-native";
import { colors, spacing, typography, borderRadius } from "../../theme";
import {
  ragApi,
  IngestionJob,
  IngestionStep,
  IngestionStatus,
  RAG_QUERY_KEYS,
} from "../../api/rag";
import { RootStackParamList } from "../../navigation/types";

type DetailRoute = RouteProp<RootStackParamList, "RagDocumentDetail">;

const statusColor = (status: IngestionStatus): string => {
  switch (status) {
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

const StatusIcon: React.FC<{ status: IngestionStatus; size?: number }> = ({
  status,
  size = 16,
}) => {
  const color = statusColor(status);
  switch (status) {
    case "COMPLETED":
      return <CheckCircle2 size={size} color={color} />;
    case "FAILED":
      return <XCircle size={size} color={color} />;
    case "RUNNING":
    case "RETRYING":
      return <Loader size={size} color={color} />;
    default:
      return <Clock size={size} color={color} />;
  }
};

// Map step names to translation keys
const STEP_NAMES: Record<string, string> = {
  parse: "Analisi PDF",
  chunk: "Creazione chunk",
  embed: "Generazione embedding",
  index: "Indicizzazione",
};

// Get step detail text from payload
const getStepDetail = (
  stepName: string,
  status: IngestionStatus,
  payload?: Record<string, any> | null,
  progressCurrent?: number | null,
  progressTotal?: number | null,
): string | null => {
  // In-progress: show live counter for embed step
  if (status === "RUNNING" && stepName === "embed") {
    if (progressCurrent != null && progressTotal != null && progressTotal > 0) {
      return `${progressCurrent} su ${progressTotal} generati`;
    }
    return null;
  }
  // Completed: show final metrics from payload
  if (!payload) return null;
  switch (stepName) {
    case "parse":
      if (payload.page_count) {
        return `${payload.page_count} pagine, ${payload.section_count || 0} sezioni, ${payload.table_count || 0} tabelle`;
      }
      break;
    case "chunk":
      if (payload.chunk_count) {
        return `${payload.chunk_count} chunk creati`;
      }
      break;
    case "embed":
      if (payload.embedding_count) {
        return `${payload.embedding_count} embeddings generati (${payload.model || "bge-m3"})`;
      }
      break;
    case "index":
      if (payload.index_created !== undefined) {
        return payload.index_created
          ? "Indice IVFFlat creato"
          : "Indice già esistente";
      }
      break;
  }
  return null;
};

const StepRow: React.FC<{
  stepName: string;
  status: IngestionStatus;
  errorMessage: string | null;
  payload?: Record<string, any> | null;
  progressCurrent?: number | null;
  progressTotal?: number | null;
}> = ({
  stepName,
  status,
  errorMessage,
  payload,
  progressCurrent,
  progressTotal,
}) => {
  const { t } = useTranslation();
  const displayName = STEP_NAMES[stepName] || stepName;
  const detail = getStepDetail(
    stepName,
    status,
    payload,
    progressCurrent,
    progressTotal,
  );

  return (
    <View style={stepStyles.row}>
      <View style={stepStyles.icon}>
        <StatusIcon status={status} size={14} />
      </View>
      <View style={stepStyles.info}>
        <Text style={stepStyles.name}>{displayName}</Text>
        <Text style={[stepStyles.status, { color: statusColor(status) }]}>
          {t(`rag.admin.status.${status.toLowerCase()}`)}
        </Text>
        {detail && <Text style={stepStyles.detail}>{detail}</Text>}
        {errorMessage ? (
          <Text style={stepStyles.error} numberOfLines={2}>
            {errorMessage}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

const stepStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  icon: {
    marginTop: 2,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  status: {
    fontSize: typography.sizes.xs,
  },
  detail: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontStyle: "italic",
  },
  error: {
    fontSize: typography.sizes.xs,
    color: colors.error,
    fontStyle: "italic",
  },
});

// Progress bar component
const ProgressBar: React.FC<{ steps: IngestionStep[] }> = ({ steps }) => {
  const totalSteps = steps.length;
  const completedSteps = steps.filter((s) => s.status === "COMPLETED").length;
  const failedSteps = steps.filter((s) => s.status === "FAILED").length;
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  return (
    <View style={progressStyles.container}>
      <View style={progressStyles.barBackground}>
        <View
          style={[
            progressStyles.barFill,
            {
              width: `${progress}%`,
              backgroundColor: failedSteps > 0 ? colors.error : colors.success,
            },
          ]}
        />
      </View>
      <Text style={progressStyles.text}>
        {completedSteps} / {totalSteps} fasi completate
      </Text>
    </View>
  );
};

const progressStyles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  barBackground: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: borderRadius.full,
  },
  text: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    textAlign: "center",
  },
});

// Auto-polling hook for active jobs
const useJobPolling = (jobId: string | undefined, isActive: boolean) => {
  const { data, refetch } = useQuery({
    queryKey: jobId ? RAG_QUERY_KEYS.job(jobId) : ["rag", "job", "none"],
    queryFn: () => ragApi.getJobStatus(jobId!),
    enabled: !!jobId,
    refetchInterval: isActive ? 3000 : false,
  });
  return { jobData: data, refetchJob: refetch };
};

export const RagDocumentDetailScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute<DetailRoute>();
  const { documentId } = route.params;
  const queryClient = useQueryClient();

  const [refreshing, setRefreshing] = useState(false);

  const {
    data: doc,
    isLoading,
    refetch: refetchDoc,
  } = useQuery({
    queryKey: RAG_QUERY_KEYS.document(documentId),
    queryFn: () => ragApi.getDocument(documentId),
  });

  const latestJob = doc?.ingestionJobs?.[doc.ingestionJobs.length - 1];
  const isJobActive =
    latestJob?.status === "RUNNING" || latestJob?.status === "RETRYING";

  const { jobData, refetchJob } = useJobPolling(latestJob?.id, isJobActive);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetchDoc();
      if (latestJob?.id) refetchJob();
    } finally {
      setRefreshing(false);
    }
  }, [refetchDoc, refetchJob, latestJob?.id]);

  // Merge polled job data into the displayed job
  const displayJob = jobData ?? latestJob;

  // Track previous status to detect transitions
  const prevStatusRef = useRef<string | undefined>(undefined);

  // Refresh document when job transitions to completed/failed + show feedback
  useEffect(() => {
    if (!jobData) return;

    const currentStatus = jobData.status;
    const prevStatus = prevStatusRef.current;

    // Only react on transition from active to terminal states
    if (
      prevStatus &&
      (prevStatus === "RUNNING" || prevStatus === "RETRYING") &&
      (currentStatus === "COMPLETED" || currentStatus === "FAILED")
    ) {
      refetchDoc();
      // Invalidate documents list so admin screen shows updated status
      queryClient.invalidateQueries({ queryKey: ["rag", "documents"] });

      // Show feedback alert
      if (currentStatus === "COMPLETED") {
        Alert.alert(
          t("common.success"),
          t("rag.admin.ingestion.completedMessage"),
          [{ text: t("common.ok"), style: "default" }],
        );
      } else if (currentStatus === "FAILED") {
        Alert.alert(t("common.error"), t("rag.admin.ingestion.failedMessage"), [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("rag.admin.ingestion.retry"),
            style: "default",
            onPress: () => retryIngestion(jobData.id),
          },
        ]);
      }
    }

    prevStatusRef.current = currentStatus;
  }, [jobData?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const { mutate: startIngestion, isPending: starting } = useMutation({
    mutationFn: () => ragApi.startIngestion(documentId),
    onSuccess: (job) => {
      queryClient.setQueryData(RAG_QUERY_KEYS.job(job.id), job);
      refetchDoc();
    },
    onError: (err: any) => {
      Alert.alert(
        t("common.error"),
        err?.response?.data?.message || t("rag.admin.ingestion.startError"),
      );
    },
  });

  const { mutate: retryIngestion, isPending: retrying } = useMutation({
    mutationFn: (jobId: string) => ragApi.retryIngestion(jobId),
    onSuccess: (job) => {
      queryClient.setQueryData(RAG_QUERY_KEYS.job(job.id), job);
      refetchDoc();
    },
    onError: (err: any) => {
      Alert.alert(
        t("common.error"),
        err?.response?.data?.message || t("rag.admin.ingestion.retryError"),
      );
    },
  });

  const { mutate: deleteDocument, isPending: deleting } = useMutation({
    mutationFn: () => ragApi.deleteDocument(documentId),
    onSuccess: () => {
      // Invalidate documents list and navigate back
      queryClient.invalidateQueries({ queryKey: ["rag", "documents"] });
      Alert.alert(t("common.success"), t("rag.admin.delete.success"), [
        { text: t("common.ok"), onPress: () => navigation.goBack() },
      ]);
    },
    onError: (err: any) => {
      Alert.alert(
        t("common.error"),
        err?.response?.data?.message || t("rag.admin.delete.error"),
      );
    },
  });

  const handleDelete = () => {
    Alert.alert(t("rag.admin.delete.title"), t("rag.admin.delete.confirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("rag.admin.delete.button"),
        style: "destructive",
        onPress: () => deleteDocument(),
      },
    ]);
  };

  const handleAction = () => {
    if (!displayJob || displayJob.status === "FAILED") {
      if (displayJob?.status === "FAILED") {
        retryIngestion(displayJob.id);
      } else {
        startIngestion();
      }
    }
  };

  const canStart = !displayJob || displayJob.status === "FAILED";
  const actionLabel =
    displayJob?.status === "FAILED"
      ? t("rag.admin.ingestion.retry")
      : t("rag.admin.ingestion.start");
  const actionPending = starting || retrying;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={24} color={colors.textInverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("common.loading")}</Text>
          <View style={styles.headerButton} />
        </View>
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: spacing.xl }}
        />
      </SafeAreaView>
    );
  }

  if (!doc) return null;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={24} color={colors.textInverse} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {doc.code}
        </Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleDelete}
          disabled={deleting}
        >
          {deleting ? (
            <ActivityIndicator size="small" color={colors.textInverse} />
          ) : (
            <Trash2 size={24} color={colors.secondaryLighter} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ backgroundColor: colors.background }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Document info */}
        <View style={styles.card}>
          <Text style={styles.docTitle}>{doc.title}</Text>
          {doc.manualPart ? (
            <InfoRow
              icon={<FileText size={14} color={colors.textSecondary} />}
              label={t("rag.admin.upload.manualPart")}
              value={doc.manualPart}
            />
          ) : null}
          {doc.issue ? (
            <InfoRow
              icon={<Hash size={14} color={colors.textSecondary} />}
              label={t("rag.admin.upload.issue")}
              value={doc.issue}
            />
          ) : null}
          {doc.revision ? (
            <InfoRow
              icon={<RefreshCw size={14} color={colors.textSecondary} />}
              label={t("rag.admin.upload.revision")}
              value={doc.revision}
            />
          ) : null}
          <InfoRow
            icon={<Calendar size={14} color={colors.textSecondary} />}
            label={t("rag.admin.upload.uploadedOn")}
            value={new Date(doc.createdAt).toLocaleDateString()}
          />
          <InfoRow
            icon={<FileText size={14} color={colors.textSecondary} />}
            label={t("rag.admin.upload.fileName")}
            value={doc.sourceFileName}
          />
        </View>

        {/* Ingestion section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {t("rag.admin.ingestion.title")}
            </Text>
            {displayJob && (
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: `${statusColor(displayJob.status)}20` },
                ]}
              >
                <StatusIcon status={displayJob.status} size={12} />
                <Text
                  style={[
                    styles.statusBadgeText,
                    { color: statusColor(displayJob.status) },
                  ]}
                >
                  {t(`rag.admin.status.${displayJob.status.toLowerCase()}`)}
                </Text>
              </View>
            )}
          </View>

          {canStart && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                actionPending && styles.actionButtonDisabled,
              ]}
              onPress={handleAction}
              disabled={actionPending}
            >
              {actionPending ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <>
                  {displayJob?.status === "FAILED" ? (
                    <RefreshCw size={16} color={colors.textInverse} />
                  ) : (
                    <Play size={16} color={colors.textInverse} />
                  )}
                  <Text style={styles.actionButtonText}>{actionLabel}</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {isJobActive && (
            <View style={styles.activeIndicator}>
              <ActivityIndicator size="small" color={colors.warning} />
              <Text style={styles.activeText}>
                {t("rag.admin.ingestion.running")}
              </Text>
            </View>
          )}
        </View>

        {/* Steps */}
        {displayJob?.steps && displayJob.steps.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.stepsTitle}>
              {t("rag.admin.ingestion.steps")}
            </Text>
            {/* Progress bar */}
            {(displayJob.status === "RUNNING" ||
              displayJob.status === "RETRYING") && (
              <ProgressBar steps={displayJob.steps} />
            )}
            {displayJob.steps.map((step) => (
              <StepRow
                key={step.id}
                stepName={step.stepName}
                status={step.status}
                errorMessage={step.errorMessage}
                payload={step.payload}
                progressCurrent={step.progressCurrent}
                progressTotal={step.progressTotal}
              />
            ))}
          </View>
        )}

        {/* Error message */}
        {displayJob?.errorMessage && (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>
              {t("rag.admin.ingestion.error")}
            </Text>
            <Text style={styles.errorText}>{displayJob.errorMessage}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const InfoRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
}> = ({ icon, label, value }) => (
  <View style={infoStyles.row}>
    {icon}
    <Text style={infoStyles.label}>{label}:</Text>
    <Text style={infoStyles.value} numberOfLines={1}>
      {value}
    </Text>
  </View>
);

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  label: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  value: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    flex: 1,
  },
});

const styles = StyleSheet.create({
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
  headerTitle: {
    flex: 1,
    color: colors.textInverse,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    textAlign: "center",
  },
  card: {
    backgroundColor: colors.surface,
    margin: spacing.md,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  docTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  section: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  statusBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: colors.textInverse,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.base,
  },
  activeIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: `${colors.warning}15`,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  activeText: {
    fontSize: typography.sizes.sm,
    color: colors.warning,
    fontWeight: typography.weights.medium,
  },
  stepsTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  errorCard: {
    backgroundColor: `${colors.error}10`,
    margin: spacing.md,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  errorTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.error,
  },
  errorText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    lineHeight: 20,
  },
});
