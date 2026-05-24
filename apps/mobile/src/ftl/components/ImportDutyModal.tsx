import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  X,
  Image as ImageIcon,
  FileText,
  CheckCircle,
  AlertCircle,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { colors, spacing, typography, borderRadius } from "../../theme";
import { ftlApi, ParsedDuty } from "../../api/ftl";
import { useFtlStore } from "../store/useFtlStore";
import {
  calcMaxFdp,
  timeToMinutes,
  minutesToDuration,
} from "../services/FtlCalculator";

const TURNAROUND_MIN_MINUTES = 25;

interface LegalityCheck {
  fdpLegal: boolean;
  actualFdp: number; // minutes
  maxFdp: number; // minutes
  shortTurnarounds: {
    from: string;
    to: string;
    mins: number;
  }[];
  hasFlights: boolean;
}

function diffMinutes(start: string, end: string): number {
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  return (e - s + 1440) % 1440;
}

function checkLegality(duty: ParsedDuty): LegalityCheck | null {
  if (!duty.reportTime || !duty.finishTime || duty.sectors == null) return null;

  const actualFdp = diffMinutes(duty.reportTime, duty.finishTime);
  const standby =
    duty.standbyType !== "none" && duty.standbyStartTime
      ? {
          type: duty.standbyType,
          startTime: duty.standbyStartTime,
          callTime: "",
          splitDuty: false,
        }
      : undefined;
  let maxFdp = 0;
  try {
    const res = calcMaxFdp(
      timeToMinutes(duty.reportTime),
      duty.sectors,
      standby,
    );
    maxFdp = res.maxFdp;
  } catch {
    return null;
  }

  const shortTurnarounds: LegalityCheck["shortTurnarounds"] = [];
  for (let i = 0; i < duty.flights.length - 1; i++) {
    const cur = duty.flights[i];
    const nxt = duty.flights[i + 1];
    if (!cur.arrTime || !nxt.depTime) continue;
    const mins = diffMinutes(cur.arrTime, nxt.depTime);
    if (mins < TURNAROUND_MIN_MINUTES) {
      shortTurnarounds.push({
        from: cur.flightNumber ?? cur.arrAirport ?? "?",
        to: nxt.flightNumber ?? nxt.depAirport ?? "?",
        mins,
      });
    }
  }

  return {
    fdpLegal: actualFdp <= maxFdp,
    actualFdp,
    maxFdp,
    shortTurnarounds,
    hasFlights: duty.flights.length > 0,
  };
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

type InputTab = "image" | "text";

export const ImportDutyModal: React.FC<Props> = ({ visible, onClose }) => {
  const { t } = useTranslation();
  const { set } = useFtlStore();

  const [activeTab, setActiveTab] = useState<InputTab>("image");
  const [pastedText, setPastedText] = useState("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ParsedDuty | null>(null);

  const reset = () => {
    setPastedText("");
    setImageBase64(null);
    setError(null);
    setPreview(null);
    setLoading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const pickImage = async () => {
    setError(null);
    setPreview(null);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      setError("Photo library permission denied");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      base64: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      setImageBase64(result.assets[0].base64);
    }
  };

  const analyze = async () => {
    setError(null);
    setPreview(null);
    setLoading(true);
    try {
      const body =
        activeTab === "image" && imageBase64
          ? { image: imageBase64 }
          : { text: pastedText };
      const duty = await ftlApi.parseDuty(body);
      setPreview(duty);
    } catch {
      setError(t("ftl.importError"));
    } finally {
      setLoading(false);
    }
  };

  const apply = () => {
    if (!preview) return;
    set({
      ...(preview.reportTime
        ? { reportTime: preview.reportTime, dutyStart: preview.reportTime }
        : {}),
      ...(preview.sectors != null ? { sectors: preview.sectors } : {}),
      ...(preview.finishTime ? { finishTime: preview.finishTime } : {}),
      isHomeBase: preview.homeBase,
      standby: {
        type: preview.standbyType ?? "none",
        startTime: preview.standbyStartTime ?? "",
        callTime: "",
        splitDuty: false,
      },
    });
    handleClose();
  };

  const canAnalyze =
    (activeTab === "image" && !!imageBase64) ||
    (activeTab === "text" && pastedText.trim().length > 10);

  const standbyLabel = () => {
    if (!preview) return "";
    if (preview.standbyType === "home")
      return `${t("ftl.importStandbyHome")}${preview.standbyStartTime ? ` (${preview.standbyStartTime})` : ""}`;
    if (preview.standbyType === "airport")
      return `${t("ftl.importStandbyAirport")}${preview.standbyStartTime ? ` (${preview.standbyStartTime})` : ""}`;
    return t("ftl.importStandbyNone");
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{t("ftl.importDuty")}</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <X size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            {/* Tab selector */}
            <View style={styles.tabRow}>
              <TouchableOpacity
                style={[styles.tab, activeTab === "image" && styles.tabActive]}
                onPress={() => {
                  setActiveTab("image");
                  setError(null);
                  setPreview(null);
                }}
              >
                <ImageIcon
                  size={16}
                  color={
                    activeTab === "image"
                      ? colors.textInverse
                      : colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "image" && styles.tabTextActive,
                  ]}
                >
                  {t("ftl.importScreenshot")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === "text" && styles.tabActive]}
                onPress={() => {
                  setActiveTab("text");
                  setError(null);
                  setPreview(null);
                }}
              >
                <FileText
                  size={16}
                  color={
                    activeTab === "text"
                      ? colors.textInverse
                      : colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "text" && styles.tabTextActive,
                  ]}
                >
                  {t("ftl.importPasteText")}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Image tab */}
            {activeTab === "image" && (
              <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                <ImageIcon size={32} color={colors.primary} />
                <Text style={styles.imagePickerText}>
                  {imageBase64
                    ? t("ftl.importImageSelected")
                    : t("ftl.importScreenshot")}
                </Text>
                {imageBase64 && (
                  <CheckCircle size={18} color={colors.success} />
                )}
              </TouchableOpacity>
            )}

            {/* Text tab */}
            {activeTab === "text" && (
              <TextInput
                style={styles.textArea}
                multiline
                numberOfLines={8}
                placeholder={t("ftl.importTextPlaceholder")}
                placeholderTextColor={colors.textTertiary}
                value={pastedText}
                onChangeText={setPastedText}
                textAlignVertical="top"
              />
            )}

            {/* Analyze button */}
            <TouchableOpacity
              style={[
                styles.analyzeBtn,
                (!canAnalyze || loading) && styles.analyzeBtnDisabled,
              ]}
              onPress={analyze}
              disabled={!canAnalyze || loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.textInverse} size="small" />
              ) : (
                <Text style={styles.analyzeBtnText}>
                  {loading ? t("ftl.importLoading") : t("ftl.importAnalyze")}
                </Text>
              )}
            </TouchableOpacity>

            {loading && (
              <Text style={styles.loadingText}>{t("ftl.importLoading")}</Text>
            )}

            {/* Error */}
            {error && (
              <View style={styles.errorBox}>
                <AlertCircle size={16} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Preview */}
            {preview && (
              <View style={styles.previewCard}>
                <Text style={styles.previewTitle}>
                  {t("ftl.importPreview")}
                </Text>

                <PreviewRow
                  label={t("ftl.importReportTime")}
                  value={preview.reportTime ?? "—"}
                />
                <PreviewRow
                  label={t("ftl.importSectors")}
                  value={
                    preview.sectors != null ? String(preview.sectors) : "—"
                  }
                />
                <PreviewRow
                  label={t("ftl.importStandby")}
                  value={standbyLabel()}
                />
                <PreviewRow
                  label={t("ftl.importFinishTime")}
                  value={preview.finishTime ?? "—"}
                />
                <PreviewRow
                  label={t("ftl.importHomeBase")}
                  value={preview.homeBase ? t("common.yes") : t("common.no")}
                />

                {(() => {
                  const legality = checkLegality(preview);
                  if (!legality) return null;
                  const legal =
                    legality.fdpLegal && legality.shortTurnarounds.length === 0;
                  return (
                    <View
                      style={[
                        styles.legalityBox,
                        legal ? styles.legalityBoxOk : styles.legalityBoxBad,
                      ]}
                    >
                      <View style={styles.legalityHeader}>
                        {legal ? (
                          <CheckCircle size={20} color={colors.success} />
                        ) : (
                          <AlertCircle size={20} color={colors.error} />
                        )}
                        <Text
                          style={[
                            styles.legalityTitle,
                            {
                              color: legal ? colors.success : colors.error,
                            },
                          ]}
                        >
                          {legal
                            ? t("ftl.importLegal")
                            : t("ftl.importIllegal")}
                        </Text>
                      </View>
                      <Text style={styles.legalitySub}>
                        {t("ftl.importLegalityFdp", {
                          actual: minutesToDuration(legality.actualFdp),
                          max: minutesToDuration(legality.maxFdp),
                        })}
                      </Text>

                      <Text style={styles.turnaroundTitle}>
                        {t("ftl.importTurnaroundTitle")}
                      </Text>
                      {!legality.hasFlights ? (
                        <Text style={styles.turnaroundOk}>
                          {t("ftl.importNoFlights")}
                        </Text>
                      ) : legality.shortTurnarounds.length === 0 ? (
                        <Text style={styles.turnaroundOk}>
                          {t("ftl.importTurnaroundOk")}
                        </Text>
                      ) : (
                        legality.shortTurnarounds.map((sa, i) => (
                          <Text key={i} style={styles.turnaroundBad}>
                            •{" "}
                            {t("ftl.importTurnaroundShort", {
                              from: sa.from,
                              to: sa.to,
                              mins: sa.mins,
                            })}
                          </Text>
                        ))
                      )}
                    </View>
                  );
                })()}

                <TouchableOpacity style={styles.applyBtn} onPress={apply}>
                  <CheckCircle size={18} color={colors.textInverse} />
                  <Text style={styles.applyBtnText}>
                    {t("ftl.importApply")}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const PreviewRow: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <View style={styles.previewRow}>
    <Text style={styles.previewLabel}>{label}</Text>
    <Text style={styles.previewValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    flex: 1,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  closeBtn: { padding: spacing.xs },
  scroll: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  tabRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
  },
  tabTextActive: { color: colors.textInverse },
  imagePicker: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: "dashed",
    padding: spacing.lg,
    marginBottom: spacing.md,
    justifyContent: "center",
  },
  imagePickerText: {
    fontSize: typography.sizes.md,
    color: colors.primary,
    fontWeight: typography.weights.medium,
  },
  textArea: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    fontSize: typography.sizes.sm,
    color: colors.text,
    minHeight: 140,
    marginBottom: spacing.md,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  analyzeBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
    minHeight: 48,
  },
  analyzeBtnDisabled: { opacity: 0.4 },
  analyzeBtnText: {
    color: colors.textInverse,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.md,
  },
  loadingText: {
    textAlign: "center",
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs,
    backgroundColor: "#FFF0F0",
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.error,
  },
  previewCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  previewTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  previewLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  previewValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  legalityBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  legalityBoxOk: {
    backgroundColor: "#E8F5E9",
    borderColor: colors.success,
  },
  legalityBoxBad: {
    backgroundColor: "#FFF0F0",
    borderColor: colors.error,
  },
  legalityHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  legalityTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  legalitySub: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  turnaroundTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  turnaroundOk: {
    fontSize: typography.sizes.sm,
    color: colors.success,
  },
  turnaroundBad: {
    fontSize: typography.sizes.sm,
    color: colors.error,
    marginBottom: 2,
  },
  applyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.success,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
  applyBtnText: {
    color: colors.textInverse,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.md,
  },
});
