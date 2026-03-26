import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import {
  ArrowLeft,
  Users,
  Plane,
  UserCheck,
  TrendingUp,
  Building2,
  Briefcase,
  Award,
  X,
  Download,
} from "lucide-react-native";
import { colors, spacing, typography, borderRadius } from "../../theme";
import { usersApi, ScopedStats, DashboardStatistics } from "../../api/users";
import { Button } from "../../components/Button";
import { useAuthStore } from "../../store/authStore";
import { UserRole } from "../../types";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

// ─── FullListModal ─────────────────────────────────────────────────────────────

interface FullListModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  items: { label: string; count: number }[];
}

const FullListModal: React.FC<FullListModalProps> = ({
  visible,
  onClose,
  title,
  items,
}) => {
  const maxCount = items.length > 0 ? items[0].count : 1;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={modalStyles.overlay}>
        <View style={modalStyles.sheet}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>{title}</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={items}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={{ paddingBottom: spacing.xl }}
            renderItem={({ item, index }) => (
              <View style={modalStyles.item}>
                <View style={modalStyles.itemLeft}>
                  <Text style={modalStyles.rank}>{index + 1}</Text>
                  <Text style={modalStyles.label}>{item.label}</Text>
                </View>
                <View style={modalStyles.barContainer}>
                  <View
                    style={[
                      modalStyles.bar,
                      {
                        width: `${Math.round((item.count / maxCount) * 100)}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={modalStyles.count}>{item.count}</Text>
              </View>
            )}
          />
        </View>
      </View>
    </Modal>
  );
};

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: "80%",
    paddingTop: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    width: 140,
    gap: spacing.sm,
  },
  rank: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    width: 20,
  },
  label: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    flex: 1,
  },
  barContainer: {
    flex: 1,
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  bar: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  count: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    width: 32,
    textAlign: "right",
  },
});

// ─── TopListSection ────────────────────────────────────────────────────────────

interface TopListSectionProps {
  title: string;
  icon: React.ReactNode;
  items: { label: string; count: number }[];
  maxVisible?: number;
}

const TopListSection: React.FC<TopListSectionProps> = ({
  title,
  icon,
  items,
  maxVisible = 3,
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  if (!items || items.length === 0) return null;

  const visible = items.slice(0, maxVisible);
  const hasMore = items.length > maxVisible;

  return (
    <View style={topStyles.section}>
      <Text style={topStyles.sectionTitle}>{title}</Text>
      <View style={styles.listCard}>
        {visible.map((item, index) => (
          <View
            key={index}
            style={[
              styles.listItem,
              index === visible.length - 1 &&
                !hasMore && { borderBottomWidth: 0 },
            ]}
          >
            <View style={styles.listIcon}>{icon}</View>
            <Text style={styles.listName}>{item.label}</Text>
            <Text style={styles.listCount}>{item.count}</Text>
          </View>
        ))}
        {hasMore && (
          <TouchableOpacity
            style={topStyles.seeAllBtn}
            onPress={() => setModalVisible(true)}
          >
            <Text style={topStyles.seeAllText}>
              Vedi tutti ({items.length})
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <FullListModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={title}
        items={items}
      />
    </View>
  );
};

const topStyles = StyleSheet.create({
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  seeAllBtn: {
    padding: spacing.md,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  seeAllText: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
});

// ─── AdminStatsView ────────────────────────────────────────────────────────────

interface AdminStatsViewProps {
  data: ScopedStats;
}

const AdminStatsView: React.FC<AdminStatsViewProps> = ({ data }) => {
  return (
    <>
      {/* Total Members */}
      <View style={styles.mainCard}>
        <Users size={48} color={colors.primary} />
        <Text style={styles.totalNumber}>{data.totalUsers}</Text>
        <Text style={styles.totalLabel}>Total Members</Text>
      </View>

      {/* Recent Activity */}
      <View style={adminStyles.recentCard}>
        <TrendingUp size={22} color={colors.success} />
        <View style={adminStyles.recentContent}>
          <Text style={adminStyles.recentNumber}>
            {data.recentRegistrations}
          </Text>
          <Text style={adminStyles.recentLabel}>
            New registrations (last 30 days)
          </Text>
        </View>
      </View>

      {/* Top Grade */}
      <TopListSection
        title="Top Grade"
        icon={<Award size={16} color={colors.primary} />}
        items={data.byGrade.map((g) => ({ label: g.grade, count: g.count }))}
      />

      {/* Top Bases */}
      <TopListSection
        title="Top Basi"
        icon={<Building2 size={16} color={colors.primary} />}
        items={data.byBase.map((b) => ({ label: b.base, count: b.count }))}
      />

      {/* Top Contracts */}
      <TopListSection
        title="Top Contratti"
        icon={<Briefcase size={16} color={colors.primary} />}
        items={data.byContract.map((c) => ({
          label: c.contract,
          count: c.count,
        }))}
      />
    </>
  );
};

const adminStyles = StyleSheet.create({
  recentCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  recentContent: {
    flex: 1,
  },
  recentNumber: {
    fontSize: 24,
    fontWeight: typography.weights.bold,
    color: colors.success,
  },
  recentLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});

// ─── SuperAdminGeneralView ─────────────────────────────────────────────────────

interface SuperAdminGeneralViewProps {
  data: DashboardStatistics;
}

const SuperAdminGeneralView: React.FC<SuperAdminGeneralViewProps> = ({
  data,
}) => {
  return (
    <>
      {/* Total Members */}
      <View style={styles.mainCard}>
        <Users size={48} color={colors.primary} />
        <Text style={styles.totalNumber}>{data.totalUsers}</Text>
        <Text style={styles.totalLabel}>Total Members</Text>
      </View>

      {/* By Role */}
      <View style={saStyles.roleRow}>
        <View
          style={[
            saStyles.roleCard,
            { backgroundColor: colors.primary + "15" },
          ]}
        >
          <Plane size={28} color={colors.primary} />
          <Text style={saStyles.roleNumber}>{data.byRole?.pilot ?? 0}</Text>
          <Text style={saStyles.roleLabel}>Pilots</Text>
        </View>
        <View
          style={[
            saStyles.roleCard,
            { backgroundColor: colors.secondary + "15" },
          ]}
        >
          <UserCheck size={28} color={colors.secondary} />
          <Text style={saStyles.roleNumber}>
            {data.byRole?.cabin_crew ?? 0}
          </Text>
          <Text style={saStyles.roleLabel}>Cabin Crew</Text>
        </View>
      </View>

      {/* Recent Activity */}
      <View style={adminStyles.recentCard}>
        <TrendingUp size={22} color={colors.success} />
        <View style={adminStyles.recentContent}>
          <Text style={adminStyles.recentNumber}>
            {data.recentRegistrations}
          </Text>
          <Text style={adminStyles.recentLabel}>
            New registrations (last 30 days)
          </Text>
        </View>
      </View>
    </>
  );
};

const saStyles = StyleSheet.create({
  roleRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  roleCard: {
    flex: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: "center",
  },
  roleNumber: {
    fontSize: 28,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: spacing.sm,
  },
  roleLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});

// ─── StatisticsScreen ──────────────────────────────────────────────────────────

export const StatisticsScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [statistics, setStatistics] = useState<DashboardStatistics | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = user?.role === UserRole.SUPERADMIN;

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const data = await usersApi.getStatistics();
      setStatistics(data);
    } catch (error) {
      console.error("Error fetching statistics:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const { csv, filename } = await usersApi.exportToCsv();
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, csv);
      await Sharing.shareAsync(fileUri, {
        mimeType: "text/csv",
        dialogTitle: "Export Members",
      });
    } catch (error) {
      console.error("Error exporting:", error);
    } finally {
      setExporting(false);
    }
  };

  const header = (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <ArrowLeft size={24} color={colors.textInverse} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Statistics</Text>
      <TouchableOpacity
        style={styles.exportButton}
        onPress={handleExport}
        disabled={exporting}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Download size={20} color={colors.textInverse} />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.wrapper}>
        <View style={[styles.statusBarHack, { height: insets.top }]} />
        <SafeAreaView
          style={styles.container}
          edges={["bottom", "left", "right"]}
        >
          {header}
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const tabs = ["General", "Piloti", "Cabin Crew"];

  const renderContent = () => {
    if (!statistics) return null;

    if (!isSuperAdmin) {
      return (
        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          <AdminStatsView data={statistics} />
          <View style={styles.exportSection}>
            <Button
              title={exporting ? "Exporting..." : "Export to CSV"}
              onPress={handleExport}
              loading={exporting}
              size="lg"
            />
          </View>
        </ScrollView>
      );
    }

    return (
      <>
        {/* Tab Bar */}
        <View style={tabStyles.tabBar}>
          {tabs.map((tab, index) => (
            <TouchableOpacity
              key={tab}
              style={[
                tabStyles.tab,
                activeTab === index && tabStyles.tabActive,
              ]}
              onPress={() => setActiveTab(index)}
            >
              <Text
                style={[
                  tabStyles.tabText,
                  activeTab === index && tabStyles.tabTextActive,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          {activeTab === 0 && <SuperAdminGeneralView data={statistics} />}
          {activeTab === 1 && statistics.pilot && (
            <AdminStatsView data={statistics.pilot} />
          )}
          {activeTab === 2 && statistics.cabinCrew && (
            <AdminStatsView data={statistics.cabinCrew} />
          )}
          <View style={styles.exportSection}>
            <Button
              title={exporting ? "Exporting..." : "Export to CSV"}
              onPress={handleExport}
              loading={exporting}
              size="lg"
            />
          </View>
        </ScrollView>
      </>
    );
  };

  return (
    <View style={styles.wrapper}>
      <View style={[styles.statusBarHack, { height: insets.top }]} />
      <SafeAreaView
        style={styles.container}
        edges={["bottom", "left", "right"]}
      >
        {header}
        {renderContent()}
      </SafeAreaView>
    </View>
  );
};

const tabStyles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.border,
    margin: spacing.md,
    borderRadius: borderRadius.lg,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderRadius: borderRadius.md,
  },
  tabActive: {
    backgroundColor: colors.surface,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: typography.weights.semibold,
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
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 56,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  exportButton: {
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  mainCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: "center",
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  totalNumber: {
    fontSize: 48,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    marginTop: spacing.md,
  },
  totalLabel: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  listIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary + "15",
    justifyContent: "center",
    alignItems: "center",
  },
  listName: {
    flex: 1,
    fontSize: typography.sizes.base,
    color: colors.text,
    marginLeft: spacing.md,
  },
  listCount: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  exportSection: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
});
