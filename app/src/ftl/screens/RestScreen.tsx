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
import { Menu, RotateCcw } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { colors, spacing, typography, borderRadius } from "../../theme";
import { useFtlStore } from "../store/useFtlStore";
import {
  calcMinRest,
  timeToMinutes,
  minutesToTime,
  minutesToDuration,
} from "../services/FtlCalculator";
import { TimePickerSheet } from "../components/TimePickerSheet";

export const RestScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { dutyStart, finishTime, isHomeBase, set, reset } = useFtlStore();

  // Duty duration = finishTime − dutyStart (wraps midnight)
  const dutyMinutes = useMemo(() => {
    if (
      !dutyStart ||
      dutyStart.length < 5 ||
      !finishTime ||
      finishTime.length < 5
    )
      return null;
    const d =
      (timeToMinutes(finishTime) - timeToMinutes(dutyStart) + 1440) % 1440;
    return d > 0 ? d : null;
  }, [dutyStart, finishTime]);

  const result = useMemo(() => {
    if (dutyMinutes === null) return null;
    return calcMinRest(dutyMinutes, isHomeBase);
  }, [dutyMinutes, isHomeBase]);

  const availableFrom = useMemo(() => {
    if (!result || !finishTime || finishTime.length < 5) return null;
    return minutesToTime(timeToMinutes(finishTime) + result.minRest);
  }, [result, finishTime]);

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
          <Text style={styles.resultLabel}>{t("ftl.minRest")}</Text>
          <Text style={styles.resultValue}>
            {result ? minutesToDuration(result.minRest) : "--:--"}
          </Text>
          {dutyMinutes !== null && (
            <Text style={styles.resultSub}>
              {t("ftl.dutyDuration")}:{" "}
              <Text style={styles.resultSubBold}>
                {minutesToDuration(dutyMinutes)}
              </Text>
            </Text>
          )}
          {availableFrom && (
            <Text style={styles.resultSub}>
              {t("ftl.availableFrom")}:{" "}
              <Text style={styles.resultSubBold}>{availableFrom}</Text>
            </Text>
          )}
          <Text style={styles.resultHint}>
            {isHomeBase ? t("ftl.homeBase") : t("ftl.awayBase")} —{" "}
            {isHomeBase ? t("ftl.minRestHomeRule") : t("ftl.minRestAwayRule")}
          </Text>
        </View>

        {/* Inputs */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t("ftl.inputs")}</Text>

          <TimePickerSheet
            label={t("ftl.dutyStart")}
            hint={t("ftl.dutyStartHint")}
            value={dutyStart}
            onChange={(v) => set({ dutyStart: v })}
          />

          <TimePickerSheet
            label={t("ftl.finishTime")}
            value={finishTime}
            onChange={(v) => set({ finishTime: v })}
            placeholder="--:--"
          />

          <View style={styles.switchRow}>
            <View>
              <Text style={styles.fieldLabel}>{t("ftl.homeBase")}</Text>
              <Text style={styles.fieldHint}>
                {isHomeBase
                  ? t("ftl.minRestHomeRule")
                  : t("ftl.minRestAwayRule")}
              </Text>
            </View>
            <Switch
              value={isHomeBase}
              onValueChange={(v) => set({ isHomeBase: v })}
              trackColor={{ true: colors.primary }}
            />
          </View>
        </View>

        {/* Reference */}
        <View style={[styles.card, styles.refCard]}>
          <Text style={styles.refTitle}>{t("ftl.restRules")}</Text>
          <Text style={styles.refText}>{t("ftl.restRuleHome")}</Text>
          <Text style={styles.refText}>{t("ftl.restRuleAway")}</Text>
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
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  resultValue: {
    fontSize: 52,
    fontWeight: typography.weights.bold,
    color: colors.primary,
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
  resultHint: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
    marginTop: spacing.xs,
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
  },
  fieldHint: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.sm,
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
