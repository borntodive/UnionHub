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
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Zap, Trash2, Edit3 } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { colors, spacing, typography, borderRadius } from "../../theme";
import { Card } from "../../components/Card";
import { issueUrgenciesApi } from "../../api/issue-urgencies";
import { RootStackParamList } from "../../navigation/types";
import { IssueUrgency } from "../../types";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const getLevelColor = (level: number) => {
  if (level <= 1) return "#22c55e";
  if (level <= 2) return "#84cc16";
  if (level <= 3) return "#f59e0b";
  if (level <= 4) return "#ef4444";
  return "#7c3aed";
};

export const IssueUrgenciesScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: urgencies,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["issueUrgencies"],
    queryFn: issueUrgenciesApi.getAll,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => issueUrgenciesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issueUrgencies"] });
      Alert.alert(t("common.success"), t("issues.urgencyDeleted"));
    },
    onError: (error: any) => {
      Alert.alert(
        t("common.error"),
        error.response?.data?.message || t("errors.generic"),
      );
    },
  });

  const localName = (item: IssueUrgency) =>
    i18n.language === "it" ? item.nameIt : item.nameEn;

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleDelete = (urg: IssueUrgency) => {
    Alert.alert(
      t("common.confirm"),
      `${t("issues.deleteUrgencyConfirm")} "${localName(urg)}"?`,
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => deleteMutation.mutate(urg.id),
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: IssueUrgency }) => (
    <Card style={styles.itemCard}>
      <View style={styles.itemContent}>
        <View
          style={[
            styles.levelBadge,
            { backgroundColor: getLevelColor(item.level) },
          ]}
        >
          <Text style={styles.levelText}>{item.level}</Text>
        </View>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{localName(item)}</Text>
          <Text style={styles.itemSubName}>
            {item.nameIt !== item.nameEn
              ? i18n.language === "it"
                ? item.nameEn
                : item.nameIt
              : ""}
          </Text>
        </View>
        <View style={styles.itemActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() =>
              navigation.navigate("IssueUrgencyForm", { urgencyId: item.id })
            }
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Edit3 size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDelete(item)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Trash2 size={18} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    </Card>
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
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={24} color={colors.textInverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("issues.issueUrgencies")}</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate("IssueUrgencyForm", {})}
            style={styles.addButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Plus size={24} color={colors.textInverse} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={urgencies || []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.emptyContainer}>
                <Zap size={64} color={colors.textTertiary} />
                <Text style={styles.emptyText}>{t("issues.noUrgencies")}</Text>
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
  addButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: { padding: spacing.md },
  itemCard: { marginBottom: spacing.md, padding: spacing.md },
  itemContent: { flexDirection: "row", alignItems: "center" },
  levelBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  levelText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: "#fff",
  },
  itemInfo: { flex: 1 },
  itemName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  itemSubName: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  itemActions: { flexDirection: "row", gap: spacing.sm },
  actionButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
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
