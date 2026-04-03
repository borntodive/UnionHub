import React, { useState, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
  Modal,
  Platform,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Save,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Award,
  Shield,
  User,
  Building2,
  FileText,
  MessageCircle,
  Calendar,
  AlertTriangle,
} from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

import { colors, spacing, typography, borderRadius } from "../../theme";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Select } from "../../components/Select";
import { usersApi } from "../../api/users";
import { useAuthStore } from "../../store/authStore";
import { RootStackParamList } from "../../navigation/types";
import { Ruolo, UserRole } from "../../types";
import { basesApi } from "../../api/bases";
import { contractsApi } from "../../api/contracts";
import { gradesApi } from "../../api/grades";
import { usePayslipStore } from "../../payslip/store/usePayslipStore";
import { getUnionFee } from "../../payslip/data/contractData";

type MemberEditRouteProp = RouteProp<RootStackParamList, "MemberEdit">;
type MemberEditNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const CAPTAIN_GRADES = ["CPT", "LTC", "LCC", "TRI", "TRE"];

export const MemberEditScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<MemberEditNavigationProp>();
  const route = useRoute<MemberEditRouteProp>();
  const { memberId } = route.params;
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const currentUser = useAuthStore((state) => state.user);
  const isSuperAdmin = currentUser?.role === UserRole.SUPERADMIN;
  const isAdmin = currentUser?.role === UserRole.ADMIN || isSuperAdmin;
  const isOwnProfile = currentUser?.id === memberId;
  const canEditProfessional = isOwnProfile || isAdmin;
  const canEditAdminFields = isAdmin;

  // Fetch member data
  const { data: member, isLoading: isLoadingMember } = useQuery({
    queryKey: ["user", memberId],
    queryFn: () => usersApi.getUserById(memberId),
  });

  // Fetch filter options
  const { data: bases } = useQuery({
    queryKey: ["bases"],
    queryFn: basesApi.getBases,
  });

  const { data: contracts } = useQuery({
    queryKey: ["contracts"],
    queryFn: contractsApi.getContracts,
  });

  const { data: grades } = useQuery({
    queryKey: ["grades"],
    queryFn: gradesApi.getGrades,
  });

  // Form state
  const [formData, setFormData] = useState({
    nome: "",
    cognome: "",
    email: "",
    telefono: "",
    baseId: "",
    contrattoId: "",
    gradeId: "",
    note: "",
    itud: false,
    rsa: false,
    rls: false,
    isUSO: false,
    whatsappStatus: null as "yes" | "no" | "declined" | null,
    dataIscrizione: "",
    dateOfEntry: "",
    dateOfCaptaincy: "",
    isActive: true,
    role: UserRole.USER,
    ruolo: null as Ruolo | null,
  });

  const scrollViewRef = useRef<ScrollView>(null);

  const [activePicker, setActivePicker] = useState<
    "dataIscrizione" | "dateOfEntry" | "dateOfCaptaincy" | null
  >(null);

  // Helper to parse DD/MM/YYYY string to Date
  const parseDate = (dateStr: string | undefined): Date | null => {
    if (!dateStr) return null;
    const parts = dateStr.split("/");
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const date = new Date(year, month, day);
    return isNaN(date.getTime()) ? null : date;
  };

  // Helper to format Date to DD/MM/YYYY
  const formatDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Determine if selected grade is a captain grade
  const isCurrentGradeCaptain = useMemo(() => {
    if (formData.gradeId && grades) {
      const g = grades.find((gr) => gr.id === formData.gradeId);
      return g ? CAPTAIN_GRADES.includes(g.codice) : false;
    }
    return CAPTAIN_GRADES.includes(member?.grade?.codice || "");
  }, [formData.gradeId, grades, member]);

  // Initialize form when member data loads
  React.useEffect(() => {
    if (member) {
      setFormData({
        nome: member.nome || "",
        cognome: member.cognome || "",
        email: member.email || "",
        telefono: member.telefono || "",
        baseId: member.base?.id || "",
        contrattoId: member.contratto?.id || "",
        gradeId: member.grade?.id || "",
        note: member.note || "",
        itud: member.itud || false,
        rsa: member.rsa || false,
        rls: member.rls || false,
        isUSO: member.isUSO || false,
        whatsappStatus: member.whatsappStatus ?? null,
        dataIscrizione: member.dataIscrizione || "",
        dateOfEntry: member.dateOfEntry || "",
        dateOfCaptaincy: member.dateOfCaptaincy || "",
        isActive: member.isActive,
        role: member.role,
        ruolo: member.ruolo,
      });
    }
  }, [member]);

  // Filter options based on user role
  const filteredContracts = useMemo(() => {
    if (!contracts) return [];
    if (isSuperAdmin) return contracts;

    // Admin sees only contracts for their role
    const userRuolo = currentUser?.ruolo;
    return contracts.filter((c) => {
      if (userRuolo === Ruolo.PILOT) {
        return (
          c.codice.includes("PI") ||
          ["AFA", "Contractor", "DAC"].includes(c.codice)
        );
      }
      if (userRuolo === Ruolo.CABIN_CREW) {
        return c.codice.includes("CC") || c.codice === "CrewLink";
      }
      return true;
    });
  }, [contracts, isSuperAdmin, currentUser?.ruolo]);

  const filteredGrades = useMemo(() => {
    if (!grades) return [];
    if (isSuperAdmin) return grades;

    // Admin sees only grades for their role
    const userRuolo = currentUser?.ruolo;
    return grades.filter((g) => g.ruolo === userRuolo);
  }, [grades, isSuperAdmin, currentUser?.ruolo]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) => usersApi.updateUser(memberId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", memberId] });
      queryClient.invalidateQueries({ queryKey: ["users"] });

      // If editing own profile and grade changed → sync rank in payslip settings
      if (
        isOwnProfile &&
        formData.gradeId &&
        formData.gradeId !== member?.grade?.id
      ) {
        const newGrade = grades?.find((g) => g.id === formData.gradeId);
        if (newGrade) {
          const rank = newGrade.codice.toLowerCase();
          const role = currentUser?.ruolo === Ruolo.CABIN_CREW ? "cc" : "pil";
          const union = getUnionFee(rank, role);
          usePayslipStore.getState().setSettings({ rank, role, union });
        }
      }

      Alert.alert("Success", "Member updated successfully");
      navigation.goBack();
    },
    onError: (error: any) => {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to update member",
      );
    },
  });

  const normalizePhone = (s?: string) => {
    if (!s) return s;
    const t = s.trim();
    return t.startsWith("00") ? "+" + t.slice(2) : t;
  };

  const handleSave = () => {
    if (
      !formData.nome.trim() ||
      !formData.cognome.trim() ||
      !formData.email.trim()
    ) {
      Alert.alert("Error", "Name, surname and email are required");
      return;
    }

    if (formData.telefono && !formData.telefono.trim().startsWith("+")) {
      Alert.alert(
        "Phone prefix required",
        "Please include the country prefix (e.g. +39 for Italy).",
      );
      return;
    }

    // Own profile requires date of entry (and captaincy if captain grade)
    if (isOwnProfile) {
      if (!formData.dateOfEntry) {
        Alert.alert("Error", t("members.dateOfEntryRequired"));
        return;
      }
      if (isCurrentGradeCaptain && !formData.dateOfCaptaincy) {
        Alert.alert("Error", t("members.dateOfCaptaincyRequired"));
        return;
      }
    }

    // Build update data - only include changed fields
    const updateData: any = {};
    if (member) {
      if (formData.nome !== member.nome) updateData.nome = formData.nome;
      if (formData.cognome !== member.cognome)
        updateData.cognome = formData.cognome;
      if (formData.email !== member.email) updateData.email = formData.email;
      if (formData.telefono !== (member.telefono || ""))
        updateData.telefono = formData.telefono || null;
      if (formData.baseId !== (member.base?.id || ""))
        updateData.baseId = formData.baseId || null;
      if (formData.contrattoId !== (member.contratto?.id || ""))
        updateData.contrattoId = formData.contrattoId || null;
      if (formData.gradeId !== (member.grade?.id || ""))
        updateData.gradeId = formData.gradeId || null;
      if (formData.note !== (member.note || ""))
        updateData.note = formData.note || null;
      if (formData.itud !== (member.itud || false))
        updateData.itud = formData.itud;
      if (formData.rsa !== (member.rsa || false)) updateData.rsa = formData.rsa;
      if (formData.rls !== (member.rls || false)) updateData.rls = formData.rls;
      if (formData.isUSO !== (member.isUSO || false))
        updateData.isUSO = formData.isUSO;
      if (formData.whatsappStatus !== (member.whatsappStatus ?? null))
        updateData.whatsappStatus = formData.whatsappStatus;
      if (formData.dataIscrizione !== (member.dataIscrizione || ""))
        updateData.dataIscrizione = formData.dataIscrizione || null;
      if (formData.dateOfEntry !== (member.dateOfEntry || ""))
        updateData.dateOfEntry = formData.dateOfEntry || null;
      if (formData.dateOfCaptaincy !== (member.dateOfCaptaincy || ""))
        updateData.dateOfCaptaincy = formData.dateOfCaptaincy || null;
      if (formData.isActive !== member.isActive)
        updateData.isActive = formData.isActive;

      // Only SuperAdmin can change role and ruolo
      if (isSuperAdmin) {
        if (formData.role !== member.role) updateData.role = formData.role;
        if (formData.ruolo !== member.ruolo) updateData.ruolo = formData.ruolo;
      }
    }

    if (Object.keys(updateData).length === 0) {
      navigation.goBack();
      return;
    }

    updateMutation.mutate(updateData);
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  if (isLoadingMember || !member) {
    return (
      <View style={styles.wrapper}>
        <View style={[styles.statusBarHack, { height: insets.top }]} />
        <SafeAreaView
          style={styles.container}
          edges={["bottom", "left", "right"]}
        >
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <View style={[styles.statusBarHack, { height: insets.top }]} />
      <SafeAreaView
        style={styles.container}
        edges={["bottom", "left", "right"]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleCancel}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={24} color={colors.textInverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Member</Text>
          <TouchableOpacity
            onPress={handleSave}
            style={styles.saveButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <ActivityIndicator size="small" color={colors.textInverse} />
            ) : (
              <Save size={20} color={colors.textInverse} />
            )}
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={insets.top + 56}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Personal Info Section */}
            <Card style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Personal Information</Text>

              <InputField
                label="First Name"
                value={formData.nome}
                onChangeText={(text) =>
                  setFormData({ ...formData, nome: text })
                }
                icon={<User size={20} color={colors.primary} />}
                required
              />

              <InputField
                label="Last Name"
                value={formData.cognome}
                onChangeText={(text) =>
                  setFormData({ ...formData, cognome: text })
                }
                icon={<User size={20} color={colors.primary} />}
                required
              />

              <InputField
                label="Email"
                value={formData.email}
                onChangeText={(text) =>
                  setFormData({ ...formData, email: text })
                }
                icon={<Mail size={20} color={colors.primary} />}
                keyboardType="email-address"
                autoCapitalize="none"
                required
              />

              <InputField
                label="Phone"
                value={formData.telefono}
                onChangeText={(text) =>
                  setFormData({
                    ...formData,
                    telefono: normalizePhone(text) ?? text,
                  })
                }
                icon={<Phone size={20} color={colors.primary} />}
                keyboardType="phone-pad"
              />
              {!!formData.telefono &&
                !formData.telefono.trim().startsWith("+") && (
                  <View style={styles.phoneWarning}>
                    <AlertTriangle size={14} color={colors.warning} />
                    <Text style={styles.phoneWarningText}>
                      Add country prefix (e.g. +39)
                    </Text>
                  </View>
                )}
            </Card>

            {/* Professional Info Section */}
            <Card style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Professional Information</Text>

              {canEditProfessional ? (
                <>
                  <SelectField
                    label="Base"
                    value={formData.baseId}
                    options={
                      bases?.map((b) => ({
                        label: `${b.codice} - ${b.nome}`,
                        value: b.id,
                      })) || []
                    }
                    onChange={(value) =>
                      setFormData({ ...formData, baseId: value })
                    }
                    icon={<MapPin size={20} color={colors.primary} />}
                    placeholder="Select base"
                  />

                  <SelectField
                    label="Contract"
                    value={formData.contrattoId}
                    options={filteredContracts.map((c) => ({
                      label: isSuperAdmin
                        ? c.codice
                        : c.codice.replace(/-(PI|CC)$/, ""),
                      value: c.id,
                    }))}
                    onChange={(value) =>
                      setFormData({ ...formData, contrattoId: value })
                    }
                    icon={<Briefcase size={20} color={colors.primary} />}
                    placeholder="Select contract"
                  />

                  <SelectField
                    label="Grade"
                    value={formData.gradeId}
                    options={filteredGrades.map((g) => ({
                      label: g.codice,
                      value: g.id,
                    }))}
                    onChange={(value) =>
                      setFormData({ ...formData, gradeId: value })
                    }
                    icon={<Award size={20} color={colors.primary} />}
                    placeholder="Select grade"
                  />
                </>
              ) : (
                <>
                  <ReadOnlyField
                    label="Base"
                    value={
                      member.base
                        ? `${member.base.codice} - ${member.base.nome}`
                        : "Not specified"
                    }
                    icon={<MapPin size={20} color={colors.primary} />}
                  />
                  <ReadOnlyField
                    label="Contract"
                    value={
                      member.contratto
                        ? isSuperAdmin
                          ? member.contratto.codice
                          : member.contratto.codice.replace(/-(PI|CC)$/, "")
                        : "Not specified"
                    }
                    icon={<Briefcase size={20} color={colors.primary} />}
                  />
                  <ReadOnlyField
                    label="Grade"
                    value={member.grade?.codice || "Not specified"}
                    icon={<Award size={20} color={colors.primary} />}
                  />
                </>
              )}
            </Card>

            {/* Professional Dates - visible to own profile or admin */}
            {canEditProfessional && (
              <Card style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>
                  {t("members.professionalDates")}
                </Text>

                <Text style={styles.fieldLabel}>
                  {t("members.dateOfEntry")}
                  {isOwnProfile && <Text style={styles.required}> *</Text>}
                </Text>
                <TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={() => setActivePicker("dateOfEntry")}
                >
                  <View style={styles.datePickerIcon}>
                    <Calendar size={20} color={colors.primary} />
                  </View>
                  <View style={styles.datePickerContent}>
                    <Text style={styles.datePickerValue}>
                      {formData.dateOfEntry || "Select date"}
                    </Text>
                  </View>
                </TouchableOpacity>

                {isCurrentGradeCaptain && (
                  <>
                    <Text
                      style={[styles.fieldLabel, { marginTop: spacing.md }]}
                    >
                      {t("members.dateOfCaptaincy")}
                      {isOwnProfile && <Text style={styles.required}> *</Text>}
                    </Text>
                    <TouchableOpacity
                      style={styles.datePickerButton}
                      onPress={() => setActivePicker("dateOfCaptaincy")}
                    >
                      <View style={styles.datePickerIcon}>
                        <Calendar size={20} color={colors.primary} />
                      </View>
                      <View style={styles.datePickerContent}>
                        <Text style={styles.datePickerValue}>
                          {formData.dateOfCaptaincy || "Select date"}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </>
                )}
              </Card>
            )}

            {/* Subscription Date - Admin only */}
            {canEditAdminFields && (
              <Card style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Membership Information</Text>

                <TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={() => setActivePicker("dataIscrizione")}
                >
                  <View style={styles.datePickerIcon}>
                    <Calendar size={20} color={colors.primary} />
                  </View>
                  <View style={styles.datePickerContent}>
                    <Text style={styles.datePickerLabel}>
                      Subscription Date
                    </Text>
                    <Text style={styles.datePickerValue}>
                      {formData.dataIscrizione || "Select date"}
                    </Text>
                  </View>
                </TouchableOpacity>
              </Card>
            )}

            {/* Date Picker Action Sheet Modal */}
            <Modal
              visible={activePicker !== null}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setActivePicker(null)}
            >
              <View style={styles.actionSheetOverlay}>
                <View style={styles.actionSheetContainer}>
                  <View style={styles.actionSheetHeader}>
                    <Text style={styles.actionSheetTitle}>Select Date</Text>
                    <TouchableOpacity
                      onPress={() => setActivePicker(null)}
                      style={styles.actionSheetDoneButton}
                    >
                      <Text style={styles.actionSheetDoneText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={
                      parseDate(
                        activePicker ? formData[activePicker] : undefined,
                      ) || new Date()
                    }
                    mode="date"
                    display="spinner"
                    maximumDate={new Date()}
                    onChange={(event, selectedDate) => {
                      if (selectedDate && activePicker) {
                        setFormData({
                          ...formData,
                          [activePicker]: formatDate(selectedDate),
                        });
                      }
                    }}
                  />
                </View>
              </View>
            </Modal>

            {/* Admin Fields Section - Only for Admins */}
            {canEditAdminFields && (
              <Card style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Administrative</Text>

                <View style={styles.switchRow}>
                  <View style={styles.switchLabelContainer}>
                    <Building2
                      size={20}
                      color={colors.primary}
                      style={styles.switchIcon}
                    />
                    <Text style={styles.switchLabel}>ITUD</Text>
                  </View>
                  <Switch
                    value={formData.itud}
                    onValueChange={(value) =>
                      setFormData({ ...formData, itud: value })
                    }
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={colors.background}
                  />
                </View>

                <View style={styles.switchRow}>
                  <View style={styles.switchLabelContainer}>
                    <Shield
                      size={20}
                      color={colors.primary}
                      style={styles.switchIcon}
                    />
                    <Text style={styles.switchLabel}>RSA</Text>
                  </View>
                  <Switch
                    value={formData.rsa}
                    onValueChange={(value) =>
                      setFormData({ ...formData, rsa: value })
                    }
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={colors.background}
                  />
                </View>

                <View style={styles.switchRow}>
                  <View style={styles.switchLabelContainer}>
                    <Shield
                      size={20}
                      color={colors.primary}
                      style={styles.switchIcon}
                    />
                    <Text style={styles.switchLabel}>RLS</Text>
                  </View>
                  <Switch
                    value={formData.rls}
                    onValueChange={(value) =>
                      setFormData({ ...formData, rls: value })
                    }
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={colors.background}
                  />
                </View>

                <View style={styles.switchRow}>
                  <View style={styles.switchLabelContainer}>
                    <Shield
                      size={20}
                      color={colors.primary}
                      style={styles.switchIcon}
                    />
                    <Text style={styles.switchLabel}>USO</Text>
                  </View>
                  <Switch
                    value={formData.isUSO}
                    onValueChange={(value) =>
                      setFormData({ ...formData, isUSO: value })
                    }
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={colors.background}
                  />
                </View>
              </Card>
            )}

            {/* WhatsApp Status */}
            {canEditAdminFields && (
              <Card style={styles.sectionCard}>
                <View style={styles.switchLabelContainer}>
                  <MessageCircle
                    size={20}
                    color={colors.primary}
                    style={styles.switchIcon}
                  />
                  <Text style={styles.sectionTitle}>WhatsApp Group</Text>
                </View>
                <View style={styles.whatsappOptions}>
                  {(
                    [
                      { value: "yes", label: "Yes" },
                      { value: "no", label: "No" },
                      { value: "declined", label: "Doesn't want" },
                    ] as const
                  ).map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.whatsappOption,
                        formData.whatsappStatus === opt.value &&
                          styles.whatsappOptionSelected,
                      ]}
                      onPress={() =>
                        setFormData({
                          ...formData,
                          whatsappStatus:
                            formData.whatsappStatus === opt.value
                              ? null
                              : opt.value,
                        })
                      }
                    >
                      <Text
                        style={[
                          styles.whatsappOptionText,
                          formData.whatsappStatus === opt.value &&
                            styles.whatsappOptionTextSelected,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Card>
            )}

            {/* SuperAdmin Fields */}
            {isSuperAdmin && (
              <Card style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Role Management</Text>

                <SelectField
                  label="System Role"
                  value={formData.role}
                  options={[
                    { label: "User", value: UserRole.USER },
                    { label: "Admin", value: UserRole.ADMIN },
                    { label: "Super Admin", value: UserRole.SUPERADMIN },
                  ]}
                  onChange={(value) =>
                    setFormData({ ...formData, role: value as UserRole })
                  }
                  icon={<Shield size={20} color={colors.primary} />}
                  placeholder="Select role"
                />

                <SelectField
                  label="Crew Role"
                  value={formData.ruolo || ""}
                  options={[
                    { label: "Pilot", value: Ruolo.PILOT },
                    { label: "Cabin Crew", value: Ruolo.CABIN_CREW },
                  ]}
                  onChange={(value) =>
                    setFormData({ ...formData, ruolo: value as Ruolo })
                  }
                  icon={<User size={20} color={colors.primary} />}
                  placeholder="Select crew role"
                />
              </Card>
            )}

            {/* Notes Section - Only for admins */}
            {canEditAdminFields && (
              <Card style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Notes</Text>

                <View style={styles.textAreaContainer}>
                  <FileText
                    size={20}
                    color={colors.primary}
                    style={styles.textAreaIcon}
                  />
                  <TextInput
                    style={styles.textArea}
                    value={formData.note}
                    onChangeText={(text) =>
                      setFormData({ ...formData, note: text })
                    }
                    onFocus={() =>
                      scrollViewRef.current?.scrollToEnd({ animated: true })
                    }
                    placeholder="Add notes..."
                    placeholderTextColor={colors.textTertiary}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>
              </Card>
            )}

            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
              <Button
                title="Cancel"
                onPress={handleCancel}
                variant="secondary"
                style={styles.actionButton}
              />
              <Button
                title="Save Changes"
                onPress={handleSave}
                loading={updateMutation.isPending}
                style={styles.actionButton}
              />
            </View>

            <View style={styles.bottomSpacer} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

// Input Field Component
interface InputFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  icon: React.ReactNode;
  keyboardType?: "default" | "email-address" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  required?: boolean;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  value,
  onChangeText,
  icon,
  keyboardType = "default",
  autoCapitalize = "sentences",
  required = false,
}) => (
  <View style={styles.fieldContainer}>
    <Text style={styles.fieldLabel}>
      {label}
      {required && <Text style={styles.required}> *</Text>}
    </Text>
    <View style={styles.inputContainer}>
      <View style={styles.inputIcon}>{icon}</View>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        placeholderTextColor={colors.textTertiary}
      />
    </View>
  </View>
);

// Select Field Component
interface SelectFieldProps {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
  icon: React.ReactNode;
  placeholder?: string;
}

const SelectField: React.FC<SelectFieldProps> = ({
  label,
  value,
  options,
  onChange,
  icon,
  placeholder = "Select...",
}) => {
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.selectWrapper}>
        <View style={styles.inputIcon}>{icon}</View>
        <View style={styles.selectContainer}>
          <Select
            label=""
            value={value || undefined}
            onValueChange={(val) => onChange(val || "")}
            options={options}
            placeholder={placeholder}
          />
        </View>
      </View>
    </View>
  );
};

// Read Only Field Component (for non-editable fields)
interface ReadOnlyFieldProps {
  label: string;
  value: string;
  icon: React.ReactNode;
}

const ReadOnlyField: React.FC<ReadOnlyFieldProps> = ({
  label,
  value,
  icon,
}) => (
  <View style={styles.fieldContainer}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={styles.readOnlyContainer}>
      <View style={styles.inputIcon}>{icon}</View>
      <Text style={styles.readOnlyText}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  statusBarHack: {
    backgroundColor: colors.primary,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    minHeight: 56,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
    flex: 1,
    textAlign: "center",
  },
  saveButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
  },
  sectionCard: {
    margin: spacing.md,
    marginBottom: 0,
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  fieldContainer: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  required: {
    color: colors.error,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
  },
  inputIcon: {
    padding: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingRight: spacing.sm,
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
  },
  selectContainer: {
    flex: 1,
    marginBottom: 0,
  },
  readOnlyContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background + "80",
    paddingVertical: spacing.sm,
  },
  readOnlyText: {
    flex: 1,
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    paddingRight: spacing.sm,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  switchLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  switchIcon: {
    marginRight: spacing.sm,
  },
  switchLabel: {
    fontSize: typography.sizes.base,
    color: colors.text,
  },
  whatsappOptions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  whatsappOption: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  whatsappOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  whatsappOptionText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  whatsappOptionTextSelected: {
    color: colors.background,
  },
  textAreaContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    padding: spacing.sm,
  },
  textAreaIcon: {
    marginRight: spacing.sm,
    marginTop: spacing.xs,
  },
  textArea: {
    flex: 1,
    height: 100,
    fontSize: typography.sizes.base,
    color: colors.text,
    textAlignVertical: "top",
  },
  actionsContainer: {
    flexDirection: "row",
    gap: spacing.md,
    margin: spacing.md,
    marginTop: spacing.lg,
  },
  actionButton: {
    flex: 1,
  },
  bottomSpacer: {
    height: spacing.xl,
  },
  // Date Picker styles
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
  datePickerContent: {
    flex: 1,
  },
  datePickerLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  datePickerValue: {
    fontSize: typography.sizes.base,
    color: colors.text,
    fontWeight: typography.weights.medium,
  },
  // Action Sheet styles
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
  phoneWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  phoneWarningText: {
    fontSize: typography.sizes.sm,
    color: colors.warning,
  },
});
