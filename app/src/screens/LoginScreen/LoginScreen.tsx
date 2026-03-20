import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation } from "@tanstack/react-query";
import { Lock, User, ChevronDown, Fingerprint } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { colors, spacing, typography, borderRadius } from "../../theme";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { authApi } from "../../api/auth";
import { useAuthStore } from "../../store/authStore";
import { useBiometricAuth } from "../../hooks/useBiometricAuth";

const QUICK_USERS: { label: string; crewcode: string; password: string }[] = [
  { label: "Manual Entry", crewcode: "", password: "" },
  { label: "SuperAdmin", crewcode: "SUPERADMIN", password: "password" },
  { label: "Admin Piloti", crewcode: "ADMINPILOT", password: "password" },
  // One pilot per grade
  { label: "SO0001", crewcode: "SO0001", password: "password" },
  { label: "JFO0001", crewcode: "JFO0001", password: "password" },
  { label: "FO0001", crewcode: "FO0001", password: "password" },
  { label: "CPT0001", crewcode: "CPT0001", password: "password" },
  { label: "LTC0001", crewcode: "LTC0001", password: "password" },
  { label: "SFI0001", crewcode: "SFI0001", password: "password" },
  { label: "LCC0001", crewcode: "LCC0001", password: "password" },
  { label: "TRI0001", crewcode: "TRI0001", password: "password" },
  { label: "TRE0001", crewcode: "TRE0001", password: "password" },
];

export const LoginScreen: React.FC = () => {
  const DEV_USERS = QUICK_USERS;
  const { t } = useTranslation();
  const setAuth = useAuthStore((state) => state.setAuth);
  const enableBiometric = useAuthStore((state) => state.enableBiometric);
  const biometricEnabled = useAuthStore((state) => state.biometricEnabled);
  const biometricCredentials = useAuthStore(
    (state) => state.biometricCredentials,
  );
  const loadBiometricCredentials = useAuthStore(
    (state) => state.loadBiometricCredentials,
  );

  const [crewcode, setCrewcode] = useState("");
  const [password, setPassword] = useState("");
  const [selectedDevUser, setSelectedDevUser] = useState(DEV_USERS[0]);
  const [showDevSelect, setShowDevSelect] = useState(false);

  const {
    isAvailable,
    biometricType,
    authenticate,
    getBiometricLabel,
    checkAvailability,
  } = useBiometricAuth();

  // Load biometric credentials from SecureStore on mount
  useEffect(() => {
    loadBiometricCredentials();
  }, [loadBiometricCredentials]);

  // Check if biometric is available on mount
  useEffect(() => {
    checkAvailability();
  }, [checkAvailability]);

  // Try biometric login on mount if enabled
  useEffect(() => {
    const tryBiometricLogin = async () => {
      if (biometricEnabled && isAvailable && biometricCredentials) {
        const success = await authenticate(
          t("auth.biometricLogin", { method: getBiometricLabel() }),
        );
        if (success) {
          // Login using stored credentials
          try {
            const response = await authApi.login({
              crewcode: biometricCredentials.crewcode,
              password: biometricCredentials.password,
            });
            setAuth(response);
          } catch {
            Alert.alert(t("errors.generic"), t("auth.sessionExpired"), [
              { text: t("common.ok") },
            ]);
          }
        }
      }
    };

    tryBiometricLogin();
  }, [biometricEnabled, isAvailable, biometricCredentials]);

  // Store credentials temporarily for biometric enable
  const [lastLoginCredentials, setLastLoginCredentials] = useState<{
    crewcode: string;
    password: string;
  } | null>(null);

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data, variables) => {
      setAuth(data);
      // Store credentials used for this login
      setLastLoginCredentials({
        crewcode: variables.crewcode,
        password: variables.password,
      });

      // Ask to enable biometric after successful login (if available and not already enabled)
      console.log(
        "[Biometric] Login success - Available:",
        isAvailable,
        "Enabled:",
        biometricEnabled,
        "Dev:",
        __DEV__,
      );
      console.log(
        "[Biometric] Should show dialog:",
        (isAvailable || __DEV__) && !biometricEnabled,
      );
      if ((isAvailable || __DEV__) && !biometricEnabled) {
        console.log("[Biometric] Showing enable dialog...");
        setTimeout(() => {
          Alert.alert(
            t("auth.enableBiometric", { method: getBiometricLabel() }),
            t("auth.biometricLogin", { method: getBiometricLabel() }),
            [
              { text: t("common.no"), style: "cancel" },
              {
                text: t("common.yes"),
                onPress: async () => {
                  console.log(
                    "[Biometric] Dialog - crewcode from variables:",
                    variables.crewcode,
                  );
                  console.log(
                    "[Biometric] Dialog - crewcode from state:",
                    crewcode,
                  );
                  const success = await authenticate(
                    t("auth.biometricLogin", { method: getBiometricLabel() }),
                  );
                  console.log("[Biometric] Auth success:", success);
                  if (success) {
                    const credsToSave = variables.crewcode || crewcode;
                    const passToSave = variables.password || password;
                    console.log(
                      "[Biometric] Saving credentials for:",
                      credsToSave,
                    );
                    enableBiometric(credsToSave, passToSave);
                    Alert.alert(
                      t("common.success"),
                      t("auth.biometricLogin", { method: getBiometricLabel() }),
                    );
                  }
                },
              },
            ],
          );
        }, 500);
      }
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || t("auth.invalidCredentials");
      Alert.alert(t("common.error"), message);
    },
  });

  const handleLogin = useCallback(() => {
    if (!crewcode.trim() || !password.trim()) {
      Alert.alert(t("common.error"), t("errors.requiredField"));
      return;
    }

    loginMutation.mutate({ crewcode: crewcode.trim(), password });
  }, [crewcode, password, loginMutation, t]);

  const handleDevUserSelect = useCallback(
    (user: (typeof DEV_USERS)[0]) => {
      setSelectedDevUser(user);
      setCrewcode(user.crewcode);
      setPassword(user.password);
      setShowDevSelect(false);

      // Auto login if credentials are provided
      if (user.crewcode && user.password) {
        setTimeout(() => {
          loginMutation.mutate({
            crewcode: user.crewcode,
            password: user.password,
          });
        }, 100);
      }
    },
    [loginMutation],
  );

  const handleBiometricLogin = async () => {
    if (!isAvailable) {
      Alert.alert(t("common.error"), t("auth.biometricNotAvailable"));
      return;
    }

    if (!biometricCredentials) {
      Alert.alert(t("common.error"), t("auth.firstLoginRequired"));
      return;
    }

    const success = await authenticate(
      t("auth.biometricLogin", { method: getBiometricLabel() }),
    );
    if (success) {
      try {
        const response = await authApi.login({
          crewcode: biometricCredentials.crewcode,
          password: biometricCredentials.password,
        });
        setAuth(response);
      } catch (error: any) {
        Alert.alert(t("errors.generic"), t("auth.sessionExpired"));
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Logo Section */}
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <Text style={styles.logoText}>UNION</Text>
              </View>
              <Text style={styles.appName}>{t("common.appName")}</Text>
              <Text style={styles.appTagline}>
                Platform for air transport workers
              </Text>
            </View>

            {/* Form Section */}
            <View style={styles.formContainer}>
              <Text style={styles.formTitle}>{t("auth.login")}</Text>

              {/* Dev Quick Login Select */}
              {__DEV__ && (
                <View style={styles.devSelectContainer}>
                  <Text style={styles.devSelectLabel}>
                    Quick Login (Dev Only):
                  </Text>
                  <TouchableOpacity
                    style={styles.devSelectButton}
                    onPress={() => setShowDevSelect(!showDevSelect)}
                  >
                    <Text style={styles.devSelectText}>
                      {selectedDevUser.label}
                    </Text>
                    <ChevronDown size={20} color={colors.primary} />
                  </TouchableOpacity>

                  {showDevSelect && (
                    <View style={styles.devSelectDropdown}>
                      {DEV_USERS.map((user, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.devSelectOption}
                          onPress={() => handleDevUserSelect(user)}
                        >
                          <Text style={styles.devSelectOptionText}>
                            {user.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}

              <Input
                label={t("auth.crewcode")}
                placeholder={t("auth.enterCrewcode")}
                value={crewcode}
                onChangeText={setCrewcode}
                autoCapitalize="characters"
                autoCorrect={false}
                leftIcon={<User size={20} color={colors.textTertiary} />}
                containerStyle={styles.inputContainer}
              />

              <Input
                label={t("auth.password")}
                placeholder={t("auth.enterPassword")}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                leftIcon={<Lock size={20} color={colors.textTertiary} />}
                containerStyle={styles.inputContainer}
              />

              <Button
                title={t("auth.login")}
                onPress={handleLogin}
                loading={loginMutation.isPending}
                disabled={!crewcode.trim() || !password.trim()}
                size="lg"
                style={styles.loginButton}
              />

              {/* Biometric Login Button */}
              {(isAvailable || __DEV__) && biometricCredentials && (
                <TouchableOpacity
                  style={styles.biometricButton}
                  onPress={handleBiometricLogin}
                  activeOpacity={0.8}
                >
                  <Fingerprint size={24} color={colors.primary} />
                  <Text style={styles.biometricText}>
                    {t("auth.biometricLogin", { method: getBiometricLabel() })}
                  </Text>
                </TouchableOpacity>
              )}

              <Text style={styles.hint}>
                For access issues, contact your union delegate
              </Text>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>© 2025 UnionHub</Text>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
    justifyContent: "space-between",
  },
  logoContainer: {
    alignItems: "center",
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  logoText: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },
  appName: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  appTagline: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: "center",
  },
  formContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  formTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.lg,
    textAlign: "center",
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  loginButton: {
    marginTop: spacing.sm,
  },
  biometricButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  biometricText: {
    fontSize: typography.sizes.base,
    color: colors.primary,
    fontWeight: typography.weights.medium,
  },
  hint: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
    textAlign: "center",
    marginTop: spacing.md,
  },
  footer: {
    marginTop: spacing.lg,
    alignItems: "center",
  },
  footerText: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
  },

  // Dev select styles
  devSelectContainer: {
    marginBottom: spacing.md,
  },
  devSelectLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  devSelectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  devSelectText: {
    fontSize: typography.sizes.base,
    color: colors.text,
    fontWeight: typography.weights.medium,
  },
  devSelectDropdown: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
    overflow: "hidden",
  },
  devSelectOption: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  devSelectOptionText: {
    fontSize: typography.sizes.base,
    color: colors.text,
  },
});
