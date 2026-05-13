import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation } from "@tanstack/react-query";
import { Mail, User } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { useTranslation } from "react-i18next";

import { colors, spacing, typography, borderRadius } from "../../theme";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { authApi } from "../../api/auth";

type ForgotPasswordNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "ForgotPassword"
>;

export const ForgotPasswordScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<ForgotPasswordNavigationProp>();
  const [inputMethod, setInputMethod] = useState<"email" | "crewcode">("email");
  const [email, setEmail] = useState("");
  const [crewcode, setCrewcode] = useState("");

  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: { email?: string; crewcode?: string }) => {
      return authApi.forgotPassword(data);
    },
    onSuccess: () => {
      // Always show success message (user enumeration protection)
      navigation.replace("ForgotPasswordSuccess");
    },
    onError: (error: any) => {
      // Even on error, show success (user enumeration protection)
      navigation.replace("ForgotPasswordSuccess");
    },
  });

  const handleSubmit = () => {
    if (inputMethod === "email") {
      if (!email.trim()) return;
      forgotPasswordMutation.mutate({ email: email.trim() });
    } else {
      if (!crewcode.trim()) return;
      forgotPasswordMutation.mutate({
        crewcode: crewcode.trim().toUpperCase(),
      });
    }
  };

  const isValid =
    inputMethod === "email"
      ? email.trim().length > 0
      : crewcode.trim().length > 0;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {t("auth.forgotPasswordTitle")}
          </Text>
        </View>
      </SafeAreaView>
      <View style={styles.innerContainer}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            bounces={false}
            showsVerticalScrollIndicator={false}
          >
            {/* Description */}
            <Text style={styles.description}>
              {t("auth.forgotPasswordDescription")}
            </Text>

            {/* Input Method Toggle */}
            <View style={styles.methodToggle}>
              <TouchableOpacity
                style={[
                  styles.methodButton,
                  inputMethod === "email" && styles.methodButtonActive,
                ]}
                onPress={() => setInputMethod("email")}
              >
                <Mail
                  size={18}
                  color={
                    inputMethod === "email"
                      ? colors.surface
                      : colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.methodButtonText,
                    inputMethod === "email" && styles.methodButtonTextActive,
                  ]}
                >
                  {t("auth.byEmail")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.methodButton,
                  inputMethod === "crewcode" && styles.methodButtonActive,
                ]}
                onPress={() => setInputMethod("crewcode")}
              >
                <User
                  size={18}
                  color={
                    inputMethod === "crewcode"
                      ? colors.surface
                      : colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.methodButtonText,
                    inputMethod === "crewcode" && styles.methodButtonTextActive,
                  ]}
                >
                  {t("auth.byCrewcode")}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Form */}
            <View style={styles.formContainer}>
              {inputMethod === "email" ? (
                <Input
                  label={t("auth.email")}
                  placeholder={t("auth.enterEmailOrCrewcode")}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  leftIcon={<Mail size={20} color={colors.textTertiary} />}
                  containerStyle={styles.inputContainer}
                />
              ) : (
                <Input
                  label={t("auth.crewcode")}
                  placeholder={t("auth.enterEmailOrCrewcode")}
                  value={crewcode}
                  onChangeText={setCrewcode}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  leftIcon={<User size={20} color={colors.textTertiary} />}
                  containerStyle={styles.inputContainer}
                />
              )}

              <Button
                title={t("auth.sendResetLink")}
                onPress={handleSubmit}
                loading={forgotPasswordMutation.isPending}
                disabled={!isValid || forgotPasswordMutation.isPending}
                style={styles.submitButton}
              />
            </View>

            {/* Back to Login */}
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backToLogin}
            >
              <Text style={styles.backToLoginText}>
                {t("auth.backToLogin")}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    backgroundColor: colors.primary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
  },
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },
  innerContainer: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.xl,
  },
  description: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.xl,
    marginTop: spacing.md,
  },
  methodToggle: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
    marginBottom: spacing.xl,
  },
  methodButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  methodButtonActive: {
    backgroundColor: colors.primary,
  },
  methodButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
  },
  methodButtonTextActive: {
    color: colors.surface,
  },
  formContainer: {
    marginBottom: spacing.xl,
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  submitButton: {
    marginTop: spacing.sm,
  },
  backToLogin: {
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  backToLoginText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
});
