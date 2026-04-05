import React, { useState, useCallback } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Lock, Shield, AlertTriangle } from "lucide-react-native";

import { colors, spacing, typography, borderRadius } from "../../theme";
import { Button } from "../../components/Button";
import { PasswordInput } from "../../components/PasswordInput";
import { authApi } from "../../api/auth";
import { useAuthStore } from "../../store/authStore";
import { usePayslipStore } from "../../payslip/store/usePayslipStore";

export const ChangePasswordScreen: React.FC = () => {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const wasMandatoryChange = user?.mustChangePassword ?? false;

  const changePasswordMutation = useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: () => {
      setTimeout(() => {
        Alert.alert(
          t("auth.passwordChanged"),
          wasMandatoryChange
            ? t("auth.sessionExpired")
            : t("auth.passwordChanged"),
          [
            {
              text: t("common.ok"),
              onPress: async () => {
                if (wasMandatoryChange) {
                  // Reset payslip settings before logout
                  usePayslipStore.getState().resetSettings();
                  await logout();
                }
              },
            },
          ],
        );
      }, 100);
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        t("errors.generic");
      Alert.alert(
        t("common.error"),
        Array.isArray(message) ? message.join("\n") : message,
      );
    },
  });

  const handleChangePassword = useCallback(() => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert(t("common.error"), t("errors.requiredField"));
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(t("common.error"), t("errors.passwordMismatch"));
      return;
    }

    if (newPassword.length < 12) {
      Alert.alert(t("common.error"), "Password must be at least 12 characters");
      return;
    }

    const hasLowercase = /[a-z]/.test(newPassword);
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[@$!%*?&]/.test(newPassword);

    if (!hasLowercase || !hasUppercase || !hasNumber || !hasSpecial) {
      Alert.alert(
        t("common.error"),
        "Password must contain at least one lowercase, one uppercase, one number, and one special character (@ $ ! % * ? &)",
      );
      return;
    }

    changePasswordMutation.mutate({
      currentPassword,
      newPassword,
    });
  }, [
    currentPassword,
    newPassword,
    confirmPassword,
    changePasswordMutation,
    t,
  ]);

  return (
    <SafeAreaView style={styles.container} edges={["bottom", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Shield size={48} color={colors.secondary} />
              </View>
              <Text style={styles.title}>{t("auth.changePassword")}</Text>
              <Text style={styles.subtitle}>
                {user?.mustChangePassword
                  ? t("auth.firstLoginRequired")
                  : t("settings.security")}
              </Text>
            </View>

            {/* Alert Box */}
            {user?.mustChangePassword && (
              <View style={styles.alertBox}>
                <AlertTriangle size={20} color={colors.secondary} />
                <Text style={styles.alertText}>
                  {t("auth.firstLoginRequired")}
                </Text>
              </View>
            )}

            {/* Form */}
            <View style={styles.formContainer}>
              <PasswordInput
                label={t("auth.currentPassword")}
                placeholder={t("auth.enterPassword")}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                leftIcon={<Lock size={20} color={colors.textTertiary} />}
                containerStyle={styles.inputContainer}
              />

              <PasswordInput
                label={t("auth.newPassword")}
                placeholder={t("auth.enterPassword")}
                value={newPassword}
                onChangeText={setNewPassword}
                leftIcon={<Lock size={20} color={colors.textTertiary} />}
                containerStyle={styles.inputContainer}
              />

              <PasswordInput
                label={t("auth.confirmPassword")}
                placeholder={t("auth.enterPassword")}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                leftIcon={<Lock size={20} color={colors.textTertiary} />}
                containerStyle={styles.inputContainer}
                error={
                  confirmPassword && newPassword !== confirmPassword
                    ? t("errors.passwordMismatch")
                    : undefined
                }
              />

              <View style={styles.passwordHints}>
                <Text style={styles.hintTitle}>Password requirements:</Text>
                <Text
                  style={[
                    styles.hint,
                    newPassword.length >= 12 && styles.hintValid,
                  ]}
                >
                  • At least 12 characters
                </Text>
                <Text
                  style={[
                    styles.hint,
                    /[a-z]/.test(newPassword) && styles.hintValid,
                  ]}
                >
                  • At least one lowercase letter
                </Text>
                <Text
                  style={[
                    styles.hint,
                    /[A-Z]/.test(newPassword) && styles.hintValid,
                  ]}
                >
                  • At least one uppercase letter
                </Text>
                <Text
                  style={[
                    styles.hint,
                    /[0-9]/.test(newPassword) && styles.hintValid,
                  ]}
                >
                  • At least one number
                </Text>
                <Text
                  style={[
                    styles.hint,
                    /[@$!%*?&]/.test(newPassword) && styles.hintValid,
                  ]}
                >
                  • At least one special character: @ $ ! % * ? &
                </Text>
              </View>

              <Button
                title={t("auth.changePassword")}
                onPress={handleChangePassword}
                loading={changePasswordMutation.isPending}
                disabled={
                  !currentPassword ||
                  !newPassword ||
                  !confirmPassword ||
                  newPassword !== confirmPassword
                }
                size="lg"
                style={styles.button}
              />
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
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
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
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    textAlign: "center",
  },
  alertBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.secondary + "15",
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  alertText: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: typography.sizes.sm,
    color: colors.text,
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
  inputContainer: {
    marginBottom: spacing.md,
  },
  passwordHints: {
    marginBottom: spacing.lg,
  },
  hintTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  hint: {
    fontSize: typography.sizes.sm,
    color: colors.textTertiary,
  },
  hintValid: {
    color: colors.success,
  },
  button: {
    marginTop: spacing.sm,
  },
});
