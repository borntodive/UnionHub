import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  Calendar,
  CheckCircle,
  MapPin,
  Briefcase,
  Award,
} from "lucide-react-native";

import { colors, spacing, typography, borderRadius } from "../../theme";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Select } from "../../components/Select";
import { usersApi } from "../../api/users";
import { basesApi } from "../../api/bases";
import { contractsApi } from "../../api/contracts";
import { gradesApi } from "../../api/grades";
import { useAuthStore } from "../../store/authStore";

const CAPTAIN_GRADES = ["CPT", "LTC", "LCC", "TRI", "TRE"];

const parseDate = (dateStr: string | undefined): Date | null => {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  const date = new Date(
    parseInt(parts[2], 10),
    parseInt(parts[1], 10) - 1,
    parseInt(parts[0], 10),
  );
  return isNaN(date.getTime()) ? null : date;
};

const formatDate = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export const CompleteProfileScreen: React.FC = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);

  const isCaptainGrade = CAPTAIN_GRADES.includes(user?.grade?.codice || "");

  // Determine which fields are missing
  const missing = {
    nome: !user?.nome,
    cognome: !user?.cognome,
    email: !user?.email,
    telefono: !user?.telefono,
    base: !user?.base,
    contratto: !user?.contratto,
    grade: !user?.grade,
    dateOfEntry: !user?.dateOfEntry,
    dateOfCaptaincy: isCaptainGrade && !user?.dateOfCaptaincy,
  };

  const needsPersonal = missing.nome || missing.cognome;
  const needsContact = missing.email || missing.telefono;
  const needsProfessional = missing.base || missing.contratto || missing.grade;
  const needsDates = missing.dateOfEntry || missing.dateOfCaptaincy;

  // Form state — pre-filled from existing user data
  const [nome, setNome] = useState(user?.nome || "");
  const [cognome, setCognome] = useState(user?.cognome || "");
  const [email, setEmail] = useState(user?.email || "");
  const [telefono, setTelefono] = useState(user?.telefono || "");
  const [baseId, setBaseId] = useState(user?.base?.id || "");
  const [contrattoId, setContrattoId] = useState(user?.contratto?.id || "");
  const [gradeId, setGradeId] = useState(user?.grade?.id || "");
  const [dateOfEntry, setDateOfEntry] = useState(user?.dateOfEntry || "");
  const [dateOfCaptaincy, setDateOfCaptaincy] = useState(
    user?.dateOfCaptaincy || "",
  );
  const [activePicker, setActivePicker] = useState<
    "dateOfEntry" | "dateOfCaptaincy" | null
  >(null);

  // Load reference data only if needed
  const { data: bases, isLoading: loadingBases } = useQuery({
    queryKey: ["bases"],
    queryFn: basesApi.getBases,
    enabled: needsProfessional,
  });

  const { data: contracts, isLoading: loadingContracts } = useQuery({
    queryKey: ["contracts"],
    queryFn: contractsApi.getContracts,
    enabled: needsProfessional,
  });

  const { data: grades, isLoading: loadingGrades } = useQuery({
    queryKey: ["grades"],
    queryFn: gradesApi.getGrades,
    enabled: needsProfessional,
  });

  const isLoadingRefs = loadingBases || loadingContracts || loadingGrades;

  const mutation = useMutation({
    mutationFn: () => {
      const payload: Parameters<typeof usersApi.updateMe>[0] = {};
      if (missing.nome) payload.nome = nome;
      if (missing.cognome) payload.cognome = cognome;
      if (missing.email) payload.email = email;
      if (missing.telefono) payload.telefono = telefono;
      if (missing.base) payload.baseId = baseId;
      if (missing.contratto) payload.contrattoId = contrattoId;
      if (missing.grade) payload.gradeId = gradeId;
      if (missing.dateOfEntry) payload.dateOfEntry = dateOfEntry;
      if (missing.dateOfCaptaincy) payload.dateOfCaptaincy = dateOfCaptaincy;
      return usersApi.updateMe(payload);
    },
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
    },
    onError: (error: any) => {
      Alert.alert(
        t("common.error"),
        error.response?.data?.message || t("errors.generic"),
      );
    },
  });

  const handleSave = () => {
    if (missing.nome && !nome) {
      Alert.alert(t("common.error"), t("members.firstNameRequired"));
      return;
    }
    if (missing.cognome && !cognome) {
      Alert.alert(t("common.error"), t("members.lastNameRequired"));
      return;
    }
    if (missing.email && !email) {
      Alert.alert(t("common.error"), t("members.emailRequired"));
      return;
    }
    if (missing.telefono && !telefono) {
      Alert.alert(t("common.error"), t("members.phoneRequired"));
      return;
    }
    if (missing.base && !baseId) {
      Alert.alert(t("common.error"), t("members.baseRequired"));
      return;
    }
    if (missing.contratto && !contrattoId) {
      Alert.alert(t("common.error"), t("members.contractRequired"));
      return;
    }
    if (missing.grade && !gradeId) {
      Alert.alert(t("common.error"), t("members.gradeRequired"));
      return;
    }
    if (missing.dateOfEntry && !dateOfEntry) {
      Alert.alert(t("common.error"), t("members.dateOfEntryRequired"));
      return;
    }
    if (missing.dateOfCaptaincy && !dateOfCaptaincy) {
      Alert.alert(t("common.error"), t("members.dateOfCaptaincyRequired"));
      return;
    }
    mutation.mutate();
  };

  const activeValue =
    activePicker === "dateOfEntry" ? dateOfEntry : dateOfCaptaincy;

  const baseOptions = (bases || []).map((b) => ({
    label: `${b.codice} — ${b.nome}`,
    value: b.id,
  }));
  const contractOptions = (contracts || []).map((c) => ({
    label: `${c.codice} — ${c.nome}`,
    value: c.id,
  }));
  const gradeOptions = (grades || [])
    .filter((g) => !user?.ruolo || g.ruolo === user.ruolo)
    .map((g) => ({ label: g.nome, value: g.id }));

  return (
    <View style={styles.wrapper}>
      <View style={[styles.statusBarHack, { height: insets.top }]} />
      <SafeAreaView style={{ flex: 1 }} edges={["bottom", "left", "right"]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <CheckCircle size={40} color={colors.textInverse} />
          </View>
          <Text style={styles.headerTitle}>{t("completeProfile.title")}</Text>
          <Text style={styles.headerSubtitle}>
            {t("completeProfile.description")}
          </Text>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            ref={scrollRef}
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ── Personal info ─────────────────────────────────── */}
            {needsPersonal && (
              <Card style={styles.card}>
                <Text style={styles.sectionTitle}>
                  {t("members.personalInfo")}
                </Text>

                {missing.nome && (
                  <>
                    <Text style={styles.fieldLabel}>
                      {t("members.firstName")}
                      <Text style={styles.required}> *</Text>
                    </Text>
                    <TextInput
                      style={styles.textInput}
                      value={nome}
                      onChangeText={setNome}
                      autoCapitalize="words"
                      autoCorrect={false}
                    />
                  </>
                )}

                {missing.cognome && (
                  <>
                    <Text
                      style={[
                        styles.fieldLabel,
                        missing.nome && styles.fieldLabelSpaced,
                      ]}
                    >
                      {t("members.lastName")}
                      <Text style={styles.required}> *</Text>
                    </Text>
                    <TextInput
                      style={styles.textInput}
                      value={cognome}
                      onChangeText={setCognome}
                      autoCapitalize="words"
                      autoCorrect={false}
                    />
                  </>
                )}
              </Card>
            )}

            {/* ── Contact info ──────────────────────────────────── */}
            {needsContact && (
              <Card style={styles.card}>
                <Text style={styles.sectionTitle}>
                  {t("members.contactInfo")}
                </Text>

                {missing.email && (
                  <>
                    <Text style={styles.fieldLabel}>
                      {t("members.email")}
                      <Text style={styles.required}> *</Text>
                    </Text>
                    <TextInput
                      style={styles.textInput}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </>
                )}

                {missing.telefono && (
                  <>
                    <Text
                      style={[
                        styles.fieldLabel,
                        missing.email && styles.fieldLabelSpaced,
                      ]}
                    >
                      {t("members.phone")}
                      <Text style={styles.required}> *</Text>
                    </Text>
                    <TextInput
                      style={styles.textInput}
                      value={telefono}
                      onChangeText={setTelefono}
                      keyboardType="phone-pad"
                      placeholder="+39 333 1234567"
                      placeholderTextColor={colors.textTertiary}
                      onFocus={() =>
                        scrollRef.current?.scrollToEnd({ animated: true })
                      }
                    />
                  </>
                )}
              </Card>
            )}

            {/* ── Professional info ─────────────────────────────── */}
            {needsProfessional && (
              <Card style={styles.card}>
                <Text style={styles.sectionTitle}>
                  {t("members.unionInfo")}
                </Text>

                {isLoadingRefs ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.primary}
                    style={{ marginVertical: spacing.md }}
                  />
                ) : (
                  <>
                    {missing.base && (
                      <>
                        <Text style={styles.fieldLabel}>
                          {t("members.base")}
                          <Text style={styles.required}> *</Text>
                        </Text>
                        <View style={styles.selectWrapper}>
                          <MapPin
                            size={18}
                            color={colors.primary}
                            style={styles.selectIcon}
                          />
                          <View style={styles.selectInner}>
                            <Select
                              label=""
                              value={baseId || undefined}
                              onValueChange={(v) => setBaseId(v || "")}
                              options={baseOptions}
                              placeholder={t("members.base")}
                            />
                          </View>
                        </View>
                      </>
                    )}

                    {missing.contratto && (
                      <>
                        <Text
                          style={[
                            styles.fieldLabel,
                            missing.base && styles.fieldLabelSpaced,
                          ]}
                        >
                          {t("members.contract")}
                          <Text style={styles.required}> *</Text>
                        </Text>
                        <View style={styles.selectWrapper}>
                          <Briefcase
                            size={18}
                            color={colors.primary}
                            style={styles.selectIcon}
                          />
                          <View style={styles.selectInner}>
                            <Select
                              label=""
                              value={contrattoId || undefined}
                              onValueChange={(v) => setContrattoId(v || "")}
                              options={contractOptions}
                              placeholder={t("members.contract")}
                            />
                          </View>
                        </View>
                      </>
                    )}

                    {missing.grade && (
                      <>
                        <Text
                          style={[
                            styles.fieldLabel,
                            (missing.base || missing.contratto) &&
                              styles.fieldLabelSpaced,
                          ]}
                        >
                          {t("members.grade")}
                          <Text style={styles.required}> *</Text>
                        </Text>
                        <View style={styles.selectWrapper}>
                          <Award
                            size={18}
                            color={colors.primary}
                            style={styles.selectIcon}
                          />
                          <View style={styles.selectInner}>
                            <Select
                              label=""
                              value={gradeId || undefined}
                              onValueChange={(v) => setGradeId(v || "")}
                              options={gradeOptions}
                              placeholder={t("members.grade")}
                            />
                          </View>
                        </View>
                      </>
                    )}
                  </>
                )}
              </Card>
            )}

            {/* ── Professional dates ────────────────────────────── */}
            {needsDates && (
              <Card style={styles.card}>
                <Text style={styles.sectionTitle}>
                  {t("members.professionalDates")}
                </Text>

                {missing.dateOfEntry && (
                  <>
                    <Text style={styles.fieldLabel}>
                      {t("members.dateOfEntry")}
                      <Text style={styles.required}> *</Text>
                    </Text>
                    <TouchableOpacity
                      style={styles.datePickerButton}
                      onPress={() => setActivePicker("dateOfEntry")}
                    >
                      <View style={styles.datePickerIcon}>
                        <Calendar size={20} color={colors.primary} />
                      </View>
                      <Text
                        style={[
                          styles.datePickerValue,
                          !dateOfEntry && styles.datePickerPlaceholder,
                        ]}
                      >
                        {dateOfEntry || t("completeProfile.selectDate")}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                {missing.dateOfCaptaincy && (
                  <>
                    <Text
                      style={[
                        styles.fieldLabel,
                        missing.dateOfEntry && styles.fieldLabelSpaced,
                      ]}
                    >
                      {t("members.dateOfCaptaincy")}
                      <Text style={styles.required}> *</Text>
                    </Text>
                    <TouchableOpacity
                      style={styles.datePickerButton}
                      onPress={() => setActivePicker("dateOfCaptaincy")}
                    >
                      <View style={styles.datePickerIcon}>
                        <Calendar size={20} color={colors.primary} />
                      </View>
                      <Text
                        style={[
                          styles.datePickerValue,
                          !dateOfCaptaincy && styles.datePickerPlaceholder,
                        ]}
                      >
                        {dateOfCaptaincy || t("completeProfile.selectDate")}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </Card>
            )}

            <Button
              title={
                mutation.isPending
                  ? t("common.pleaseWait")
                  : t("completeProfile.save")
              }
              onPress={handleSave}
              loading={mutation.isPending}
              style={styles.saveButton}
            />

            <TouchableOpacity onPress={logout} style={styles.backToLoginButton}>
              <Text style={styles.backToLoginText}>
                {t("completeProfile.backToLogin")}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Date Picker Modal */}
        <Modal
          visible={activePicker !== null}
          transparent
          animationType="slide"
          onRequestClose={() => setActivePicker(null)}
        >
          <View style={styles.actionSheetOverlay}>
            <View style={styles.actionSheetContainer}>
              <View style={styles.actionSheetHeader}>
                <Text style={styles.actionSheetTitle}>
                  {t("completeProfile.selectDate")}
                </Text>
                <TouchableOpacity
                  onPress={() => setActivePicker(null)}
                  style={styles.actionSheetDoneButton}
                >
                  <Text style={styles.actionSheetDoneText}>
                    {t("common.done")}
                  </Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={parseDate(activeValue) || new Date()}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                onChange={(_, selectedDate) => {
                  if (selectedDate && activePicker) {
                    const formatted = formatDate(selectedDate);
                    if (activePicker === "dateOfEntry") {
                      setDateOfEntry(formatted);
                    } else {
                      setDateOfCaptaincy(formatted);
                    }
                  }
                }}
              />
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  statusBarHack: {
    backgroundColor: colors.primary,
  },
  header: {
    backgroundColor: colors.primary,
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  headerIcon: {
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  headerSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textInverse + "CC",
    textAlign: "center",
    lineHeight: 20,
  },
  content: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: spacing.md,
    paddingTop: spacing.lg,
  },
  card: {
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  fieldLabelSpaced: {
    marginTop: spacing.md,
  },
  required: {
    color: colors.error,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    fontSize: typography.sizes.base,
    color: colors.text,
  },
  selectWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    paddingLeft: spacing.md,
    overflow: "hidden",
  },
  selectIcon: {
    marginRight: spacing.sm,
  },
  selectInner: {
    flex: 1,
  },
  datePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  datePickerIcon: {
    marginRight: spacing.sm,
  },
  datePickerValue: {
    fontSize: typography.sizes.base,
    color: colors.text,
    fontWeight: typography.weights.medium,
    flex: 1,
  },
  datePickerPlaceholder: {
    color: colors.textTertiary,
    fontWeight: typography.weights.regular,
  },
  saveButton: {
    marginTop: spacing.sm,
  },
  backToLoginButton: {
    alignItems: "center",
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
  },
  backToLoginText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textDecorationLine: "underline",
  },
  actionSheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  actionSheetContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    paddingBottom: spacing.xl,
  },
  actionSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionSheetTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  actionSheetDoneButton: {
    paddingHorizontal: spacing.sm,
  },
  actionSheetDoneText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.primary,
  },
});
