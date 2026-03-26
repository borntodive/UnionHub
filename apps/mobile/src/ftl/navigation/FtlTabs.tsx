import React from "react";
import { View, StyleSheet, StatusBar } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Clock, Moon, TrendingUp } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { colors } from "../../theme";
import { FdpScreen } from "../screens/FdpScreen";
import { RestScreen } from "../screens/RestScreen";
import { ExtensionScreen } from "../screens/ExtensionScreen";

export type FtlTabParamList = {
  FDP: undefined;
  Rest: undefined;
  Extension: undefined;
};

const Tab = createBottomTabNavigator<FtlTabParamList>();

export const FtlTabs: React.FC = () => {
  const { t } = useTranslation();

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
          name="FDP"
          component={FdpScreen}
          options={{
            tabBarLabel: t("ftl.tabFdp"),
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <Clock size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Rest"
          component={RestScreen}
          options={{
            tabBarLabel: t("ftl.tabRest"),
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <Moon size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Extension"
          component={ExtensionScreen}
          options={{
            tabBarLabel: t("ftl.tabExtension"),
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <TrendingUp size={size} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
