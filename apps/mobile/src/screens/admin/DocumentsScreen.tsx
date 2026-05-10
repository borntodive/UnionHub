import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useNavigation, DrawerActions } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Menu,
  Plus,
  FileText,
  Trash2,
  Edit3,
  Eye,
  CheckCircle,
  Sparkles,
  Cpu,
  Upload,
  Zap,
} from "lucide-react-native";
import * as DocumentPicker from "expo-document-picker";

import { colors, spacing, typography, borderRadius } from "../../theme";
import {
  documentsApi,
  Document,
  DocumentStatus,
  UnionType,
} from "../../api/documents";
import { RootStackParamList } from "../../navigation/types";
import { useAuthStore } from "../../store/authStore";
import { UserRole } from "../../types";

type DocumentsScreenNavigationProp =
  NativeStackNavigationProp<RootStackParamList>;

const STATUS_COLORS: Record<DocumentStatus, string> = {
  draft: colors.textSecondary,
  published: colors.success,
};

export const DocumentsScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<DocumentsScreenNavigationProp>();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [ruoloFilter, setRuoloFilter] = useState<
    "all" | "pilot" | "cabin_crew"
  >("all");

  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === UserRole.SUPERADMIN;

  const {
    data: documents,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["documents"],
    queryFn: documentsApi.getDocuments,
  });

  // Filter documents by ruolo if SuperAdmin
  const filteredDocuments = documents?.filter((doc) => {
    if (!isSuperAdmin || ruoloFilter === "all") return true;
    return doc.ruolo === ruoloFilter;
  });

  const { data: aiHealth } = useQuery({
    queryKey: ["aiHealth"],
    queryFn: documentsApi.getAiHealth,
    refetchInterval: 30000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentsApi.deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      Alert.alert(t("common.success"), "Document deleted");
    },
    onError: (error: any) => {
      Alert.alert(
        t("common.error"),
        error.response?.data?.message || t("errors.generic"),
      );
    },
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => documentsApi.publishDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      Alert.alert(t("common.success"), "Document published successfully!");
    },
    onError: (error: any) => {
      Alert.alert(
        t("common.error"),
        error.response?.data?.message || t("errors.generic"),
      );
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (data: {
      fileUri: string;
      fileName: string;
      title: string;
      union?: "fit-cisl" | "joint";
      ruolo?: "pilot" | "cabin_crew";
    }) => documentsApi.uploadDocument(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      Alert.alert(t("common.success"), "PDF uploaded successfully!");
    },
    onError: (error: any) => {
      Alert.alert(
        t("common.error"),
        error.response?.data?.message || t("errors.generic"),
      );
    },
  });

  const handleUpload = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf"],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.length) return;

    const file = result.assets[0];

    Alert.prompt(
      "Enter Document Title",
      "What should this document be called?",
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: "Upload",
          onPress: (title?: string) => {
            if (!title?.trim()) {
              Alert.alert(t("common.error"), "Title is required");
              return;
            }
            uploadMutation.mutate({
              fileUri: file.uri,
              fileName: file.name,
              title: title.trim(),
              ruolo: isSuperAdmin
                ? ruoloFilter === "all"
                  ? "pilot"
                  : ruoloFilter
                : user?.ruolo === "cabin_crew"
                  ? "cabin_crew"
                  : "pilot",
            });
          },
        },
      ],
      "plain-text",
    );
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleAdd = () => {
    navigation.navigate("DocumentEditor", {} as never);
  };

  const handleEdit = (document: Document) => {
    navigation.navigate("DocumentEditor", { documentId: document.id } as never);
  };

  const handleViewPdf = (document: Document) => {
    navigation.navigate("PdfViewer", {
      documentId: document.id,
      title: document.title,
    } as never);
  };

  const handleDelete = (document: Document) => {
    if (document.status === "published") {
      Alert.alert(
        "Cannot Delete",
        "Published documents cannot be deleted. Please unpublish first.",
      );
      return;
    }

    Alert.alert(
      "Delete Document",
      "Are you sure you want to delete this document?",
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMutation.mutate(document.id),
        },
      ],
    );
  };

  const handlePublish = (document: Document) => {
    if (!document.finalPdfUrl && !document.aiReviewedContent) {
      Alert.alert(
        "Cannot Publish",
        "Please process the document first to generate AI content and PDF.",
      );
      return;
    }
    publishMutation.mutate(document.id);
  };

  const renderStatusBadge = (status: DocumentStatus) => (
    <View
      style={[
        styles.statusBadge,
        { backgroundColor: STATUS_COLORS[status] + "20" },
      ]}
    >
      <Text style={[styles.statusText, { color: STATUS_COLORS[status] }]}>
        {status === "published" ? "Published" : "Draft"}
      </Text>
    </View>
  );

  const renderUnionBadge = (union: UnionType) => {
    if (union === "joint") {
      return (
        <View style={[styles.unionBadge, styles.unionBadgeJoint]}>
          <View style={styles.unionDotJoint}>
            <View
              style={[styles.unionDotHalf, { backgroundColor: colors.primary }]}
            />
            <View
              style={[styles.unionDotHalf, { backgroundColor: "#003399" }]}
            />
          </View>
          <Text style={[styles.unionBadgeText, styles.unionBadgeTextJoint]}>
            FIT-CISL + ANPAC
          </Text>
        </View>
      );
    }
    return (
      <View style={[styles.unionBadge, styles.unionBadgeCisl]}>
        <View style={[styles.unionDot, { backgroundColor: colors.primary }]} />
        <Text style={[styles.unionBadgeText, styles.unionBadgeTextCisl]}>
          FIT-CISL
        </Text>
      </View>
    );
  };

  const renderItem = ({ item }: { item: Document }) => {
    const isDraft = item.status === "draft";
    const isProcessed = !!item.aiReviewedContent && !!item.finalPdfUrl;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleEdit(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
            <FileText size={24} color={colors.primary} />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.cardMeta}>
              By {item.author?.nome} {item.author?.cognome} •{" "}
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
            <View style={styles.cardBadgeRow}>
              {renderUnionBadge(item.union || "fit-cisl")}
              {renderStatusBadge(item.status)}
            </View>
          </View>
        </View>

        <View style={styles.cardActions}>
          {isDraft && (
            <>
              <TouchableOpacity
                onPress={() => handleEdit(item)}
                style={styles.actionButton}
              >
                <Edit3 size={18} color={colors.primary} />
                <Text style={styles.actionText}>{t("common.edit")}</Text>
              </TouchableOpacity>

              {isProcessed ? (
                <TouchableOpacity
                  onPress={() => handlePublish(item)}
                  style={[styles.actionButton, styles.publishActionButton]}
                >
                  <CheckCircle size={18} color={colors.success} />
                  <Text style={[styles.actionText, { color: colors.success }]}>
                    Publish
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => handleEdit(item)}
                  style={styles.actionButton}
                >
                  <Sparkles size={18} color={colors.warning} />
                  <Text style={[styles.actionText, { color: colors.warning }]}>
                    Process
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => handleDelete(item)}
                style={styles.actionButton}
              >
                <Trash2 size={18} color={colors.error} />
                <Text style={[styles.actionText, { color: colors.error }]}>
                  {t("common.delete")}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {!isDraft && (
            <>
              <TouchableOpacity
                onPress={() => handleViewPdf(item)}
                style={styles.actionButton}
              >
                <Eye size={18} color={colors.primary} />
                <Text style={styles.actionText}>View PDF</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleEdit(item)}
                style={styles.actionButton}
              >
                <Edit3 size={18} color={colors.primary} />
                <Text style={styles.actionText}>{t("common.edit")}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={[styles.statusBarHack, { height: insets.top }]} />
        <SafeAreaView
          style={styles.container}
          edges={["bottom", "left", "right"]}
        >
          <View style={styles.centered}>
            <Text>{t("common.loading")}</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container} testID="documents-screen">
      <View style={[styles.statusBarHack, { height: insets.top }]} />
      <SafeAreaView
        style={styles.container}
        edges={["bottom", "left", "right"]}
      >
        {/* AI Status Bar */}
        {aiHealth && (
          <View
            style={[
              styles.aiBar,
              {
                backgroundColor: aiHealth.available
                  ? colors.success
                  : colors.error,
              },
            ]}
          >
            <Cpu size={16} color={colors.textInverse} />
            <Text style={styles.aiText}>
              AI {aiHealth.isCloud && "Cloud"}{" "}
              {aiHealth.available ? "Online" : "Offline"}
              {aiHealth.available && ` • ${aiHealth.model}`}
            </Text>
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            style={styles.menuButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            testID="menu-button"
          >
            <Menu size={24} color={colors.textInverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Documents</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={handleUpload}
              style={styles.addButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Upload size={24} color={colors.textInverse} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleAdd}
              style={styles.addButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Plus size={24} color={colors.textInverse} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Ruolo Filter - Only for SuperAdmin */}
        {isSuperAdmin && (
          <View style={styles.filterContainer}>
            <Text style={styles.filterLabel}>Filter by:</Text>
            <View style={styles.filterButtons}>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  ruoloFilter === "all" && styles.filterButtonActive,
                ]}
                onPress={() => setRuoloFilter("all")}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    ruoloFilter === "all" && styles.filterButtonTextActive,
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  ruoloFilter === "pilot" && styles.filterButtonActive,
                ]}
                onPress={() => setRuoloFilter("pilot")}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    ruoloFilter === "pilot" && styles.filterButtonTextActive,
                  ]}
                >
                  Pilots
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  ruoloFilter === "cabin_crew" && styles.filterButtonActive,
                ]}
                onPress={() => setRuoloFilter("cabin_crew")}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    ruoloFilter === "cabin_crew" &&
                      styles.filterButtonTextActive,
                  ]}
                >
                  Cabin Crew
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Content */}
        <FlatList
          data={filteredDocuments || []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <FileText size={64} color={colors.border} />
              <Text style={styles.emptyTitle}>No Documents</Text>
              <Text style={styles.emptyText}>
                Create your first document to get started
              </Text>
              <TouchableOpacity style={styles.emptyButton} onPress={handleAdd}>
                <Zap size={20} color={colors.textInverse} />
                <Text style={styles.emptyButtonText}>Create Document</Text>
              </TouchableOpacity>
            </View>
          }
        />
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  statusBarHack: {
    backgroundColor: colors.primary,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  aiBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  aiText: {
    color: colors.textInverse,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primary,
    minHeight: 56,
  },
  menuButton: {
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  addButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: spacing.md,
    flexGrow: 1,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary + "10",
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardMeta: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  cardBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  cardActions: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: spacing.lg,
  },
  actionText: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    marginLeft: spacing.xs,
  },
  publishActionButton: {
    marginRight: spacing.lg,
  },
  unionBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
    borderWidth: 1,
  },
  unionBadgeCisl: {
    backgroundColor: colors.primary + "15",
    borderColor: colors.primary + "30",
  },
  unionBadgeJoint: {
    backgroundColor: "#003399" + "10",
    borderColor: "#003399" + "25",
  },
  unionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  unionDotJoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexDirection: "row",
    overflow: "hidden",
  },
  unionDotHalf: {
    width: 4,
    height: 8,
  },
  unionBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  unionBadgeTextCisl: {
    color: colors.primary,
  },
  unionBadgeTextJoint: {
    color: "#003399",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
    marginTop: 100,
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  emptyButton: {
    flexDirection: "row",
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    alignItems: "center",
  },
  emptyButtonText: {
    color: colors.textInverse,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  filterContainer: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  filterButtons: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  filterButtonTextActive: {
    color: colors.textInverse,
    fontWeight: typography.weights.semibold,
  },
});

export default DocumentsScreen;
