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
} from "lucide-react-native";

import { colors, spacing, typography, borderRadius } from "../../theme";
import {
  documentsApi,
  Document,
  DocumentStatus,
  UnionType,
  DocumentRuolo,
} from "../../api/documents";
import { RootStackParamList } from "../../navigation/types";
import { useAuthStore } from "../../store/authStore";
import { UserRole } from "../../types";

type DocumentsScreenNavigationProp =
  NativeStackNavigationProp<RootStackParamList>;

const STATUS_COLORS: Record<DocumentStatus, string> = {
  draft: colors.textSecondary,
  reviewing: "#f59e0b",
  approved: "#22c55e",
  verified: "#8b5cf6",
  published: colors.primary,
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

  const { data: ollamaHealth } = useQuery({
    queryKey: ["ollamaHealth"],
    queryFn: documentsApi.getOllamaHealth,
    refetchInterval: 30000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentsApi.deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      Alert.alert(t("common.success"), t("documents.documentDeleted"));
    },
    onError: (error: any) => {
      Alert.alert(
        t("common.error"),
        error.response?.data?.message || t("errors.generic"),
      );
    },
  });

  const verifyMutation = useMutation({
    mutationFn: (id: string) => documentsApi.verifyDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      Alert.alert(t("common.success"), t("documents.documentVerified"));
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
      Alert.alert(t("common.success"), t("documents.documentPublished"));
    },
    onError: (error: any) => {
      Alert.alert(
        t("common.error"),
        error.response?.data?.message || t("errors.generic"),
      );
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleAdd = () => {
    navigation.navigate("DocumentEditor", {});
  };

  const handleEdit = (document: Document) => {
    navigation.navigate("DocumentEditor", { documentId: document.id });
  };

  const handleDelete = (document: Document) => {
    Alert.alert(t("documents.deleteDocument"), t("documents.deleteConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: () => deleteMutation.mutate(document.id),
      },
    ]);
  };

  const renderStatusBadge = (status: DocumentStatus) => (
    <View
      style={[
        styles.statusBadge,
        { backgroundColor: STATUS_COLORS[status] + "20" },
      ]}
    >
      <Text style={[styles.statusText, { color: STATUS_COLORS[status] }]}>
        {t(`documents.${status}`)}
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

  const renderRuoloBadge = (ruolo: "pilot" | "cabin_crew") => {
    return (
      <View
        style={[
          styles.ruoloBadge,
          ruolo === "pilot" ? styles.ruoloBadgePilot : styles.ruoloBadgeCC,
        ]}
      >
        <Text
          style={[
            styles.ruoloBadgeText,
            ruolo === "pilot"
              ? styles.ruoloBadgeTextPilot
              : styles.ruoloBadgeTextCC,
          ]}
        >
          {ruolo === "pilot" ? t("documents.pilots") : t("documents.cabinCrew")}
        </Text>
      </View>
    );
  };

  const renderItem = ({ item }: { item: Document }) => (
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
            {isSuperAdmin && renderRuoloBadge(item.ruolo || "pilot")}
            {renderStatusBadge(item.status)}
          </View>
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          onPress={() => handleEdit(item)}
          style={styles.actionButton}
        >
          <Edit3 size={18} color={colors.primary} />
          <Text style={styles.actionText}>{t("common.edit")}</Text>
        </TouchableOpacity>

        {item.status === "draft" && (
          <TouchableOpacity
            onPress={() => handleEdit(item)}
            style={styles.actionButton}
          >
            <Sparkles size={18} color={colors.primary} />
            <Text style={styles.actionText}>
              {t("documents.requestAiReview")}
            </Text>
          </TouchableOpacity>
        )}

        {item.status === "reviewing" && (
          <TouchableOpacity
            onPress={() => handleEdit(item)}
            style={styles.actionButton}
          >
            <CheckCircle size={18} color={colors.success} />
            <Text style={[styles.actionText, { color: colors.success }]}>
              {t("documents.reviewAiResult")}
            </Text>
          </TouchableOpacity>
        )}

        {item.status === "approved" && (
          <TouchableOpacity
            onPress={() => verifyMutation.mutate(item.id)}
            style={styles.actionButton}
          >
            <CheckCircle size={18} color={colors.primary} />
            <Text style={styles.actionText}>{t("documents.verify")}</Text>
          </TouchableOpacity>
        )}

        {item.status === "verified" && (
          <TouchableOpacity
            onPress={() => publishMutation.mutate(item.id)}
            style={[styles.actionButton, styles.publishButton]}
          >
            <Eye size={18} color={colors.textInverse} />
            <Text style={[styles.actionText, styles.publishText]}>
              {t("documents.publish")}
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
      </View>
    </TouchableOpacity>
  );

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
    <View style={styles.container}>
      <View style={[styles.statusBarHack, { height: insets.top }]} />
      <SafeAreaView
        style={styles.container}
        edges={["bottom", "left", "right"]}
      >
        {/* Ollama Status Bar */}
        {ollamaHealth && (
          <View
            style={[
              styles.ollamaBar,
              {
                backgroundColor: ollamaHealth.available
                  ? "#22c55e"
                  : colors.error,
              },
            ]}
          >
            <Cpu size={16} color={colors.textInverse} />
            <Text style={styles.ollamaText}>
              Ollama {ollamaHealth.isCloud && "Cloud"}{" "}
              {ollamaHealth.available ? "Online" : "Offline"}
              {ollamaHealth.available && ` • ${ollamaHealth.model}`}
            </Text>
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            style={styles.menuButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Menu size={24} color={colors.textInverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {t("documents.publicDocuments")}
          </Text>
          <TouchableOpacity
            onPress={handleAdd}
            style={styles.addButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Plus size={24} color={colors.textInverse} />
          </TouchableOpacity>
        </View>

        {/* Ruolo Filter - Only for SuperAdmin */}
        {isSuperAdmin && (
          <View style={styles.filterContainer}>
            <Text style={styles.filterLabel}>{t("documents.filterBy")}:</Text>
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
                  {t("common.all")}
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
                  {t("documents.pilots")}
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
                  {t("documents.cabinCrew")}
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
              <Text style={styles.emptyTitle}>
                {t("documents.noDocuments")}
              </Text>
              <Text style={styles.emptyText}>
                {t("documents.createDocument")}
              </Text>
              <TouchableOpacity style={styles.emptyButton} onPress={handleAdd}>
                <Text style={styles.emptyButtonText}>
                  {t("documents.createDocument")}
                </Text>
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
  ollamaBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  ollamaText: {
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
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  cardTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
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
  publishButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    marginRight: spacing.md,
  },
  publishText: {
    color: colors.textInverse,
    fontWeight: typography.weights.semibold,
  },
  ruoloBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
    borderWidth: 1,
  },
  ruoloBadgePilot: {
    backgroundColor: "#3b82f6" + "15",
    borderColor: "#3b82f6" + "30",
  },
  ruoloBadgeCC: {
    backgroundColor: "#ec4899" + "15",
    borderColor: "#ec4899" + "30",
  },
  ruoloBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  ruoloBadgeTextPilot: {
    color: "#3b82f6",
  },
  ruoloBadgeTextCC: {
    color: "#ec4899",
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
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
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
  emptyButtonText: {
    color: colors.textInverse,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
});

export default DocumentsScreen;
