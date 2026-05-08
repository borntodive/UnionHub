import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookOpen,
  RefreshCw,
  CheckCircle,
  XCircle,
  SkipForward,
  FileText,
  Upload,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import * as DocumentPicker from "expo-document-picker";

import { colors, spacing, typography, borderRadius } from "../../theme";
import { Card } from "../../components/Card";
import { kbApi, IngestResponse, KbDocument } from "../../api/kb";

export function KbAdminScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [ingestResult, setIngestResult] = useState<IngestResponse | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<
    { filename: string; size: number }[]
  >([]);

  const {
    data: documents,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<KbDocument[]>({
    queryKey: ["kb-documents"],
    queryFn: kbApi.listDocuments,
  });

  const ingestMutation = useMutation({
    mutationFn: (force: boolean) => kbApi.ingest(force),
    onSuccess: (data) => {
      setIngestResult(data);
      refetch();
    },
    onError: () => {
      Alert.alert(t("kbAdmin.ingestError"), t("kbAdmin.ingestErrorMessage"));
    },
  });

  const handleIngest = (force: boolean) => {
    Alert.alert(
      force ? t("kbAdmin.forceIngestTitle") : t("kbAdmin.ingestTitle"),
      force ? t("kbAdmin.forceIngestMessage") : t("kbAdmin.ingestMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("kbAdmin.confirm"),
          onPress: () => ingestMutation.mutate(force),
        },
      ],
    );
  };

  const uploadMutation = useMutation({
    mutationFn: (files: { uri: string; name: string; mimeType?: string }[]) =>
      kbApi.uploadFiles(files),
    onSuccess: (data) => {
      setUploadedFiles(data.uploaded);
      Alert.alert(
        t("kbAdmin.uploadSuccess"),
        t("kbAdmin.uploadSuccessMessage", { count: data.uploaded.length }),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("kbAdmin.ingestButton"),
            onPress: () => ingestMutation.mutate(false),
          },
        ],
      );
    },
    onError: () => {
      Alert.alert(t("kbAdmin.uploadError"), t("kbAdmin.uploadErrorMessage"));
    },
  });

  const handlePickAndUpload = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["text/markdown", "text/plain", "*/*"],
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const mdFiles = result.assets.filter((a) =>
      a.name.toLowerCase().endsWith(".md"),
    );
    if (!mdFiles.length) {
      Alert.alert(t("kbAdmin.uploadError"), t("kbAdmin.uploadMdOnly"));
      return;
    }
    uploadMutation.mutate(
      mdFiles.map((f) => ({ uri: f.uri, name: f.name, mimeType: f.mimeType })),
    );
  };

  const renderDocument = ({ item }: { item: KbDocument }) => (
    <View style={styles.documentRow}>
      <FileText size={18} color={colors.primary} style={styles.documentIcon} />
      <View style={styles.documentInfo}>
        <Text style={styles.documentTitle}>{item.title}</Text>
        <Text style={styles.documentSections}>
          {t("kbAdmin.sections", { count: item.section_count })}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View
        style={[styles.header, { paddingTop: insets.top > 0 ? 0 : spacing.md }]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("kbAdmin.title")}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <BookOpen size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>
              {t("kbAdmin.documentsTitle")}
            </Text>
            <Text style={styles.documentCount}>
              {documents ? `(${documents.length})` : ""}
            </Text>
          </View>

          {isLoading ? (
            <ActivityIndicator color={colors.primary} style={styles.loader} />
          ) : documents && documents.length > 0 ? (
            <FlatList
              data={documents}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderDocument}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          ) : (
            <Text style={styles.emptyText}>{t("kbAdmin.noDocuments")}</Text>
          )}
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>{t("kbAdmin.uploadTitle")}</Text>
          <Text style={styles.ingestDescription}>
            {t("kbAdmin.uploadDescription")}
          </Text>
          <TouchableOpacity
            style={[
              styles.ingestButton,
              uploadMutation.isPending && styles.buttonDisabled,
            ]}
            onPress={handlePickAndUpload}
            disabled={uploadMutation.isPending}
          >
            {uploadMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Upload size={18} color="#fff" />
            )}
            <Text style={styles.buttonText}>{t("kbAdmin.uploadButton")}</Text>
          </TouchableOpacity>

          {uploadedFiles.length > 0 && (
            <View style={styles.uploadedList}>
              {uploadedFiles.map((f, i) => (
                <View key={i} style={styles.uploadedRow}>
                  <CheckCircle size={14} color={colors.success} />
                  <Text style={styles.uploadedFilename}>{f.filename}</Text>
                  <Text style={styles.uploadedSize}>
                    {(f.size / 1024).toFixed(1)} KB
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t("kbAdmin.ingestSectionTitle")}
          </Text>
          <Text style={styles.ingestDescription}>
            {t("kbAdmin.ingestDescription")}
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.ingestButton,
                ingestMutation.isPending && styles.buttonDisabled,
              ]}
              onPress={() => handleIngest(false)}
              disabled={ingestMutation.isPending}
            >
              {ingestMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <RefreshCw size={18} color="#fff" />
              )}
              <Text style={styles.buttonText}>{t("kbAdmin.ingestButton")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.forceButton,
                ingestMutation.isPending && styles.buttonDisabled,
              ]}
              onPress={() => handleIngest(true)}
              disabled={ingestMutation.isPending}
            >
              {ingestMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <RefreshCw size={18} color={colors.primary} />
              )}
              <Text style={styles.forceButtonText}>
                {t("kbAdmin.forceIngestButton")}
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {ingestResult && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>{t("kbAdmin.resultTitle")}</Text>

            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{ingestResult.total}</Text>
                <Text style={styles.statLabel}>{t("kbAdmin.total")}</Text>
              </View>
              <View style={styles.stat}>
                <CheckCircle size={16} color={colors.success} />
                <Text style={[styles.statValue, { color: colors.success }]}>
                  {ingestResult.ingested}
                </Text>
                <Text style={styles.statLabel}>{t("kbAdmin.ingested")}</Text>
              </View>
              <View style={styles.stat}>
                <SkipForward size={16} color={colors.warning} />
                <Text style={[styles.statValue, { color: colors.warning }]}>
                  {ingestResult.skipped}
                </Text>
                <Text style={styles.statLabel}>{t("kbAdmin.skipped")}</Text>
              </View>
              <View style={styles.stat}>
                <XCircle size={16} color={colors.error} />
                <Text style={[styles.statValue, { color: colors.error }]}>
                  {ingestResult.failed}
                </Text>
                <Text style={styles.statLabel}>{t("kbAdmin.failed")}</Text>
              </View>
            </View>

            {ingestResult.documents.map((doc, idx) => (
              <View key={idx} style={styles.resultRow}>
                {doc.status === "ingested" ? (
                  <CheckCircle size={14} color={colors.success} />
                ) : doc.status === "failed" ? (
                  <XCircle size={14} color={colors.error} />
                ) : (
                  <SkipForward size={14} color={colors.warning} />
                )}
                <View style={styles.resultInfo}>
                  <Text style={styles.resultFilename}>
                    {doc.title ?? doc.filename}
                  </Text>
                  {doc.sections != null && (
                    <Text style={styles.resultMeta}>
                      {t("kbAdmin.sections", { count: doc.sections })}
                    </Text>
                  )}
                  {doc.reason && (
                    <Text style={styles.resultReason}>{doc.reason}</Text>
                  )}
                </View>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  section: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  sectionTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  documentCount: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  loader: {
    marginVertical: spacing.md,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: "center",
    paddingVertical: spacing.md,
  },
  documentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  documentIcon: {
    marginTop: 2,
  },
  documentInfo: {
    flex: 1,
  },
  documentTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  documentSections: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
  },
  ingestDescription: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  ingestButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  forceButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    gap: spacing.xs,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  forceButtonText: {
    color: colors.primary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stat: {
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  resultInfo: {
    flex: 1,
  },
  resultFilename: {
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  resultMeta: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  resultReason: {
    fontSize: typography.sizes.xs,
    color: colors.error,
    fontStyle: "italic",
  },
  uploadedList: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  uploadedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  uploadedFilename: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  uploadedSize: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
});
