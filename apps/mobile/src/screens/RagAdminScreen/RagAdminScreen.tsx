import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import {
  Menu,
  BookOpen,
  Upload,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Loader,
  RefreshCw,
  Wifi,
  WifiOff,
  Database,
  Cpu,
  Activity,
  FileText,
  ChevronRight,
} from "lucide-react-native";
import * as DocumentPicker from "expo-document-picker";
import { colors, spacing, typography, borderRadius } from "../../theme";
import {
  ragApi,
  RagDocument,
  RagHealthStatus,
  UploadDocumentDto,
  RAG_QUERY_KEYS,
  IngestionJob,
} from "../../api/rag";

// ── Health status badge ──────────────────────────────────────────────────────

const StatusDot: React.FC<{ ok: boolean; label: string }> = ({ ok, label }) => (
  <View style={statusStyles.item}>
    {ok ? (
      <CheckCircle2 size={14} color={colors.success} />
    ) : (
      <XCircle size={14} color={colors.error} />
    )}
    <Text
      style={[
        statusStyles.label,
        { color: ok ? colors.success : colors.error },
      ]}
    >
      {label}
    </Text>
  </View>
);

const statusStyles = StyleSheet.create({
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  label: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
});

// ── Document row ──────────────────────────────────────────────────────────────

const stepOrder = ["parse", "chunk", "embed", "index"];

const getCurrentStepLabel = (job: IngestionJob | undefined): string | null => {
  if (!job || !job.steps || job.steps.length === 0) return null;
  const jobStatus = job.status?.toUpperCase();
  if (jobStatus === "COMPLETED") return "Indexing completed";
  if (jobStatus === "FAILED") return "Indexing failed";

  // Find the currently running step
  const runningStep = job.steps.find(
    (s) => s.status?.toUpperCase() === "RUNNING",
  );
  if (runningStep) {
    return `Step ${stepOrder.indexOf(runningStep.stepName) + 1}/${stepOrder.length}: ${runningStep.stepName}`;
  }

  // Find pending step
  const pendingStep = job.steps.find(
    (s) => s.status?.toUpperCase() === "PENDING",
  );
  if (pendingStep) {
    return `Step ${stepOrder.indexOf(pendingStep.stepName) + 1}/${stepOrder.length}: ${pendingStep.stepName}`;
  }

  return "Processing...";
};

const DocumentRow: React.FC<{ doc: RagDocument; onPress: () => void }> = ({
  doc,
  onPress,
}) => {
  const { t } = useTranslation();
  const latestJob = doc.ingestionJobs?.[doc.ingestionJobs.length - 1];
  const statusUpper = latestJob?.status?.toUpperCase();

  // DEBUG
  console.log(`DocumentRow ${doc.code}:`, {
    jobStatus: latestJob?.status,
    statusUpper,
    stepsCount: latestJob?.steps?.length,
    steps: latestJob?.steps,
    isActive:
      statusUpper === "RUNNING" ||
      statusUpper === "RETRYING" ||
      statusUpper === "PENDING",
  });
  const isActive =
    statusUpper === "RUNNING" ||
    statusUpper === "RETRYING" ||
    statusUpper === "PENDING";

  const jobStatusColor = (status?: string) => {
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

  const stepLabel = getCurrentStepLabel(latestJob);

  return (
    <TouchableOpacity
      style={docStyles.row}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={docStyles.iconWrapper}>
        {isActive ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <FileText size={20} color={colors.primary} />
        )}
      </View>
      <View style={docStyles.info}>
        <Text style={docStyles.code}>{doc.code}</Text>
        <Text style={docStyles.title} numberOfLines={1}>
          {doc.title}
        </Text>
        {latestJob && (
          <>
            <Text
              style={[
                docStyles.status,
                { color: jobStatusColor(latestJob.status) },
              ]}
            >
              {t(`rag.admin.status.${latestJob.status.toLowerCase()}`)}
            </Text>
            {isActive && stepLabel && (
              <Text style={docStyles.stepText}>{stepLabel}</Text>
            )}
          </>
        )}
        {!latestJob && (
          <Text style={docStyles.status}>{t("rag.admin.notIngested")}</Text>
        )}
      </View>
      <ChevronRight size={18} color={colors.textTertiary} />
    </TouchableOpacity>
  );
};

const docStyles = StyleSheet.create({
  stepText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontStyle: "italic",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  info: {
    flex: 1,
    gap: 2,
  },
  code: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  title: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  status: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
  },
});

// ── Upload modal ─────────────────────────────────────────────────────────────

interface UploadModalProps {
  visible: boolean;
  onClose: () => void;
  onUpload: (fileUri: string, fileName: string, dto: UploadDocumentDto) => void;
  uploading: boolean;
}

const UploadModal: React.FC<UploadModalProps> = ({
  visible,
  onClose,
  onUpload,
  uploading,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [file, setFile] = useState<{ uri: string; name: string } | null>(null);
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [manualPart, setManualPart] = useState("");
  const [issue, setIssue] = useState("");
  const [revision, setRevision] = useState("");

  const reset = () => {
    setFile(null);
    setCode("");
    setTitle("");
    setManualPart("");
    setIssue("");
    setRevision("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handlePickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      setFile({ uri: result.assets[0].uri, name: result.assets[0].name });
    }
  };

  const handleSubmit = () => {
    if (!file) {
      Alert.alert(t("common.error"), t("rag.admin.upload.noFile"));
      return;
    }
    if (!code.trim() || !title.trim()) {
      Alert.alert(t("common.error"), t("rag.admin.upload.requiredFields"));
      return;
    }
    onUpload(file.uri, file.name, {
      code: code.trim(),
      title: title.trim(),
      manualPart: manualPart.trim() || undefined,
      issue: issue.trim() || undefined,
      revision: revision.trim() || undefined,
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={modalStyles.container} edges={["top"]}>
        <View style={modalStyles.header}>
          <Text style={modalStyles.headerTitle}>
            {t("rag.admin.upload.title")}
          </Text>
          <TouchableOpacity onPress={handleClose} disabled={uploading}>
            <Text style={modalStyles.cancelText}>{t("common.cancel")}</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={insets.top + 56}
        >
          <ScrollView
            style={modalStyles.form}
            contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
            keyboardShouldPersistTaps="handled"
          >
            {/* File picker */}
            <TouchableOpacity
              style={modalStyles.filePicker}
              onPress={handlePickFile}
            >
              <Upload size={20} color={colors.primary} />
              <Text style={modalStyles.filePickerText}>
                {file ? file.name : t("rag.admin.upload.selectPdf")}
              </Text>
            </TouchableOpacity>

            <View style={modalStyles.field}>
              <Text style={modalStyles.label}>
                {t("rag.admin.upload.code")} *
              </Text>
              <TextInput
                style={modalStyles.input}
                value={code}
                onChangeText={setCode}
                placeholder="OMA-P8"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="characters"
              />
            </View>

            <View style={modalStyles.field}>
              <Text style={modalStyles.label}>
                {t("rag.admin.upload.titleField")} *
              </Text>
              <TextInput
                style={modalStyles.input}
                value={title}
                onChangeText={setTitle}
                placeholder={t("rag.admin.upload.titlePlaceholder")}
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            <View style={modalStyles.field}>
              <Text style={modalStyles.label}>
                {t("rag.admin.upload.manualPart")}
              </Text>
              <TextInput
                style={modalStyles.input}
                value={manualPart}
                onChangeText={setManualPart}
                placeholder={t("rag.admin.upload.manualPartPlaceholder")}
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            <View style={modalStyles.row}>
              <View style={[modalStyles.field, { flex: 1 }]}>
                <Text style={modalStyles.label}>
                  {t("rag.admin.upload.issue")}
                </Text>
                <TextInput
                  style={modalStyles.input}
                  value={issue}
                  onChangeText={setIssue}
                  placeholder="01"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
              <View style={[modalStyles.field, { flex: 1 }]}>
                <Text style={modalStyles.label}>
                  {t("rag.admin.upload.revision")}
                </Text>
                <TextInput
                  style={modalStyles.input}
                  value={revision}
                  onChangeText={setRevision}
                  placeholder="00"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[
                modalStyles.submitButton,
                uploading && modalStyles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <Text style={modalStyles.submitText}>
                  {t("rag.admin.upload.submit")}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const modalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  cancelText: {
    fontSize: typography.sizes.base,
    color: colors.primary,
  },
  form: {
    flex: 1,
  },
  filePicker: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: "dashed",
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    justifyContent: "center",
  },
  filePickerText: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    fontWeight: typography.weights.medium,
    flexShrink: 1,
  },
  field: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: "row",
    gap: spacing.md,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.base,
    color: colors.text,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.md,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: colors.textInverse,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
  },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export const RagAdminScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const [uploadVisible, setUploadVisible] = useState(false);

  const {
    data: documents = [],
    isLoading: docsLoading,
    refetch: refetchDocs,
    isRefetching,
  } = useQuery({
    queryKey: RAG_QUERY_KEYS.documents,
    queryFn: ragApi.listDocuments,
  });

  const { data: health, isLoading: healthLoading } = useQuery({
    queryKey: RAG_QUERY_KEYS.health,
    queryFn: ragApi.health,
    refetchInterval: 30_000,
  });

  const { mutate: uploadDoc, isPending: uploading } = useMutation({
    mutationFn: ({
      fileUri,
      fileName,
      dto,
    }: {
      fileUri: string;
      fileName: string;
      dto: UploadDocumentDto;
    }) => ragApi.uploadDocument(fileUri, fileName, dto),
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: RAG_QUERY_KEYS.documents });
      setUploadVisible(false);
      Alert.alert(
        t("common.success"),
        t("rag.admin.upload.success", { code: doc.code }),
      );
    },
    onError: (err: any) => {
      Alert.alert(
        t("common.error"),
        err?.response?.data?.message || t("rag.admin.upload.error"),
      );
    },
  });

  const handleUpload = (
    fileUri: string,
    fileName: string,
    dto: UploadDocumentDto,
  ) => {
    uploadDoc({ fileUri, fileName, dto });
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
          <Text style={styles.headerTitle}>{t("rag.admin.title")}</Text>
        </View>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => setUploadVisible(true)}
        >
          <Plus size={24} color={colors.textInverse} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ backgroundColor: colors.background }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetchDocs} />
        }
      >
        {/* Health card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("rag.admin.systemStatus")}</Text>
          <View style={styles.healthCard}>
            {healthLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : health ? (
              <View style={styles.healthGrid}>
                <StatusDot ok={health.redis} label="Redis" />
                <StatusDot ok={health.pythonService} label="Python" />
                <StatusDot ok={health.pgvector} label="pgvector" />
                <StatusDot ok={health.ollama} label="Ollama" />
              </View>
            ) : (
              <Text style={styles.healthError}>
                {t("rag.admin.healthError")}
              </Text>
            )}
          </View>
        </View>

        {/* Processing badge */}
        {(() => {
          const processingCount = documents.filter((d) =>
            d.ingestionJobs?.some((j) => {
              const status = j.status?.toUpperCase();
              return (
                status === "PENDING" ||
                status === "RUNNING" ||
                status === "RETRYING"
              );
            }),
          ).length;
          return processingCount > 0 ? (
            <View style={styles.section}>
              <View style={styles.processingBadge}>
                <Loader size={14} color={colors.warning} />
                <Text style={styles.processingText}>
                  {t("rag.admin.processing", { count: processingCount })}
                </Text>
              </View>
            </View>
          ) : null;
        })()}

        {/* Documents list */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("rag.admin.documents")}</Text>
            <Text style={styles.sectionCount}>{documents.length}</Text>
          </View>
        </View>

        {/* DEBUG: Log documents data */}
        {(() => {
          console.log("=== RAG DEBUG ===");
          console.log("Documents:", documents);
          documents.forEach((d) => {
            console.log(`Doc ${d.code}:`, {
              jobsCount: d.ingestionJobs?.length,
              latestJob: d.ingestionJobs?.[d.ingestionJobs.length - 1],
            });
          });
          console.log("================");
          return null;
        })()}

        {docsLoading ? (
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={{ marginTop: spacing.xl }}
          />
        ) : documents.length === 0 ? (
          <View style={styles.emptyState}>
            <BookOpen size={40} color={colors.border} />
            <Text style={styles.emptyText}>{t("rag.admin.noDocuments")}</Text>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => setUploadVisible(true)}
            >
              <Upload size={16} color={colors.textInverse} />
              <Text style={styles.uploadButtonText}>
                {t("rag.admin.upload.title")}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.listCard}>
            {documents.map((doc) => (
              <DocumentRow
                key={doc.id}
                doc={doc}
                onPress={() =>
                  (navigation as any).navigate("RagDocumentDetail", {
                    documentId: doc.id,
                  })
                }
              />
            ))}
          </View>
        )}
      </ScrollView>

      <UploadModal
        visible={uploadVisible}
        onClose={() => setUploadVisible(false)}
        onUpload={handleUpload}
        uploading={uploading}
      />
    </SafeAreaView>
  );
};

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
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
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
  sectionCount: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
    fontWeight: typography.weights.medium,
  },
  processingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: `${colors.warning}15`,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignSelf: "flex-start",
  },
  processingText: {
    fontSize: typography.sizes.sm,
    color: colors.warning,
    fontWeight: typography.weights.medium,
  },
  healthCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  healthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  healthError: {
    fontSize: typography.sizes.sm,
    color: colors.error,
  },
  listCard: {
    backgroundColor: colors.surface,
    marginTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  emptyText: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  uploadButtonText: {
    color: colors.textInverse,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.sm,
  },
});
