import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { colors, spacing, typography, borderRadius } from "../../theme";
import { issuesApi } from "../../api/issues";
import { IssueStatus } from "../../types";
import { RootStackParamList } from "../../navigation/types";

type RouteType = RouteProp<RootStackParamList, "MyIssueDetail">;

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

export const MyIssueDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteType>();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();

  const { issueId } = route.params;
  const queryClient = useQueryClient();

  const { data: issue, isLoading } = useQuery({
    queryKey: ["issue", issueId],
    queryFn: () => issuesApi.getById(issueId),
  });

  const reopenMutation = useMutation({
    mutationFn: () => issuesApi.reopenIssue(issueId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issue", issueId] });
      queryClient.invalidateQueries({ queryKey: ["myIssues"] });
      Alert.alert(t("common.success"), t("issues.reopenSuccess"));
    },
    onError: () => {
      Alert.alert(t("common.error"), t("issues.reopenError"));
    },
  });

  const handleReopen = () => {
    Alert.alert(t("issues.reopenTitle"), t("issues.reopenMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("issues.reopen"), onPress: () => reopenMutation.mutate() },
    ]);
  };

  const localName = (item: { nameIt: string; nameEn: string }) =>
    i18n.language === "it" ? item.nameIt : item.nameEn;

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

  return (
    <View style={styles.wrapper}>
      <View style={[styles.statusBarHack, { height: insets.top }]} />
      <SafeAreaView
        style={styles.container}
        edges={["bottom", "left", "right"]}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() =>
              navigation.canGoBack()
                ? navigation.goBack()
                : navigation.navigate("MyIssues" as never)
            }
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={24} color={colors.textInverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("issues.issueDetail")}</Text>
          <View style={{ width: 40 }} />
        </View>

        {isLoading ? (
          <View style={styles.centered}>
            <Text style={styles.loadingText}>{t("common.loading")}</Text>
          </View>
        ) : issue ? (
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.sectionTitle}>{issue.title}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(issue.status) + "20" },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: getStatusColor(issue.status) },
                    ]}
                  >
                    {getStatusLabel(issue.status)}
                  </Text>
                </View>
              </View>

              <Text style={styles.description}>{issue.description}</Text>

              <View style={styles.metaSection}>
                {issue.category && (
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>
                      {t("issues.category")}:
                    </Text>
                    <Text style={styles.metaValue}>
                      {localName(issue.category)}
                    </Text>
                  </View>
                )}
                {issue.urgency && (
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>{t("issues.urgency")}:</Text>
                    <Text
                      style={styles.metaValue}
                    >{`L${issue.urgency.level} - ${localName(issue.urgency)}`}</Text>
                  </View>
                )}
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>
                    {t("issues.submittedAt")}:
                  </Text>
                  <Text style={styles.metaValue}>
                    {new Date(issue.createdAt).toLocaleDateString(
                      i18n.language,
                    )}
                  </Text>
                </View>
                {issue.solvedAt && (
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>
                      {t("issues.solvedAt")}:
                    </Text>
                    <Text style={styles.metaValue}>
                      {new Date(issue.solvedAt).toLocaleDateString(
                        i18n.language,
                      )}
                    </Text>
                  </View>
                )}
              </View>

              {issue.adminNotes ? (
                <View style={styles.adminNotesSection}>
                  <Text style={styles.adminNotesLabel}>
                    {t("issues.adminNotes")}:
                  </Text>
                  <Text style={styles.adminNotesText}>{issue.adminNotes}</Text>
                </View>
              ) : null}
            </View>

            {issue.status === IssueStatus.SOLVED && (
              <TouchableOpacity
                style={styles.reopenButton}
                onPress={handleReopen}
                disabled={reopenMutation.isPending}
              >
                {reopenMutation.isPending ? (
                  <ActivityIndicator color={colors.textInverse} size="small" />
                ) : (
                  <Text style={styles.reopenButtonText}>
                    {t("issues.reopen")}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </ScrollView>
        ) : null}
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
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { color: colors.textSecondary },
  content: { padding: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
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
  description: {
    fontSize: typography.sizes.base,
    color: colors.text,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  metaSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  metaRow: { flexDirection: "row", marginBottom: spacing.xs },
  metaLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    width: 110,
  },
  metaValue: { fontSize: typography.sizes.sm, color: colors.text, flex: 1 },
  adminNotesSection: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: "#fef9c3",
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: "#f59e0b",
  },
  adminNotesLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: "#92400e",
    marginBottom: spacing.xs,
  },
  adminNotesText: { fontSize: typography.sizes.sm, color: "#78350f" },
  reopenButton: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  reopenButtonText: {
    color: colors.textInverse,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.base,
  },
});
