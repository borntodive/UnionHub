import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Fingerprint,
  Trash2,
  Globe,
  ChevronRight,
  Info,
  Bug,
  Mail,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { Switch } from "react-native";
import { colors, spacing, typography, borderRadius } from "../../theme";
import { useAuthStore } from "../../store/authStore";
import { UserRole } from "../../types";
import apiClient from "../../api/client";
import { usersApi } from "../../api/users";
import { setLanguage, getLanguage } from "../../i18n";
import { usePayslipStore } from "../../payslip/store/usePayslipStore";
import { useOfflineStore } from "../../store/offlineStore";
import { PayslipSettings, LegacyCustom } from "../../payslip/types";
import {
  getContractData,
  getActiveCorrections,
  applyCorrections,
} from "../../payslip/data/contractData";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "it", label: "Italiano" },
];

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

// Renders a full payslip settings form for a given settings object + setter
interface PayslipFormProps {
  s: PayslipSettings;
  set: (patch: Partial<PayslipSettings>) => void;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  /** When true, role and rank are always editable (override mode) */
  forceEditable?: boolean;
}

const PayslipForm: React.FC<PayslipFormProps> = ({
  s,
  set,
  isAdmin,
  isSuperAdmin,
  forceEditable = false,
}) => {
  const { t } = useTranslation();
  const isPilot = s.role === "pil";
  const availableRanks = isPilot ? PILOT_RANKS : CC_RANKS;
  const canEditRole = isSuperAdmin || forceEditable;
  const canEditRank = isAdmin || forceEditable;

  const [comunaliText, setComunaliText] = useState(s.addComunali.toString());
  const [accontoText, setAccontoText] = useState(
    s.accontoAddComunali.toString(),
  );
  const [regionaliText, setRegionaliText] = useState(s.addRegionali.toString());

  // Legacy state
  const lc = s.legacyCustom ?? { ffp: 0, sbh: 0, al: 0 };
  const [legacyFfpText, setLegacyFfpText] = useState(
    lc.ffp > 0 ? lc.ffp.toFixed(2) : "",
  );
  const [legacySbhText, setLegacySbhText] = useState(
    lc.sbh > 0 ? lc.sbh.toFixed(4) : "",
  );
  const [legacyAlText, setLegacyAlText] = useState(
    lc.al > 0 ? lc.al.toFixed(2) : "",
  );

  const getContractRef = () => {
    const base = getContractData(s.company, s.role, s.rank);
    if (!base) return null;
    const today = new Date().toISOString().split("T")[0];
    const corrections = getActiveCorrections(s.company, s.role, today);
    return applyCorrections(base, corrections, s.rank);
  };

  const handleSaveLegacy = () => {
    const cd = getContractRef();
    if (!cd) return;
    const ffp = parseFloat(legacyFfpText) || 0;
    const sbh = parseFloat(legacySbhText.replace(",", ".")) || 0;
    const al = parseFloat(legacyAlText) || 0;
    const deltas: LegacyCustom = {
      ffp: ffp - cd.ffp,
      sbh: sbh - cd.sbh,
      al: al - cd.al,
    };
    set({ legacyCustom: { ffp, sbh, al }, legacyDeltas: deltas });
    Alert.alert(t("common.success"), t("payslip.legacySaved"));
  };

  const handlePensionChange = (value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0 && num <= 100) {
      set({ voluntaryPensionContribution: num });
    }
  };

  return (
    <>
      {/* Profile */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t("settings.payslipProfile")}</Text>

        {canEditRole ? (
          <View style={styles.selectorContainer}>
            <Text style={styles.fieldLabel}>{t("members.role")}</Text>
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  s.role === "pil" && styles.toggleBtnActive,
                ]}
                onPress={() => set({ role: "pil", rank: "fo" })}
              >
                <Text
                  style={[
                    styles.toggleBtnText,
                    s.role === "pil" && styles.toggleBtnTextActive,
                  ]}
                >
                  {t("settings.payslipPilot")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  s.role === "cc" && styles.toggleBtnActive,
                ]}
                onPress={() => set({ role: "cc", rank: "sepe" })}
              >
                <Text
                  style={[
                    styles.toggleBtnText,
                    s.role === "cc" && styles.toggleBtnTextActive,
                  ]}
                >
                  {t("settings.payslipCabinCrew")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t("members.role")}</Text>
            <Text style={styles.infoValue}>
              {isPilot
                ? t("settings.payslipPilot")
                : t("settings.payslipCabinCrew")}
            </Text>
          </View>
        )}

        {canEditRank ? (
          <View style={styles.selectorContainer}>
            <Text style={styles.fieldLabel}>{t("settings.payslipRank")}</Text>
            <View style={styles.rankContainer}>
              {availableRanks.map((rank) => (
                <TouchableOpacity
                  key={rank}
                  style={[
                    styles.rankBtn,
                    s.rank === rank && styles.rankBtnActive,
                  ]}
                  onPress={() => set({ rank })}
                >
                  <Text
                    style={[
                      styles.rankBtnText,
                      s.rank === rank && styles.rankBtnTextActive,
                    ]}
                  >
                    {rank.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t("settings.payslipRank")}</Text>
            <Text style={styles.infoValue}>{s.rank.toUpperCase()}</Text>
          </View>
        )}

        {s.rank === "cpt" && (
          <CheckboxRow
            label={t("settings.payslipNewCaptain")}
            value={s.cu}
            onToggle={() => set({ cu: !s.cu })}
          />
        )}
        {s.rank === "tri" && (
          <CheckboxRow
            label={t("settings.payslipTriLtc")}
            value={s.triAndLtc}
            onToggle={() => set({ triAndLtc: !s.triAndLtc })}
          />
        )}
        {["sfi", "tri", "tre"].includes(s.rank) && (
          <CheckboxRow
            label={t("settings.payslipBtc")}
            value={s.btc}
            onToggle={() => set({ btc: !s.btc })}
          />
        )}
        <CheckboxRow
          label={t("settings.payslipDependentSpouse")}
          value={s.coniugeCarico}
          onToggle={() => set({ coniugeCarico: !s.coniugeCarico })}
        />
      </View>

      {/* Pension Fund */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t("settings.payslipPension")}</Text>
        <Text style={styles.fieldLabel}>
          {t("settings.payslipVoluntaryContribution")}
        </Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.numInput}
            value={s.voluntaryPensionContribution.toString()}
            onChangeText={handlePensionChange}
            keyboardType="numeric"
            maxLength={5}
            placeholder="0"
            placeholderTextColor={colors.textSecondary}
          />
          <Text style={styles.inputSuffix}>%</Text>
        </View>
        <Text style={styles.hint}>{t("settings.payslipPensionHint")}</Text>
      </View>

      {/* Part-Time */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t("settings.payslipPartTime")}</Text>
        <CheckboxRow
          label={t("settings.payslipPartTimeContract")}
          value={s.parttime}
          onToggle={() => set({ parttime: !s.parttime })}
        />
        {s.parttime && (
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
                    s.parttimePercentage === pct && styles.toggleBtnActive,
                  ]}
                  onPress={() => set({ parttimePercentage: pct })}
                >
                  <Text
                    style={[
                      styles.toggleBtnText,
                      s.parttimePercentage === pct &&
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
          value={s.legacy}
          onToggle={() => set({ legacy: !s.legacy })}
        />
        {s.legacy && (
          <>
            <Text style={[styles.hint, { marginBottom: spacing.md }]}>
              {t("payslip.legacyDescription")}
            </Text>

            {/* FFP */}
            <Text style={styles.fieldLabel}>{t("payslip.legacyFfp")}</Text>
            {(() => {
              const cd = getContractRef();
              return cd ? (
                <Text style={styles.hint}>
                  {t("payslip.legacyContractRef", {
                    value: cd.ffp.toFixed(2) + " €",
                  })}
                </Text>
              ) : null;
            })()}
            <View style={[styles.inputRow, { marginTop: spacing.xs }]}>
              <TextInput
                style={styles.numInput}
                value={legacyFfpText}
                onChangeText={(v) => {
                  setLegacyFfpText(v.replace(",", "."));
                  set({
                    legacyCustom: {
                      ...lc,
                      ffp: parseFloat(v.replace(",", ".")) || 0,
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

            {/* SBH */}
            <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>
              {t("payslip.legacySbh")}
            </Text>
            {(() => {
              const cd = getContractRef();
              return cd ? (
                <Text style={styles.hint}>
                  {t("payslip.legacyContractRef", {
                    value: cd.sbh.toFixed(4) + " €",
                  })}
                </Text>
              ) : null;
            })()}
            <View style={[styles.inputRow, { marginTop: spacing.xs }]}>
              <TextInput
                style={styles.numInput}
                value={legacySbhText}
                onChangeText={(v) => {
                  setLegacySbhText(v.replace(",", "."));
                  set({
                    legacyCustom: {
                      ...lc,
                      sbh: parseFloat(v.replace(",", ".")) || 0,
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

            {/* AL */}
            <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>
              {t("payslip.legacyAl")}
            </Text>
            {(() => {
              const cd = getContractRef();
              return cd ? (
                <Text style={styles.hint}>
                  {t("payslip.legacyContractRef", {
                    value: cd.al.toFixed(2) + " €",
                  })}
                </Text>
              ) : null;
            })()}
            <View style={[styles.inputRow, { marginTop: spacing.xs }]}>
              <TextInput
                style={styles.numInput}
                value={legacyAlText}
                onChangeText={(v) => {
                  setLegacyAlText(v.replace(",", "."));
                  set({
                    legacyCustom: {
                      ...lc,
                      al: parseFloat(v.replace(",", ".")) || 0,
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

            <TouchableOpacity
              style={styles.legacySaveBtn}
              onPress={handleSaveLegacy}
            >
              <Text style={styles.legacySaveBtnText}>
                {t("payslip.legacySave")}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </>
  );
};

// Small reusable checkbox row
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

// ─── Main Screen ────────────────────────────────────────────────────────────

export const SettingsScreen: React.FC = () => {
  const { t } = useTranslation();
  const { biometricEnabled, disableBiometric, user } = useAuthStore();
  const { settings, setSettings } = usePayslipStore();
  const { notificationPrefs, setNotificationPrefs } = useOfflineStore();
  const isAdmin =
    user?.role === UserRole.ADMIN || user?.role === UserRole.SUPERADMIN;
  const isSuperAdmin = user?.role === UserRole.SUPERADMIN;

  const [activeTab, setActiveTab] = useState<"general" | "payslip" | "debug">(
    "general",
  );
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<string | null>(null);
  const [testFormEmailLoading, setTestFormEmailLoading] = useState(false);
  const [testFormEmailResult, setTestFormEmailResult] = useState<string | null>(
    null,
  );
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const currentLanguage = getLanguage();

  const handleDisableBiometric = () => {
    Alert.alert(
      t("settings.disableBiometricConfirm"),
      t("settings.disableBiometricConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => {
            disableBiometric();
            Alert.alert(
              t("common.success"),
              t("settings.biometricAuth") + " " + t("settings.disabled"),
            );
          },
        },
      ],
    );
  };

  const handleLanguageChange = async (langCode: "it" | "en") => {
    // Always save locally first
    await setLanguage(langCode);

    // If authenticated, sync with backend
    if (user) {
      const { isOnline, setPendingLanguageChange } = useOfflineStore.getState();

      if (isOnline) {
        // Online: save directly to backend
        try {
          await usersApi.updateMe({ language: langCode });
        } catch {
          // If fails, queue for later
          setPendingLanguageChange({
            language: langCode,
            timestamp: new Date().toISOString(),
          });
        }
      } else {
        // Offline: queue for later
        setPendingLanguageChange({
          language: langCode,
          timestamp: new Date().toISOString(),
        });
      }
    }

    setShowLanguageModal(false);
  };

  const getCurrentLanguageLabel = () =>
    LANGUAGES.find((l) => l.code === currentLanguage)?.label || "English";

  const renderGeneralTab = () => (
    <>
      {/* Language */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("settings.language")}</Text>
        <TouchableOpacity
          style={styles.card}
          onPress={() => setShowLanguageModal(true)}
          activeOpacity={0.8}
        >
          <View style={styles.row}>
            <View style={styles.iconContainer}>
              <Globe size={24} color={colors.primary} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.label}>{t("settings.selectLanguage")}</Text>
              <Text style={styles.value}>{getCurrentLanguageLabel()}</Text>
            </View>
            <ChevronRight size={20} color={colors.textSecondary} />
          </View>
        </TouchableOpacity>
        {showLanguageModal && (
          <View style={styles.languageModal}>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageOption,
                  currentLanguage === lang.code && styles.languageOptionActive,
                ]}
                onPress={() => handleLanguageChange(lang.code)}
              >
                <Text
                  style={[
                    styles.languageOptionText,
                    currentLanguage === lang.code &&
                      styles.languageOptionTextActive,
                  ]}
                >
                  {lang.label}
                </Text>
                {currentLanguage === lang.code && (
                  <View style={styles.checkmark}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("settings.notifications")}</Text>
        <View style={styles.card}>
          <View style={styles.notifRow}>
            <View style={styles.notifTextContainer}>
              <Text style={styles.label}>
                {t("settings.notificationsIssueStatus")}
              </Text>
              <Text style={styles.value}>
                {t("settings.notificationsIssueStatusDesc")}
              </Text>
            </View>
            <Switch
              value={notificationPrefs.issueStatusUpdate}
              onValueChange={(v) =>
                setNotificationPrefs({ issueStatusUpdate: v })
              }
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.notifRow}>
            <View style={styles.notifTextContainer}>
              <Text style={styles.label}>
                {t("settings.notificationsNewDocument")}
              </Text>
              <Text style={styles.value}>
                {t("settings.notificationsNewDocumentDesc")}
              </Text>
            </View>
            <Switch
              value={notificationPrefs.newDocument}
              onValueChange={(v) => setNotificationPrefs({ newDocument: v })}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>
          {isAdmin && (
            <>
              <View style={styles.divider} />
              <View style={styles.notifRow}>
                <View style={styles.notifTextContainer}>
                  <Text style={styles.label}>
                    {t("settings.notificationsNewIssue")}
                  </Text>
                  <Text style={styles.value}>
                    {t("settings.notificationsNewIssueDesc")}
                  </Text>
                </View>
                <Switch
                  value={notificationPrefs.newIssue}
                  onValueChange={(v) => setNotificationPrefs({ newIssue: v })}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.surface}
                />
              </View>
            </>
          )}
        </View>
      </View>

      {/* Security */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("settings.security")}</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.iconContainer}>
              <Fingerprint size={24} color={colors.primary} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.label}>{t("settings.biometricAuth")}</Text>
              <Text style={styles.value}>
                {biometricEnabled
                  ? t("auth.biometricEnabled")
                  : t("auth.biometricDisabled")}
              </Text>
            </View>
            {biometricEnabled && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleDisableBiometric}
              >
                <Trash2 size={20} color={colors.error} />
              </TouchableOpacity>
            )}
          </View>
          {biometricEnabled && (
            <TouchableOpacity
              style={styles.disableButton}
              onPress={handleDisableBiometric}
            >
              <Text style={styles.disableButtonText}>
                {t("settings.disableAndDelete")}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* App Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("settings.info")}</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t("settings.version")}</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t("settings.build")}</Text>
            <Text style={styles.infoValue}>2025.03.16</Text>
          </View>
        </View>
      </View>
    </>
  );

  const handleTestWelcomeEmail = async () => {
    setTestEmailLoading(true);
    setTestEmailResult(null);
    try {
      const res = await apiClient.post<{
        sent: boolean;
        to: string;
        crewcode: string;
      }>("/users/debug/test-welcome-email");
      setTestEmailResult(`✓ Inviata a ${res.data.crewcode} (${res.data.to})`);
    } catch (err: any) {
      setTestEmailResult(
        `✗ Errore: ${err?.response?.data?.message ?? err.message}`,
      );
    } finally {
      setTestEmailLoading(false);
    }
  };

  const handleTestFormEmail = async () => {
    setTestFormEmailLoading(true);
    setTestFormEmailResult(null);
    try {
      const res = await apiClient.post<{
        sent: boolean;
        to: string;
        crewcode: string;
      }>("/users/debug/test-registration-form-email");
      setTestFormEmailResult(
        `✓ Inviata a segreteria (utente: ${res.data.crewcode})`,
      );
    } catch (err: any) {
      setTestFormEmailResult(
        `✗ Errore: ${err?.response?.data?.message ?? err.message}`,
      );
    } finally {
      setTestFormEmailLoading(false);
    }
  };

  const renderDebugTab = () => (
    <View style={styles.section}>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.iconContainer}>
            <Mail size={24} color={colors.primary} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.label}>Test welcome email</Text>
            <Text style={styles.value}>
              Invia una mail di benvenuto ad un utente attivo casuale
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.debugBtn, testEmailLoading && styles.debugBtnDisabled]}
          onPress={handleTestWelcomeEmail}
          disabled={testEmailLoading}
        >
          {testEmailLoading ? (
            <ActivityIndicator size="small" color={colors.textInverse} />
          ) : (
            <Text style={styles.debugBtnText}>Invia test email</Text>
          )}
        </TouchableOpacity>
        {testEmailResult !== null && (
          <Text
            style={[
              styles.debugResult,
              testEmailResult.startsWith("✓")
                ? styles.debugResultOk
                : styles.debugResultErr,
            ]}
          >
            {testEmailResult}
          </Text>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.iconContainer}>
            <Mail size={24} color={colors.primary} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.label}>Test email segreteria</Text>
            <Text style={styles.value}>
              Invia un modulo di iscrizione (placeholder) alla segreteria
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[
            styles.debugBtn,
            testFormEmailLoading && styles.debugBtnDisabled,
          ]}
          onPress={handleTestFormEmail}
          disabled={testFormEmailLoading}
        >
          {testFormEmailLoading ? (
            <ActivityIndicator size="small" color={colors.textInverse} />
          ) : (
            <Text style={styles.debugBtnText}>Invia test segreteria</Text>
          )}
        </TouchableOpacity>
        {testFormEmailResult !== null && (
          <Text
            style={[
              styles.debugResult,
              testFormEmailResult.startsWith("✓")
                ? styles.debugResultOk
                : styles.debugResultErr,
            ]}
          >
            {testFormEmailResult}
          </Text>
        )}
      </View>
    </View>
  );

  const renderPayslipTab = () => (
    <>
      {/* User's own payslip settings — role/rank always read-only here */}
      <View style={styles.section}>
        <PayslipForm
          s={settings}
          set={setSettings}
          isAdmin={false}
          isSuperAdmin={false}
        />

        {/* Info */}
        <View style={styles.infoCard}>
          <Info size={20} color={colors.primary} />
          <Text style={styles.infoCardText}>
            Settings are automatically saved and applied to the payslip
            calculator.
          </Text>
        </View>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      {/* Tab bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "general" && styles.tabActive]}
          onPress={() => setActiveTab("general")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "general" && styles.tabTextActive,
            ]}
          >
            {t("settings.tabGeneral")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "payslip" && styles.tabActive]}
          onPress={() => setActiveTab("payslip")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "payslip" && styles.tabTextActive,
            ]}
          >
            {t("settings.tabPayslip")}
          </Text>
        </TouchableOpacity>
        {isSuperAdmin && (
          <TouchableOpacity
            style={[styles.tab, activeTab === "debug" && styles.tabActive]}
            onPress={() => setActiveTab("debug")}
          >
            <Bug
              size={14}
              color={
                activeTab === "debug" ? colors.primary : colors.textSecondary
              }
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "debug" && styles.tabTextActive,
              ]}
            >
              Debug
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content}>
        {activeTab === "general" && renderGeneralTab()}
        {activeTab === "payslip" && renderPayslipTab()}
        {activeTab === "debug" && renderDebugTab()}
        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // ── Tabs ────────────────────────────────
  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  // ── Layout ──────────────────────────────
  content: {
    flex: 1,
  },
  section: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  bottomSpace: {
    height: spacing.xl,
  },
  // ── Card (General tab) ──────────────────
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.md,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary + "15",
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  value: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  actionButton: {
    padding: spacing.sm,
  },
  disableButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.error + "10",
    borderRadius: borderRadius.md,
    alignItems: "center",
  },
  disableButtonText: {
    fontSize: typography.sizes.base,
    color: colors.error,
    fontWeight: typography.weights.medium,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  infoLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  notifRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  notifTextContainer: {
    flex: 1,
  },
  languageModal: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  languageOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  languageOptionActive: {
    backgroundColor: colors.primary + "10",
  },
  languageOptionText: {
    fontSize: typography.sizes.base,
    color: colors.text,
  },
  languageOptionTextActive: {
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  checkmarkText: {
    color: colors.textInverse,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  // ── Payslip form ────────────────────────
  fieldLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  selectorContainer: {
    marginBottom: spacing.md,
  },
  buttonGroup: {
    flexDirection: "row",
    gap: spacing.sm,
  },
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
  toggleBtnTextActive: {
    color: colors.textInverse,
  },
  rankContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
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
  rankBtnTextActive: {
    color: colors.textInverse,
  },
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
  checkboxActive: {
    backgroundColor: colors.primary,
  },
  checkboxCheck: {
    color: colors.textInverse,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  checkboxLabel: {
    fontSize: typography.sizes.base,
    color: colors.text,
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
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontStyle: "italic",
    marginTop: spacing.xs,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  infoCardText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.primary,
  },
  legacySaveBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
  },
  legacySaveBtnText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.textInverse,
  },
  // ── Debug tab ───────────────────────────
  debugBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  debugBtnDisabled: {
    opacity: 0.6,
  },
  debugBtnText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.textInverse,
  },
  debugResult: {
    marginTop: spacing.sm,
    fontSize: typography.sizes.sm,
    fontFamily: "monospace",
  },
  debugResultOk: {
    color: colors.success ?? colors.primary,
  },
  debugResultErr: {
    color: colors.error,
  },
});

export default SettingsScreen;
