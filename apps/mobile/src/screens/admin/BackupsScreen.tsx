import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Plus,
  HardDrive,
  Trash2,
  RotateCcw,
  FileArchive,
  Clock,
  User,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { colors, spacing, typography, borderRadius } from "../../theme";
import { Card } from "../../components/Card";
import { backupsApi, BackupFolder, DriveSpace } from "../../api/backups";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatFolderName(name: string): string {
  const match = name.match(/^(\d{4})-(\d{2})-(\d{2})_(\d{2})(\d{2})$/);
  if (!match) return name;
  const [, year, month, day, hh, mm] = match;
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${day} ${months[parseInt(month, 10) - 1]} ${year}, ${hh}:${mm}`;
}

interface DriveSpaceBarProps {
  driveSpace: DriveSpace;
}

const DriveSpaceBar: React.FC<DriveSpaceBarProps> = ({ driveSpace }) => {
  const { t } = useTranslation();
  const { total, used, backupSize } = driveSpace;

  // total=0 means unlimited (e.g. Google Workspace)
  const hasQuota = total > 0;
  const usedPct = hasQuota ? Math.min(used / total, 1) : 0;
  const backupPct = hasQuota ? Math.min(backupSize / total, 1) : 0;

  return (
    <View style={spaceStyles.container}>
      <View style={spaceStyles.header}>
        <HardDrive size={14} color={colors.textSecondary} />
        <Text style={spaceStyles.label}>Google Drive</Text>
        <Text style={spaceStyles.right}>
          {hasQuota
            ? `${formatBytes(used)} / ${formatBytes(total)}`
            : `${formatBytes(used)} ${t("backups.used")}`}
        </Text>
      </View>
      {hasQuota && (
        <View style={spaceStyles.track}>
          <View style={[spaceStyles.barUsed, { width: `${usedPct * 100}%` }]} />
          <View
            style={[spaceStyles.barBackup, { width: `${backupPct * 100}%` }]}
          />
        </View>
      )}
      <Text style={spaceStyles.backupLabel}>
        {t("backups.backupSpaceLabel")}: {formatBytes(backupSize)}
      </Text>
    </View>
  );
};

export const BackupsScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["backups"],
    queryFn: backupsApi.list,
  });

  const createMutation = useMutation({
    mutationFn: backupsApi.create,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["backups"] });
      Alert.alert(
        t("backups.success"),
        `${t("backups.created")}: ${res.folder}`,
      );
    },
    onError: (error: any) => {
      Alert.alert(
        t("common.error"),
        error.response?.data?.message || t("backups.createError"),
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: backupsApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backups"] });
      Alert.alert(t("backups.success"), t("backups.deleted"));
    },
    onError: (error: any) => {
      Alert.alert(
        t("common.error"),
        error.response?.data?.message || t("backups.deleteError"),
      );
    },
  });

  const restoreMutation = useMutation({
    mutationFn: backupsApi.restore,
    onSuccess: () => {
      Alert.alert(t("backups.success"), t("backups.restored"));
    },
    onError: (error: any) => {
      Alert.alert(
        t("common.error"),
        error.response?.data?.message || t("backups.restoreError"),
      );
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleCreate = () => {
    Alert.alert(t("backups.createTitle"), t("backups.createConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("backups.create"), onPress: () => createMutation.mutate() },
    ]);
  };

  const handleDelete = (item: BackupFolder) => {
    Alert.alert(
      t("backups.deleteTitle"),
      `${t("backups.deleteConfirm")} "${formatFolderName(item.name)}"?`,
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => deleteMutation.mutate(item.id),
        },
      ],
    );
  };

  const handleRestore = (item: BackupFolder) => {
    Alert.alert(t("backups.restoreTitle"), t("backups.restoreConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("backups.restoreConfirmButton"),
        style: "destructive",
        onPress: () => {
          Alert.alert(
            t("backups.restoreTitle"),
            t("backups.restoreDoubleConfirm"),
            [
              { text: t("common.cancel"), style: "cancel" },
              {
                text: t("backups.restoreConfirmButton"),
                style: "destructive",
                onPress: () => restoreMutation.mutate(item.id),
              },
            ],
          );
        },
      },
    ]);
  };

  const isAnyMutating =
    createMutation.isPending ||
    deleteMutation.isPending ||
    restoreMutation.isPending;

  const sections = [
    {
      title: t("backups.sectionAutomatic"),
      icon: <Clock size={14} color={colors.textSecondary} />,
      data: data?.automatic ?? [],
    },
    {
      title: t("backups.sectionManual"),
      icon: <User size={14} color={colors.textSecondary} />,
      data: data?.manual ?? [],
    },
  ];

  const renderItem = ({ item }: { item: BackupFolder }) => (
    <Card style={styles.itemCard}>
      <View style={styles.itemContent}>
        <View style={styles.itemIcon}>
          <HardDrive size={24} color={colors.primary} />
        </View>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{formatFolderName(item.name)}</Text>
          <View style={styles.itemMeta}>
            <FileArchive size={12} color={colors.textTertiary} />
            <Text style={styles.itemSubtext}>
              {formatBytes(item.totalSize)} · {item.files.length}{" "}
              {t("backups.files")}
            </Text>
          </View>
        </View>
        <View style={styles.itemActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleRestore(item)}
            disabled={isAnyMutating}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <RotateCcw size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDelete(item)}
            disabled={isAnyMutating}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Trash2 size={18} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );

  const renderSectionHeader = ({
    section,
  }: {
    section: (typeof sections)[0];
  }) => (
    <View style={styles.sectionHeader}>
      {section.icon}
      <Text style={styles.sectionTitle}>{section.title}</Text>
      {section.data.length === 0 && (
        <Text style={styles.sectionEmpty}>{t("backups.sectionEmpty")}</Text>
      )}
    </View>
  );

  return (
    <View style={styles.wrapper}>
      <View style={[styles.statusBarHack, { height: insets.top }]} />
      <SafeAreaView
        style={styles.container}
        edges={["bottom", "left", "right"]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.headerButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={24} color={colors.textInverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("backups.title")}</Text>
          <TouchableOpacity
            onPress={handleCreate}
            style={styles.headerButton}
            disabled={isAnyMutating}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {createMutation.isPending ? (
              <ActivityIndicator size="small" color={colors.textInverse} />
            ) : (
              <Plus size={24} color={colors.textInverse} />
            )}
          </TouchableOpacity>
        </View>

        {/* Loading banner for restore/delete */}
        {(deleteMutation.isPending || restoreMutation.isPending) && (
          <View style={styles.loadingBanner}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingBannerText}>
              {restoreMutation.isPending
                ? t("backups.restoring")
                : t("backups.deleting")}
            </Text>
          </View>
        )}

        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            ListHeaderComponent={
              data?.driveSpace ? (
                <DriveSpaceBar driveSpace={data.driveSpace} />
              ) : null
            }
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
              />
            }
            stickySectionHeadersEnabled={false}
          />
        )}
      </SafeAreaView>
    </View>
  );
};

const spaceStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface ?? colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border ?? "#e5e7eb",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  label: {
    flex: 1,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
  },
  right: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  track: {
    height: 6,
    backgroundColor: colors.border ?? "#e5e7eb",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: spacing.xs,
  },
  barUsed: {
    position: "absolute",
    height: "100%",
    backgroundColor: colors.textTertiary ?? "#9ca3af",
    borderRadius: 3,
  },
  barBackup: {
    position: "absolute",
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  backupLabel: {
    fontSize: typography.sizes.xs ?? 11,
    color: colors.textTertiary,
  },
});

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  statusBarHack: {
    backgroundColor: colors.primary,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
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
  loadingBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary + "15",
  },
  loadingBannerText: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    flex: 1,
  },
  sectionEmpty: {
    fontSize: typography.sizes.sm,
    color: colors.textTertiary,
    fontStyle: "italic",
  },
  itemCard: {
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  itemContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary + "10",
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  itemMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: 2,
  },
  itemSubtext: {
    fontSize: typography.sizes.xs ?? 11,
    color: colors.textSecondary,
  },
  itemActions: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  actionButton: {
    width: 38,
    height: 38,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
  },
});
