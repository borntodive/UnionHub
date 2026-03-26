import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { colors, spacing, typography, borderRadius } from "../../theme";
import { issuesApi } from "../../api/issues";
import { IssueStatus } from "../../types";
import { RootStackParamList } from "../../navigation/types";

type RouteType = RouteProp<RootStackParamList, "IssueDetail">;

const STATUS_OPTIONS = [
  IssueStatus.OPEN,
  IssueStatus.IN_PROGRESS,
  IssueStatus.SOLVED,
];

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

export const IssueDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteType>();
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { issueId } = route.params;

  const [selectedStatus, setSelectedStatus] = useState<IssueStatus | null>(
    null,
  );
  const [adminNotes, setAdminNotes] = useState<string>("");

  const { data: issue, isLoading } = useQuery({
    queryKey: ["issue", issueId],
    queryFn: () => issuesApi.getById(issueId),
  });

  useEffect(() => {
    if (issue) {
      setSelectedStatus(issue.status);
      setAdminNotes(issue.adminNotes || "");
    }
  }, [issue]);

  const mutation = useMutation({
    mutationFn: (data: { status?: IssueStatus; adminNotes?: string }) =>
      issuesApi.updateIssue(issueId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminIssues"] });
      queryClient.invalidateQueries({ queryKey: ["issue", issueId] });
      Alert.alert(t("common.success"), t("issues.updateSuccess"));
    },
    onError: (error: any) => {
      Alert.alert(
        t("common.error"),
        error.response?.data?.message || t("issues.updateError"),
      );
    },
  });

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

  const handleSave = () => {
    if (!issue) return;
    const updates: { status?: IssueStatus; adminNotes?: string } = {};
    updates.adminNotes = adminNotes;
    if (selectedStatus && selectedStatus !== issue.status) {
      if (selectedStatus === IssueStatus.SOLVED) {
        Alert.alert(t("issues.confirmSolve"), t("issues.confirmSolveMessage"), [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("common.confirm"),
            onPress: () =>
              mutation.mutate({ status: selectedStatus, adminNotes }),
          },
        ]);
        return;
      }
      updates.status = selectedStatus;
    }
    mutation.mutate(updates);
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
                : navigation.navigate("Issues" as never)
            }
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={24} color={colors.textInverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("issues.issueDetail")}</Text>
          <TouchableOpacity
            onPress={handleSave}
            style={styles.saveButton}
            disabled={mutation.isPending}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {mutation.isPending ? (
              <ActivityIndicator color={colors.textInverse} size="small" />
            ) : (
              <Save size={22} color={colors.textInverse} />
            )}
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : issue ? (
          <ScrollView contentContainerStyle={styles.content}>
            {/* Issue info */}
            <View style={styles.card}>
              <Text style={styles.issueTitle}>{issue.title}</Text>
              <Text style={styles.issueDescription}>{issue.description}</Text>

              <View style={styles.metaSection}>
                {issue.user && (
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>
                      {t("issues.submitter")}:
                    </Text>
                    <Text style={styles.metaValue}>
                      {issue.user.crewcode} — {issue.user.nome}{" "}
                      {issue.user.cognome}
                    </Text>
                  </View>
                )}
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
              </View>
            </View>

            {/* Admin panel */}
            <View style={styles.card}>
              <Text style={styles.sectionHeader}>
                {t("issues.adminActions")}
              </Text>

              <Text style={styles.label}>{t("issues.status")}</Text>
              <View style={styles.statusOptions}>
                {STATUS_OPTIONS.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.statusOption,
                      selectedStatus === s && {
                        backgroundColor: getStatusColor(s) + "20",
                        borderColor: getStatusColor(s),
                      },
                    ]}
                    onPress={() => setSelectedStatus(s)}
                  >
                    <Text
                      style={[
                        styles.statusOptionText,
                        selectedStatus === s && {
                          color: getStatusColor(s),
                          fontWeight: typography.weights.bold,
                        },
                      ]}
                    >
                      {getStatusLabel(s)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>{t("issues.adminNotes")}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={adminNotes}
                onChangeText={setAdminNotes}
                placeholder={t("issues.adminNotesPlaceholder")}
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
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
  saveButton: {
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
  content: { padding: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  issueTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  issueDescription: {
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
  sectionHeader: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  statusOptions: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  statusOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  statusOptionText: { fontSize: typography.sizes.sm, color: colors.text },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.base,
    color: colors.text,
  },
  textArea: { minHeight: 100, paddingTop: spacing.sm },
});
