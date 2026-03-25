import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Menu,
  Thermometer,
  Plus,
  X,
  AlertTriangle,
  Info,
} from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { colors, spacing, typography, borderRadius } from "../theme";
import {
  getCorrectionFt,
  getCorrectionM,
  roundUpTo100,
} from "../ftl/data/ctcTables";

type Unit = "ft" | "m";

interface AltRow {
  id: string;
  label: string;
  publishedAlt: string;
}

const createRow = (): AltRow => ({
  id: Math.random().toString(36).slice(2),
  label: "",
  publishedAlt: "",
});

export const CtcScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();

  const [unit, setUnit] = useState<Unit>("ft");
  const [roundUp, setRoundUp] = useState(false);
  const [tempStr, setTempStr] = useState("");
  const [elevStr, setElevStr] = useState("");
  const [msaStr, setMsaStr] = useState("");
  const [rows, setRows] = useState<AltRow[]>([createRow()]);

  const tempC = parseFloat(tempStr);
  const elevation = parseFloat(elevStr);
  const msa = parseFloat(msaStr);
  const msaSet = !isNaN(msa);
  const tempValid = !isNaN(tempC);
  const elevValid = !isNaN(elevation);
  const noCorrection = tempValid && tempC > 0;

  const addRow = () => setRows((prev) => [...prev, createRow()]);

  const removeRow = (id: string) =>
    setRows((prev) =>
      prev.length > 1 ? prev.filter((r) => r.id !== id) : prev,
    );

  const updateRow = (id: string, field: keyof AltRow, value: string) =>
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );

  const computeRow = (row: AltRow) => {
    const published = parseFloat(row.publishedAlt);
    if (isNaN(published)) {
      return { correction: null, corrected: null, aboveMsa: false };
    }
    if (msaSet && published > msa) {
      return { correction: null, corrected: null, aboveMsa: true };
    }
    if (!tempValid || !elevValid || noCorrection) {
      return { correction: null, corrected: null, aboveMsa: false };
    }
    const height = published - elevation;
    if (height <= 0) {
      return { correction: 0, corrected: published, aboveMsa: false };
    }
    const rawCorrection =
      unit === "ft"
        ? getCorrectionFt(tempC, height)
        : getCorrectionM(tempC, height);
    const correction = Math.round(rawCorrection);
    const raw = published + correction;
    const corrected = roundUp ? roundUpTo100(raw) : raw;
    return { correction, corrected, aboveMsa: false };
  };

  const unitLabel = unit === "ft" ? "ft" : "m";

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => (navigation as any).openDrawer?.()}
          >
            <Menu size={24} color={colors.textInverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("ctc.title")}</Text>
          <View style={styles.menuButton} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Unit toggle + round-up option */}
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <Text style={styles.label}>{t("ctc.roundUp")}</Text>
            <Switch
              value={roundUp}
              onValueChange={setRoundUp}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor={colors.surface}
            />
          </View>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                unit === "ft" && styles.toggleBtnActive,
              ]}
              onPress={() => setUnit("ft")}
            >
              <Text
                style={[
                  styles.toggleBtnText,
                  unit === "ft" && styles.toggleBtnTextActive,
                ]}
              >
                ft
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, unit === "m" && styles.toggleBtnActive]}
              onPress={() => setUnit("m")}
            >
              <Text
                style={[
                  styles.toggleBtnText,
                  unit === "m" && styles.toggleBtnTextActive,
                ]}
              >
                m
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Inputs */}
        <View style={styles.card}>
          <View style={styles.inputRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t("ctc.airportTemp")}</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={tempStr}
                  onChangeText={setTempStr}
                  keyboardType="numbers-and-punctuation"
                  placeholder="-10"
                  placeholderTextColor={colors.textTertiary}
                />
                <Text style={styles.inputUnit}>°C</Text>
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t("ctc.airportElev")}</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={elevStr}
                  onChangeText={setElevStr}
                  keyboardType="numbers-and-punctuation"
                  placeholder="500"
                  placeholderTextColor={colors.textTertiary}
                />
                <Text style={styles.inputUnit}>{unitLabel}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.inputRow, { marginTop: spacing.md }]}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t("ctc.msa")}</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={msaStr}
                  onChangeText={setMsaStr}
                  keyboardType="number-pad"
                  placeholder={t("ctc.msaPlaceholder")}
                  placeholderTextColor={colors.textTertiary}
                />
                <Text style={styles.inputUnit}>{unitLabel}</Text>
              </View>
            </View>
            <View style={styles.inputGroup} />
          </View>
        </View>

        {/* No correction banner */}
        {noCorrection && (
          <View style={styles.warningBanner}>
            <AlertTriangle size={18} color={colors.warning} />
            <Text style={styles.warningText}>{t("ctc.noCorrection")}</Text>
          </View>
        )}

        {/* Altitude rows */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t("ctc.altitudesSection")}</Text>

          {rows.map((row, idx) => {
            const { correction, corrected, aboveMsa } = computeRow(row);
            const hasResult =
              correction !== null && corrected !== null && !noCorrection;

            return (
              <View key={row.id} style={styles.altRow}>
                <View style={styles.altRowHeader}>
                  <Text style={styles.altRowIndex}>#{idx + 1}</Text>
                  {rows.length > 1 && (
                    <TouchableOpacity onPress={() => removeRow(row.id)}>
                      <X size={18} color={colors.error} />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.altInputRow}>
                  <View style={[styles.inputGroup, { flex: 1.2 }]}>
                    <Text style={styles.label}>{t("ctc.label")}</Text>
                    <TextInput
                      style={[styles.input, styles.inputBordered]}
                      value={row.label}
                      onChangeText={(v) => updateRow(row.id, "label", v)}
                      placeholder="FAF"
                      placeholderTextColor={colors.textTertiary}
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.label}>{t("ctc.published")}</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.input}
                        value={row.publishedAlt}
                        onChangeText={(v) =>
                          updateRow(row.id, "publishedAlt", v)
                        }
                        keyboardType="number-pad"
                        placeholder="3000"
                        placeholderTextColor={colors.textTertiary}
                      />
                      <Text style={styles.inputUnit}>{unitLabel}</Text>
                    </View>
                  </View>
                </View>

                {aboveMsa && (
                  <View style={styles.aboveMsaBadge}>
                    <Text style={styles.aboveMsaText}>{t("ctc.aboveMsa")}</Text>
                  </View>
                )}

                {hasResult && (
                  <View style={styles.resultRow}>
                    <View style={styles.resultCell}>
                      <Text style={styles.resultLabel}>
                        {t("ctc.correction")}
                      </Text>
                      <Text style={styles.resultValue}>
                        +{correction} {unitLabel}
                      </Text>
                    </View>
                    <View style={[styles.resultCell, styles.resultCellRight]}>
                      <Text style={styles.resultLabel}>
                        {t("ctc.corrected")}
                      </Text>
                      <Text
                        style={[styles.resultValue, styles.resultHighlight]}
                      >
                        {corrected} {unitLabel}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            );
          })}

          <TouchableOpacity style={styles.addBtn} onPress={addRow}>
            <Plus size={18} color={colors.primary} />
            <Text style={styles.addBtnText}>{t("ctc.addRow")}</Text>
          </TouchableOpacity>
        </View>

        {/* Non-applicability info box */}
        <View style={styles.infoCard}>
          <View style={styles.infoCardHeader}>
            <Info size={16} color={colors.primary} />
            <Text style={styles.infoCardTitle}>
              {t("ctc.notApplicableTitle")}
            </Text>
          </View>
          {(
            t("ctc.notApplicableItems", { returnObjects: true }) as string[]
          ).map((item, i) => (
            <View key={i} style={styles.infoItem}>
              <Text style={styles.infoBullet}>•</Text>
              <Text style={styles.infoItemText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* Source note */}
        <View style={styles.sourceBox}>
          <Thermometer size={14} color={colors.textTertiary} />
          <Text style={styles.sourceText}>{t("ctc.info")}</Text>
        </View>
      </ScrollView>
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
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  toggleRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  toggleBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  toggleBtnText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
  },
  toggleBtnTextActive: {
    color: colors.textInverse,
  },
  inputRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  inputGroup: {
    flex: 1,
    gap: spacing.xs,
  },
  label: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.background,
  },
  input: {
    flex: 1,
    fontSize: typography.sizes.base,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  inputBordered: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.background,
    paddingVertical: spacing.sm,
  },
  inputUnit: {
    fontSize: typography.sizes.sm,
    color: colors.textTertiary,
    marginLeft: spacing.xs,
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "#fef3c7",
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "#fcd34d",
  },
  warningText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: "#92400e",
    fontWeight: typography.weights.medium,
  },
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  altRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  altRowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  altRowIndex: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textTertiary,
    textTransform: "uppercase",
  },
  altInputRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  aboveMsaBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#e0f2fe",
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#7dd3fc",
  },
  aboveMsaText: {
    fontSize: typography.sizes.xs,
    color: "#0369a1",
    fontWeight: typography.weights.medium,
  },
  resultRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  resultCell: {
    flex: 1,
  },
  resultCellRight: {
    alignItems: "flex-end",
  },
  resultLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
    marginBottom: 2,
  },
  resultValue: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  resultHighlight: {
    color: colors.primary,
    fontSize: typography.sizes.lg,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    borderStyle: "dashed",
    marginTop: spacing.xs,
  },
  addBtnText: {
    fontSize: typography.sizes.base,
    color: colors.primary,
    fontWeight: typography.weights.medium,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  infoCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  infoCardTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  infoItem: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  infoBullet: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  infoItemText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  sourceBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  sourceText: {
    flex: 1,
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
    lineHeight: 18,
  },
});
