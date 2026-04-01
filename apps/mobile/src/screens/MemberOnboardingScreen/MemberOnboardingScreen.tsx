import React, { useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  StatusBar,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  CheckCircle,
  Clock,
  MessageCircle,
  User,
  ArrowLeft,
} from "lucide-react-native";
import Constants from "expo-constants";

import { colors, spacing, typography, borderRadius } from "../../theme";
import { Card } from "../../components/Card";
import { usersApi } from "../../api/users";
import { RootStackParamList } from "../../navigation/types";

type MemberOnboardingRouteProp = RouteProp<
  RootStackParamList,
  "MemberOnboarding"
>;
type MemberOnboardingNavigationProp =
  NativeStackNavigationProp<RootStackParamList>;

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 60000;

const WHATSAPP_GROUP_URL: string =
  (Constants.expoConfig?.extra?.whatsappGroupUrl as string | undefined) ||
  (process.env.EXPO_PUBLIC_WHATSAPP_GROUP_URL as string | undefined) ||
  "";

type EmailStatus = "pending" | "sent" | "timeout";

function getEmailStatus(
  isSent: boolean | undefined,
  timedOut: boolean,
): EmailStatus {
  if (isSent) return "sent";
  if (timedOut) return "timeout";
  return "pending";
}

function StatusRow({
  label,
  status,
  pendingLabel,
  sentLabel,
  timeoutLabel,
}: {
  label: string;
  status: EmailStatus;
  pendingLabel: string;
  sentLabel: string;
  timeoutLabel: string;
}) {
  return (
    <View style={styles.statusRow}>
      {status === "pending" && (
        <ActivityIndicator
          size="small"
          color={colors.primary}
          style={styles.statusIcon}
        />
      )}
      {status === "sent" && (
        <CheckCircle
          size={20}
          color={colors.success}
          style={styles.statusIcon}
        />
      )}
      {status === "timeout" && (
        <Clock
          size={20}
          color={colors.warning ?? "#f59e0b"}
          style={styles.statusIcon}
        />
      )}
      <View style={styles.statusTextContainer}>
        <Text style={styles.statusLabel}>{label}</Text>
        <Text
          style={[
            styles.statusValue,
            status === "sent" && styles.statusSent,
            status === "timeout" && styles.statusTimeout,
          ]}
        >
          {status === "pending" && pendingLabel}
          {status === "sent" && sentLabel}
          {status === "timeout" && timeoutLabel}
        </Text>
      </View>
    </View>
  );
}

export const MemberOnboardingScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<MemberOnboardingNavigationProp>();
  const route = useRoute<MemberOnboardingRouteProp>();
  const { memberId, memberName, hasRegistrationForm } = route.params;
  const insets = useSafeAreaInsets();

  const startTime = useRef(Date.now());

  const { data: member } = useQuery({
    queryKey: ["user", memberId],
    queryFn: () => usersApi.getUserById(memberId),
    refetchInterval: (query) => {
      const elapsed = Date.now() - startTime.current;
      if (elapsed >= POLL_TIMEOUT_MS) return false;

      const data = query.state.data;
      const welcomeDone = data?.welcomeEmailSent === true;
      const secretaryDone =
        !hasRegistrationForm || data?.secretaryEmailSent === true;
      if (welcomeDone && secretaryDone) return false;

      return POLL_INTERVAL_MS;
    },
    staleTime: 0,
  });

  const elapsed = Date.now() - startTime.current;
  const timedOut = elapsed >= POLL_TIMEOUT_MS;

  const welcomeStatus = getEmailStatus(member?.welcomeEmailSent, timedOut);
  const secretaryStatus = getEmailStatus(member?.secretaryEmailSent, timedOut);

  const pendingLabel = t("memberOnboarding.statusPending");
  const sentLabel = t("memberOnboarding.statusSent");
  const timeoutLabel = t("memberOnboarding.statusTimeout");

  const handleWhatsApp = () => {
    const groupPart = WHATSAPP_GROUP_URL
      ? ` Per entrare nel nostro gruppo WhatsApp clicca qui: ${WHATSAPP_GROUP_URL}`
      : "";
    const text = `Ciao ${memberName}, benvenuto in FIT-CISL!${groupPart}`;
    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`);
  };

  return (
    <View style={styles.wrapper}>
      <View style={[styles.statusBarHack, { height: insets.top }]} />
      <StatusBar barStyle="light-content" />
      <SafeAreaView
        style={styles.container}
        edges={["bottom", "left", "right"]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.navigate("Members" as any)}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={24} color={colors.textInverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("memberOnboarding.title")}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Creation confirmed */}
          <Card style={styles.card}>
            <View style={styles.successHeader}>
              <CheckCircle size={40} color={colors.success} />
              <Text style={styles.successTitle}>{memberName}</Text>
              <Text style={styles.successSubtitle}>
                {t("memberOnboarding.successTitle")}
              </Text>
            </View>
          </Card>

          {/* Email status */}
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>
              {t("memberOnboarding.sectionStatus")}
            </Text>

            {/* Profile created — always green */}
            <View style={styles.statusRow}>
              <CheckCircle
                size={20}
                color={colors.success}
                style={styles.statusIcon}
              />
              <View style={styles.statusTextContainer}>
                <Text style={styles.statusLabel}>
                  {t("memberOnboarding.profileCreated")}
                </Text>
                <Text style={[styles.statusValue, styles.statusSent]}>
                  {t("memberOnboarding.profileCreatedValue")}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <StatusRow
              label={t("memberOnboarding.welcomeEmail")}
              status={welcomeStatus}
              pendingLabel={pendingLabel}
              sentLabel={sentLabel}
              timeoutLabel={timeoutLabel}
            />

            {hasRegistrationForm && (
              <>
                <View style={styles.divider} />
                <StatusRow
                  label={t("memberOnboarding.secretaryEmail")}
                  status={secretaryStatus}
                  pendingLabel={pendingLabel}
                  sentLabel={sentLabel}
                  timeoutLabel={timeoutLabel}
                />
              </>
            )}
          </Card>

          {/* WhatsApp button */}
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>
              {t("memberOnboarding.whatsappTitle")}
            </Text>
            <Text style={styles.whatsappDescription}>
              {t("memberOnboarding.whatsappDescription", { name: memberName })}
            </Text>
            <TouchableOpacity
              style={styles.whatsappButton}
              onPress={handleWhatsApp}
            >
              <MessageCircle size={20} color="#ffffff" />
              <Text style={styles.whatsappButtonText}>
                {t("memberOnboarding.whatsappButton")}
              </Text>
            </TouchableOpacity>
          </Card>

          {/* Navigation actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => navigation.navigate("MemberDetail", { memberId })}
            >
              <User size={18} color={colors.primary} />
              <Text style={styles.profileButtonText}>
                {t("memberOnboarding.goToProfile")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.listButton}
              onPress={() => navigation.navigate("Members" as any)}
            >
              <Text style={styles.listButtonText}>
                {t("memberOnboarding.backToList")}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  statusBarHack: {
    backgroundColor: colors.primary,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  card: {
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  successHeader: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  successTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    textAlign: "center",
  },
  successSubtitle: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  statusIcon: {
    marginRight: spacing.md,
    width: 24,
    alignItems: "center",
  },
  statusTextContainer: {
    flex: 1,
  },
  statusLabel: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  statusValue: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusSent: {
    color: colors.success,
  },
  statusTimeout: {
    color: "#f59e0b",
  },
  divider: {
    height: 1,
    backgroundColor: colors.border ?? "#e5e7eb",
    marginVertical: spacing.xs,
  },
  whatsappDescription: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  whatsappButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: "#25d366",
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  whatsappButtonText: {
    color: "#ffffff",
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
  },
  actions: {
    gap: spacing.md,
  },
  profileButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.primary + "10",
  },
  profileButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.primary,
  },
  listButton: {
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  listButtonText: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
  },
});
