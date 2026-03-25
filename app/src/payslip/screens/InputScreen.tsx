import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Menu } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { colors, spacing, typography, borderRadius } from "../../theme";
import { useAuthStore } from "../../store/authStore";
import { usePayslipStore } from "../store/usePayslipStore";
import { MonthPicker } from "../components/input/MonthPicker";
import { SbhPicker } from "../components/input/SbhPicker";
import { NumberInput } from "../components/input/NumberInput";
import { AdditionalPaymentsSection } from "../components/input/AdditionalPaymentsSection";
import { AdditionalDeductionsSection } from "../components/input/AdditionalDeductionsSection";
import { usePayslipSettingsSync } from "../hooks/usePayslipSettingsSync";

export const InputScreen: React.FC = () => {
  usePayslipSettingsSync();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const {
    input,
    settings,
    overrideActive,
    overrideSettings,
    overrideItud,
    setInput,
    addAdditionalPayment,
    updateAdditionalPayment,
    removeAdditionalPayment,
    addAdditionalDeduction,
    updateAdditionalDeduction,
    removeAdditionalDeduction,
  } = usePayslipStore();

  const activeSettings = overrideActive ? overrideSettings : settings;
  const isPilot = activeSettings.role === "pil";
  const isLTC = activeSettings.rank === "ltc";
  const isInstructor = ["sfi", "tri", "tre"].includes(activeSettings.rank);

  const hasItud = overrideActive ? overrideItud : (user?.itud ?? false);

  const handleMenuPress = () => {
    // @ts-ignore - Now inside DrawerNavigator
    navigation.openDrawer?.();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleMenuPress} style={styles.menuButton}>
            <Menu size={24} color={colors.textInverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("payslip.title")}</Text>
          <View style={styles.placeholder} />
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView style={styles.content}>
          <View style={styles.card}>
            <MonthPicker
              value={input.date}
              onChange={(date) => setInput({ date })}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              {t("payslip.flightActivity")}
            </Text>
            <SbhPicker
              value={input.sbh}
              onChange={(sbh) => setInput({ sbh })}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t("payslip.perDiem")}</Text>
            <NumberInput
              label={t("payslip.flyingPerDiem")}
              value={input.flyDiaria}
              onChange={(flyDiaria) => setInput({ flyDiaria })}
            />
            <NumberInput
              label={t("payslip.nonFlyingPerDiem")}
              value={input.noFlyDiaria}
              onChange={(noFlyDiaria) => setInput({ noFlyDiaria })}
            />
            <NumberInput
              label={t("payslip.outOfBase")}
              value={input.oob}
              onChange={(oob) => setInput({ oob })}
            />
            {isPilot && (
              <NumberInput
                label={t("payslip.workingDayOff")}
                value={input.woff}
                onChange={(woff) => setInput({ woff })}
              />
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              {t("payslip.leaveAbsences")}
            </Text>
            <NumberInput
              label={t("payslip.annualLeave")}
              value={input.al}
              onChange={(al) => setInput({ al })}
            />
            {!isPilot && (
              <NumberInput
                label={t("payslip.bankHolidays")}
                value={input.bankHolydays}
                onChange={(bankHolydays) => setInput({ bankHolydays })}
              />
            )}
            {!isPilot && (
              <NumberInput
                label={t("payslip.oobUnplanned")}
                value={input.oobUnplanned}
                onChange={(oobUnplanned) => setInput({ oobUnplanned })}
              />
            )}
            <NumberInput
              label={t("payslip.unpaidLeave")}
              value={input.ul}
              onChange={(ul) => setInput({ ul })}
            />
            <NumberInput
              label={t("payslip.parentalLeave")}
              value={input.parentalDays}
              onChange={(parentalDays) => setInput({ parentalDays })}
            />
            <NumberInput
              label={t("payslip.law104")}
              value={input.days104}
              onChange={(days104) => setInput({ days104 })}
            />
          </View>

          {isLTC && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>
                {t("payslip.ltcTraining")}
              </Text>
              <NumberInput
                label={t("payslip.trainingSectors")}
                value={input.trainingSectors}
                onChange={(trainingSectors) => setInput({ trainingSectors })}
              />
            </View>
          )}

          {isInstructor && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{t("payslip.instructor")}</Text>
              <NumberInput
                label={t("payslip.simulatorDays")}
                value={input.simDays}
                onChange={(simDays) => setInput({ simDays })}
              />
            </View>
          )}

          {!isPilot && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{t("members.cabinCrew")}</Text>
              <NumberInput
                label={t("payslip.cabinCrewTraining")}
                value={input.ccTrainingDays}
                onChange={(ccTrainingDays) => setInput({ ccTrainingDays })}
              />
              <NumberInput
                label={t("payslip.landingsOffDay")}
                value={input.landingInOffDay}
                onChange={(landingInOffDay) => setInput({ landingInOffDay })}
              />
              <NumberInput
                label={t("payslip.commissions")}
                value={input.commissions}
                onChange={(commissions) => setInput({ commissions })}
              />
            </View>
          )}

          {hasItud && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{t("payslip.other")}</Text>
              <NumberInput
                label={t("payslip.itudDays")}
                value={input.itud}
                onChange={(itud) => setInput({ itud })}
              />
            </View>
          )}

          <View style={styles.card}>
            <AdditionalPaymentsSection
              items={input.additional}
              onAdd={() =>
                addAdditionalPayment({
                  amount: 0,
                  tax: 100,
                  isSLR: false,
                  isConguaglio: false,
                })
              }
              onUpdate={updateAdditionalPayment}
              onRemove={removeAdditionalPayment}
            />
          </View>

          <View style={styles.card}>
            <AdditionalDeductionsSection
              items={input.additionalDeductions}
              onAdd={() =>
                addAdditionalDeduction({
                  amount: 0,
                  tax: 100,
                  isConguaglio: false,
                })
              }
              onUpdate={updateAdditionalDeduction}
              onRemove={removeAdditionalDeduction}
            />
          </View>

          <View style={styles.bottomSpace} />
        </ScrollView>
      </KeyboardAvoidingView>
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
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  menuButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.textInverse,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  buttonContainer: {
    padding: spacing.md,
    marginTop: spacing.md,
  },
  bottomSpace: {
    height: spacing.xl,
  },
});
