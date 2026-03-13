import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Calculator, Settings, FileText } from 'lucide-react-native';
import { colors } from '../../theme';
import { InputScreen } from '../screens/InputScreen';
import { ResultScreen } from '../screens/ResultScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

export type PayslipTabParamList = {
  Input: undefined;
  Results: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<PayslipTabParamList>();

export const PayslipTabs: React.FC = () => {
  return (
    <View style={styles.container}>
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
            tabBarLabel: 'Risultati',
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <Calculator size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarLabel: 'Impostazioni',
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <Settings size={size} color={color} />
            ),
          }}
        />
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
