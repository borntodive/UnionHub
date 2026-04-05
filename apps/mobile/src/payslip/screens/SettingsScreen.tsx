import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Menu, AlertTriangle, X } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";

import { colors, spacing, typography, borderRadius } from "../../theme";
import { useAuthStore } from "../../store/authStore";
import { usePayslipStore } from "../store/usePayslipStore";
import { User, UserRole } from "../../types";
import { PayslipSettings } from "../types";
import { usePayslipSettingsSync } from "../hooks/usePayslipSettingsSync";
import { usersApi } from "../../api/users";
import { payslipSettingsApi } from "../../api/payslipSettings";

// ── Shared sub-components (inline) ──────────────────────────────────────────

const PILOT_RANKS = [
  "cpt",
  "fo",
  "sfi",
  "tri",
  "tre",
  "ltc",
  "lcc",
  "jfo",
  "so",
];
const CC_RANKS = ["sepe", "sepi", "pu", "jpu", "ju"];

interface CheckboxRowProps {
  label: string;
  value: boolean;
  onToggle: () => void;
}

const CheckboxRow: React.FC<CheckboxRowProps> = ({
  label,
  value,
  onToggle,
}) => (
  <TouchableOpacity style={styles.checkboxRow} onPress={onToggle}>
    <View style={[styles.checkbox, value && styles.checkboxActive]}>
      {value && <Text style={styles.checkboxCheck}>✓</Text>}
    </View>
    <Text style={styles.checkboxLabel}>{label}</Text>
  </TouchableOpacity>
);

// ── Main Screen ──────────────────────────────────────────────────────────────

export const SettingsScreen: React.FC = () => {
  usePayslipSettingsSync();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const {
    overrideActive,
    overrideSettings,
    overrideRsa,
    overrideItud,
    setOverrideActive,
    setOverrideSettings,
    setOverrideRsa,
    setOverrideItud,
  } = usePayslipStore();

  const isAdmin =
    user?.role === UserRole.ADMIN || user?.role === UserRole.SUPERADMIN;
  const isSuperAdmin = user?.role === UserRole.SUPERADMIN;

  const handleMenuPress = () => {
    // @ts-ignore
    navigation.openDrawer?.();
  };

  const isPilot = overrideSettings.role === "pil";
  const availableRanks = isPilot ? PILOT_RANKS : CC_RANKS;

  const set = (patch: Partial<PayslipSettings>) => setOverrideSettings(patch);

  // Local string states to allow decimal input without losing "." mid-typing
  const [comunaliText, setComunaliText] = useState(
    overrideSettings.addComunali.toString(),
  );
  const [accontoText, setAccontoText] = useState(
    overrideSettings.accontoAddComunali.toString(),
  );
  const [regionaliText, setRegionaliText] = useState(
    overrideSettings.addRegionali.toString(),
  );

  // Legacy local states
  const olc = overrideSettings.legacyCustom ?? { ffp: 0, sbh: 0, al: 0 };
  const [legacyFfpText, setLegacyFfpText] = useState(
    olc.ffp > 0 ? olc.ffp.toFixed(2) : "",
  );
  const [legacySbhText, setLegacySbhText] = useState(
    olc.sbh > 0 ? olc.sbh.toFixed(4) : "",
  );
  const [legacyAlText, setLegacyAlText] = useState(
    olc.al > 0 ? olc.al.toFixed(2) : "",
  );

  // Member search states
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedMember, setSelectedMember] = useState<User | null>(null);

  // Search members function
  const searchMembers = async (query: string) => {
    setIsSearching(true);
    try {
      const res = await usersApi.getUsersPaginated(1, 10, { search: query });
      setSearchResults(res.data || []);
    } catch (error) {
      console.error("Failed to search members:", error);
    } finally {
      setIsSearching(false);
    }
  };

  // Load member settings into override
  const loadMemberSettings = async (member: User) => {
    try {
      const settings = await payslipSettingsApi.getByUserId(member.id);
      if (settings) {
        // Apply member's settings to override
        setOverrideSettings({
          ...overrideSettings,
          role: settings.role,
          rank: settings.rank,
          base: settings.base,
          parttime: settings.parttime,
          parttimePercentage: settings.parttimePercentage,
          coniugeCarico: settings.coniugeCarico,
          cu: settings.cu,
          triAndLtc: settings.triAndLtc,
          btc: settings.btc,
          voluntaryPensionContribution: settings.voluntaryPensionContribution,
          addComunali: settings.addComunali,
          accontoAddComunali: settings.accontoAddComunali,
          addRegionali: settings.addRegionali,
          legacy: settings.legacy,
          legacyCustom: settings.legacyCustom,
        });
        // Note: RSA and ITUD are not stored in PayslipSettings
        // They come from user profile, so we keep current override values
        // Update local text states
        setComunaliText(settings.addComunali?.toString() || "0");
        setAccontoText(settings.accontoAddComunali?.toString() || "0");
        setRegionaliText(settings.addRegionali?.toString() || "0");
        if (settings.legacyCustom) {
          setLegacyFfpText(
            settings.legacyCustom.ffp > 0
              ? settings.legacyCustom.ffp.toFixed(2)
              : "",
          );
          setLegacySbhText(
            settings.legacyCustom.sbh > 0
              ? settings.legacyCustom.sbh.toFixed(4)
              : "",
          );
          setLegacyAlText(
            settings.legacyCustom.al > 0
              ? settings.legacyCustom.al.toFixed(2)
              : "",
          );
        }
        setSelectedMember(member);
        setSearchResults([]);
        setMemberSearchQuery("");
      } else {
        Alert.alert("Info", "L'iscritto non ha impostazioni salvate");
      }
    } catch (error) {
      Alert.alert(
        "Errore",
        "Impossibile caricare le impostazioni dell'iscritto",
      );
    }
  };

  const handleReset = () => {
    Alert.alert(
      t("settings.payslipOverrideReset"),
      "Reset all override settings to defaults?",
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            setOverrideSettings({
              role: "pil",
              rank: "fo",
              parttime: false,
              parttimePercentage: 1,
              coniugeCarico: false,
              cu: false,
              triAndLtc: false,
              btc: false,
              voluntaryPensionContribution: 0,
              addComunali: 0,
              accontoAddComunali: 0,
              addRegionali: 0,
              legacy: false,
              legacyCustom: { ffp: 0, sbh: 0, al: 0 },
            });
            setLegacyFfpText("");
            setLegacySbhText("");
            setLegacyAlText("");
            setOverrideRsa(false);
            setOverrideItud(false);
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleMenuPress} style={styles.menuButton}>
            <Menu size={24} color={colors.textInverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {t("settings.payslipOverrideSection")}
          </Text>
          <View style={styles.placeholder} />
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Override toggle card */}
          <View style={styles.overrideCard}>
            <View style={styles.overrideHeaderRow}>
              <AlertTriangle size={20} color={colors.warning} />
              <Text style={styles.overrideTitle}>
                {t("settings.payslipOverrideSection")}
              </Text>
              <Switch
                value={overrideActive}
                onValueChange={setOverrideActive}
                trackColor={{
                  false: colors.border,
                  true: colors.warning + "80",
                }}
                thumbColor={
                  overrideActive ? colors.warning : colors.textSecondary
                }
              />
            </View>
            <Text style={styles.overrideDescription}>
              {t("settings.payslipOverrideDescription")}
            </Text>

            {overrideActive && (
              <View style={styles.overrideBanner}>
                <AlertTriangle size={14} color={colors.warning} />
                <Text style={styles.overrideBannerText}>
                  {t("settings.payslipOverrideActive")}
                </Text>
              </View>
            )}
          </View>

          {/* Override settings — shown only when active */}
          {overrideActive && (
            <>
              {/* Load from Member Section */}
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>
                  Carica impostazioni da iscritto
                </Text>

                {/* Search Input */}
                <View style={styles.inputRow}>
                  <TextInput
                    style={[styles.numInput, { flex: 1 }]}
                    value={memberSearchQuery}
                    onChangeText={(text) => {
                      setMemberSearchQuery(text);
                      if (text.length >= 2) {
                        searchMembers(text);
                      } else if (text.length === 0) {
                        setSearchResults([]);
                      }
                    }}
                    placeholder="Cerca per crewcode o nome..."
                    placeholderTextColor={colors.textSecondary}
                  />
                  {isSearching && (
                    <ActivityIndicator size="small" color={colors.primary} />
                  )}
                </View>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <View style={styles.searchResults}>
                    {searchResults.map((member) => (
                      <TouchableOpacity
                        key={member.id}
                        style={styles.searchResultItem}
                        onPress={() => loadMemberSettings(member)}
                      >
                        <Text style={styles.searchResultText}>
                          {member.crewcode} - {member.nome} {member.cognome}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Selected Member */}
                {selectedMember && (
                  <View style={styles.selectedMemberBanner}>
                    <Text style={styles.selectedMemberText}>
                      Impostazioni caricate da: {selectedMember.crewcode}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedMember(null);
                        setMemberSearchQuery("");
                      }}
                    >
                      <Text style={styles.clearSelection}>✕</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Profile */}
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>
                  {t("settings.payslipProfile")}
                </Text>

                {isSuperAdmin && (
                  <View style={styles.selectorContainer}>
                    <Text style={styles.fieldLabel}>{t("members.role")}</Text>
                    <View style={styles.buttonGroup}>
                      <TouchableOpacity
                        style={[
                          styles.toggleBtn,
                          overrideSettings.role === "pil" &&
                            styles.toggleBtnActive,
                        ]}
                        onPress={() => set({ role: "pil", rank: "fo" })}
                      >
                        <Text
                          style={[
                            styles.toggleBtnText,
                            overrideSettings.role === "pil" &&
                              styles.toggleBtnTextActive,
                          ]}
                        >
                          {t("settings.payslipPilot")}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.toggleBtn,
                          overrideSettings.role === "cc" &&
                            styles.toggleBtnActive,
                        ]}
                        onPress={() => set({ role: "cc", rank: "sepe" })}
                      >
                        <Text
                          style={[
                            styles.toggleBtnText,
                            overrideSettings.role === "cc" &&
                              styles.toggleBtnTextActive,
                          ]}
                        >
                          {t("settings.payslipCabinCrew")}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                <View style={styles.selectorContainer}>
                  <Text style={styles.fieldLabel}>
                    {t("settings.payslipRank")}
                  </Text>
                  <View style={styles.rankContainer}>
                    {availableRanks.map((rank) => (
                      <TouchableOpacity
                        key={rank}
                        style={[
                          styles.rankBtn,
                          overrideSettings.rank === rank &&
                            styles.rankBtnActive,
                        ]}
                        onPress={() => set({ rank })}
                      >
                        <Text
                          style={[
                            styles.rankBtnText,
                            overrideSettings.rank === rank &&
                              styles.rankBtnTextActive,
                          ]}
                        >
                          {rank.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {overrideSettings.rank === "cpt" && (
                  <CheckboxRow
                    label={t("settings.payslipNewCaptain")}
                    value={overrideSettings.cu}
                    onToggle={() => set({ cu: !overrideSettings.cu })}
                  />
                )}
                {overrideSettings.rank === "tri" && (
                  <CheckboxRow
                    label={t("settings.payslipTriLtc")}
                    value={overrideSettings.triAndLtc}
                    onToggle={() =>
                      set({ triAndLtc: !overrideSettings.triAndLtc })
                    }
                  />
                )}
                {["sfi", "tri", "tre"].includes(overrideSettings.rank) && (
                  <CheckboxRow
                    label={t("settings.payslipBtc")}
                    value={overrideSettings.btc}
                    onToggle={() => set({ btc: !overrideSettings.btc })}
                  />
                )}
                <CheckboxRow
                  label={t("settings.payslipDependentSpouse")}
                  value={overrideSettings.coniugeCarico}
                  onToggle={() =>
                    set({ coniugeCarico: !overrideSettings.coniugeCarico })
                  }
                />
                <CheckboxRow
                  label="RSA"
                  value={overrideRsa}
                  onToggle={() => setOverrideRsa(!overrideRsa)}
                />
                <CheckboxRow
                  label="ITUD"
                  value={overrideItud}
                  onToggle={() => setOverrideItud(!overrideItud)}
                />
              </View>

              {/* Pension Fund */}
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>
                  {t("settings.payslipPension")}
                </Text>
                <Text style={styles.fieldLabel}>
                  {t("settings.payslipVoluntaryContribution")}
                </Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.numInput}
                    value={overrideSettings.voluntaryPensionContribution.toString()}
                    onChangeText={(v) => {
                      const n = parseFloat(v);
                      if (!isNaN(n) && n >= 0 && n <= 100)
                        set({ voluntaryPensionContribution: n });
                    }}
                    keyboardType="numeric"
                    maxLength={5}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                  />
                  <Text style={styles.inputSuffix}>%</Text>
                </View>
                <Text style={styles.hint}>
                  {t("settings.payslipPensionHint")}
                </Text>
              </View>

              {/* Part-Time */}
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>
                  {t("settings.payslipPartTime")}
                </Text>
                <CheckboxRow
                  label={t("settings.payslipPartTimeContract")}
                  value={overrideSettings.parttime}
                  onToggle={() => set({ parttime: !overrideSettings.parttime })}
                />
                {overrideSettings.parttime && (
                  <View style={styles.selectorContainer}>
                    <Text style={styles.fieldLabel}>
                      {t("settings.payslipPercentage")}
                    </Text>
                    <View style={styles.buttonGroup}>
                      {[0.5, 0.66, 0.75].map((pct) => (
                        <TouchableOpacity
                          key={pct}
                          style={[
                            styles.toggleBtn,
                            overrideSettings.parttimePercentage === pct &&
                              styles.toggleBtnActive,
                          ]}
                          onPress={() => set({ parttimePercentage: pct })}
                        >
                          <Text
                            style={[
                              styles.toggleBtnText,
                              overrideSettings.parttimePercentage === pct &&
                                styles.toggleBtnTextActive,
                            ]}
                          >
                            {Math.round(pct * 100)}%
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              {/* Local Taxes */}
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>
                  {t("settings.payslipLocalTaxes")}
                </Text>

                <Text style={styles.fieldLabel}>
                  {t("settings.payslipMunicipalSurcharge")}
                </Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.numInput}
                    value={comunaliText}
                    onChangeText={(v) => {
                      const normalized = v.replace(",", ".");
                      setComunaliText(normalized);
                      const n = parseFloat(normalized);
                      if (!isNaN(n) && n >= 0) set({ addComunali: n });
                    }}
                    keyboardType="decimal-pad"
                    maxLength={10}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                  />
                  <Text style={styles.inputSuffix}>€</Text>
                </View>

                <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>
                  {t("settings.payslipMunicipalSurchargeAdvance")}
                </Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.numInput}
                    value={accontoText}
                    onChangeText={(v) => {
                      const normalized = v.replace(",", ".");
                      setAccontoText(normalized);
                      const n = parseFloat(normalized);
                      if (!isNaN(n) && n >= 0) set({ accontoAddComunali: n });
                    }}
                    keyboardType="decimal-pad"
                    maxLength={10}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                  />
                  <Text style={styles.inputSuffix}>€</Text>
                </View>

                <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>
                  {t("settings.payslipRegionalSurcharge")}
                </Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.numInput}
                    value={regionaliText}
                    onChangeText={(v) => {
                      const normalized = v.replace(",", ".");
                      setRegionaliText(normalized);
                      const n = parseFloat(normalized);
                      if (!isNaN(n) && n >= 0) set({ addRegionali: n });
                    }}
                    keyboardType="decimal-pad"
                    maxLength={10}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                  />
                  <Text style={styles.inputSuffix}>€</Text>
                </View>
              </View>

              {/* Legacy Contract */}
              <View style={styles.card}>
                <CheckboxRow
                  label={t("payslip.legacyContract")}
                  value={overrideSettings.legacy}
                  onToggle={() => set({ legacy: !overrideSettings.legacy })}
                />
                {overrideSettings.legacy && (
                  <>
                    <Text style={[styles.hint, { marginBottom: spacing.md }]}>
                      {t("payslip.legacyDirectHint")}
                    </Text>

                    <Text style={styles.fieldLabel}>
                      {t("payslip.legacyFfp")}
                    </Text>
                    <View
                      style={[styles.inputRow, { marginBottom: spacing.md }]}
                    >
                      <TextInput
                        style={styles.numInput}
                        value={legacyFfpText}
                        onChangeText={(v) => {
                          const norm = v.replace(",", ".");
                          setLegacyFfpText(norm);
                          set({
                            legacyCustom: {
                              ...olc,
                              ffp: parseFloat(norm) || 0,
                            },
                          });
                        }}
                        keyboardType="decimal-pad"
                        maxLength={10}
                        placeholder="0.00"
                        placeholderTextColor={colors.textSecondary}
                      />
                      <Text style={styles.inputSuffix}>€</Text>
                    </View>

                    <Text style={styles.fieldLabel}>
                      {t("payslip.legacySbh")}
                    </Text>
                    <View
                      style={[styles.inputRow, { marginBottom: spacing.md }]}
                    >
                      <TextInput
                        style={styles.numInput}
                        value={legacySbhText}
                        onChangeText={(v) => {
                          const norm = v.replace(",", ".");
                          setLegacySbhText(norm);
                          set({
                            legacyCustom: {
                              ...olc,
                              sbh: parseFloat(norm) || 0,
                            },
                          });
                        }}
                        keyboardType="decimal-pad"
                        maxLength={10}
                        placeholder="0.0000"
                        placeholderTextColor={colors.textSecondary}
                      />
                      <Text style={styles.inputSuffix}>€</Text>
                    </View>

                    <Text style={styles.fieldLabel}>
                      {t("payslip.legacyAl")}
                    </Text>
                    <View style={styles.inputRow}>
                      <TextInput
                        style={styles.numInput}
                        value={legacyAlText}
                        onChangeText={(v) => {
                          const norm = v.replace(",", ".");
                          setLegacyAlText(norm);
                          set({
                            legacyCustom: {
                              ...olc,
                              al: parseFloat(norm) || 0,
                            },
                          });
                        }}
                        keyboardType="decimal-pad"
                        maxLength={10}
                        placeholder="0.00"
                        placeholderTextColor={colors.textSecondary}
                      />
                      <Text style={styles.inputSuffix}>€</Text>
                    </View>
                  </>
                )}
              </View>

              {/* Reset button */}
              <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
                <X size={16} color={colors.error} />
                <Text style={styles.resetBtnText}>
                  {t("settings.payslipOverrideReset")}
                </Text>
              </TouchableOpacity>
            </>
          )}

          <View style={styles.bottomSpace} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safeArea: { backgroundColor: colors.primary },
  header: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  menuButton: { padding: 8 },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.textInverse,
  },
  placeholder: { width: 40 },
  content: { flex: 1 },
  scrollContent: { padding: spacing.md },
  bottomSpace: { height: spacing.xl },
  // ── Override toggle ──────────────────────────────
  overrideCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.warning,
  },
  overrideHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  overrideTitle: {
    flex: 1,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.warning,
  },
  overrideDescription: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  overrideBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.warning + "20",
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.sm,
  },
  overrideBannerText: {
    fontSize: typography.sizes.xs,
    color: colors.warning,
    fontWeight: typography.weights.semibold,
    flex: 1,
  },
  // ── Cards ────────────────────────────────────────
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  selectorContainer: { marginBottom: spacing.md },
  buttonGroup: { flexDirection: "row", gap: spacing.sm },
  toggleBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
  },
  toggleBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  toggleBtnText: {
    fontSize: typography.sizes.base,
    color: colors.text,
    fontWeight: typography.weights.medium,
  },
  toggleBtnTextActive: { color: colors.textInverse },
  rankContainer: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  rankBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minWidth: 70,
    alignItems: "center",
  },
  rankBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  rankBtnText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    fontWeight: typography.weights.medium,
  },
  rankBtnTextActive: { color: colors.textInverse },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.sm,
  },
  checkboxActive: { backgroundColor: colors.primary },
  checkboxCheck: {
    color: colors.textInverse,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  checkboxLabel: { fontSize: typography.sizes.base, color: colors.text },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: colors.error + "10",
    marginBottom: spacing.md,
  },
  resetBtnText: {
    fontSize: typography.sizes.sm,
    color: colors.error,
    fontWeight: typography.weights.medium,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  numInput: {
    flex: 1,
    fontSize: typography.sizes.base,
    color: colors.text,
    paddingVertical: spacing.md,
  },
  inputSuffix: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  hint: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontStyle: "italic",
    marginTop: spacing.xs,
  },
  // Member search styles
  searchResults: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
    maxHeight: 200,
  },
  searchResultItem: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchResultText: {
    fontSize: typography.sizes.base,
    color: colors.text,
  },
  selectedMemberBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.primary + "20",
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  selectedMemberText: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    fontWeight: "600",
  },
  clearSelection: {
    fontSize: typography.sizes.base,
    color: colors.error,
    padding: spacing.xs,
  },
});
