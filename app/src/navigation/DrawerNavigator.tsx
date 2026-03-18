import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { createDrawerNavigator, DrawerContentComponentProps } from '@react-navigation/drawer';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
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
} from 'lucide-react-native';

import { colors, spacing, typography, borderRadius } from '../theme';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/auth';
import * as Updates from 'expo-updates';
import { MembersScreen } from '../screens/MembersScreen/MembersScreen';
import { PayslipTabs } from '../payslip/navigation/PayslipTabs';
import AdminContractsScreen from '../payslip/screens/AdminContractsScreen';
import ContractEditorScreen from '../payslip/screens/ContractEditorScreen';
import { SettingsScreen } from '../screens/SettingsScreen/SettingsScreen';
import { ContractsScreen } from '../screens/admin/ContractsScreen';
import { ContractFormScreen } from '../screens/admin/ContractFormScreen';
import { DocumentsScreen } from '../screens/admin/DocumentsScreen';
import { DocumentEditorScreen } from '../screens/admin/DocumentEditorScreen';
import { PublicDocumentsScreen } from '../screens/PublicDocumentsScreen';
import { UserRole } from '../types';
const Drawer = createDrawerNavigator();

// Placeholder Screens
const HomeScreen = () => {
  const { t } = useTranslation();
  return (
    <View style={styles.screenContainer}>
      <Home size={64} color={colors.primary} />
      <Text style={styles.screenTitle}>{t('common.appName')}</Text>
      <Text style={styles.screenSubtitle}>{t('navigation.home')}</Text>
    </View>
  );
};

const AdminScreen = () => {
  const { t } = useTranslation();
  return (
    <View style={styles.screenContainer}>
      <Shield size={64} color={colors.primary} />
      <Text style={styles.screenTitle}>{t('navigation.admin')}</Text>
      <Text style={styles.screenSubtitle}>Admin Panel - Under Construction</Text>
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

  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.SUPERADMIN;
  const isSuperAdmin = user?.role === UserRole.SUPERADMIN;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
    <View style={styles.drawerContainer}>
      {/* Header with User Info */}
      <View style={styles.drawerHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.nome?.[0]}{user?.cognome?.[0]}
          </Text>
        </View>
        <Text style={styles.userName}>{user?.nome} {user?.cognome}</Text>
        <Text style={styles.userCrewcode}>{user?.crewcode}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>
            {user?.role === UserRole.SUPERADMIN ? t('navigation.superAdmin') : 
             user?.role === UserRole.ADMIN ? t('navigation.admin') : t('members.active')}
          </Text>
        </View>

        {/* Notification Bell */}
        <TouchableOpacity style={styles.notificationButton}>
          <Bell size={24} color={colors.textInverse} />
          <View style={styles.notificationBadge}>
            <Text style={styles.notificationBadgeText}>3</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Menu Items */}
      <ScrollView style={styles.menuContainer}>
        <MenuItem
          icon={<Home size={22} color={colors.primary} />}
          label={t('navigation.home')}
          onPress={() => navigateToScreen('Home')}
        />
        
        <MenuItem
          icon={<User size={22} color={colors.primary} />}
          label={t('navigation.profile')}
          onPress={() => {
            if (user?.id) {
              props.navigation.navigate('MemberDetail', { memberId: user.id });
            }
            props.navigation.closeDrawer();
          }}
        />

        {/* Payslip Calculator - Visible to all */}
        <MenuItem
          icon={<Calculator size={22} color={colors.primary} />}
          label={t('navigation.payslipCalculator')}
          onPress={() => {
            props.navigation.navigate('PayslipCalculator');
            props.navigation.closeDrawer();
          }}
        />

        {isAdmin && (
          <>
            {/* Sezione Membri */}
            <View style={styles.sectionDivider} />
            <Text style={styles.sectionTitle}>{t('navigation.membersSection')}</Text>
            <MenuItem
              icon={<Users size={22} color={colors.primary} />}
              label={t('navigation.members')}
              onPress={() => navigateToScreen('Members')}
            />
            <MenuItem
              icon={<BarChart3 size={22} color={colors.primary} />}
              label={t('navigation.statistics')}
              onPress={() => {
                props.navigation.navigate('Statistics');
                props.navigation.closeDrawer();
              }}
            />
            <MenuItem
              icon={<Upload size={22} color={colors.primary} />}
              label={t('navigation.bulkImport')}
              onPress={() => {
                props.navigation.navigate('BulkImport');
                props.navigation.closeDrawer();
              }}
            />

            {/* Sezione Comunicati */}
            <View style={styles.sectionDivider} />
            <Text style={styles.sectionTitle}>{t('navigation.documentsSection')}</Text>
            <MenuItem
              icon={<FileText size={22} color={colors.primary} />}
              label={t('navigation.documentsManagement')}
              onPress={() => {
                props.navigation.navigate('Documents');
                props.navigation.closeDrawer();
              }}
            />
            <MenuItem
              icon={<FileText size={22} color={colors.primary} />}
              label={t('documents.publicDocuments')}
              onPress={() => {
                props.navigation.navigate('PublicDocuments');
                props.navigation.closeDrawer();
              }}
            />
          </>
        )}

        {/* Public Documents - Visible to non-admin users */}
        {!isAdmin && (
          <>
            <View style={styles.sectionDivider} />
            <MenuItem
              icon={<FileText size={22} color={colors.primary} />}
              label={t('documents.publicDocuments')}
              onPress={() => {
                props.navigation.navigate('PublicDocuments');
                props.navigation.closeDrawer();
              }}
            />
          </>
        )}

        {isSuperAdmin && (
          <>
            <View style={styles.sectionDivider} />
            <Text style={styles.sectionTitle}>{t('navigation.superAdmin')}</Text>
            <MenuItem
              icon={<UserX size={22} color={colors.primary} />}
              label={t('navigation.deactivatedMembers')}
              onPress={() => {
                props.navigation.navigate('DeactivatedMembers');
                props.navigation.closeDrawer();
              }}
            />
            <View style={styles.sectionDivider} />
            <Text style={styles.sectionTitle}>{t('navigation.configuration')}</Text>
            <MenuItem
              icon={<Building2 size={22} color={colors.primary} />}
              label={t('navigation.bases')}
              onPress={() => {
                props.navigation.navigate('Bases');
                props.navigation.closeDrawer();
              }}
            />
            <MenuItem
              icon={<Briefcase size={22} color={colors.primary} />}
              label={t('navigation.contracts')}
              onPress={() => {
                props.navigation.navigate('Contracts');
                props.navigation.closeDrawer();
              }}
            />
            <MenuItem
              icon={<Award size={22} color={colors.primary} />}
              label={t('navigation.grades')}
              onPress={() => {
                props.navigation.navigate('Grades');
                props.navigation.closeDrawer();
              }}
            />
            <MenuItem
              icon={<Calculator size={22} color={colors.primary} />}
              label={t('navigation.claContracts')}
              onPress={() => {
                props.navigation.navigate('ClaContracts');
                props.navigation.closeDrawer();
              }}
            />
          </>
        )}

        {/* Sezione Impostazioni (senza titolo) */}
        <View style={styles.sectionDivider} />
        <MenuItem
          icon={<Settings size={22} color={colors.primary} />}
          label={t('navigation.settings')}
          onPress={() => navigateToScreen('Settings')}
        />
      </ScrollView>

      {/* Footer with Logout */}
      <View style={styles.drawerFooter}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={22} color={colors.error} />
          <Text style={styles.logoutText}>{t('auth.logout')}</Text>
        </TouchableOpacity>
        
        <Text style={styles.versionText}>
          {t('settings.version')} {Updates.updateId ? Updates.updateId.slice(0, 8) : '1.0.0'}
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
}

const MenuItem: React.FC<MenuItemProps> = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress}>
    <View style={styles.menuIcon}>{icon}</View>
    <Text style={styles.menuLabel}>{label}</Text>
  </TouchableOpacity>
);

export const DrawerNavigator: React.FC = () => {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.SUPERADMIN;
  const isSuperAdmin = user?.role === UserRole.SUPERADMIN;

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
        drawerType: 'front',
        overlayColor: 'rgba(0,0,0,0.5)',
      }}
    >
      <Drawer.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          title: t('navigation.home'),
          drawerIcon: ({ color }) => <Home size={22} color={color} />,
        }}
      />

      {isAdmin && (
        <>
          <Drawer.Screen 
            name="Members" 
            component={MembersScreen}
            options={{
              title: t('navigation.members'),
              drawerIcon: ({ color }) => <Users size={22} color={color} />,
            }}
          />
          <Drawer.Screen 
            name="Contracts" 
            component={ContractsScreen}
            options={{
              title: t('navigation.contracts'),
              drawerIcon: ({ color }) => <Briefcase size={22} color={color} />,
              headerShown: false,
            }}
          />
          <Drawer.Screen 
            name="ContractForm" 
            component={ContractFormScreen}
            options={{
              title: t('navigation.contracts'),
              drawerItemStyle: { display: 'none' },
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
            title: t('navigation.admin'),
            drawerIcon: ({ color }) => <Shield size={22} color={color} />,
          }}
        />
      )}
      <Drawer.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          title: t('navigation.settings'),
          drawerIcon: ({ color }) => <Settings size={22} color={color} />,
        }}
      />
      <Drawer.Screen 
        name="PublicDocuments" 
        component={PublicDocumentsScreen}
        options={{
          title: t('documents.publicDocuments'),
          drawerIcon: ({ color }) => <FileText size={22} color={color} />,
          headerShown: false,
        }}
      />
      <Drawer.Screen 
        name="PayslipCalculator" 
        component={PayslipTabs}
        options={{
          title: t('navigation.payslipCalculator'),
          drawerIcon: ({ color }) => <Calculator size={22} color={color} />,
          headerShown: false,
        }}
      />
      {isAdmin && (
        <>
          <Drawer.Screen 
            name="Documents" 
            component={DocumentsScreen}
            options={{
              title: t('documents.title'),
              drawerItemStyle: { display: 'none' },
              headerShown: false,
            }}
          />
          <Drawer.Screen 
            name="DocumentEditor" 
            component={DocumentEditorScreen}
            options={{
              title: t('documents.editDocument'),
              drawerItemStyle: { display: 'none' },
              headerShown: false,
            }}
          />
        </>
      )}
      {isSuperAdmin && (
        <>
          <Drawer.Screen 
            name="ClaContracts" 
            component={AdminContractsScreen}
            options={{
              title: t('navigation.claContracts'),
              drawerIcon: ({ color }) => <Briefcase size={22} color={color} />,
              headerShown: false,
            }}
          />
          <Drawer.Screen 
            name="ContractEditor" 
            component={ContractEditorScreen}
            options={{
              title: t('navigation.contracts'),
              drawerItemStyle: { display: 'none' },
              headerShown: false,
            }}
          />
        </>
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
    alignItems: 'center',
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: 'rgba(255,255,255,0.2)',
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
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.full,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  menuIcon: {
    width: 32,
    alignItems: 'center',
  },
  menuLabel: {
    fontSize: typography.sizes.base,
    color: colors.text,
    marginLeft: spacing.md,
    fontWeight: typography.weights.medium,
  },
  drawerFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.lg,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
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
    textAlign: 'center',
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
    textTransform: 'uppercase',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
  },
  screenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
