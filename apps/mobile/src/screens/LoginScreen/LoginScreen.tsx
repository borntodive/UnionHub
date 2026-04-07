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
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation } from "@tanstack/react-query";
import { Lock, User, Fingerprint } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { useTranslation } from "react-i18next";
import { setLanguage, getLanguage } from "../../i18n";

import { colors, spacing, typography, borderRadius } from "../../theme";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { PasswordInput } from "../../components/PasswordInput";
import { authApi } from "../../api/auth";
import { useAuthStore } from "../../store/authStore";
import { useBiometricAuth } from "../../hooks/useBiometricAuth";
import { syncPayslipSettings } from "../../payslip/hooks/usePayslipSettingsSync";

function safeErrorMessage(error: any, fallback: string): string {
  if (__DEV__) {
    return error.response?.data?.message || error.message || fallback;
  }
  const status = error.response?.data?.statusCode;
  if (status === 401) return fallback;
  if (status === 400) return fallback;
  return t("errors.generic");
}

const QUICK_USERS = [
  { label: "SuperAdmin", crewcode: "COVEAN", password: "password" },
  { label: "Admin Piloti", crewcode: "ADMINPILOT", password: "password" },
  { label: "Admin CC", crewcode: "ADMINCC", password: "password" },
  { label: "SO0001", crewcode: "SO0001", password: "password" },
  { label: "FO0001", crewcode: "FO0001", password: "password" },
  { label: "CPT0001", crewcode: "CPT0001", password: "password" },
  { label: "LTC0001", crewcode: "LTC0001", password: "password" },
  { label: "CC0001", crewcode: "CC0001", password: "password" },
  { label: "SEPE0001", crewcode: "SEPE0001", password: "password" },
];

export const LoginScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
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
  const [currentLang, setCurrentLang] = useState(getLanguage());

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
          try {
            const response = await authApi.refreshToken(
              biometricCredentials.refreshToken,
            );
            setAuth(response);
            if (response.user?.language) {
              await setLanguage(response.user.language);
            }
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

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: async (data, variables) => {
      setAuth(data);
      // Set language from user preference
      if (data.user?.language) {
        await setLanguage(data.user.language);
      }
      syncPayslipSettings();

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
                    enableBiometric(variables.crewcode, data.refreshToken);
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
      console.log("[LoginError]", JSON.stringify(error?.response?.data), error?.message);
      const status = error?.response?.status;
      const msg =
        status === 401 || status === 400
          ? t("auth.invalidCredentials")
          : t("errors.generic");
      Alert.alert(t("common.error"), msg);
    },
  });

  const handleLogin = useCallback(() => {
    if (!crewcode.trim() || !password.trim()) {
      Alert.alert(t("common.error"), t("errors.requiredField"));
      return;
    }

    loginMutation.mutate({
      crewcode: crewcode.trim(),
      password,
      language: currentLang,
    });
  }, [crewcode, password, currentLang, loginMutation, t]);

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
        const response = await authApi.refreshToken(
          biometricCredentials.refreshToken,
        );
        setAuth(response);
        // Set language from user preference
        if (response.user?.language) {
          await setLanguage(response.user.language);
        }
        syncPayslipSettings();
      } catch (error: any) {
        Alert.alert(t("errors.generic"), t("auth.sessionExpired"));
      }
    }
  };

  const handleLanguageChange = async (lang: "it" | "en") => {
    await setLanguage(lang);
    setCurrentLang(lang);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.innerContainer}>
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
                <Image
                  source={require("../../../assets/icon.png")}
                  style={styles.logoImage}
                />
              </View>
              <Text style={styles.appName}>{t("common.appName")}</Text>
              <Text style={styles.appTagline}>{t("auth.tagline")}</Text>
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

              <PasswordInput
                label={t("auth.password")}
                placeholder={t("auth.enterPassword")}
                value={password}
                onChangeText={setPassword}
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

              <Text style={styles.hint}>{t("auth.loginHint")}</Text>

              <TouchableOpacity
                onPress={() => navigation.navigate("JoinUs")}
                style={styles.joinUsLink}
              >
                <Text style={styles.joinUsText}>
                  {t("auth.joinUsPrompt")}{" "}
                  <Text style={styles.joinUsTextBold}>
                    {t("auth.joinUsLink")}
                  </Text>
                </Text>
              </TouchableOpacity>

              {/* Language Selector */}
              <View style={styles.langRow}>
                <TouchableOpacity
                  style={[
                    styles.langBtn,
                    currentLang === "it" && styles.langBtnActive,
                  ]}
                  onPress={() => handleLanguageChange("it")}
                >
                  <Text
                    style={[
                      styles.langBtnText,
                      currentLang === "it" && styles.langBtnTextActive,
                    ]}
                  >
                    🇮🇹 Italiano
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.langBtn,
                    currentLang === "en" && styles.langBtnActive,
                  ]}
                  onPress={() => handleLanguageChange("en")}
                >
                  <Text
                    style={[
                      styles.langBtnText,
                      currentLang === "en" && styles.langBtnTextActive,
                    ]}
                  >
                    🇬🇧 English
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>© 2025 UnionHub</Text>
            </View>

            {/* Quick Login */}
            <View style={styles.quickLoginContainer}>
              <Text style={styles.quickLoginTitle}>{t("auth.quickLogin")}</Text>
              <View style={styles.quickLoginGrid}>
                {QUICK_USERS.map((u) => (
                  <TouchableOpacity
                    key={u.crewcode}
                    style={styles.quickLoginButton}
                    onPress={() =>
                      loginMutation.mutate({
                        crewcode: u.crewcode,
                        password: u.password,
                        language: currentLang,
                      })
                    }
                    disabled={loginMutation.isPending}
                  >
                    <Text style={styles.quickLoginButtonText}>{u.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  innerContainer: {
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
  logoImage: {
    width: 60,
    height: 60,
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
  joinUsLink: {
    marginTop: spacing.md,
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  joinUsText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: "center",
  },
  joinUsTextBold: {
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  langRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  langBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  langBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "20",
  },
  langBtnText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  langBtnTextActive: {
    color: colors.primary,
    fontWeight: typography.weights.medium,
  },
  footer: {
    marginTop: spacing.lg,
    alignItems: "center",
  },
  footerText: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
  },
  quickLoginContainer: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fcd34d",
    borderRadius: borderRadius.lg,
  },
  quickLoginTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: "#92400e",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  quickLoginGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  quickLoginButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#fcd34d",
    borderRadius: borderRadius.md,
  },
  quickLoginButtonText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: "#92400e",
  },
});
