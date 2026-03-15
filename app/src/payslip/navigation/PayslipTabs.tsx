import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Calculator, Settings, FileText, Bug } from 'lucide-react-native';
import { colors } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { UserRole } from '../../types';
import { InputScreen } from '../screens/InputScreen';
import { ResultScreen } from '../screens/ResultScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import DebugContractScreen from '../screens/DebugContractScreen';

export type PayslipTabParamList = {
  Input: undefined;
  Results: undefined;
  Settings: undefined;
  Debug: undefined;
};

const Tab = createBottomTabNavigator<PayslipTabParamList>();

export const PayslipTabs: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = user?.role === UserRole.SUPERADMIN;
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarStyle: styles.tabBar,
        }}
      >
        <Tab.Screen
          name="Input"
          component={InputScreen}
          options={{
            tabBarLabel: 'Input',
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <FileText size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Results"
          component={ResultScreen}
          options={{
            tabBarLabel: 'Results',
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <Calculator size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarLabel: 'Settings',
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <Settings size={size} color={color} />
            ),
          }}
        />
        {isSuperAdmin && (
          <Tab.Screen
            name="Debug"
            component={DebugContractScreen}
            options={{
              tabBarLabel: 'Debug',
              tabBarIcon: ({ color, size }: { color: string; size: number }) => (
                <Bug size={size} color={color} />
              ),
            }}
          />
        )}
      </Tab.Navigator>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
