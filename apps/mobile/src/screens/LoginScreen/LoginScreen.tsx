import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation } from "@tanstack/react-query";
import { Lock, User, Fingerprint } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { colors, spacing, typography, borderRadius } from "../../theme";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { authApi } from "../../api/auth";
import { useAuthStore } from "../../store/authStore";
import { useBiometricAuth } from "../../hooks/useBiometricAuth";
import { syncPayslipSettings } from "../../payslip/hooks/usePayslipSettingsSync";

export const LoginScreen: React.FC = () => {
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
            syncPayslipSettings();
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
      syncPayslipSettings();
      // Store credentials used for this login
      setLastLoginCredentials({
        crewcode: variables.crewcode,
        password: variables.password,
      });

      // Ask to enable biometric after successful login (if available and not already enabled)
      if (isAvailable && !biometricEnabled) {
        setTimeout(() => {
          Alert.alert(
            t("auth.enableBiometric", { method: getBiometricLabel() }),
            t("auth.biometricLogin", { method: getBiometricLabel() }),
            [
              { text: t("common.no"), style: "cancel" },
              {
                text: t("common.yes"),
                onPress: async () => {
                  const success = await authenticate(
                    t("auth.biometricLogin", { method: getBiometricLabel() }),
                  );
                  if (success) {
                    const credsToSave = variables.crewcode || crewcode;
                    const passToSave = variables.password || password;
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
        syncPayslipSettings();
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
            {isAvailable && biometricCredentials && (
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
});
