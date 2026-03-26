import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  ExternalLink,
  Copy,
} from "lucide-react-native";
import { Share } from "react-native";
import { useTranslation } from "react-i18next";

import { colors, spacing, typography, borderRadius } from "../../theme";
import apiClient from "../../api/client";

type Ruolo = "pilot" | "cabin_crew";

interface StatusResult {
  pilot: boolean;
  cabin_crew: boolean;
}

const fetchStatus = async (): Promise<StatusResult> => {
  const res = await apiClient.get<StatusResult>("/gmail/status");
  return res.data;
};

const fetchAuthUrl = async (ruolo: Ruolo): Promise<string> => {
  const res = await apiClient.get<{ url: string; ruolo: string }>(
    `/gmail/authorize?ruolo=${ruolo}`,
  );
  return res.data.url;
};

const submitCode = async (params: {
  code: string;
  ruolo: Ruolo;
}): Promise<{ refreshToken: string; ruolo: Ruolo }> => {
  const res = await apiClient.post<{ refreshToken: string; ruolo: Ruolo }>(
    "/gmail/authorize",
    params,
  );
  return res.data;
};

interface RuoloSectionProps {
  ruolo: Ruolo;
  label: string;
  envKey: string;
  authorized: boolean;
}

const RuoloSection: React.FC<RuoloSectionProps> = ({
  ruolo,
  label,
  envKey,
  authorized,
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);

  const handleOpenBrowser = async () => {
    setLoadingUrl(true);
    try {
      const url = await fetchAuthUrl(ruolo);
      await Linking.openURL(url);
    } catch {
      Alert.alert(t("common.error"), t("gmailSetup.errorUrl"));
    } finally {
      setLoadingUrl(false);
    }
  };

  const mutation = useMutation({
    mutationFn: submitCode,
    onSuccess: (data) => {
      setRefreshToken(data.refreshToken);
      setCode("");
      queryClient.invalidateQueries({ queryKey: ["gmail-setup-status"] });
    },
    onError: () => {
      Alert.alert(t("common.error"), t("gmailSetup.errorCode"));
    },
  });

  const handleCopy = async (text: string) => {
    await Share.share({ message: text });
  };

  return (
    <View style={styles.section}>
      {/* Section header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{label}</Text>
        {authorized ? (
          <View style={styles.statusBadge}>
            <CheckCircle size={16} color={colors.success} />
            <Text style={[styles.statusText, { color: colors.success }]}>
              {t("gmailSetup.authorized")}
            </Text>
          </View>
        ) : (
          <View style={styles.statusBadge}>
            <XCircle size={16} color={colors.error} />
            <Text style={[styles.statusText, { color: colors.error }]}>
              {t("gmailSetup.notAuthorized")}
            </Text>
          </View>
        )}
      </View>

      {/* Step 1 */}
      <Text style={styles.stepLabel}>{t("gmailSetup.step1")}</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={handleOpenBrowser}
        disabled={loadingUrl}
        activeOpacity={0.8}
      >
        {loadingUrl ? (
          <ActivityIndicator size="small" color={colors.textInverse} />
        ) : (
          <>
            <ExternalLink size={18} color={colors.textInverse} />
            <Text style={styles.buttonText}>{t("gmailSetup.openGoogle")}</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Step 2 */}
      <Text style={styles.stepLabel}>{t("gmailSetup.step2")}</Text>
      <TextInput
        style={styles.input}
        placeholder={t("gmailSetup.codePlaceholder")}
        placeholderTextColor={colors.textTertiary}
        value={code}
        onChangeText={setCode}
        autoCapitalize="none"
        autoCorrect={false}
        multiline
        numberOfLines={2}
      />

      <TouchableOpacity
        style={[
          styles.button,
          styles.buttonSecondary,
          (!code.trim() || mutation.isPending) && styles.buttonDisabled,
        ]}
        onPress={() => mutation.mutate({ code: code.trim(), ruolo })}
        disabled={!code.trim() || mutation.isPending}
        activeOpacity={0.8}
      >
        {mutation.isPending ? (
          <ActivityIndicator size="small" color={colors.textInverse} />
        ) : (
          <Text style={styles.buttonText}>{t("gmailSetup.getToken")}</Text>
        )}
      </TouchableOpacity>

      {/* Result */}
      {refreshToken && (
        <View style={styles.tokenBox}>
          <Text style={styles.tokenLabel}>{t("gmailSetup.tokenLabel")}</Text>
          <Text style={styles.envHint}>{`${envKey}=`}</Text>
          <View style={styles.tokenRow}>
            <Text style={styles.tokenValue} numberOfLines={3} selectable>
              {refreshToken}
            </Text>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={() => handleCopy(refreshToken)}
            >
              <Copy size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.tokenHint}>{t("gmailSetup.tokenHint")}</Text>
        </View>
      )}
    </View>
  );
};

export const GmailSetupScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();

  const { data: status, isLoading } = useQuery({
    queryKey: ["gmail-setup-status"],
    queryFn: fetchStatus,
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={24} color={colors.textInverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("gmailSetup.title")}</Text>
          <View style={styles.headerButton} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.intro}>{t("gmailSetup.intro")}</Text>

          {isLoading ? (
            <ActivityIndicator
              size="large"
              color={colors.primary}
              style={styles.loader}
            />
          ) : (
            <>
              <RuoloSection
                ruolo="pilot"
                label={t("gmailSetup.pilotLabel")}
                envKey="GOOGLE_REFRESH_TOKEN_PILOT"
                authorized={status?.pilot ?? false}
              />
              <RuoloSection
                ruolo="cabin_crew"
                label={t("gmailSetup.cabinCrewLabel")}
                envKey="GOOGLE_REFRESH_TOKEN_CABIN_CREW"
                authorized={status?.cabin_crew ?? false}
              />
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    color: colors.textInverse,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    textAlign: "center",
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  intro: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  loader: {
    marginTop: spacing.xl,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  statusText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  stepLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  buttonSecondary: {
    backgroundColor: colors.secondary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.textInverse,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.sm,
    color: colors.text,
    backgroundColor: colors.background,
    minHeight: 60,
    textAlignVertical: "top",
  },
  tokenBox: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.success,
    gap: spacing.xs,
  },
  tokenLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.success,
  },
  envHint: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
    fontFamily: "monospace",
  },
  tokenRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  tokenValue: {
    flex: 1,
    fontSize: typography.sizes.xs,
    color: colors.text,
    fontFamily: "monospace",
  },
  copyButton: {
    padding: spacing.xs,
  },
  tokenHint: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
    fontStyle: "italic",
  },
});
