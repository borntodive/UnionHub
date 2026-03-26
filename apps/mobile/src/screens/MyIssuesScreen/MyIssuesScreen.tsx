import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import { useQuery } from "@tanstack/react-query";
import { Menu, AlertTriangle, Clock } from "lucide-react-native";
import { useTranslation } from "react-i18next";

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
      return colors.textSecondary;
  }
};

export const MyIssuesScreen: React.FC = () => {
  const navigation = useNavigation<DrawerNavigationProp<any>>();
  const { t, i18n } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  const {
    data: issues,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["myIssues"],
    queryFn: issuesApi.getMyIssues,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getStatusLabel = (status: IssueStatus) => {
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

  const localName = (item: { nameIt: string; nameEn: string }) =>
    i18n.language === "it" ? item.nameIt : item.nameEn;

  const renderItem = ({ item }: { item: Issue }) => (
    <TouchableOpacity
      style={styles.itemCard}
      onPress={() => navigation.navigate("MyIssueDetail", { issueId: item.id })}
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
        {item.category && (
          <Text style={styles.metaText}>{localName(item.category)}</Text>
        )}
        {item.urgency && (
          <Text style={styles.metaText}>• L{item.urgency.level}</Text>
        )}
        <Text style={styles.metaText}>
          • {new Date(item.createdAt).toLocaleDateString(i18n.language)}
        </Text>
      </View>
      <View style={styles.lastActivityRow}>
        <Clock size={11} color={colors.textTertiary} />
        <Text style={styles.lastActivityText}>
          {t("issues.lastActivity")}:{" "}
          {new Date(item.updatedAt).toLocaleDateString(i18n.language, {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
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
          <Text style={styles.headerTitle}>{t("issues.myIssues")}</Text>
          <View style={{ width: 40 }} />
        </View>

        <FlatList
          data={issues || []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.emptyContainer}>
                <AlertTriangle size={64} color={colors.textTertiary} />
                <Text style={styles.emptyText}>{t("issues.noIssues")}</Text>
              </View>
            ) : null
          }
        />
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
  itemMeta: { flexDirection: "row", gap: spacing.xs },
  metaText: { fontSize: typography.sizes.xs, color: colors.textSecondary },
  lastActivityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  lastActivityText: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
  },
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
});
