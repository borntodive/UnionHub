import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Menu } from "lucide-react-native";

import { colors, spacing, typography, borderRadius } from "../../theme";
import { usePayslipStore } from "../store/usePayslipStore";
import { useAuthStore } from "../../store/authStore";
import { useContractData } from "../hooks/useContractData";
import { formatCurrency, formatNumber } from "../utils/formatters";
import { RankContract } from "../types";
import { getSeniorityDate, computeSeniorityYears } from "../utils/seniority";

// ── helpers ──────────────────────────────────────────────────────────────────

const INSTRUCTOR_RANKS = ["sfi", "tri", "tre", "ltc", "lcc"];

function applyLegacyOverrides(
  cd: RankContract,
  legacy: boolean,
  legacyDirect: boolean,
  legacyCustom: { ffp: number; sbh: number; al: number },
  legacyDeltas: { ffp: number; sbh: number; al: number },
): RankContract {
  if (!legacy) return cd;
  if (legacyDirect) {
    return {
      ...cd,
      ffp: legacyCustom.ffp > 0 ? legacyCustom.ffp : cd.ffp,
      sbh: legacyCustom.sbh > 0 ? legacyCustom.sbh : cd.sbh,
      al: legacyCustom.al > 0 ? legacyCustom.al : cd.al,
    };
  }
  return {
    ...cd,
    ffp: cd.ffp + legacyDeltas.ffp,
    sbh: cd.sbh + legacyDeltas.sbh,
    al: cd.al + legacyDeltas.al,
  };
}

function computeTrainingAllowances(
  cd: RankContract,
  rank: string,
  btc: boolean,
  triAndLtc: boolean,
  ltcContractData: any | null,
): { base: number; instructor: number; ltc: number } {
  let base = 0;
  let instructor = 0;
  let ltc = 0;

  if (cd.training?.allowance) base = cd.training.allowance;

  if (INSTRUCTOR_RANKS.includes(rank) && cd.training) {
    const training = cd.training;
    if (btc && training.btc) instructor = training.btc.allowance ?? 0;
    else if (training.nonBtc) instructor = training.nonBtc.allowance ?? 0;
  }

  const isLtc = rank === "tre" || triAndLtc;
  if (isLtc && ltcContractData?.training?.allowance) {
    ltc = ltcContractData.training.allowance;
  }

  return { base, instructor, ltc };
}

// ── sub-components ────────────────────────────────────────────────────────────

interface RowProps {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  dimmed?: boolean;
}

const Row: React.FC<RowProps> = ({ label, value, sub, highlight, dimmed }) => (
  <View style={[styles.row, dimmed && styles.rowDimmed]}>
    <View style={styles.rowLeft}>
      <Text style={[styles.rowLabel, highlight && styles.rowLabelHighlight]}>
        {label}
      </Text>
      {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
    </View>
    <Text style={[styles.rowValue, highlight && styles.rowValueHighlight]}>
      {value}
    </Text>
  </View>
);

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.card}>{children}</View>
  </View>
);

interface BadgeProps {
  label: string;
  color?: string;
}

const Badge: React.FC<BadgeProps> = ({ label, color = colors.primary }) => (
  <View style={[styles.badge, { backgroundColor: color + "20" }]}>
    <Text style={[styles.badgeText, { color }]}>{label}</Text>
  </View>
);

// ── main screen ───────────────────────────────────────────────────────────────

export const ContractScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const {
    settings,
    overrideActive,
    overrideSettings,
    overrideRsa,
    overrideItud,
  } = usePayslipStore();
  const user = useAuthStore((state) => state.user);
  const userRsa = overrideActive ? overrideRsa : user?.rsa === true;
  const userItud = overrideActive ? overrideItud : user?.itud === true;

  const handleMenuPress = () => {
    // @ts-ignore
    navigation.openDrawer?.();
  };

  const s = overrideActive
    ? { ...overrideSettings, legacyDirect: true }
    : { ...settings, legacyDirect: false };

  const today = new Date().toISOString().split("T")[0];
  const { contractData: rawCd, loading } = useContractData(
    s.company,
    s.role,
    s.rank,
    today,
  );
  // Also fetch LTC data for TRE/triAndLtc training allowance
  const needsLtc = s.rank === "tre" || s.triAndLtc;
  const { contractData: ltcContractData } = useContractData(
    s.company,
    s.role,
    needsLtc ? "ltc" : s.rank,
    today,
  );

  const cd = useMemo(() => {
    if (!rawCd) return null;
    return applyLegacyOverrides(
      rawCd,
      s.legacy,
      s.legacyDirect ?? false,
      s.legacyCustom ?? { ffp: 0, sbh: 0, al: 0 },
      s.legacyDeltas ?? { ffp: 0, sbh: 0, al: 0 },
    );
  }, [rawCd, s.legacy, s.legacyDirect, s.legacyCustom, s.legacyDeltas]);

  const ptPct = s.parttime ? s.parttimePercentage : 1;
  const cuPct = s.cu ? 0.9 : 1;

  const training = useMemo(
    () =>
      cd
        ? computeTrainingAllowances(
            cd,
            s.rank,
            s.btc,
            s.triAndLtc,
            needsLtc ? ltcContractData : null,
          )
        : { base: 0, instructor: 0, ltc: 0 },
    [cd, s.rank, s.btc, s.triAndLtc, needsLtc, ltcContractData],
  );

  if (loading) {
    return (
      <View style={styles.emptyContainer}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!cd) {
    return (
      <View style={styles.emptyContainer}>
        <AlertTriangle size={48} color={colors.textTertiary} />
        <Text style={styles.emptyText}>{t("payslip.contractNotFound")}</Text>
      </View>
    );
  }

  const basicEffective = cd.basic * ptPct * cuPct;
  const ffpBaseEffective = cd.ffp * ptPct * cuPct;
  const ffpTotal =
    ffpBaseEffective +
    cd.allowance +
    training.base +
    training.instructor +
    training.ltc;
  const alEffective = cd.al * cuPct;
  const woffEffective = cd.woff ? cd.woff * cuPct : null;

  // Seniority years — computed from user dates relative to today's date
  const seniorityYears = (() => {
    if (overrideActive) return null;
    const userContext = {
      gradeCode: user?.grade?.codice,
      dateOfEntry: user?.dateOfEntry,
      dateOfCaptaincy: user?.dateOfCaptaincy,
    };
    const senDate = getSeniorityDate(userContext);
    if (!senDate) return null;
    const today = new Date().toISOString().split("T")[0];
    return computeSeniorityYears(senDate, today);
  })();

  const activeBadges: { label: string; color: string }[] = [];
  if (overrideActive)
    activeBadges.push({
      label: t("payslip.overrideActive"),
      color: colors.warning,
    });
  if (s.parttime)
    activeBadges.push({
      label: `Part-time ${Math.round(ptPct * 100)}%`,
      color: colors.info ?? colors.primary,
    });
  if (s.cu)
    activeBadges.push({
      label: t("settings.payslipNewCaptain") + " (−10%)",
      color: colors.warning,
    });
  if (s.legacy)
    activeBadges.push({
      label: t("payslip.legacyContract"),
      color: colors.secondary ?? colors.primary,
    });

  const roleLabel =
    s.role === "pil"
      ? t("settings.payslipPilot")
      : t("settings.payslipCabinCrew");

  return (
    <View style={styles.wrapper}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.topHeader}>
          <TouchableOpacity onPress={handleMenuPress} style={styles.menuButton}>
            <Menu size={24} color={colors.textInverse} />
          </TouchableOpacity>
          <Text style={styles.topHeaderTitle}>{t("payslip.contractTab")}</Text>
          <View style={styles.placeholder} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        {/* Info card */}
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerCompany}>{s.company}</Text>
              <Text style={styles.headerRank}>{s.rank.toUpperCase()}</Text>
              <Text style={styles.headerRole}>{roleLabel}</Text>
              {seniorityYears !== null && (
                <Text style={styles.headerSeniority}>
                  {t("payslip.seniority")}: {seniorityYears}{" "}
                  {t("payslip.seniorityYears")}
                </Text>
              )}
            </View>
            {activeBadges.length > 0 && (
              <View style={styles.badgeList}>
                {activeBadges.map((b, i) => (
                  <Badge key={i} label={b.label} color={b.color} />
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Monthly base pay */}
        <Section title={t("payslip.contractBaseSection")}>
          <Row
            label={t("payslip.basic")}
            sub={
              ptPct < 1 || cuPct < 1
                ? `×${formatNumber(ptPct, 2)} ×${formatNumber(cuPct, 2)}`
                : undefined
            }
            value={formatCurrency(basicEffective)}
          />
          <View style={styles.divider} />
          <Row
            label={t("payslip.ffp") + " " + t("payslip.contractBase")}
            sub={
              ptPct < 1 || cuPct < 1
                ? `×${formatNumber(ptPct, 2)} ×${formatNumber(cuPct, 2)}`
                : undefined
            }
            value={formatCurrency(ffpBaseEffective)}
          />
          <Row
            label={t("payslip.contractAllowance")}
            value={formatCurrency(cd.allowance)}
            dimmed
          />
          {training.base > 0 && (
            <Row
              label={t("payslip.contractTrainingAllowance")}
              value={formatCurrency(training.base)}
              dimmed
            />
          )}
          {training.instructor > 0 && (
            <Row
              label={t("payslip.contractInstructorAllowance")}
              value={formatCurrency(training.instructor)}
              dimmed
            />
          )}
          {training.ltc > 0 && (
            <Row
              label={t("payslip.contractLtcAllowance")}
              value={formatCurrency(training.ltc)}
              dimmed
            />
          )}
          <View style={styles.divider} />
          <Row
            label={t("payslip.fixedFlightPay")}
            value={formatCurrency(ffpTotal)}
            highlight
          />
        </Section>

        {/* Per-unit rates */}
        <Section title={t("payslip.contractRatesSection")}>
          <Row
            label={t("payslip.scheduledBlockHours")}
            sub={t("payslip.contractPerHour")}
            value={formatCurrency(cd.sbh)}
          />
          <View style={styles.divider} />
          <Row
            label={t("payslip.annualLeave")}
            sub={
              cuPct < 1
                ? `${t("payslip.contractPerDay")} ×${formatNumber(cuPct, 2)}`
                : t("payslip.contractPerDay")
            }
            value={formatCurrency(alEffective)}
          />
          {cd.oob > 0 && (
            <>
              <View style={styles.divider} />
              <Row
                label={t("payslip.outOfBase")}
                sub={t("payslip.contractPerNight")}
                value={formatCurrency(cd.oob)}
              />
            </>
          )}
          {woffEffective !== null && (
            <>
              <View style={styles.divider} />
              <Row
                label={t("payslip.workingDayOff")}
                sub={
                  cuPct < 1
                    ? `${t("payslip.contractPerDay")} ×${formatNumber(cuPct, 2)}`
                    : t("payslip.contractPerDay")
                }
                value={formatCurrency(woffEffective)}
              />
            </>
          )}
          <View style={styles.divider} />
          <Row
            label={t("payslip.perDiem")}
            sub={t("payslip.contractPerDay")}
            value={formatCurrency(cd.diaria)}
          />
        </Section>

        {/* Fixed monthly — only if at least one applies to the user */}
        {(userRsa || userItud) && (
          <Section title={t("payslip.contractFixedSection")}>
            {userRsa && cd.rsa > 0 && (
              <>
                <Row
                  label="RSA"
                  sub={t("payslip.contractMonthly")}
                  value={formatCurrency(cd.rsa)}
                />
                {userItud && cd.itud > 0 && <View style={styles.divider} />}
              </>
            )}
            {userItud && cd.itud > 0 && (
              <Row
                label="ITUD"
                sub={t("payslip.contractPerDay")}
                value={formatCurrency(cd.itud)}
              />
            )}
          </Section>
        )}

        {/* Legacy note */}
        {s.legacy && (
          <View style={styles.legacyNote}>
            <AlertTriangle
              size={14}
              color={colors.secondary ?? colors.primary}
            />
            <Text style={styles.legacyNoteText}>
              {t("payslip.legacyContract")}:{" "}
              {s.legacyDirect
                ? t("payslip.legacyDirectHint")
                : t("payslip.legacyDeltaHint", {
                    ffp: formatCurrency(s.legacyDeltas?.ffp ?? 0),
                    sbh: formatCurrency(s.legacyDeltas?.sbh ?? 0),
                    al: formatCurrency(s.legacyDeltas?.al ?? 0),
                  })}
            </Text>
          </View>
        )}

        <View style={styles.bottomSpace} />
      </ScrollView>
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
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  emptyText: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: "center",
  },
  // Header
  headerCard: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerCompany: {
    fontSize: typography.sizes.xs,
    color: colors.textInverse + "99",
    fontWeight: typography.weights.medium,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  headerRank: {
    fontSize: 28,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
    lineHeight: 32,
  },
  headerRole: {
    fontSize: typography.sizes.sm,
    color: colors.textInverse + "CC",
  },
  headerSeniority: {
    fontSize: typography.sizes.xs,
    color: colors.textInverse + "99",
    marginTop: 4,
  },
  badgeList: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  // Sections
  section: { marginBottom: spacing.md },
  sectionTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  // Rows
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  rowDimmed: { opacity: 0.65 },
  rowLeft: { flex: 1, marginRight: spacing.sm },
  rowLabel: {
    fontSize: typography.sizes.base,
    color: colors.text,
  },
  rowLabelHighlight: {
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  rowSub: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  rowValue: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  rowValueHighlight: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  // Legacy note
  legacyNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  legacyNoteText: {
    flex: 1,
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  bottomSpace: { height: spacing.xl },
});
