import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useOfflineStore } from "../../store/offlineStore";
import { Menu, AlertTriangle, Download, Cpu, X } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import { colors, spacing, typography, borderRadius } from "../../theme";
import { issuesApi } from "../../api/issues";
import { Issue, IssueStatus } from "../../types";

const getStatusColor = (status: IssueStatus) => {
  switch (status) {
    case IssueStatus.OPEN:
      return "#22c55e";
    case IssueStatus.IN_PROGRESS:
      return "#f59e0b";
    case IssueStatus.SOLVED:
      return "#22c55e";
    default:
      return "#6b7280";
  }
};

const ALL_STATUSES = [
  null,
  IssueStatus.OPEN,
  IssueStatus.IN_PROGRESS,
  IssueStatus.SOLVED,
];

export const IssuesScreen: React.FC = () => {
  const navigation = useNavigation<DrawerNavigationProp<any>>();
  const pendingIssues = useOfflineStore((state) => state.pendingIssues);
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<IssueStatus | null>(null);
  const [summaryVisible, setSummaryVisible] = useState(false);
  const [summaryText, setSummaryText] = useState("");
  const [summaryPdfBase64, setSummaryPdfBase64] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryPdfLoading, setSummaryPdfLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const { data: issues, refetch } = useQuery({
    queryKey: ["adminIssues"],
    queryFn: issuesApi.getIssues,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const localName = (item: { nameIt: string; nameEn: string }) =>
    i18n.language === "it" ? item.nameIt : item.nameEn;

  const getStatusLabel = (status: IssueStatus | null) => {
    if (!status) return t("common.all");
    switch (status) {
      case IssueStatus.OPEN:
        return t("issues.statusOpen");
      case IssueStatus.IN_PROGRESS:
        return t("issues.statusInProgress");
      case IssueStatus.SOLVED:
        return t("issues.statusSolved");
      default:
        return status;
    }
  };

  const filteredIssues = filterStatus
    ? (issues || []).filter((i) => i.status === filterStatus)
    : issues || [];

  const handleSummary = async () => {
    setSummaryLoading(true);
    setSummaryVisible(true);
    try {
      const result = await issuesApi.getSummary();
      setSummaryText(result.summary);
      setSummaryPdfBase64(result.pdfBase64 || "");
    } catch {
      setSummaryText(t("issues.summaryError"));
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleSummaryPdf = async () => {
    if (!summaryPdfBase64) return;
    setSummaryPdfLoading(true);
    try {
      const fileUri = FileSystem.cacheDirectory + "summary.pdf";
      await FileSystem.writeAsStringAsync(fileUri, summaryPdfBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await Sharing.shareAsync(fileUri, { mimeType: "application/pdf" });
    } catch (err: any) {
      Alert.alert(t("common.error"), t("issues.exportError"));
    } finally {
      setSummaryPdfLoading(false);
    }
  };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const csv = await issuesApi.exportCsv();
      const fileUri = FileSystem.cacheDirectory + "issues_export.csv";
      await FileSystem.writeAsStringAsync(fileUri, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      await Sharing.shareAsync(fileUri, {
        mimeType: "text/csv",
        dialogTitle: t("issues.exportTitle"),
      });
    } catch {
      Alert.alert(t("common.error"), t("issues.exportError"));
    } finally {
      setExportLoading(false);
    }
  };

  const renderItem = ({ item }: { item: Issue }) => (
    <TouchableOpacity
      style={styles.itemCard}
      onPress={() => navigation.navigate("IssueDetail", { issueId: item.id })}
    >
      <View style={styles.itemHeader}>
        <Text style={styles.itemTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) + "20" },
          ]}
        >
          <Text
            style={[styles.statusText, { color: getStatusColor(item.status) }]}
          >
            {getStatusLabel(item.status)}
          </Text>
        </View>
      </View>
      <View style={styles.itemMeta}>
        <Text style={styles.metaText}>{item.user?.crewcode || ""}</Text>
        {item.category && (
          <Text style={styles.metaText}>• {localName(item.category)}</Text>
        )}
        {item.urgency && (
          <Text style={styles.metaText}>• L{item.urgency.level}</Text>
        )}
        <Text style={styles.metaText}>
          • {new Date(item.createdAt).toLocaleDateString(i18n.language)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.wrapper}>
      <View style={[styles.statusBarHack, { height: insets.top }]} />
      <SafeAreaView
        style={styles.container}
        edges={["bottom", "left", "right"]}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.openDrawer()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Menu size={24} color={colors.textInverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("issues.manageIssues")}</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={handleSummary}
              style={styles.iconButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Cpu size={22} color={colors.textInverse} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleExport}
              style={styles.iconButton}
              disabled={exportLoading}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {exportLoading ? (
                <ActivityIndicator color={colors.textInverse} size="small" />
              ) : (
                <Download size={22} color={colors.textInverse} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Filter chips */}
        <View style={styles.filterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChips}
          >
            {ALL_STATUSES.map((status) => (
              <TouchableOpacity
                key={String(status)}
                style={[
                  styles.chip,
                  filterStatus === status && styles.chipSelected,
                ]}
                onPress={() => setFilterStatus(status)}
              >
                <Text
                  style={[
                    styles.chipText,
                    filterStatus === status && styles.chipTextSelected,
                  ]}
                >
                  {getStatusLabel(status)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <FlatList
          data={filteredIssues}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          removeClippedSubviews
          maxToRenderPerBatch={10}
          windowSize={5}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <AlertTriangle size={64} color={colors.textTertiary} />
              <Text style={styles.emptyText}>{t("issues.noIssues")}</Text>
            </View>
          }
        />

        {/* DEBUG — Offline queue (dev only) */}
        {__DEV__ && pendingIssues.length > 0 && (
          <View style={styles.debugContainer}>
            <Text style={styles.debugTitle}>
              🛜 DEBUG — Coda offline ({pendingIssues.length})
            </Text>
            {pendingIssues.map((issue) => (
              <View key={issue.localId} style={styles.debugItem}>
                <Text style={styles.debugId}>ID: {issue.localId}</Text>
                <Text style={styles.debugText}>📋 {issue.title}</Text>
                <Text style={styles.debugText}>📝 {issue.description}</Text>
                <Text style={styles.debugText}>
                  🏷 categoryId: {issue.categoryId}
                </Text>
                <Text style={styles.debugText}>
                  ⚡ urgencyId: {issue.urgencyId}
                </Text>
                <Text style={styles.debugText}>
                  🕐 {new Date(issue.createdAt).toLocaleString()}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* AI Summary Modal */}
        <Modal visible={summaryVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t("issues.aiSummary")}</Text>
                <TouchableOpacity onPress={() => setSummaryVisible(false)}>
                  <X size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalContent}>
                {summaryLoading ? (
                  <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>
                      {t("common.pleaseWait")}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.summaryText}>{summaryText}</Text>
                )}
              </ScrollView>
              {!summaryLoading && summaryPdfBase64 ? (
                <TouchableOpacity
                  style={styles.pdfButton}
                  onPress={handleSummaryPdf}
                  disabled={summaryPdfLoading}
                >
                  {summaryPdfLoading ? (
                    <ActivityIndicator
                      color={colors.textInverse}
                      size="small"
                    />
                  ) : (
                    <>
                      <Download size={16} color={colors.textInverse} />
                      <Text style={styles.pdfButtonText}>PDF</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  debugContainer: {
    margin: spacing.md,
    padding: spacing.md,
    backgroundColor: "#1a1a2e",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#f59e0b",
  },
  debugTitle: {
    color: "#f59e0b",
    fontWeight: "bold",
    fontSize: 13,
    marginBottom: spacing.sm,
    fontFamily: "monospace",
  },
  debugItem: {
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  debugId: {
    color: "#888",
    fontSize: 10,
    fontFamily: "monospace",
    marginBottom: 2,
  },
  debugText: {
    color: "#e2e8f0",
    fontSize: 12,
    fontFamily: "monospace",
    marginBottom: 2,
  },
  wrapper: { flex: 1, backgroundColor: colors.primary },
  statusBarHack: { backgroundColor: colors.primary },
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    minHeight: 56,
  },
  backButton: {
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
  headerActions: { flexDirection: "row", gap: spacing.xs },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  filterContainer: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterChips: { padding: spacing.sm, gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: { fontSize: typography.sizes.sm, color: colors.text },
  chipTextSelected: {
    color: colors.textInverse,
    fontWeight: typography.weights.medium,
  },
  listContent: { padding: spacing.md },
  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  itemTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  itemMeta: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  metaText: { fontSize: typography.sizes.xs, color: colors.textSecondary },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl * 2,
  },
  emptyText: {
    fontSize: typography.sizes.lg,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.md * 2,
    borderTopRightRadius: borderRadius.md * 2,
    maxHeight: "70%",
    padding: spacing.md,
    flexShrink: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  modalContent: { flexGrow: 1, flexShrink: 1 },
  centered: { alignItems: "center", paddingVertical: spacing.xl },
  loadingText: { color: colors.textSecondary, marginTop: spacing.md },
  summaryText: {
    fontSize: typography.sizes.base,
    color: colors.text,
    lineHeight: 22,
  },
  pdfButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
  },
  pdfButtonText: {
    color: colors.textInverse,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
});
