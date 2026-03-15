import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// Disable screens to prevent white screen on resume (iOS issue)
// import { enableScreens } from 'react-native-screens';
// enableScreens();

import { RootStackParamList } from "./types";
import { LoginScreen } from "../screens/LoginScreen/LoginScreen";
import { ChangePasswordScreen } from "../screens/ChangePasswordScreen/ChangePasswordScreen";
import { MemberDetailScreen } from "../screens/MemberDetailScreen/MemberDetailScreen";
import { MemberEditScreen } from "../screens/MemberDetailScreen/MemberEditScreen";
import { MemberCreateScreen } from "../screens/MembersScreen/MemberCreateScreen";
import { DrawerNavigator } from "./DrawerNavigator";
// Admin screens
import {
  BasesScreen,
  BaseFormScreen,
  ContractsScreen,
  ContractFormScreen,
  GradesScreen,
  GradeFormScreen,
  DeactivatedMembersScreen,
  StatisticsScreen,
  BulkImportScreen,
} from "../screens/admin";
// CLA Contract Admin screens
import AdminContractsScreen from "../payslip/screens/AdminContractsScreen";
import ContractEditorScreen from "../payslip/screens/ContractEditorScreen";
import { colors } from "../theme";
import { useAuthStore } from "../store/authStore";
import { SharedFileHandler } from "../components/SharedFileHandler";

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const user = useAuthStore((state) => state.user);
  const mustChangePassword = user?.mustChangePassword ?? false;

  // Show loading while checking auth state
  if (isLoading) {
    return null; // Or a loading screen
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          // Auth Stack
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen
              name="ChangePassword"
              component={ChangePasswordScreen}
              options={{
                headerShown: true,
                title: "Change Password",
                headerStyle: { backgroundColor: colors.primary },
                headerTintColor: colors.textInverse,
              }}
            />
          </>
        ) : mustChangePassword ? (
          // Force password change
          <Stack.Screen
            name="ChangePassword"
            component={ChangePasswordScreen}
            options={{
              headerShown: true,
              title: "Cambio Password Obbligatorio",
              headerStyle: { backgroundColor: colors.secondary },
              headerTintColor: colors.textInverse,
              headerBackVisible: false,
              gestureEnabled: false,
            }}
          />
        ) : (
          // App Stack
          <>
            <Stack.Screen name="MainTabs" component={DrawerNavigator} />
            <Stack.Screen
              name="ChangePassword"
              component={ChangePasswordScreen}
              options={{
                headerShown: true,
                title: "Change Password",
                headerStyle: { backgroundColor: colors.primary },
                headerTintColor: colors.textInverse,
              }}
            />
            <Stack.Screen
              name="MemberDetail"
              component={MemberDetailScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="MemberEdit"
              component={MemberEditScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="MemberCreate"
              component={MemberCreateScreen}
              options={{
                headerShown: false,
              }}
            />
            {/* Admin Routes */}
            <Stack.Screen
              name="Bases"
              component={BasesScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="BaseForm"
              component={BaseFormScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Contracts"
              component={ContractsScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ContractForm"
              component={ContractFormScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Grades"
              component={GradesScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="GradeForm"
              component={GradeFormScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="DeactivatedMembers"
              component={DeactivatedMembersScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Statistics"
              component={StatisticsScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="BulkImport"
              component={BulkImportScreen}
              options={{ headerShown: false }}
            />
            {/* CLA Contract Admin */}
            <Stack.Screen
              name="ClaContracts"
              component={AdminContractsScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ContractEditor"
              component={ContractEditorScreen}
              options={{ headerShown: false }}
            />
          </>
        )}
      </Stack.Navigator>
      <SharedFileHandler />
    </NavigationContainer>
  );
};
