import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useNavigation, DrawerActions } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Menu,
  Calculator,
  AlertTriangle,
  FileText,
  ChevronRight,
  Users,
  BarChart3,
  Bell,
} from "lucide-react-native";

import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
} from "../../theme";
import { useAuthStore } from "../../store/authStore";
import { UserRole, IssueStatus } from "../../types";
import { issuesApi } from "../../api/issues";
import { usersApi } from "../../api/users";
import { RootStackParamList } from "../../navigation/types";
import apiClient from "../../api/client";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface PublishedDocument {
  id: string;
  title: string;
  publishedAt: string | null;
  createdAt: string;
}

export const HomeScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);

  const isAdmin =
    user?.role === UserRole.ADMIN || user?.role === UserRole.SUPERADMIN;
  const isSuperAdmin = user?.role === UserRole.SUPERADMIN;

  // Greeting by time of day
  const hour = new Date().getHours();
  let greetingKey = "home.greetingMorning";
  if (hour >= 12 && hour < 18) greetingKey = "home.greetingAfternoon";
  else if (hour >= 18) greetingKey = "home.greetingEvening";

  const initials = `${user?.nome?.[0] ?? ""}${user?.cognome?.[0] ?? ""}`;
  const fullName = `${user?.nome ?? ""} ${user?.cognome ?? ""}`.trim();

  // Role label
  let roleLabel = "";
  if (user?.ruolo === "pilot") roleLabel = t("home.pilot");
  else if (user?.ruolo === "cabin_crew") roleLabel = t("home.cabinCrew");
  if (user?.role === UserRole.ADMIN) roleLabel = t("home.adminLabel");
  if (isSuperAdmin) roleLabel = t("navigation.superAdmin");

  const subtitle = [user?.crewcode, roleLabel, user?.base?.codice]
    .filter(Boolean)
    .join(" · ");

  // Data: my issues (user view)
  const { data: myIssues, isLoading: myIssuesLoading } = useQuery({
    queryKey: ["my-issues-home"],
    queryFn: issuesApi.getMyIssues,
    enabled: !isAdmin,
  });

  // Data: all issues count (admin view)
  const { data: allIssues } = useQuery({
    queryKey: ["all-issues-home"],
    queryFn: issuesApi.getIssues,
    enabled: isAdmin,
  });

  // Data: statistics (admin view)
  const { data: stats } = useQuery({
    queryKey: ["home-statistics"],
    queryFn: usersApi.getStatistics,
    enabled: isAdmin,
  });

  // Data: last published document
  const { data: documents } = useQuery({
    queryKey: ["home-published-documents"],
    queryFn: async (): Promise<PublishedDocument[]> => {
      const response = await apiClient.get("/documents/public/published");
      return response.data;
    },
  });

  const openIssuesCount =
    allIssues?.filter((i) => i.status !== IssueStatus.SOLVED).length ?? 0;
  const activeMyIssues =
    myIssues?.filter((i) => i.status !== IssueStatus.SOLVED) ?? [];
  const lastDocument = documents?.[0] ?? null;

  const openDrawer = () => navigation.dispatch(DrawerActions.openDrawer());

  return (
    <View style={styles.wrapper}>
      <View style={[styles.statusBarHack, { height: insets.top }]} />
      <SafeAreaView style={{ flex: 1 }} edges={["bottom", "left", "right"]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.menuButton} onPress={openDrawer}>
            <Menu size={24} color={colors.textInverse} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <Text style={styles.greetingText}>
              {t(greetingKey)}, {user?.nome}
            </Text>
            {subtitle ? (
              <Text style={styles.subtitleText}>{subtitle}</Text>
            ) : null}
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Quick Actions */}
          <Text style={styles.sectionTitle}>{t("home.quickActions")}</Text>
          <View style={styles.actionsGrid}>
            {isAdmin ? (
              <>
                <QuickAction
                  icon={<Users size={28} color={colors.primary} />}
                  label={t("navigation.members")}
                  onPress={() =>
                    navigation.dispatch(DrawerActions.jumpTo("Members"))
                  }
                />
                <QuickAction
                  icon={<BarChart3 size={28} color={colors.primary} />}
                  label={t("navigation.statistics")}
                  onPress={() =>
                    navigation.dispatch(DrawerActions.jumpTo("Statistics"))
                  }
                />
                <QuickAction
                  icon={<AlertTriangle size={28} color={colors.primary} />}
                  label={t("navigation.issues")}
                  onPress={() =>
                    navigation.dispatch(DrawerActions.jumpTo("Issues"))
                  }
                />
                <QuickAction
                  icon={<FileText size={28} color={colors.primary} />}
                  label={t("navigation.documentsManagement")}
                  onPress={() =>
                    navigation.dispatch(DrawerActions.jumpTo("Documents"))
                  }
                />
              </>
            ) : (
              <>
                <QuickAction
                  icon={<Calculator size={28} color={colors.primary} />}
                  label={t("navigation.payslipCalculator")}
                  onPress={() =>
                    navigation.dispatch(
                      DrawerActions.jumpTo("PayslipCalculator"),
                    )
                  }
                />
                <QuickAction
                  icon={<AlertTriangle size={28} color={colors.secondary} />}
                  label={t("navigation.reportIssue")}
                  onPress={() =>
                    navigation.dispatch(DrawerActions.jumpTo("ReportIssue"))
                  }
                />
                <QuickAction
                  icon={<FileText size={28} color={colors.primary} />}
                  label={t("documents.publicDocuments")}
                  onPress={() =>
                    navigation.dispatch(DrawerActions.jumpTo("PublicDocuments"))
                  }
                />
                <QuickAction
                  icon={<Bell size={28} color={colors.primary} />}
                  label={t("navigation.myIssues")}
                  onPress={() =>
                    navigation.dispatch(DrawerActions.jumpTo("MyIssues"))
                  }
                />
              </>
            )}
          </View>

          {/* Admin stats */}
          {isAdmin && (
            <>
              <Text style={styles.sectionTitle}>{t("home.overview")}</Text>
              <View style={styles.statsRow}>
                <StatCard
                  value={
                    isSuperAdmin
                      ? (stats?.totalUsers ?? "-")
                      : user?.ruolo === "pilot"
                        ? (stats?.byRole?.pilot ?? "-")
                        : (stats?.byRole?.cabin_crew ?? "-")
                  }
                  label={t("home.statMembers")}
                />
                <StatCard
                  value={stats?.recentRegistrations ?? "-"}
                  label={t("home.statNew30d")}
                />
                <StatCard
                  value={openIssuesCount}
                  label={t("home.statOpenIssues")}
                  accent={openIssuesCount > 0}
                />
              </View>
            </>
          )}

          {/* My issues (user only) */}
          {!isAdmin && (
            <>
              <Text style={styles.sectionTitle}>{t("home.myIssues")}</Text>
              {myIssuesLoading ? (
                <ActivityIndicator
                  color={colors.primary}
                  style={styles.loader}
                />
              ) : activeMyIssues.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>
                    {t("home.noActiveIssues")}
                  </Text>
                </View>
              ) : (
                activeMyIssues.slice(0, 2).map((issue) => (
                  <TouchableOpacity
                    key={issue.id}
                    style={styles.issueCard}
                    onPress={() =>
                      navigation.navigate("MyIssueDetail", {
                        issueId: issue.id,
                      })
                    }
                  >
                    <View style={styles.issueCardContent}>
                      <Text style={styles.issueTitle} numberOfLines={1}>
                        {issue.title}
                      </Text>
                      <View style={styles.issueMeta}>
                        <StatusBadge status={issue.status} t={t} />
                        <Text style={styles.issueDate}>
                          {formatDate(issue.createdAt)}
                        </Text>
                      </View>
                    </View>
                    <ChevronRight size={18} color={colors.textTertiary} />
                  </TouchableOpacity>
                ))
              )}
            </>
          )}

          {/* Last document */}
          {lastDocument && (
            <>
              <Text style={styles.sectionTitle}>{t("home.lastDocument")}</Text>
              <TouchableOpacity
                style={styles.documentCard}
                onPress={() =>
                  navigation.navigate("PdfViewer", {
                    documentId: lastDocument.id,
                    title: lastDocument.title,
                  })
                }
              >
                <View style={styles.documentCardInner}>
                  <FileText size={20} color={colors.primary} />
                  <View style={styles.documentInfo}>
                    <Text style={styles.documentTitle} numberOfLines={2}>
                      {lastDocument.title}
                    </Text>
                    <Text style={styles.documentDate}>
                      {formatDate(
                        lastDocument.publishedAt ?? lastDocument.createdAt,
                      )}
                    </Text>
                  </View>
                </View>
                <View style={styles.documentReadBtn}>
                  <Text style={styles.documentReadText}>{t("home.read")}</Text>
                  <ChevronRight size={16} color={colors.primary} />
                </View>
              </TouchableOpacity>
            </>
          )}

          <View style={{ height: spacing.xl }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

interface QuickActionProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}

const QuickAction: React.FC<QuickActionProps> = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.actionCard} onPress={onPress}>
    <View style={styles.actionIcon}>{icon}</View>
    <Text style={styles.actionLabel} numberOfLines={2}>
      {label}
    </Text>
  </TouchableOpacity>
);

interface StatCardProps {
  value: number | string;
  label: string;
  accent?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ value, label, accent }) => (
  <View style={[styles.statCard, accent && styles.statCardAccent]}>
    <Text style={[styles.statValue, accent && styles.statValueAccent]}>
      {value}
    </Text>
    <Text style={[styles.statLabel, accent && styles.statLabelAccent]}>
      {label}
    </Text>
  </View>
);

const StatusBadge: React.FC<{
  status: IssueStatus;
  t: (key: string) => string;
}> = ({ status, t }) => {
  const map: Record<IssueStatus, { label: string; color: string; bg: string }> =
    {
      [IssueStatus.OPEN]: {
        label: t("issues.statusOpen"),
        color: colors.secondary,
        bg: "#fde8eb",
      },
      [IssueStatus.IN_PROGRESS]: {
        label: t("issues.statusInProgress"),
        color: colors.warning,
        bg: "#fff3e0",
      },
      [IssueStatus.SOLVED]: {
        label: t("issues.statusSolved"),
        color: colors.success,
        bg: "#e8f5e9",
      },
    };

  const { label, color, bg } = map[status] ?? map[IssueStatus.OPEN];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  statusBarHack: {
    backgroundColor: colors.primary,
  },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    alignItems: "center",
  },
  menuButton: {
    position: "absolute",
    top: spacing.md,
    left: spacing.md,
    padding: spacing.sm,
  },
  headerCenter: {
    alignItems: "center",
    marginTop: spacing.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  avatarText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },
  greetingText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
    marginBottom: spacing.xs,
  },
  subtitleText: {
    fontSize: typography.sizes.sm,
    color: "rgba(255,255,255,0.75)",
  },
  scrollView: {
    flex: 1,
    marginTop: -spacing.md,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  actionCard: {
    width: "47.5%",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: "center",
    ...shadows.sm,
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  actionLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text,
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: "center",
    ...shadows.sm,
  },
  statCardAccent: {
    backgroundColor: "#fde8eb",
  },
  statValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  statValueAccent: {
    color: colors.secondary,
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    textAlign: "center",
  },
  statLabelAccent: {
    color: colors.secondaryDark,
  },
  loader: {
    marginVertical: spacing.md,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: "center",
    ...shadows.sm,
  },
  emptyText: {
    fontSize: typography.sizes.sm,
    color: colors.textTertiary,
  },
  issueCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  issueCardContent: {
    flex: 1,
    marginRight: spacing.sm,
  },
  issueTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  issueMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  issueDate: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  documentCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  documentCardInner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  documentInfo: {
    flex: 1,
  },
  documentTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  documentDate: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
  },
  documentReadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 2,
  },
  documentReadText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.primary,
  },
});
