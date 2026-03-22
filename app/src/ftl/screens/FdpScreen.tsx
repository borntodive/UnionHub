import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Menu,
  Clock,
  AlertTriangle,
  Info,
  RotateCcw,
} from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { colors, spacing, typography, borderRadius } from "../../theme";
import { useFtlStore } from "../store/useFtlStore";
import {
  calcMaxFdp,
  timeToMinutes,
  minutesToTime,
  minutesToDuration,
} from "../services/FtlCalculator";
import { MAX_AWAKE } from "../data/ftlTables";
import { StandbyType } from "../types";
import { TimePickerSheet } from "../components/TimePickerSheet";

const SECTORS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export const FdpScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { reportTime, sectors, standby, set, reset } = useFtlStore();

  const showStandby = standby.type !== "none";
  // callTime: for home standby, but NOT for night standby 2000–2300 (fixed formula)
  const sbyStartMin = standby.startTime ? timeToMinutes(standby.startTime) : 0;
  const isNightSby = sbyStartMin >= 20 * 60 && sbyStartMin < 23 * 60;
  const showCallTime = standby.type === "home" && !isNightSby;

  const result = useMemo(() => {
    if (!reportTime || reportTime.length < 5) return null;
    try {
      return calcMaxFdp(
        timeToMinutes(reportTime),
        sectors,
        showStandby ? standby : undefined,
      );
    } catch {
      return null;
    }
  }, [reportTime, sectors, standby, showStandby]);

  const endOfDuty = result
    ? minutesToTime(timeToMinutes(reportTime) + result.maxFdp)
    : "--:--";

  const fdpColor = !result
    ? colors.textSecondary
    : result.limitedByAwake || result.limitedByStandby
      ? colors.warning
      : result.maxFdp >= 720
        ? colors.success
        : colors.error;

  const standbyTypes: { label: string; value: StandbyType }[] = [
    { label: t("ftl.standbyNone"), value: "none" },
    { label: t("ftl.standbyAirport"), value: "airport" },
    { label: t("ftl.standbyHome"), value: "home" },
    { label: t("ftl.standbyReserve"), value: "reserve" },
  ];

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
          <Text style={styles.resultLabel}>{t("ftl.maxFdp")}</Text>
          <Text style={[styles.resultValue, { color: fdpColor }]}>
            {result ? minutesToDuration(result.maxFdp) : "--:--"}
          </Text>
          <Text style={styles.resultSub}>
            {t("ftl.endOfDuty")}:{" "}
            <Text style={styles.resultSubBold}>{endOfDuty}</Text>
          </Text>

          {result?.isEarlyStart && (
            <View style={styles.badge}>
              <AlertTriangle size={14} color={colors.warning} />
              <Text style={styles.badgeText}>{t("ftl.earlyStart")}</Text>
            </View>
          )}
          {result?.limitedByAwake && (
            <View style={[styles.badge, styles.badgeWarning]}>
              <Clock size={14} color={colors.warning} />
              <Text style={styles.badgeText}>{t("ftl.limitedByAwake")}</Text>
            </View>
          )}
          {result?.limitedByStandby && (
            <View style={[styles.badge, styles.badgeWarning]}>
              <Info size={14} color={colors.warning} />
              <Text style={styles.badgeText}>
                {t("ftl.reducedByStandby", {
                  amount: minutesToDuration(result.standbyReduction),
                })}
              </Text>
            </View>
          )}
          {result?.limitedBy16hCap && (
            <View style={[styles.badge, styles.badgeWarning]}>
              <AlertTriangle size={14} color={colors.warning} />
              <Text style={styles.badgeText}>{t("ftl.limited16hCap")}</Text>
            </View>
          )}
          {result?.isNightDuty && sectors > 4 && (
            <View style={[styles.badge, styles.badgeWarning]}>
              <AlertTriangle size={14} color={colors.warning} />
              <Text style={styles.badgeText}>{t("ftl.nightDutyWarning")}</Text>
            </View>
          )}
          {result && result.woclEncroachmentMin > 0 && (
            <View style={[styles.badge, styles.badgeInfo]}>
              <AlertTriangle size={14} color={colors.secondary} />
              <Text style={styles.badgeText}>
                {t("ftl.woclWarning", {
                  hours: minutesToDuration(result.woclEncroachmentMin),
                })}
              </Text>
            </View>
          )}
        </View>

        {/* Inputs */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t("ftl.inputs")}</Text>

          <TimePickerSheet
            label={t("ftl.reportTime")}
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

        {/* Standby section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t("ftl.standbySection")}</Text>

          <View style={styles.segmentRow}>
            {standbyTypes.map((st) => (
              <TouchableOpacity
                key={st.value}
                style={[
                  styles.segmentBtn,
                  standby.type === st.value && styles.segmentBtnActive,
                ]}
                onPress={() => set({ standby: { ...standby, type: st.value } })}
              >
                <Text
                  style={[
                    styles.segmentText,
                    standby.type === st.value && styles.segmentTextActive,
                  ]}
                >
                  {st.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {showStandby && standby.type !== "reserve" && (
            <TimePickerSheet
              label={t("ftl.standbyStart")}
              value={standby.startTime}
              onChange={(v) => set({ standby: { ...standby, startTime: v } })}
            />
          )}

          {showCallTime && (
            <TimePickerSheet
              label={t("ftl.callTime")}
              value={standby.callTime}
              onChange={(v) => set({ standby: { ...standby, callTime: v } })}
              placeholder="--:--"
            />
          )}

          {standby.type === "home" && (
            <View style={styles.switchRow}>
              <Text style={styles.fieldLabel}>{t("ftl.splitDuty")}</Text>
              <Switch
                value={standby.splitDuty}
                onValueChange={(v) =>
                  set({ standby: { ...standby, splitDuty: v } })
                }
                trackColor={{ true: colors.primary }}
              />
            </View>
          )}

          {standby.type === "reserve" && (
            <View style={styles.infoBox}>
              <Info size={14} color={colors.textSecondary} />
              <Text style={styles.infoText}>{t("ftl.reserveInfo")}</Text>
            </View>
          )}

          {standby.type === "airport" && result?.standbyReduction ? (
            <View style={styles.infoBox}>
              <Info size={14} color={colors.warning} />
              <Text style={styles.infoText}>
                {t("ftl.airportReductionInfo", {
                  amount: minutesToDuration(result.standbyReduction),
                })}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Debug info */}
        {result &&
          showStandby &&
          standby.type !== "reserve" &&
          standby.startTime && (
            <View style={[styles.card, styles.refCard]}>
              <Text style={styles.refTitle}>Debug</Text>
              <Text style={styles.refLabel}>
                Durata standby:{" "}
                {minutesToDuration(
                  (timeToMinutes(reportTime) -
                    timeToMinutes(standby.startTime) +
                    1440) %
                    1440,
                )}
              </Text>
              <Text style={styles.refLabel}>
                Riduzione FDP:{" "}
                {result.standbyReduction > 0
                  ? `−${minutesToDuration(result.standbyReduction)}`
                  : "nessuna"}
              </Text>
              <Text style={styles.refLabel}>
                Tabella 2: {minutesToDuration(result.tableMax)}
              </Text>
              {result.assumedWakeMinutes !== null && (
                <Text style={styles.refLabel}>
                  Sveglia assunta: {minutesToTime(result.assumedWakeMinutes)}
                  {standby.type === "home" ? " (tabella OMA)" : " (inserita)"}
                </Text>
              )}
              {result.awakeMax < Number.MAX_SAFE_INTEGER && (
                <Text style={styles.refLabel}>
                  Ore veglia prima del report:{" "}
                  {minutesToDuration(MAX_AWAKE - result.awakeMax)}
                </Text>
              )}
              {result.awakeMax < Number.MAX_SAFE_INTEGER && (
                <Text style={styles.refLabel}>
                  Budget veglia residuo (max FDP):{" "}
                  {minutesToDuration(result.awakeMax)}
                </Text>
              )}
            </View>
          )}
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
  resetButton: { padding: spacing.xs },
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
  },
  resultLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  resultValue: {
    fontSize: 52,
    fontWeight: typography.weights.bold,
    letterSpacing: -1,
  },
  resultSub: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  resultSubBold: {
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
  },
  badgeWarning: { backgroundColor: "#FFF8E1" },
  badgeInfo: { backgroundColor: "#E8F5E9" },
  badgeText: {
    fontSize: typography.sizes.xs,
    color: colors.text,
    fontWeight: typography.weights.medium,
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
  segmentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  segmentBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  segmentBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  segmentText: {
    fontSize: typography.sizes.xs,
    color: colors.text,
    fontWeight: typography.weights.medium,
  },
  segmentTextActive: { color: colors.textInverse },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginTop: spacing.xs,
  },
  infoText: {
    flex: 1,
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
  refLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
    marginBottom: spacing.xs / 2,
  },
});
