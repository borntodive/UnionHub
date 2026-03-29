import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Check, X, Menu } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { colors, spacing, typography, borderRadius } from "../../theme";
import { usersApi } from "../../api/users";
import apiClient from "../../api/client";
import { User } from "../../types";
import { RootStackParamList } from "../../navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export const PendingMembersScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["pending-members"],
    queryFn: () => usersApi.getPendingUsers(),
  });

  // Refetch when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const approveMutation = useMutation({
    mutationFn: (userId: string) => usersApi.approveRegistration(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-members"] });
      queryClient.invalidateQueries({ queryKey: ["pending-count"] });
      Alert.alert(t("members.activated"), t("members.pendingApproval"));
    },
    onError: (err: any) => {
      Alert.alert(
        t("common:error"),
        err?.response?.data?.message || t("common:error"),
      );
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (userId: string) => usersApi.rejectRegistration(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-members"] });
      queryClient.invalidateQueries({ queryKey: ["pending-count"] });
    },
    onError: (err: any) => {
      Alert.alert(
        t("common:error"),
        err?.response?.data?.message || t("common:error"),
      );
    },
  });

  const handleApprove = (user: User) => {
    Alert.alert(
      t("members.activate"),
      `${t("members.activate")} ${user.nome} ${user.cognome}?`,
      [
        { text: t("common:cancel"), style: "cancel" },
        {
          text: t("members.activate"),
          onPress: () => approveMutation.mutate(user.id),
        },
      ],
    );
  };

  const handleReject = (user: User) => {
    Alert.alert(
      t("members.reject"),
      `${t("members.reject")} ${user.nome} ${user.cognome}?`,
      [
        { text: t("common:cancel"), style: "cancel" },
        {
          text: t("members.reject"),
          style: "destructive",
          onPress: () => rejectMutation.mutate(user.id),
        },
      ],
    );
  };

  const handleViewForm = (user: User) => {
    if (!user.registrationFormUrl) {
      Alert.alert(t("common:notFound"), t("pdfViewer:noDocument"));
      return;
    }
    // registrationFormUrl is a relative path like /uploads/registration-forms/...
    // Prepend the server root (strip /api/v1 suffix from baseURL).
    const serverRoot = (apiClient.defaults.baseURL ?? "").replace(
      /\/api\/v1\/?$/,
      "",
    );
    navigation.navigate("PdfViewer", {
      url: `${serverRoot}${user.registrationFormUrl}`,
      title: `Delega – ${user.nome} ${user.cognome}`,
    });
  };

  const pending = data?.data ?? [];

  const renderItem = ({ item }: { item: User }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.nome?.[0]}
            {item.cognome?.[0]}
          </Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>
            {item.nome} {item.cognome}
          </Text>
          <Text style={styles.cardCrewcode}>{item.crewcode}</Text>
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.badge,
                item.ruolo === "pilot" ? styles.badgePilot : styles.badgeCabin,
              ]}
            >
              <Text style={styles.badgeText}>
                {item.ruolo === "pilot" ? t("home:pilot") : t("home:cabinCrew")}
              </Text>
            </View>
            {item.grade && (
              <Text style={styles.gradeText}>{item.grade.codice}</Text>
            )}
            {item.base && (
              <Text style={styles.baseText}>{item.base.codice}</Text>
            )}
          </View>
          <Text style={styles.cardDate}>
            {new Date(item.createdAt).toLocaleDateString("it-IT", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => handleViewForm(item)}
        >
          <FileText size={16} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.primary }]}>
            {t("documents:viewDocument")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnApprove]}
          onPress={() => handleApprove(item)}
          disabled={approveMutation.isPending}
        >
          <Check size={16} color={colors.textInverse} />
          <Text style={[styles.actionText, { color: colors.textInverse }]}>
            {t("members.activate")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnReject]}
          onPress={() => handleReject(item)}
          disabled={rejectMutation.isPending}
        >
          <X size={16} color={colors.textInverse} />
          <Text style={[styles.actionText, { color: colors.textInverse }]}>
            {t("members.reject")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.statusBarBg, { height: insets.top }]} />
      <SafeAreaView
        style={styles.container}
        edges={["bottom", "left", "right"]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => (navigation as any).openDrawer?.()}
            style={styles.headerBtn}
          >
            <Menu size={24} color={colors.textInverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {t("navigation.pendingMembers")}
          </Text>
          <View style={styles.headerBtn} />
        </View>

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : pending.length === 0 ? (
          <View style={styles.centered}>
            <FileText size={64} color={colors.border} />
            <Text style={styles.emptyTitle}>{t("members.noPending")}</Text>
            <Text style={styles.emptySubtitle}>
              {t("members.noPendingDesc")}
            </Text>
          </View>
        ) : (
          <FlatList
            data={pending}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  statusBarBg: { backgroundColor: colors.primary },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    minHeight: 56,
  },
  headerBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
    textAlign: "center",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: "center",
  },
  listContent: { padding: spacing.md, gap: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + "20",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  avatarText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  cardInfo: { flex: 1 },
  cardName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 2,
  },
  cardCrewcode: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flexWrap: "wrap",
    marginBottom: spacing.xs,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  badgePilot: { backgroundColor: "#dbeafe" },
  badgeCabin: { backgroundColor: "#fce7f3" },
  badgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  gradeText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  baseText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  cardDate: { fontSize: typography.sizes.xs, color: colors.textTertiary },
  cardActions: {
    flexDirection: "row",
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  actionBtnApprove: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  actionBtnReject: {
    backgroundColor: colors.error,
    borderColor: colors.error,
  },
  actionText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
});

export default PendingMembersScreen;
