import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Menu,
  CheckCircle,
  XCircle,
  Info,
  RotateCcw,
} from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { colors, spacing, typography, borderRadius } from "../../theme";
import { useFtlStore } from "../store/useFtlStore";
import {
  calcExtension,
  calcMaxFdp,
  timeToMinutes,
  minutesToDuration,
} from "../services/FtlCalculator";
import { TimePickerSheet } from "../components/TimePickerSheet";

const SECTORS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export const ExtensionScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { reportTime, sectors, extType, standby, set, reset } = useFtlStore();

  // Extension tab re-uses reportTime/sectors/standby from the FDP tab.
  // 18h awake check only applies when called from standby (airport or home).
  const activeStandby =
    standby.type === "airport" || standby.type === "home" ? standby : undefined;

  const baseResult = useMemo(() => {
    if (!reportTime || reportTime.length < 5) return null;
    try {
      return calcMaxFdp(timeToMinutes(reportTime), sectors, activeStandby);
    } catch {
      return null;
    }
  }, [reportTime, sectors, activeStandby]);

  const extResult = useMemo(() => {
    if (!baseResult) return null;
    try {
      return calcExtension(
        timeToMinutes(reportTime),
        sectors,
        extType,
        baseResult.woclEncroachmentMin,
        activeStandby,
      );
    } catch {
      return null;
    }
  }, [reportTime, sectors, extType, baseResult, activeStandby]);

  const extTypes: { label: string; value: "planned" | "discretionary" }[] = [
    { label: t("ftl.extensionPlanned"), value: "planned" },
    { label: t("ftl.extensionDiscretionary"), value: "discretionary" },
  ];

  const allowedColor = extResult?.allowed ? colors.success : colors.error;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => (navigation as any).openDrawer?.()}
            style={styles.menuButton}
          >
            <Menu size={24} color={colors.textInverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("ftl.title")}</Text>
          <TouchableOpacity onPress={reset} style={styles.resetButton}>
            <RotateCcw size={20} color={colors.textInverse} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Result card */}
        <View style={styles.resultCard}>
          {extResult ? (
            extResult.allowed ? (
              <>
                <CheckCircle size={40} color={colors.success} />
                <Text style={[styles.resultStatus, { color: colors.success }]}>
                  {t("ftl.extensionAllowed")}
                </Text>
                <Text style={styles.resultValue}>
                  {minutesToDuration(extResult.extendedFdp)}
                </Text>
                <Text style={styles.resultSub}>
                  {t("ftl.baseFdp")}:{" "}
                  {baseResult ? minutesToDuration(baseResult.maxFdp) : "--:--"}{" "}
                  + {extType === "planned" ? "1:00" : "2:00"}
                </Text>
                {extType === "planned" && (
                  <View style={styles.infoBox}>
                    <Info size={13} color={colors.textSecondary} />
                    <Text style={styles.infoText}>{t("ftl.plannedNote")}</Text>
                  </View>
                )}
                {extType === "discretionary" && (
                  <View
                    style={[
                      styles.infoBox,
                      { marginTop: 8, alignSelf: "stretch" },
                    ]}
                  >
                    <Info size={13} color={colors.textSecondary} />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.infoText,
                          { fontWeight: "600", marginBottom: 4 },
                        ]}
                      >
                        {t("ftl.discretionChecklist")}
                      </Text>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Text key={n} style={styles.infoText}>
                          {"• "}
                          {t(`ftl.discretionCheck${n}`)}
                        </Text>
                      ))}
                    </View>
                  </View>
                )}
              </>
            ) : (
              <>
                <XCircle size={40} color={colors.error} />
                <Text style={[styles.resultStatus, { color: colors.error }]}>
                  {t("ftl.extensionDenied")}
                </Text>
                {extResult.reason && (
                  <Text style={styles.reasonText}>
                    {t(`ftl.${extResult.reason}`)}
                  </Text>
                )}
              </>
            )
          ) : (
            <Text style={styles.placeholderText}>{t("ftl.enterInputs")}</Text>
          )}
        </View>

        {/* Inputs */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t("ftl.extensionType")}</Text>
          <View style={styles.segmentRow}>
            {extTypes.map((et) => (
              <TouchableOpacity
                key={et.value}
                style={[
                  styles.segmentBtn,
                  extType === et.value && styles.segmentBtnActive,
                ]}
                onPress={() => set({ extType: et.value })}
              >
                <Text
                  style={[
                    styles.segmentText,
                    extType === et.value && styles.segmentTextActive,
                  ]}
                >
                  {et.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t("ftl.inputs")}</Text>

          <TimePickerSheet
            label={t("ftl.reportTime")}
            hint={t("ftl.sharedWithFdpTab")}
            value={reportTime}
            onChange={(v) => set({ reportTime: v, dutyStart: v })}
          />

          <Text style={styles.fieldLabel}>{t("ftl.sectors")}</Text>
          <View style={styles.sectorRow}>
            {SECTORS.map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.sectorBtn,
                  sectors === s && styles.sectorBtnActive,
                ]}
                onPress={() => set({ sectors: s })}
              >
                <Text
                  style={[
                    styles.sectorBtnText,
                    sectors === s && styles.sectorBtnTextActive,
                  ]}
                >
                  {s === 10 ? "10+" : String(s)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* WOCL info */}
        {baseResult && baseResult.woclEncroachmentMin > 0 && (
          <View style={[styles.card, { backgroundColor: "#FFF8E1" }]}>
            <Text style={styles.woclLabel}>
              {t("ftl.woclWarning", {
                hours: minutesToDuration(baseResult.woclEncroachmentMin),
              })}
            </Text>
            <Text style={styles.woclHint}>{t("ftl.woclExtensionNote")}</Text>
          </View>
        )}

        {/* Reference */}
        <View style={[styles.card, styles.refCard]}>
          <Text style={styles.refTitle}>{t("ftl.extensionRules")}</Text>
          <Text style={styles.refText}>{t("ftl.extensionRulePlanned")}</Text>
          <Text style={styles.refText}>
            {t("ftl.extensionRuleDiscretionary")}
          </Text>
          <Text style={styles.refText}>{t("ftl.extensionRuleWocl")}</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safeArea: { backgroundColor: colors.primary },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
  },
  menuButton: { padding: spacing.xs },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: colors.textInverse,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  resetButton: { padding: 4 },
  scroll: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: "center",
    marginBottom: spacing.md,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    minHeight: 120,
    justifyContent: "center",
  },
  resultStatus: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    marginTop: spacing.sm,
  },
  resultValue: {
    fontSize: 44,
    fontWeight: typography.weights.bold,
    color: colors.success,
    letterSpacing: -1,
    marginTop: spacing.xs,
  },
  resultSub: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  reasonText: {
    fontSize: typography.sizes.sm,
    color: colors.error,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  placeholderText: {
    fontSize: typography.sizes.sm,
    color: colors.textTertiary,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  segmentRow: {
    flexDirection: "row",
    gap: spacing.xs,
    flexWrap: "wrap",
  },
  segmentBtn: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center",
  },
  segmentBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  segmentText: {
    fontSize: typography.sizes.xs,
    color: colors.text,
    fontWeight: typography.weights.medium,
    textAlign: "center",
  },
  segmentTextActive: { color: colors.textInverse },
  sectorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  sectorBtn: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  sectorBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sectorBtnText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  sectorBtnTextActive: { color: colors.textInverse },
  woclLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.xs / 2,
  },
  woclHint: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  refCard: { backgroundColor: colors.background },
  refTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  refText: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
    marginBottom: spacing.xs / 2,
  },
});
