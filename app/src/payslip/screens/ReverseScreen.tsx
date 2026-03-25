import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { Menu, AlertTriangle, ArrowLeftRight } from "lucide-react-native";

import { colors, spacing, typography, borderRadius } from "../../theme";
import { usePayslipStore } from "../store/usePayslipStore";
import {
  getContractData,
  getActiveCorrections,
  applyCorrections,
} from "../data/contractData";
import {
  formatCurrency,
  formatNumber,
  parseSbh,
  formatSbh,
} from "../utils/formatters";

// ── helpers ───────────────────────────────────────────────────────────────────

function resolveRates(
  company: string,
  role: string,
  rank: string,
  legacy: boolean,
  legacyDirect: boolean,
  legacyCustom: { ffp: number; sbh: number; al: number },
  legacyDeltas: { ffp: number; sbh: number; al: number },
): { sbh: number; diaria: number } | null {
  const base = getContractData(company, role, rank);
  if (!base) return null;
  const today = new Date().toISOString().split("T")[0];
  const corrections = getActiveCorrections(company, role, today);
  const corrected = applyCorrections(base, corrections, rank);
  if (!corrected) return null;

  let sbh = corrected.sbh;
  let diaria = corrected.diaria;

  if (legacy) {
    if (legacyDirect) {
      if (legacyCustom.sbh > 0) sbh = legacyCustom.sbh;
    } else {
      sbh = corrected.sbh + legacyDeltas.sbh;
    }
  }

  return { sbh, diaria };
}

// ── sub-components ────────────────────────────────────────────────────────────

interface AmountInputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

const AmountInput: React.FC<AmountInputProps> = ({
  label,
  value,
  onChange,
  placeholder,
}) => (
  <View style={styles.inputGroup}>
    <Text style={styles.inputLabel}>{label}</Text>
    <View style={styles.inputRow}>
      <Text style={styles.inputPrefix}>€</Text>
      <TextInput
        style={styles.numInput}
        value={value}
        onChangeText={(v) => onChange(v.replace(",", "."))}
        keyboardType="decimal-pad"
        placeholder={placeholder ?? "0.00"}
        placeholderTextColor={colors.textSecondary}
      />
    </View>
  </View>
);

interface ResultRowProps {
  label: string;
  value: string;
  sub?: string;
}

const ResultRow: React.FC<ResultRowProps> = ({ label, value, sub }) => (
  <View style={styles.resultRow}>
    <View style={styles.resultLeft}>
      <Text style={styles.resultLabel}>{label}</Text>
      {sub ? <Text style={styles.resultSub}>{sub}</Text> : null}
    </View>
    <Text style={styles.resultValue}>{value}</Text>
  </View>
);

// ── main screen ───────────────────────────────────────────────────────────────

export const ReverseScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { settings, overrideActive, overrideSettings, input } =
    usePayslipStore();

  const s = overrideActive
    ? { ...overrideSettings, legacyDirect: true }
    : { ...settings, legacyDirect: false };

  const [sectorPayText, setSectorPayText] = useState("");
  const [diariaText, setDiariaText] = useState("");

  const handleMenuPress = () => {
    // @ts-ignore
    navigation.openDrawer?.();
  };

  const rates = useMemo(
    () =>
      resolveRates(
        s.company,
        s.role,
        s.rank,
        s.legacy,
        s.legacyDirect ?? false,
        s.legacyCustom ?? { ffp: 0, sbh: 0, al: 0 },
        s.legacyDeltas ?? { ffp: 0, sbh: 0, al: 0 },
      ),
    [
      s.company,
      s.role,
      s.rank,
      s.legacy,
      s.legacyDirect,
      s.legacyCustom,
      s.legacyDeltas,
    ],
  );

  // SBH hours from input tab (decimal)
  const inputSbhDecimal = parseSbh(input.sbh);
  const hasSbhHours = inputSbhDecimal > 0;

  // Diaria days from input tab
  const totalDiariaDays = input.flyDiaria + input.noFlyDiaria;
  const hasDiariaDays = totalDiariaDays > 0;

  // Sector pay calculations
  const sectorPayAmount = parseFloat(sectorPayText) || 0;
  const sbhRate = rates?.sbh ?? 0;

  const hoursAtContractRate =
    sbhRate > 0 && sectorPayAmount > 0 ? sectorPayAmount / sbhRate : null;
  const effectiveSbhRate =
    hasSbhHours && sectorPayAmount > 0
      ? sectorPayAmount / inputSbhDecimal
      : null;

  // Diaria calculations
  const diariaAmount = parseFloat(diariaText) || 0;
  const diariaRate = rates?.diaria ?? 0;

  const daysAtContractRate =
    diariaRate > 0 && diariaAmount > 0 ? diariaAmount / diariaRate : null;
  const effectiveDiariaRate =
    hasDiariaDays && diariaAmount > 0 ? diariaAmount / totalDiariaDays : null;

  return (
    <View style={styles.wrapper}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.topHeader}>
          <TouchableOpacity onPress={handleMenuPress} style={styles.menuButton}>
            <Menu size={24} color={colors.textInverse} />
          </TouchableOpacity>
          <Text style={styles.topHeaderTitle}>{t("payslip.reverseTab")}</Text>
          <View style={styles.placeholder} />
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
        >
          {/* Sector Pay section */}
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <ArrowLeftRight size={16} color={colors.primary} />
              <Text style={styles.sectionTitle}>
                {t("payslip.reverseSectorTitle")}
              </Text>
            </View>
            <View style={styles.card}>
              <AmountInput
                label={t("payslip.reverseEnterAmount")}
                value={sectorPayText}
                onChange={setSectorPayText}
              />

              {sectorPayAmount > 0 && rates && (
                <View style={styles.results}>
                  {/* Hours at contract rate */}
                  {hoursAtContractRate !== null && (
                    <>
                      <View style={styles.divider} />
                      <ResultRow
                        label={t("payslip.reverseHoursAtRate")}
                        sub={`${t("payslip.contractPerHour")} @ ${formatCurrency(sbhRate)}`}
                        value={formatSbh(hoursAtContractRate)}
                      />
                    </>
                  )}

                  {/* Effective rate using input hours */}
                  <View style={styles.divider} />
                  {hasSbhHours ? (
                    <ResultRow
                      label={t("payslip.reverseEffectiveRate")}
                      sub={`${formatSbh(inputSbhDecimal)} ${t("payslip.reverseFromInput")}`}
                      value={`${formatCurrency(effectiveSbhRate!)}/${t("payslip.reverseHourShort")}`}
                    />
                  ) : (
                    <View style={styles.warning}>
                      <AlertTriangle size={14} color={colors.warning} />
                      <Text style={styles.warningText}>
                        {t("payslip.reverseNoSbhWarning")}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>

          {/* Diaria section */}
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <ArrowLeftRight size={16} color={colors.primary} />
              <Text style={styles.sectionTitle}>
                {t("payslip.reverseDiariaTitle")}
              </Text>
            </View>
            <View style={styles.card}>
              <AmountInput
                label={t("payslip.reverseEnterAmount")}
                value={diariaText}
                onChange={setDiariaText}
              />

              {diariaAmount > 0 && rates && (
                <View style={styles.results}>
                  {/* Days at contract rate */}
                  {daysAtContractRate !== null && (
                    <>
                      <View style={styles.divider} />
                      <ResultRow
                        label={t("payslip.reverseDaysAtRate")}
                        sub={`${t("payslip.contractPerDay")} @ ${formatCurrency(diariaRate)}`}
                        value={formatNumber(daysAtContractRate, 2)}
                      />
                    </>
                  )}

                  {/* Effective rate using input days */}
                  <View style={styles.divider} />
                  {hasDiariaDays ? (
                    <ResultRow
                      label={t("payslip.reverseEffectiveRate")}
                      sub={`${totalDiariaDays} ${t("payslip.reverseFromInput")}`}
                      value={`${formatCurrency(effectiveDiariaRate!)}/${t("payslip.reverseDayShort")}`}
                    />
                  ) : (
                    <View style={styles.warning}>
                      <AlertTriangle size={14} color={colors.warning} />
                      <Text style={styles.warningText}>
                        {t("payslip.reverseNoDiariaWarning")}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>

          <View style={styles.bottomSpace} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background },
  safeArea: { backgroundColor: colors.primary },
  topHeader: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  menuButton: { padding: 8 },
  topHeaderTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.textInverse,
  },
  placeholder: { width: 40 },
  container: { flex: 1 },
  content: { padding: spacing.md },
  section: { marginBottom: spacing.lg },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  // Input
  inputGroup: { marginBottom: spacing.xs },
  inputLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  inputPrefix: {
    fontSize: typography.sizes.lg,
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
  numInput: {
    flex: 1,
    fontSize: typography.sizes.lg,
    color: colors.text,
    paddingVertical: spacing.md,
    fontWeight: typography.weights.semibold,
  },
  // Results
  results: { marginTop: spacing.sm },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  resultLeft: { flex: 1, marginRight: spacing.sm },
  resultLabel: {
    fontSize: typography.sizes.base,
    color: colors.text,
    fontWeight: typography.weights.medium,
  },
  resultSub: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  resultValue: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  // Warning
  warning: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.warning + "15",
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  warningText: {
    flex: 1,
    fontSize: typography.sizes.xs,
    color: colors.warning,
  },
  bottomSpace: { height: spacing.xl },
});
