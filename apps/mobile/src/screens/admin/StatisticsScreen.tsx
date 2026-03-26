import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
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
  FileText,
  Download,
} from "lucide-react-native";
import { colors, spacing, typography, borderRadius } from "../../theme";
import { usersApi } from "../../api/users";
import { Button } from "../../components/Button";
import { useAuthStore } from "../../store/authStore";
import { UserRole } from "../../types";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

interface Statistics {
  totalUsers: number;
  byRole: { pilot: number; cabin_crew: number };
  byBase: { base: string; count: number }[];
  byContract: { contract: string; count: number }[];
  recentRegistrations: number;
  itudCount: number;
  rsaCount: number;
  usoCount: number;
}

const { width } = Dimensions.get("window");

export const StatisticsScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
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

      // Share the CSV file
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
      <View style={{ width: 40 }} />
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

  return (
    <View style={styles.wrapper}>
      <View style={[styles.statusBarHack, { height: insets.top }]} />
      <SafeAreaView
        style={styles.container}
        edges={["bottom", "left", "right"]}
      >
        {header}

        <ScrollView style={styles.content}>
          {/* Total Members Card */}
          <View style={styles.mainCard}>
            <Users size={48} color={colors.primary} />
            <Text style={styles.totalNumber}>
              {statistics?.totalUsers || 0}
            </Text>
            <Text style={styles.totalLabel}>Total Members</Text>
          </View>

          {/* Role Distribution */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>By Role</Text>
            <View style={styles.roleCards}>
              <View
                style={[
                  styles.roleCard,
                  { backgroundColor: colors.primary + "15" },
                ]}
              >
                <Plane size={32} color={colors.primary} />
                <Text style={styles.roleNumber}>
                  {statistics?.byRole.pilot || 0}
                </Text>
                <Text style={styles.roleLabel}>Pilots</Text>
              </View>
              <View
                style={[
                  styles.roleCard,
                  { backgroundColor: colors.secondary + "15" },
                ]}
              >
                <UserCheck size={32} color={colors.secondary} />
                <Text style={styles.roleNumber}>
                  {statistics?.byRole.cabin_crew || 0}
                </Text>
                <Text style={styles.roleLabel}>Cabin Crew</Text>
              </View>
            </View>
          </View>

          {/* Recent Activity */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <View style={styles.activityCard}>
              <TrendingUp size={24} color={colors.success} />
              <View style={styles.activityContent}>
                <Text style={styles.activityNumber}>
                  {statistics?.recentRegistrations || 0}
                </Text>
                <Text style={styles.activityLabel}>
                  New registrations (last 30 days)
                </Text>
              </View>
            </View>
          </View>

          {/* ITUD & RSA */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Union Membership</Text>
            <View style={styles.membershipCards}>
              <View style={styles.membershipCard}>
                <FileText size={24} color={colors.info} />
                <Text style={styles.membershipNumber}>
                  {statistics?.itudCount || 0}
                </Text>
                <Text style={styles.membershipLabel}>ITUD Members</Text>
              </View>
              <View style={styles.membershipCard}>
                <FileText size={24} color={colors.warning} />
                <Text style={styles.membershipNumber}>
                  {statistics?.rsaCount || 0}
                </Text>
                <Text style={styles.membershipLabel}>RSA Members</Text>
              </View>
              <View style={styles.membershipCard}>
                <FileText size={24} color={colors.primary} />
                <Text style={styles.membershipNumber}>
                  {statistics?.usoCount || 0}
                </Text>
                <Text style={styles.membershipLabel}>USO Members</Text>
              </View>
            </View>
          </View>

          {/* By Base */}
          {statistics?.byBase && statistics.byBase.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Top Bases</Text>
              <View style={styles.listCard}>
                {statistics.byBase.map((item, index) => (
                  <View key={index} style={styles.listItem}>
                    <View style={styles.listIcon}>
                      <Building2 size={16} color={colors.primary} />
                    </View>
                    <Text style={styles.listName}>{item.base}</Text>
                    <Text style={styles.listCount}>{item.count}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* By Contract */}
          {statistics?.byContract && statistics.byContract.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Top Contracts</Text>
              <View style={styles.listCard}>
                {statistics.byContract.map((item, index) => (
                  <View key={index} style={styles.listItem}>
                    <View style={styles.listIcon}>
                      <Briefcase size={16} color={colors.primary} />
                    </View>
                    <Text style={styles.listName}>{item.contract}</Text>
                    <Text style={styles.listCount}>{item.count}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Export Button */}
          <View style={styles.exportSection}>
            <Button
              title={exporting ? "Exporting..." : "Export to CSV"}
              onPress={handleExport}
              loading={exporting}
              size="lg"
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

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
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  roleCards: {
    flexDirection: "row",
    gap: spacing.md,
  },
  roleCard: {
    flex: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: "center",
  },
  roleNumber: {
    fontSize: 32,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: spacing.sm,
  },
  roleLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  activityCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activityContent: {
    marginLeft: spacing.md,
  },
  activityNumber: {
    fontSize: 24,
    fontWeight: typography.weights.bold,
    color: colors.success,
  },
  activityLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  membershipCards: {
    flexDirection: "row",
    gap: spacing.md,
  },
  membershipCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  membershipNumber: {
    fontSize: 24,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: spacing.sm,
  },
  membershipLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: "center",
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
