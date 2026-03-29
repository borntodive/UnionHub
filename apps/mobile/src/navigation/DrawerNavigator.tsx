import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  createDrawerNavigator,
  DrawerContentComponentProps,
} from "@react-navigation/drawer";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import {
  Home,
  User,
  Users,
  Settings,
  LogOut,
  Shield,
  Building2,
  Briefcase,
  Award,
  UserX,
  BarChart3,
  Upload,
  Calculator,
  FileText,
  Bell,
  AlertTriangle,
  Clock,
  MessageSquare,
  Database,
  Mail,
  Thermometer,
  UserCheck,
} from "lucide-react-native";
import { usersApi } from "../api/users";

import { colors, spacing, typography, borderRadius } from "../theme";
import { useAuthStore } from "../store/authStore";
import { useOfflineStore } from "../store/offlineStore";
import { authApi } from "../api/auth";
import * as Updates from "expo-updates";
import { HomeScreen } from "../screens/HomeScreen/HomeScreen";
import { MembersScreen } from "../screens/MembersScreen/MembersScreen";
import { PayslipTabs } from "../payslip/navigation/PayslipTabs";
import { FtlTabs } from "../ftl";
import { CtcScreen } from "../screens/CtcScreen";
import { ChatbotScreen } from "../chatbot/screens/ChatbotScreen";
import { KnowledgeBaseScreen } from "../knowledge-base/screens/KnowledgeBaseScreen";
import { GmailScreen } from "../gmail/screens/GmailScreen";
import AdminContractsScreen from "../payslip/screens/AdminContractsScreen";
import ContractEditorScreen from "../payslip/screens/ContractEditorScreen";
import { SettingsScreen } from "../screens/SettingsScreen/SettingsScreen";
import { ContractsScreen } from "../screens/admin/ContractsScreen";
import { ContractFormScreen } from "../screens/admin/ContractFormScreen";
import { DocumentsScreen } from "../screens/admin/DocumentsScreen";
import { DocumentEditorScreen } from "../screens/admin/DocumentEditorScreen";
import { IssuesScreen } from "../screens/admin/IssuesScreen";
import { PendingMembersScreen } from "../screens/admin/PendingMembersScreen";
import { PublicDocumentsScreen } from "../screens/PublicDocumentsScreen";
import { ReportIssueScreen } from "../screens/ReportIssueScreen/ReportIssueScreen";
import { MyIssuesScreen } from "../screens/MyIssuesScreen/MyIssuesScreen";
import { NotificationsScreen } from "../screens/NotificationsScreen/NotificationsScreen";
import { UserRole } from "../types";
const Drawer = createDrawerNavigator();

const AdminScreen = () => {
  const { t } = useTranslation();
  return (
    <View style={styles.screenContainer}>
      <Shield size={64} color={colors.primary} />
      <Text style={styles.screenTitle}>{t("navigation.admin")}</Text>
      <Text style={styles.screenSubtitle}>
        Admin Panel - Under Construction
      </Text>
    </View>
  );
};

// Custom Drawer Content
const CustomDrawerContent: React.FC<DrawerContentComponentProps> = (props) => {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const navigation = useNavigation();
  const isOnline = useOfflineStore((state) => state.isOnline);
  const notificationCount = useOfflineStore(
    (state) => state.notifications.length,
  );

  const handleLogout = async () => {
    try {
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch (e) {
      // Ignore logout errors
    } finally {
      await logout();
    }
  };

  const navigateToScreen = (screenName: string) => {
    props.navigation.navigate(screenName);
    props.navigation.closeDrawer();
  };

  const isAdmin =
    user?.role === UserRole.ADMIN || user?.role === UserRole.SUPERADMIN;
  const isSuperAdmin = user?.role === UserRole.SUPERADMIN;
  const isRsa = user?.rsa === true;

  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!isAdmin || !isOnline) return;
    usersApi
      .getPendingCount()
      .then((c) => setPendingCount(c))
      .catch(() => {});
  }, [isAdmin, isOnline]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.drawerContainer}>
        {/* Header with User Info */}
        <View style={styles.drawerHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.nome?.[0]}
              {user?.cognome?.[0]}
            </Text>
          </View>
          <Text style={styles.userName}>
            {user?.nome} {user?.cognome}
          </Text>
          <Text style={styles.userCrewcode}>{user?.crewcode}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>
              {user?.role === UserRole.SUPERADMIN
                ? t("navigation.superAdmin")
                : user?.role === UserRole.ADMIN
                  ? t("navigation.admin")
                  : t("members.active")}
            </Text>
          </View>

          {/* Notification Bell */}
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => {
              props.navigation.navigate("Notifications");
              props.navigation.closeDrawer();
            }}
          >
            <Bell size={24} color={colors.textInverse} />
            {notificationCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {notificationCount > 99 ? "99+" : notificationCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Menu Items */}
        <ScrollView style={styles.menuContainer}>
          {/* ── Always available (online + offline) ── */}
          <MenuItem
            icon={<Home size={22} color={colors.primary} />}
            label={t("navigation.home")}
            onPress={() => navigateToScreen("Home")}
          />

          {isOnline && (
            <MenuItem
              icon={<User size={22} color={colors.primary} />}
              label={t("navigation.profile")}
              onPress={() => {
                if (user?.id) {
                  props.navigation.navigate("MemberDetail", {
                    memberId: user.id,
                  });
                }
                props.navigation.closeDrawer();
              }}
            />
          )}

          <MenuItem
            icon={<Calculator size={22} color={colors.primary} />}
            label={t("navigation.payslipCalculator")}
            onPress={() => {
              props.navigation.navigate("PayslipCalculator");
              props.navigation.closeDrawer();
            }}
          />

          <MenuItem
            icon={<Clock size={22} color={colors.primary} />}
            label={t("navigation.ftlCalculator")}
            onPress={() => {
              props.navigation.navigate("FtlCalculator");
              props.navigation.closeDrawer();
            }}
          />

          <MenuItem
            icon={<Thermometer size={22} color={colors.primary} />}
            label={t("navigation.ctcCalculator")}
            onPress={() => {
              props.navigation.navigate("ColdTempCorrection");
              props.navigation.closeDrawer();
            }}
          />

          {isOnline && isAdmin && (
            <MenuItem
              icon={<MessageSquare size={22} color={colors.primary} />}
              label={t("navigation.chatbot")}
              onPress={() => {
                props.navigation.navigate("Chatbot");
                props.navigation.closeDrawer();
              }}
            />
          )}

          {isOnline && isRsa && (
            <MenuItem
              icon={<Mail size={22} color={colors.primary} />}
              label={t("navigation.gmail")}
              onPress={() => {
                props.navigation.navigate("Gmail");
                props.navigation.closeDrawer();
              }}
            />
          )}

          {/* Issues — available offline */}
          <View style={styles.sectionDivider} />
          <Text style={styles.sectionTitle}>
            {t("navigation.issuesSection")}
          </Text>
          <MenuItem
            icon={<AlertTriangle size={22} color={colors.primary} />}
            label={t("navigation.reportIssue")}
            onPress={() => {
              props.navigation.navigate("ReportIssue");
              props.navigation.closeDrawer();
            }}
          />
          {isOnline && (
            <>
              <MenuItem
                icon={<AlertTriangle size={22} color={colors.primary} />}
                label={t("navigation.myIssues")}
                onPress={() => {
                  props.navigation.navigate("MyIssues");
                  props.navigation.closeDrawer();
                }}
              />
              {isAdmin && (
                <MenuItem
                  icon={<AlertTriangle size={22} color={colors.primary} />}
                  label={t("navigation.issues")}
                  onPress={() => {
                    props.navigation.navigate("Issues");
                    props.navigation.closeDrawer();
                  }}
                />
              )}
            </>
          )}

          {/* ── Online-only items ── */}
          {isOnline && (
            <>
              {/* Public Documents - non-admin */}
              {!isAdmin && (
                <>
                  <View style={styles.sectionDivider} />
                  <MenuItem
                    icon={<FileText size={22} color={colors.primary} />}
                    label={t("documents.publicDocuments")}
                    onPress={() => {
                      props.navigation.navigate("PublicDocuments");
                      props.navigation.closeDrawer();
                    }}
                  />
                </>
              )}

              {isAdmin && (
                <>
                  {/* Sezione Membri */}
                  <View style={styles.sectionDivider} />
                  <Text style={styles.sectionTitle}>
                    {t("navigation.membersSection")}
                  </Text>
                  <MenuItem
                    icon={<Users size={22} color={colors.primary} />}
                    label={t("navigation.members")}
                    onPress={() => navigateToScreen("Members")}
                  />
                  <MenuItem
                    icon={<BarChart3 size={22} color={colors.primary} />}
                    label={t("navigation.statistics")}
                    onPress={() => {
                      props.navigation.navigate("Statistics");
                      props.navigation.closeDrawer();
                    }}
                  />
                  <MenuItem
                    icon={<Upload size={22} color={colors.primary} />}
                    label={t("navigation.bulkImport")}
                    onPress={() => {
                      props.navigation.navigate("BulkImport");
                      props.navigation.closeDrawer();
                    }}
                  />
                  <MenuItem
                    icon={<UserCheck size={22} color={colors.primary} />}
                    label={t("navigation.pendingMembers")}
                    badge={pendingCount > 0 ? pendingCount : undefined}
                    onPress={() => {
                      props.navigation.navigate("PendingMembers");
                      props.navigation.closeDrawer();
                    }}
                  />

                  {/* Sezione Comunicati */}
                  <View style={styles.sectionDivider} />
                  <Text style={styles.sectionTitle}>
                    {t("navigation.documentsSection")}
                  </Text>
                  <MenuItem
                    icon={<FileText size={22} color={colors.primary} />}
                    label={t("navigation.documentsManagement")}
                    onPress={() => {
                      props.navigation.navigate("Documents");
                      props.navigation.closeDrawer();
                    }}
                  />
                  <MenuItem
                    icon={<FileText size={22} color={colors.primary} />}
                    label={t("documents.publicDocuments")}
                    onPress={() => {
                      props.navigation.navigate("PublicDocuments");
                      props.navigation.closeDrawer();
                    }}
                  />
                </>
              )}

              {isSuperAdmin && (
                <>
                  <View style={styles.sectionDivider} />
                  <Text style={styles.sectionTitle}>
                    {t("navigation.superAdmin")}
                  </Text>
                  <MenuItem
                    icon={<UserX size={22} color={colors.primary} />}
                    label={t("navigation.deactivatedMembers")}
                    onPress={() => {
                      props.navigation.navigate("DeactivatedMembers");
                      props.navigation.closeDrawer();
                    }}
                  />
                  <View style={styles.sectionDivider} />
                  <Text style={styles.sectionTitle}>
                    {t("navigation.configuration")}
                  </Text>
                  <MenuItem
                    icon={<Building2 size={22} color={colors.primary} />}
                    label={t("navigation.bases")}
                    onPress={() => {
                      props.navigation.navigate("Bases");
                      props.navigation.closeDrawer();
                    }}
                  />
                  <MenuItem
                    icon={<Briefcase size={22} color={colors.primary} />}
                    label={t("navigation.contracts")}
                    onPress={() => {
                      props.navigation.navigate("Contracts");
                      props.navigation.closeDrawer();
                    }}
                  />
                  <MenuItem
                    icon={<Award size={22} color={colors.primary} />}
                    label={t("navigation.grades")}
                    onPress={() => {
                      props.navigation.navigate("Grades");
                      props.navigation.closeDrawer();
                    }}
                  />
                  <MenuItem
                    icon={<Calculator size={22} color={colors.primary} />}
                    label={t("navigation.claContracts")}
                    onPress={() => {
                      props.navigation.navigate("ClaContracts");
                      props.navigation.closeDrawer();
                    }}
                  />
                  <MenuItem
                    icon={<AlertTriangle size={22} color={colors.primary} />}
                    label={t("navigation.issueCategories")}
                    onPress={() => {
                      props.navigation.navigate("IssueCategories");
                      props.navigation.closeDrawer();
                    }}
                  />
                  <MenuItem
                    icon={<AlertTriangle size={22} color={colors.primary} />}
                    label={t("navigation.issueUrgencies")}
                    onPress={() => {
                      props.navigation.navigate("IssueUrgencies");
                      props.navigation.closeDrawer();
                    }}
                  />
                  <MenuItem
                    icon={<Database size={22} color={colors.primary} />}
                    label={t("navigation.knowledgeBase")}
                    onPress={() => {
                      props.navigation.navigate("KnowledgeBase");
                      props.navigation.closeDrawer();
                    }}
                  />
                  <MenuItem
                    icon={<Mail size={22} color={colors.primary} />}
                    label={t("navigation.gmailSetup")}
                    onPress={() => {
                      props.navigation.navigate("GmailSetup");
                      props.navigation.closeDrawer();
                    }}
                  />
                </>
              )}
            </>
          )}

          {/* ── Always available ── */}
          <View style={styles.sectionDivider} />
          <MenuItem
            icon={<Settings size={22} color={colors.primary} />}
            label={t("navigation.settings")}
            onPress={() => navigateToScreen("Settings")}
          />
        </ScrollView>

        {/* Footer with Logout */}
        <View style={styles.drawerFooter}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <LogOut size={22} color={colors.error} />
            <Text style={styles.logoutText}>{t("auth.logout")}</Text>
          </TouchableOpacity>

          <Text style={styles.versionText}>
            {t("settings.version")}{" "}
            {Updates.updateId ? Updates.updateId.slice(0, 8) : "1.0.0"}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

// Menu Item Component
interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  badge?: number;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon, label, onPress, badge }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress}>
    <View style={styles.menuIcon}>{icon}</View>
    <Text style={styles.menuLabel}>{label}</Text>
    {badge !== undefined && badge > 0 && (
      <View style={styles.menuItemBadge}>
        <Text style={styles.menuItemBadgeText}>
          {badge > 99 ? "99+" : badge}
        </Text>
      </View>
    )}
  </TouchableOpacity>
);

export const DrawerNavigator: React.FC = () => {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const isAdmin =
    user?.role === UserRole.ADMIN || user?.role === UserRole.SUPERADMIN;
  const isSuperAdmin = user?.role === UserRole.SUPERADMIN;
  const isRsa = user?.rsa === true;

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: colors.textInverse,
        headerTitleStyle: {
          fontWeight: typography.weights.bold,
        },
        drawerStyle: {
          backgroundColor: colors.surface,
          width: 280,
        },
        drawerType: "front",
        overlayColor: "rgba(0,0,0,0.5)",
      }}
    >
      <Drawer.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: t("navigation.home"),
          headerShown: false,
          drawerIcon: ({ color }) => <Home size={22} color={color} />,
        }}
      />

      {isAdmin && (
        <>
          <Drawer.Screen
            name="Members"
            component={MembersScreen}
            options={{
              title: t("navigation.members"),
              drawerIcon: ({ color }) => <Users size={22} color={color} />,
            }}
          />
          <Drawer.Screen
            name="Contracts"
            component={ContractsScreen}
            options={{
              title: t("navigation.contracts"),
              drawerIcon: ({ color }) => <Briefcase size={22} color={color} />,
              headerShown: false,
            }}
          />
          <Drawer.Screen
            name="ContractForm"
            component={ContractFormScreen}
            options={{
              title: t("navigation.contracts"),
              drawerItemStyle: { display: "none" },
              headerShown: false,
            }}
          />
        </>
      )}
      {isSuperAdmin && (
        <Drawer.Screen
          name="Admin"
          component={AdminScreen}
          options={{
            title: t("navigation.admin"),
            drawerIcon: ({ color }) => <Shield size={22} color={color} />,
          }}
        />
      )}
      <Drawer.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          title: t("notifications.title"),
          drawerItemStyle: { display: "none" },
          headerShown: false,
        }}
      />
      <Drawer.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: t("navigation.settings"),
          drawerIcon: ({ color }) => <Settings size={22} color={color} />,
        }}
      />
      <Drawer.Screen
        name="PublicDocuments"
        component={PublicDocumentsScreen}
        options={{
          title: t("documents.publicDocuments"),
          drawerIcon: ({ color }) => <FileText size={22} color={color} />,
          headerShown: false,
        }}
      />
      <Drawer.Screen
        name="PayslipCalculator"
        component={PayslipTabs}
        options={{
          title: t("navigation.payslipCalculator"),
          drawerIcon: ({ color }) => <Calculator size={22} color={color} />,
          headerShown: false,
        }}
      />
      <Drawer.Screen
        name="FtlCalculator"
        component={FtlTabs}
        options={{
          title: t("navigation.ftlCalculator"),
          drawerIcon: ({ color }) => <Clock size={22} color={color} />,
          headerShown: false,
        }}
      />
      <Drawer.Screen
        name="ColdTempCorrection"
        component={CtcScreen}
        options={{
          title: t("navigation.ctcCalculator"),
          drawerIcon: ({ color }) => <Thermometer size={22} color={color} />,
          headerShown: false,
        }}
      />
      <Drawer.Screen
        name="Chatbot"
        component={ChatbotScreen}
        options={{
          title: t("navigation.chatbot"),
          drawerIcon: ({ color }) => <MessageSquare size={22} color={color} />,
          headerShown: false,
        }}
      />
      {/* Issues screens — hidden from drawer list, accessible to all users */}
      <Drawer.Screen
        name="ReportIssue"
        component={ReportIssueScreen}
        options={{
          title: t("navigation.reportIssue"),
          drawerItemStyle: { display: "none" },
          headerShown: false,
        }}
      />
      <Drawer.Screen
        name="MyIssues"
        component={MyIssuesScreen}
        options={{
          title: t("navigation.myIssues"),
          drawerItemStyle: { display: "none" },
          headerShown: false,
        }}
      />

      {isAdmin && (
        <>
          <Drawer.Screen
            name="Issues"
            component={IssuesScreen}
            options={{
              title: t("navigation.issues"),
              drawerItemStyle: { display: "none" },
              headerShown: false,
            }}
          />
          <Drawer.Screen
            name="PendingMembers"
            component={PendingMembersScreen}
            options={{
              title: t("navigation.pendingMembers"),
              drawerItemStyle: { display: "none" },
              headerShown: false,
            }}
          />
          <Drawer.Screen
            name="Documents"
            component={DocumentsScreen}
            options={{
              title: t("documents.title"),
              drawerItemStyle: { display: "none" },
              headerShown: false,
            }}
          />
          <Drawer.Screen
            name="DocumentEditor"
            component={DocumentEditorScreen}
            options={{
              title: t("documents.editDocument"),
              drawerItemStyle: { display: "none" },
              headerShown: false,
            }}
          />
        </>
      )}
      {isSuperAdmin && (
        <>
          <Drawer.Screen
            name="KnowledgeBase"
            component={KnowledgeBaseScreen}
            options={{
              title: t("navigation.knowledgeBase"),
              drawerIcon: ({ color }) => <Database size={22} color={color} />,
              headerShown: false,
            }}
          />
          <Drawer.Screen
            name="ClaContracts"
            component={AdminContractsScreen}
            options={{
              title: t("navigation.claContracts"),
              drawerIcon: ({ color }) => <Briefcase size={22} color={color} />,
              headerShown: false,
            }}
          />
          <Drawer.Screen
            name="ContractEditor"
            component={ContractEditorScreen}
            options={{
              title: t("navigation.contracts"),
              drawerItemStyle: { display: "none" },
              headerShown: false,
            }}
          />
        </>
      )}
      {isRsa && (
        <Drawer.Screen
          name="Gmail"
          component={GmailScreen}
          options={{
            title: t("navigation.gmail"),
            drawerIcon: ({ color }) => <Mail size={22} color={color} />,
            headerShown: false,
          }}
        />
      )}
    </Drawer.Navigator>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  drawerContainer: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  drawerHeader: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    alignItems: "center",
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  avatarText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  userName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
    marginBottom: spacing.xs,
  },
  userCrewcode: {
    fontSize: typography.sizes.sm,
    color: colors.textInverse,
    opacity: 0.8,
    marginBottom: spacing.sm,
  },
  roleBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  roleText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.textInverse,
  },
  notificationButton: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.full,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  notificationBadgeText: {
    fontSize: typography.sizes.xs,
    color: colors.textInverse,
    fontWeight: typography.weights.bold,
  },
  menuContainer: {
    flex: 1,
    paddingVertical: spacing.sm,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  menuIcon: {
    width: 32,
    alignItems: "center",
  },
  menuLabel: {
    fontSize: typography.sizes.base,
    color: colors.text,
    marginLeft: spacing.md,
    fontWeight: typography.weights.medium,
    flex: 1,
  },
  menuItemBadge: {
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 5,
  },
  menuItemBadgeText: {
    color: colors.textInverse,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  drawerFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.lg,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  logoutText: {
    fontSize: typography.sizes.base,
    color: colors.error,
    marginLeft: spacing.md,
    fontWeight: typography.weights.medium,
  },
  versionText: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
    textAlign: "center",
    marginTop: spacing.md,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textTertiary,
    textTransform: "uppercase",
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
  },
  screenContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  screenTitle: {
    marginTop: spacing.md,
    fontSize: typography.sizes.lg,
    color: colors.text,
    fontWeight: typography.weights.medium,
  },
  screenSubtitle: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
  },
});
