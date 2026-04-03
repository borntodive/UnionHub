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
import { useContractData } from "../hooks/useContractData";
import {
  formatCurrency,
  formatNumber,
  parseSbh,
  formatSbh,
} from "../utils/formatters";
import { calculateSimDiariaPay } from "../utils/calculations";
import { SimDiariaTier } from "../types";

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

interface ApplyButtonProps {
  label: string;
  onPress: () => void;
}

const ApplyButton: React.FC<ApplyButtonProps> = ({ label, onPress }) => (
  <TouchableOpacity style={styles.applyButton} onPress={onPress}>
    <Text style={styles.applyButtonText}>{label}</Text>
  </TouchableOpacity>
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
  const { settings, overrideActive, overrideSettings, input, setInput } =
    usePayslipStore();

  const s = overrideActive
    ? { ...overrideSettings, legacyDirect: true }
    : { ...settings, legacyDirect: false };

  const [sectorPayText, setSectorPayText] = useState("");
  const [diariaText, setDiariaText] = useState("");
  const [ferieText, setFerieText] = useState("");
  const [simPayText, setSimPayText] = useState("");

  const handleMenuPress = () => {
    // @ts-ignore
    navigation.openDrawer?.();
  };

  const today = new Date().toISOString().split("T")[0];
  const { contractData: rawContract } = useContractData(
    s.company,
    s.role,
    s.rank,
    today,
  );

  const rates = useMemo(() => {
    if (!rawContract) return null;
    let sbh = rawContract.sbh;
    const diaria = rawContract.diaria;
    if (s.legacy) {
      const lc = s.legacyCustom ?? { ffp: 0, sbh: 0, al: 0 };
      const ld = s.legacyDeltas ?? { ffp: 0, sbh: 0, al: 0 };
      if (s.legacyDirect) {
        if (lc.sbh > 0) sbh = lc.sbh;
      } else {
        sbh = rawContract.sbh + ld.sbh;
      }
    }

    // Sim diaria tiers (only for instructor ranks: sfi/tri/tre)
    let simDiaria: SimDiariaTier[] | null = null;
    if (rawContract.training) {
      if (s.btc && rawContract.training.btc?.simDiaria?.length) {
        simDiaria = rawContract.training.btc.simDiaria;
      } else if (rawContract.training.nonBtc?.simDiaria?.length) {
        simDiaria = rawContract.training.nonBtc.simDiaria;
      }
    }

    let al = rawContract.al;
    if (s.legacy) {
      const lc = s.legacyCustom ?? { ffp: 0, sbh: 0, al: 0 };
      const ld = s.legacyDeltas ?? { ffp: 0, sbh: 0, al: 0 };
      if (s.legacyDirect) {
        if (lc.al > 0) al = lc.al;
      } else {
        al = rawContract.al + ld.al;
      }
    }
    const cuPct = s.cu ? 0.9 : 1;

    return { sbh, diaria, al: al * cuPct, simDiaria };
  }, [
    rawContract,
    s.legacy,
    s.legacyDirect,
    s.legacyCustom,
    s.legacyDeltas,
    s.btc,
  ]);

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

  // Ferie calculations
  const ferieAmount = parseFloat(ferieText) || 0;
  const alRate = rates?.al ?? 0;
  const inputAlDays = input.al;
  const hasAlDays = inputAlDays > 0;

  const alDaysAtContractRate =
    alRate > 0 && ferieAmount > 0 ? ferieAmount / alRate : null;
  const effectiveAlRate =
    hasAlDays && ferieAmount > 0 ? ferieAmount / inputAlDays : null;

  // Sim pay calculations (instructor ranks only)
  const isInstructor = ["sfi", "tri", "tre"].includes(s.rank);
  const simDiaria = rates?.simDiaria ?? null;
  const hasSimSection = isInstructor && !!simDiaria;

  const simPayAmount = parseFloat(simPayText) || 0;
  const inputSimDays = input.simDays;
  const hasSimDays = inputSimDays > 0;

  // Inverse sim diaria: given a target sector pay, find how many sim days produce it.
  // The pay function is piecewise-linear in days, so we walk tiers and interpolate.
  const simDaysAtContractRate = useMemo<number | null>(() => {
    if (!simDiaria || simPayAmount <= 0) return null;
    const sorted = [...simDiaria].sort((a, b) => a.min - b.min);
    for (let n = 1; n <= 200; n++) {
      const pay = calculateSimDiariaPay(n, sorted).sectorPay;
      if (pay >= simPayAmount) {
        const prevPay = calculateSimDiariaPay(n - 1, sorted).sectorPay;
        const delta = pay - prevPay;
        return delta > 0 ? n - 1 + (simPayAmount - prevPay) / delta : n;
      }
    }
    return null; // amount exceeds max tiers
  }, [simDiaria, simPayAmount]);

  const effectiveSimRate =
    hasSimDays && simPayAmount > 0 ? simPayAmount / inputSimDays : null;

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
                      <ApplyButton
                        label={`→ SBH: ${formatSbh(hoursAtContractRate)}`}
                        onPress={() =>
                          setInput({ sbh: formatSbh(hoursAtContractRate!) })
                        }
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
                      <View style={styles.applyRow}>
                        <ApplyButton
                          label={`→ Fly: ${Math.round(daysAtContractRate)}`}
                          onPress={() =>
                            setInput({
                              flyDiaria: Math.round(daysAtContractRate!),
                            })
                          }
                        />
                        <ApplyButton
                          label={`→ No-Fly: ${Math.round(daysAtContractRate)}`}
                          onPress={() =>
                            setInput({
                              noFlyDiaria: Math.round(daysAtContractRate!),
                            })
                          }
                        />
                      </View>
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

          {/* Ferie section */}
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <ArrowLeftRight size={16} color={colors.primary} />
              <Text style={styles.sectionTitle}>
                {t("payslip.reverseFerieTitle")}
              </Text>
            </View>
            <View style={styles.card}>
              <AmountInput
                label={t("payslip.reverseEnterAmount")}
                value={ferieText}
                onChange={setFerieText}
              />

              {ferieAmount > 0 && rates && (
                <View style={styles.results}>
                  {alDaysAtContractRate !== null && (
                    <>
                      <View style={styles.divider} />
                      <ResultRow
                        label={t("payslip.reverseDaysAtRate")}
                        sub={`${t("payslip.contractPerDay")} @ ${formatCurrency(alRate)}`}
                        value={formatNumber(alDaysAtContractRate, 2)}
                      />
                      <ApplyButton
                        label={`→ Ferie: ${Math.round(alDaysAtContractRate)}`}
                        onPress={() =>
                          setInput({ al: Math.round(alDaysAtContractRate!) })
                        }
                      />
                    </>
                  )}
                  <View style={styles.divider} />
                  {hasAlDays ? (
                    <ResultRow
                      label={t("payslip.reverseEffectiveRate")}
                      sub={`${inputAlDays} ${t("payslip.reverseFromInput")}`}
                      value={`${formatCurrency(effectiveAlRate!)}/${t("payslip.reverseDayShort")}`}
                    />
                  ) : (
                    <View style={styles.warning}>
                      <AlertTriangle size={14} color={colors.warning} />
                      <Text style={styles.warningText}>
                        {t("payslip.reverseNoAlWarning")}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>

          {/* Sim Pay section — visible only for instructor ranks with simDiaria data */}
          {hasSimSection && (
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <ArrowLeftRight size={16} color={colors.primary} />
                <Text style={styles.sectionTitle}>
                  {t("payslip.reverseSimTitle")}
                </Text>
              </View>
              <View style={styles.card}>
                <AmountInput
                  label={t("payslip.reverseEnterAmount")}
                  value={simPayText}
                  onChange={setSimPayText}
                />

                {simPayAmount > 0 && (
                  <View style={styles.results}>
                    {/* Days at contract rate (inverse tier calculation) */}
                    {simDaysAtContractRate !== null && (
                      <>
                        <View style={styles.divider} />
                        <ResultRow
                          label={t("payslip.reverseSimDaysAtRate")}
                          sub={`${s.btc ? "BTC" : "non-BTC"} sim tiers`}
                          value={formatNumber(simDaysAtContractRate, 2)}
                        />
                        <ApplyButton
                          label={`→ Sim Days: ${Math.round(simDaysAtContractRate)}`}
                          onPress={() =>
                            setInput({
                              simDays: Math.round(simDaysAtContractRate!),
                            })
                          }
                        />
                      </>
                    )}

                    {/* Effective rate using input sim days */}
                    <View style={styles.divider} />
                    {hasSimDays ? (
                      <ResultRow
                        label={t("payslip.reverseEffectiveRate")}
                        sub={`${inputSimDays} ${t("payslip.reverseDayShort")} ${t("payslip.reverseFromInput")}`}
                        value={`${formatCurrency(effectiveSimRate!)}/${t("payslip.reverseDayShort")}`}
                      />
                    ) : (
                      <View style={styles.warning}>
                        <AlertTriangle size={14} color={colors.warning} />
                        <Text style={styles.warningText}>
                          {t("payslip.reverseNoSimWarning")}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>
          )}

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
  applyRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  applyButton: {
    flex: 1,
    backgroundColor: colors.primary + "18",
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary + "40",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
  },
  applyButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
  bottomSpace: { height: spacing.xl },
});
