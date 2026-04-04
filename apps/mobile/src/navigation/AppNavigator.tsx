import React, { useEffect } from "react";
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
import { MemberOnboardingScreen } from "../screens/MemberOnboardingScreen/MemberOnboardingScreen";
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
  IssueDetailScreen,
  IssueCategoriesScreen,
  IssueCategoryFormScreen,
  IssueUrgenciesScreen,
  IssueUrgencyFormScreen,
} from "../screens/admin";
// Issues screens
import { MyIssueDetailScreen } from "../screens/MyIssueDetailScreen/MyIssueDetailScreen";
// Note: CLA Contract screens are now in DrawerNavigator
import { PdfViewerScreen } from "../screens/admin/PdfViewerScreen";
import { colors } from "../theme";
import { useAuthStore } from "../store/authStore";
import { SharedFileHandler } from "../components/SharedFileHandler";
import { CompleteProfileScreen } from "../screens/CompleteProfileScreen/CompleteProfileScreen";
import { JoinUsScreen } from "../screens/JoinUsScreen/JoinUsScreen";
import { EmailDetailScreen } from "../gmail/screens/EmailDetailScreen";
import { GmailSetupScreen } from "../gmail/screens/GmailSetupScreen";
import { CtcScreen } from "../screens/CtcScreen";
import { RagAdminScreen } from "../screens/RagAdminScreen/RagAdminScreen";
import { RagDocumentDetailScreen } from "../screens/RagAdminScreen/RagDocumentDetailScreen";
import { BackupsScreen } from "../screens/admin";
import { UserRole } from "../types";
import { useNotifications } from "../hooks/useNotifications";
import apiClient from "../api/client";

const Stack = createNativeStackNavigator<RootStackParamList>();

const CAPTAIN_GRADES = ["CPT", "LTC", "LCC", "TRI", "TRE"];

export const AppNavigator: React.FC = () => {
  // Mount notification listeners at the root so push events (including silent
  // CATEGORIES_UPDATED / URGENCIES_UPDATED) are handled across the whole app.
  useNotifications();

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  // Self-healing: if authenticated but user object was lost (AsyncStorage failure
  // during OTA reload), re-fetch /auth/me to restore the profile silently.
  // If the token is expired the Axios interceptor will refresh it; if refresh
  // also fails it calls logout() → isAuthenticated becomes false → login screen.
  useEffect(() => {
    if (isAuthenticated && !user) {
      apiClient
        .get("/auth/me")
        .then((res) => setUser(res.data))
        .catch(() => {}); // interceptor handles logout on hard 401
    }
  }, [isAuthenticated, user]); // eslint-disable-line react-hooks/exhaustive-deps
  const mustChangePassword = user?.mustChangePassword ?? false;
  const isCaptainGrade = CAPTAIN_GRADES.includes(user?.grade?.codice || "");
  // Profile completion required for users with a professional role (not superadmin)
  const needsProfileCompletion =
    !!user?.ruolo &&
    (!user?.nome ||
      !user?.cognome ||
      !user?.email ||
      !user?.telefono ||
      !user?.base ||
      !user?.contratto ||
      !user?.grade ||
      !user?.dateOfEntry ||
      (isCaptainGrade && !user?.dateOfCaptaincy));

  // Show loading while checking auth state
  if (isLoading) {
    return null; // Or a loading screen
  }

  const getActiveStack = () => {
    if (!isAuthenticated) return "auth";
    if (mustChangePassword) return "changePassword";
    if (needsProfileCompletion) return "completeProfile";
    return "app";
  };

  const activeStack = getActiveStack();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {activeStack === "auth" ? (
          // Auth Stack
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen
              name="JoinUs"
              component={JoinUsScreen}
              options={{ headerShown: false }}
            />
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
        ) : activeStack === "changePassword" ? (
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
        ) : activeStack === "completeProfile" ? (
          // Force profile completion
          <Stack.Screen
            name="CompleteProfile"
            component={CompleteProfileScreen}
            options={{
              headerShown: false,
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
            <Stack.Screen
              name="MemberOnboarding"
              component={MemberOnboardingScreen}
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
            {/* Issues Routes */}
            <Stack.Screen
              name="MyIssueDetail"
              component={MyIssueDetailScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="IssueDetail"
              component={IssueDetailScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="IssueCategories"
              component={IssueCategoriesScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="IssueCategoryForm"
              component={IssueCategoryFormScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="IssueUrgencies"
              component={IssueUrgenciesScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="IssueUrgencyForm"
              component={IssueUrgencyFormScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="PdfViewer"
              component={PdfViewerScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="EmailDetail"
              component={EmailDetailScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="GmailSetup"
              component={GmailSetupScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ColdTempCorrection"
              component={CtcScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="RagAdmin"
              component={RagAdminScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="RagDocumentDetail"
              component={RagDocumentDetailScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Backups"
              component={BackupsScreen}
              options={{ headerShown: false }}
            />
            {/* Note: CLA Contract screens and PendingMembers moved to DrawerNavigator */}
          </>
        )}
      </Stack.Navigator>
      <SharedFileHandler />
    </NavigationContainer>
  );
};
