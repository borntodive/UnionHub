import React from "react";
import { View, StyleSheet, StatusBar } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  Calculator,
  FileText,
  Bug,
  Settings,
  BookOpen,
  ArrowLeftRight,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { colors } from "../../theme";
import { useAuthStore } from "../../store/authStore";
import { usePayslipStore } from "../store/usePayslipStore";
import { UserRole } from "../../types";
import { InputScreen } from "../screens/InputScreen";
import { ResultScreen } from "../screens/ResultScreen";
import { ContractScreen } from "../screens/ContractScreen";
import { ReverseScreen } from "../screens/ReverseScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import DebugContractScreen from "../screens/DebugContractScreen";

export type PayslipTabParamList = {
  Input: undefined;
  Results: undefined;
  Contract: undefined;
  Reverse: undefined;
  Settings: undefined;
  Debug: undefined;
};

const Tab = createBottomTabNavigator<PayslipTabParamList>();

export const PayslipTabs: React.FC = () => {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const overrideActive = usePayslipStore((state) => state.overrideActive);
  const isAdmin =
    user?.role === UserRole.ADMIN || user?.role === UserRole.SUPERADMIN;
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
            tabBarLabel: t("payslip.input"),
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <FileText size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Results"
          component={ResultScreen}
          options={{
            tabBarLabel: t("payslip.results"),
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <Calculator size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Contract"
          component={ContractScreen}
          options={{
            tabBarLabel: t("payslip.contractTab"),
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <BookOpen size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Reverse"
          component={ReverseScreen}
          options={{
            tabBarLabel: t("payslip.reverseTab"),
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <ArrowLeftRight size={size} color={color} />
            ),
          }}
        />
        {isAdmin && (
          <Tab.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              tabBarLabel: t("payslip.override"),
              tabBarIcon: ({
                color,
                size,
              }: {
                color: string;
                size: number;
              }) => (
                <Settings
                  size={size}
                  color={overrideActive ? colors.warning : color}
                />
              ),
            }}
          />
        )}
        {isSuperAdmin && (
          <Tab.Screen
            name="Debug"
            component={DebugContractScreen}
            options={{
              tabBarLabel: "Debug",
              tabBarIcon: ({
                color,
                size,
              }: {
                color: string;
                size: number;
              }) => <Bug size={size} color={color} />,
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
