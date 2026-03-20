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
import { ArrowLeft, Plus, Tag, Trash2, Edit3 } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { colors, spacing, typography, borderRadius } from "../../theme";
import { Card } from "../../components/Card";
import { issueCategoriesApi } from "../../api/issue-categories";
import { RootStackParamList } from "../../navigation/types";
import { IssueCategory, Ruolo } from "../../types";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const getRuoloColor = (ruolo: Ruolo) =>
  ruolo === Ruolo.PILOT ? "#3b82f6" : "#8b5cf6";

const getRuoloLabel = (ruolo: Ruolo) =>
  ruolo === Ruolo.PILOT ? "Pilot" : "Cabin Crew";

export const IssueCategoriesScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: categories,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["issueCategories"],
    queryFn: () => issueCategoriesApi.getAll(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => issueCategoriesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issueCategories"] });
      Alert.alert(t("common.success"), t("issues.categoryDeleted"));
    },
    onError: (error: any) => {
      Alert.alert(
        t("common.error"),
        error.response?.data?.message || t("errors.generic"),
      );
    },
  });

  const localName = (item: IssueCategory) =>
    i18n.language === "it" ? item.nameIt : item.nameEn;

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleDelete = (cat: IssueCategory) => {
    Alert.alert(
      t("common.confirm"),
      `${t("issues.deleteCategoryConfirm")} "${localName(cat)}"?`,
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => deleteMutation.mutate(cat.id),
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: IssueCategory }) => (
    <Card style={styles.itemCard}>
      <View style={styles.itemContent}>
        <View style={styles.itemIcon}>
          <Tag size={24} color={colors.primary} />
        </View>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{localName(item)}</Text>
          <View
            style={[
              styles.roleBadge,
              { backgroundColor: getRuoloColor(item.ruolo) + "20" },
            ]}
          >
            <Text
              style={[styles.roleText, { color: getRuoloColor(item.ruolo) }]}
            >
              {getRuoloLabel(item.ruolo)}
            </Text>
          </View>
        </View>
        <View style={styles.itemActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() =>
              navigation.navigate("IssueCategoryForm", { categoryId: item.id })
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
          <Text style={styles.headerTitle}>{t("issues.issueCategories")}</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate("IssueCategoryForm", {})}
            style={styles.addButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Plus size={24} color={colors.textInverse} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={categories || []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.emptyContainer}>
                <Tag size={64} color={colors.textTertiary} />
                <Text style={styles.emptyText}>{t("issues.noCategories")}</Text>
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
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary + "10",
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  itemInfo: { flex: 1 },
  itemName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  roleBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginTop: spacing.xs,
  },
  roleText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
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
