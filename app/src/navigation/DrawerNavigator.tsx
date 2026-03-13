import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { createDrawerNavigator, DrawerContentComponentProps } from '@react-navigation/drawer';
import { useNavigation } from '@react-navigation/native';
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
} from 'lucide-react-native';

import { colors, spacing, typography, borderRadius } from '../theme';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/auth';
import { MembersScreen } from '../screens/MembersScreen/MembersScreen';
import { UserRole } from '../types';
const Drawer = createDrawerNavigator();

// Placeholder Screens
const HomeScreen = () => (
  <View style={styles.screenContainer}>
    <Home size={64} color={colors.primary} />
    <Text style={styles.screenTitle}>Welcome to UnionConnect</Text>
    <Text style={styles.screenSubtitle}>Home Screen - Under Construction</Text>
  </View>
);

const SettingsScreen = () => (
  <View style={styles.screenContainer}>
    <Settings size={64} color={colors.primary} />
    <Text style={styles.screenTitle}>Settings</Text>
    <Text style={styles.screenSubtitle}>App Settings - Under Construction</Text>
  </View>
);

const AdminScreen = () => (
  <View style={styles.screenContainer}>
    <Shield size={64} color={colors.primary} />
    <Text style={styles.screenTitle}>Administration</Text>
    <Text style={styles.screenSubtitle}>Admin Panel - Under Construction</Text>
  </View>
);

// Custom Drawer Content
const CustomDrawerContent: React.FC<DrawerContentComponentProps> = (props) => {
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
            {user?.role === UserRole.SUPERADMIN ? 'Super Admin' : 
             user?.role === UserRole.ADMIN ? 'Administrator' : 'User'}
          </Text>
        </View>
      </View>

      {/* Menu Items */}
      <ScrollView style={styles.menuContainer}>
        <MenuItem
          icon={<Home size={22} color={colors.primary} />}
          label="Home"
          onPress={() => navigateToScreen('Home')}
        />
        
        <MenuItem
          icon={<User size={22} color={colors.primary} />}
          label="Profile"
          onPress={() => {
            if (user?.id) {
              props.navigation.navigate('MemberDetail', { memberId: user.id });
            }
            props.navigation.closeDrawer();
          }}
        />

        {isAdmin && (
          <>
            <MenuItem
              icon={<Users size={22} color={colors.primary} />}
              label="Members"
              onPress={() => navigateToScreen('Members')}
            />
            <MenuItem
              icon={<BarChart3 size={22} color={colors.primary} />}
              label="Statistics"
              onPress={() => {
                props.navigation.navigate('Statistics');
                props.navigation.closeDrawer();
              }}
            />
            <MenuItem
              icon={<Upload size={22} color={colors.primary} />}
              label="Bulk Import"
              onPress={() => {
                props.navigation.navigate('BulkImport');
                props.navigation.closeDrawer();
              }}
            />
          </>
        )}

        {/* Calcolatore Busta Paga - Visibile a tutti */}
        <View style={styles.sectionDivider} />
        <MenuItem
          icon={<Calculator size={22} color={colors.primary} />}
          label="Calcolatore Busta Paga"
          onPress={() => {
            props.navigation.navigate('PayslipCalculator');
            props.navigation.closeDrawer();
          }}
        />

        {isSuperAdmin && (
          <>
            <View style={styles.sectionDivider} />
            <Text style={styles.sectionTitle}>SuperAdmin</Text>
            <MenuItem
              icon={<UserX size={22} color={colors.primary} />}
              label="Deactivated Members"
              onPress={() => {
                props.navigation.navigate('DeactivatedMembers');
                props.navigation.closeDrawer();
              }}
            />
            <View style={styles.sectionDivider} />
            <Text style={styles.sectionTitle}>Configuration</Text>
            <MenuItem
              icon={<Building2 size={22} color={colors.primary} />}
              label="Bases"
              onPress={() => {
                props.navigation.navigate('Bases');
                props.navigation.closeDrawer();
              }}
            />
            <MenuItem
              icon={<Briefcase size={22} color={colors.primary} />}
              label="Contracts"
              onPress={() => {
                props.navigation.navigate('Contracts');
                props.navigation.closeDrawer();
              }}
            />
            <MenuItem
              icon={<Award size={22} color={colors.primary} />}
              label="Grades"
              onPress={() => {
                props.navigation.navigate('Grades');
                props.navigation.closeDrawer();
              }}
            />
          </>
        )}

        <MenuItem
          icon={<Settings size={22} color={colors.primary} />}
          label="Settings"
          onPress={() => navigateToScreen('Settings')}
        />
      </ScrollView>

      {/* Footer with Logout */}
      <View style={styles.drawerFooter}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={22} color={colors.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
        
        <Text style={styles.versionText}>Version 1.0.0</Text>
      </View>
    </View>
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
          title: 'Home',
          drawerIcon: ({ color }) => <Home size={22} color={color} />,
        }}
      />

      {isAdmin && (
        <Drawer.Screen 
          name="Members" 
          component={MembersScreen}
          options={{
            title: 'Members',
            drawerIcon: ({ color }) => <Users size={22} color={color} />,
          }}
        />
      )}
      {isSuperAdmin && (
        <Drawer.Screen 
          name="Admin" 
          component={AdminScreen}
          options={{
            title: 'Administration',
            drawerIcon: ({ color }) => <Shield size={22} color={color} />,
          }}
        />
      )}
      <Drawer.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          title: 'Settings',
          drawerIcon: ({ color }) => <Settings size={22} color={color} />,
        }}
      />
    </Drawer.Navigator>
  );
};

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  drawerHeader: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    paddingTop: spacing.xl,
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
