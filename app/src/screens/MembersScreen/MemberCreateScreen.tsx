import React, { useState, useMemo, useRef } from "react";
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
  Platform,
  Linking,
  Modal,
  Image,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useActionSheet } from "@expo/react-native-action-sheet";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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
  ToggleLeft,
  Hash,
  Upload,
  ScanLine,
  X,
  Eye,
  Calendar,
} from "lucide-react-native";

import { colors, spacing, typography, borderRadius } from "../../theme";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Select } from "../../components/Select";
import { usersApi, CreateUserData, ExtractedPdfData } from "../../api/users";
import { useAuthStore } from "../../store/authStore";
import { RootStackParamList } from "../../navigation/types";
import { Ruolo, UserRole } from "../../types";
import { basesApi } from "../../api/bases";
import { contractsApi } from "../../api/contracts";
import { gradesApi } from "../../api/grades";

type MemberCreateNavigationProp = NativeStackNavigationProp<RootStackParamList>;
type MemberCreateRouteProp = RouteProp<RootStackParamList, "MemberCreate">;

const CAPTAIN_GRADES_CREATE = ["CPT", "LTC", "LCC", "TRI", "TRE"];

export const MemberCreateScreen: React.FC = () => {
  const navigation = useNavigation<MemberCreateNavigationProp>();
  const route = useRoute<MemberCreateRouteProp>();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { showActionSheetWithOptions } = useActionSheet();

  // Get shared file params
  const { sharedPdfUri, extractedData } = route.params || {};

  const currentUser = useAuthStore((state) => state.user);
  const isSuperAdmin = currentUser?.role === UserRole.SUPERADMIN;
  const isAdmin = currentUser?.role === UserRole.ADMIN || isSuperAdmin;

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
  const [formData, setFormData] = useState<CreateUserData>({
    crewcode: "",
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
    dataIscrizione: "",
    dateOfEntry: "",
    dateOfCaptaincy: "",
    role: isSuperAdmin ? ("" as UserRole) : UserRole.USER,
    ruolo: isSuperAdmin ? undefined : currentUser?.ruolo || undefined,
  });

  // Filter options based on user role
  const filteredContracts = useMemo(() => {
    if (!contracts) return [];
    const ruolo = isSuperAdmin ? formData.ruolo : currentUser?.ruolo;
    return contracts.filter((c) => {
      if (ruolo === Ruolo.PILOT) {
        return (
          c.codice.includes("PI") ||
          ["AFA", "Contractor", "DAC"].includes(c.codice)
        );
      }
      if (ruolo === Ruolo.CABIN_CREW) {
        return c.codice.includes("CC") || c.codice === "CrewLink";
      }
      return true;
    });
  }, [contracts, isSuperAdmin, formData.ruolo, currentUser?.ruolo]);

  const filteredGrades = useMemo(() => {
    if (!grades) return [];
    const ruolo = isSuperAdmin ? formData.ruolo : currentUser?.ruolo;
    if (!ruolo) return grades;
    return grades.filter((g) => g.ruolo === ruolo);
  }, [grades, isSuperAdmin, formData.ruolo, currentUser?.ruolo]);

  // PDF extraction state
  const [selectedPdf, setSelectedPdf] = useState<{
    name: string;
    uri: string;
  } | null>(null);
  const [extractionStatus, setExtractionStatus] = useState<
    "idle" | "extracting" | "success" | "error"
  >("idle");
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfPreviewBase64, setPdfPreviewBase64] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [activePicker, setActivePicker] = useState<
    "dataIscrizione" | "dateOfEntry" | "dateOfCaptaincy" | null
  >(null);

  const rolesSelected = !isSuperAdmin || (!!formData.role && !!formData.ruolo);

  const isSelectedGradeCaptain = useMemo(() => {
    if (formData.gradeId && grades) {
      const g = grades.find((gr) => gr.id === formData.gradeId);
      return g ? CAPTAIN_GRADES_CREATE.includes(g.codice) : false;
    }
    return false;
  }, [formData.gradeId, grades]);

  // Handle shared PDF on mount
  React.useEffect(() => {
    if (sharedPdfUri) {
      // Set the selected PDF
      const fileName = sharedPdfUri.split("/").pop() || "shared-document.pdf";
      setSelectedPdf({ name: fileName, uri: sharedPdfUri });

      // If we have extracted data from the shared file, pre-populate the form
      if (extractedData) {
        setExtractionStatus("success");
        setFormData((prev) => ({
          ...prev,
          crewcode: extractedData.crewcode || prev.crewcode,
          nome: extractedData.nome || prev.nome,
          cognome: extractedData.cognome || prev.cognome,
          email: extractedData.email || prev.email,
          telefono: extractedData.telefono || prev.telefono,
          baseId: extractedData.baseId || prev.baseId,
          contrattoId: extractedData.contrattoId || prev.contrattoId,
          gradeId: extractedData.gradeId || prev.gradeId,
          dataIscrizione: extractedData.dataIscrizione || prev.dataIscrizione,
          ruolo: extractedData.ruolo || prev.ruolo,
        }));

        Alert.alert(
          "PDF Imported",
          `Data extracted from shared PDF. Please verify and correct any errors before saving.`,
          [{ text: "OK" }],
        );
      } else {
        // No extracted data, just set the PDF for upload
        setExtractionStatus("idle");
        Alert.alert(
          "PDF Imported",
          "PDF received. Please fill in the member details manually.",
          [{ text: "OK" }],
        );
      }
    }
  }, [sharedPdfUri, extractedData]);

  // Helper to parse DD/MM/YYYY string to Date
  const parseDate = (dateStr: string | undefined): Date | null => {
    if (!dateStr) return null;
    const parts = dateStr.split("/");
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
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

  // Extract PDF mutation
  const extractPdfMutation = useMutation({
    mutationFn: ({ fileUri, role }: { fileUri: string; role: Ruolo }) =>
      usersApi.extractPdf(fileUri, role),
    onSuccess: (data: ExtractedPdfData) => {
      setExtractionStatus("success");
      // Prepopulate form with extracted data
      setFormData((prev) => ({
        ...prev,
        crewcode: data.crewcode || prev.crewcode,
        nome: data.nome || prev.nome,
        cognome: data.cognome || prev.cognome,
        email: data.email || prev.email,
        telefono: data.telefono || prev.telefono,
        baseId: data.baseId || prev.baseId,
        contrattoId: data.contrattoId || prev.contrattoId,
        gradeId: data.gradeId || prev.gradeId,
        dataIscrizione: data.dataIscrizione || prev.dataIscrizione,
      }));
      Alert.alert(
        "PDF Processed",
        `Data extracted with ${Math.round(data.confidence * 100)}% confidence. Please verify and correct any errors.`,
        [{ text: "OK" }],
      );
    },
    onError: () => {
      setExtractionStatus("error");
      Alert.alert(
        "Extraction Failed",
        "Could not extract data from PDF. Please fill in the form manually.",
      );
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreateUserData) => {
      // First create the user
      const newUser = await usersApi.createUser(data);

      // Then upload the PDF if selected
      if (selectedPdf?.uri) {
        setIsUploadingPdf(true);
        try {
          await usersApi.uploadRegistrationForm(newUser.id, selectedPdf.uri);
        } catch (error) {
          console.warn("Failed to upload PDF:", error);
          // Don't fail the whole operation if PDF upload fails
        } finally {
          setIsUploadingPdf(false);
        }
      }

      return newUser;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      Alert.alert("Success", "Member created successfully");
      navigation.goBack();
    },
    onError: (error: any) => {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to create member",
      );
    },
  });

  const handlePdfUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const file = result.assets[0];
        setSelectedPdf({ name: file.name, uri: file.uri });
        setExtractionStatus("extracting");

        // Use current user's role for extraction (or selected role if SuperAdmin)
        const extractionRole = formData.ruolo || currentUser?.ruolo;
        if (extractionRole) {
          extractPdfMutation.mutate({
            fileUri: file.uri,
            role: extractionRole,
          });
        } else {
          Alert.alert(
            "Role Required",
            "Please select a crew role (Pilot/Cabin Crew) before uploading PDF.",
          );
          setExtractionStatus("idle");
        }
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick PDF file");
      setExtractionStatus("idle");
    }
  };

  const validateForm = (): boolean => {
    if (!formData.crewcode.trim()) {
      Alert.alert("Error", "Crewcode is required");
      return false;
    }
    if (!formData.nome.trim()) {
      Alert.alert("Error", "First name is required");
      return false;
    }
    if (!formData.cognome.trim()) {
      Alert.alert("Error", "Last name is required");
      return false;
    }
    if (!formData.email.trim()) {
      Alert.alert("Error", "Email is required");
      return false;
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return false;
    }
    return true;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    // Build create data
    const createData: CreateUserData = {
      crewcode: formData.crewcode.toUpperCase(),
      nome: formData.nome,
      cognome: formData.cognome,
      email: formData.email.toLowerCase(),
      telefono: formData.telefono || undefined,
      baseId: formData.baseId || undefined,
      contrattoId: formData.contrattoId || undefined,
      gradeId: formData.gradeId || undefined,
      note: formData.note || undefined,
      itud: formData.itud,
      rsa: formData.rsa,
      rls: formData.rls,
      role: formData.role,
      ruolo: formData.ruolo,
      dateOfEntry: formData.dateOfEntry || undefined,
      dateOfCaptaincy: formData.dateOfCaptaincy || undefined,
    };

    createMutation.mutate(createData);
  };

  const handleCancel = () => {
    navigation.goBack();
  };

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
          <Text style={styles.headerTitle}>New Member</Text>
          <TouchableOpacity
            onPress={handleSave}
            style={styles.saveButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            disabled={createMutation.isPending || isUploadingPdf}
          >
            {createMutation.isPending || isUploadingPdf ? (
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
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* SuperAdmin: Role Management first — gates everything else */}
            {isSuperAdmin && (
              <Card style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Role Management</Text>

                <SelectField
                  label="System Role"
                  value={formData.role || ""}
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
                    setFormData({
                      ...formData,
                      ruolo: value as Ruolo,
                      gradeId: "",
                      contrattoId: "",
                    })
                  }
                  icon={<User size={20} color={colors.primary} />}
                  placeholder="Select crew role"
                />
              </Card>
            )}

            {rolesSelected && (
              <>
                {/* PDF Upload Section */}
                <Card style={{ ...styles.sectionCard, ...styles.pdfCard }}>
                  <Text style={styles.sectionTitle}>Registration Form</Text>
                  <Text style={styles.pdfDescription}>
                    Upload the signed membership form (PDF) to auto-fill the
                    fields
                  </Text>

                  <TouchableOpacity
                    style={[
                      styles.pdfUploadButton,
                      extractionStatus === "extracting" &&
                        styles.pdfUploadButtonDisabled,
                    ]}
                    onPress={handlePdfUpload}
                    disabled={extractionStatus === "extracting"}
                  >
                    {extractionStatus === "extracting" ? (
                      <>
                        <ActivityIndicator
                          size="small"
                          color={colors.primary}
                        />
                        <Text style={styles.pdfUploadText}>Extracting...</Text>
                      </>
                    ) : (
                      <>
                        <Upload size={24} color={colors.primary} />
                        <Text style={styles.pdfUploadText}>
                          {selectedPdf ? "Change PDF" : "Select PDF Form"}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {selectedPdf && (
                    <View style={styles.pdfInfo}>
                      <FileText size={16} color={colors.textSecondary} />
                      <Text style={styles.pdfName} numberOfLines={1}>
                        {selectedPdf.name}
                      </Text>
                      {extractionStatus === "success" && (
                        <View style={styles.extractionBadge}>
                          <ScanLine size={14} color={colors.success} />
                          <Text style={styles.extractionText}>Extracted</Text>
                        </View>
                      )}
                      <View style={styles.pdfActions}>
                        <TouchableOpacity
                          onPress={async () => {
                            // Generate preview from PDF
                            if (!selectedPdf) return;

                            setIsLoadingPreview(true);
                            try {
                              // Read PDF as base64 using legacy API
                              const base64 = await FileSystem.readAsStringAsync(
                                selectedPdf.uri,
                                {
                                  encoding: FileSystem.EncodingType.Base64,
                                },
                              );

                              // Send to backend for conversion
                              const response =
                                await usersApi.convertPdfToImage(base64);
                              setPdfPreviewBase64(response.imageBase64);
                              setShowPdfModal(true);
                            } catch (error) {
                              console.error("Error generating preview:", error);
                              Alert.alert(
                                "Error",
                                "Could not generate PDF preview",
                              );
                            } finally {
                              setIsLoadingPreview(false);
                            }
                          }}
                          style={styles.pdfActionButton}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          disabled={isLoadingPreview}
                        >
                          {isLoadingPreview ? (
                            <ActivityIndicator
                              size="small"
                              color={colors.primary}
                            />
                          ) : (
                            <Eye size={18} color={colors.primary} />
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => {
                            setSelectedPdf(null);
                            setExtractionStatus("idle");
                          }}
                          style={styles.pdfActionButton}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <X size={18} color={colors.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </Card>

                {/* Subscription Date - Only if extracted from PDF or admin */}
                {(formData.dataIscrizione || isAdmin) && (
                  <Card style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>
                      Membership Information
                    </Text>

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

                    {formData.dataIscrizione && (
                      <Text style={styles.hintText}>
                        Date extracted from PDF signature
                      </Text>
                    )}
                  </Card>
                )}

                {/* Professional Dates - optional for admins */}
                {isAdmin && (
                  <Card style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Professional Dates</Text>

                    <Text style={styles.datePickerLabel}>Date of Entry</Text>
                    <TouchableOpacity
                      style={styles.datePickerButton}
                      onPress={() => setActivePicker("dateOfEntry")}
                    >
                      <View style={styles.datePickerIcon}>
                        <Calendar size={20} color={colors.primary} />
                      </View>
                      <View style={styles.datePickerContent}>
                        <Text style={styles.datePickerValue}>
                          {formData.dateOfEntry || "Select date (optional)"}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {isSelectedGradeCaptain && (
                      <>
                        <Text
                          style={[
                            styles.datePickerLabel,
                            { marginTop: spacing.md },
                          ]}
                        >
                          Date of Captaincy
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
                              {formData.dateOfCaptaincy ||
                                "Select date (optional)"}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      </>
                    )}
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
                            activePicker
                              ? (formData as any)[activePicker]
                              : undefined,
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

                {/* Personal Info Section */}
                <Card style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Personal Information</Text>

                  <InputField
                    label="Crewcode"
                    value={formData.crewcode}
                    onChangeText={(text) =>
                      setFormData({ ...formData, crewcode: text.toUpperCase() })
                    }
                    icon={<Hash size={20} color={colors.primary} />}
                    autoCapitalize="characters"
                    required
                    placeholder="e.g. PIL0001"
                  />

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
                    value={formData.telefono || ""}
                    onChangeText={(text) =>
                      setFormData({ ...formData, telefono: text })
                    }
                    icon={<Phone size={20} color={colors.primary} />}
                    keyboardType="phone-pad"
                  />
                </Card>

                {/* Professional Info Section */}
                <Card style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>
                    Professional Information
                  </Text>

                  <SelectField
                    label="Base"
                    value={formData.baseId || ""}
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
                    value={formData.contrattoId || ""}
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
                    value={formData.gradeId || ""}
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
                </Card>

                {/* Admin Fields Section - Only for Admins */}
                {isAdmin && (
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
                        trackColor={{
                          false: colors.border,
                          true: colors.primary,
                        }}
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
                        trackColor={{
                          false: colors.border,
                          true: colors.primary,
                        }}
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
                        trackColor={{
                          false: colors.border,
                          true: colors.primary,
                        }}
                        thumbColor={colors.background}
                      />
                    </View>
                  </Card>
                )}

                {/* Notes Section - Only for admins */}
                {isAdmin && (
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
                    title="Create Member"
                    onPress={handleSave}
                    loading={createMutation.isPending}
                    style={styles.actionButton}
                  />
                </View>
              </>
            )}

            <View style={styles.bottomSpacer} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* PDF Preview Modal */}
      <Modal
        visible={showPdfModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowPdfModal(false)}
      >
        <View style={styles.modalWrapper}>
          <View style={[styles.modalStatusBarHack, { height: insets.top }]} />
          <SafeAreaView
            style={styles.modalContainer}
            edges={["bottom", "left", "right"]}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setShowPdfModal(false)}
                style={styles.modalCloseButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={24} color={colors.textInverse} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Registration Form Preview</Text>
              <View style={styles.modalSpacer} />
            </View>

            <View style={styles.modalContent}>
              {pdfPreviewBase64 ? (
                <ZoomableImage
                  base64={pdfPreviewBase64}
                  onClose={() => setShowPdfModal(false)}
                />
              ) : (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.loadingText}>Generating preview...</Text>
                </View>
              )}
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
};

// Zoomable Image Component
interface ZoomableImageProps {
  base64: string;
  onClose: () => void;
}

const ZoomableImage: React.FC<ZoomableImageProps> = ({ base64, onClose }) => {
  const [scale, setScale] = useState(1);
  const [lastScale, setLastScale] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [lastOffsetX, setLastOffsetX] = useState(0);
  const [lastOffsetY, setLastOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startTouches = useRef<{ x: number; y: number }[]>([]);
  const startDistance = useRef(0);

  const handleTouchStart = (e: any) => {
    const touches = e.nativeEvent.touches;
    startTouches.current = touches.map((t: any) => ({
      x: t.pageX,
      y: t.pageY,
    }));

    if (touches.length === 2) {
      // Pinch start - calculate initial distance
      const dx = touches[0].pageX - touches[1].pageX;
      const dy = touches[0].pageY - touches[1].pageY;
      startDistance.current = Math.sqrt(dx * dx + dy * dy);
    } else if (touches.length === 1) {
      // Pan start
      setIsDragging(true);
    }
  };

  const handleTouchMove = (e: any) => {
    const touches = e.nativeEvent.touches;

    if (touches.length === 2 && startTouches.current.length === 2) {
      // Pinch zoom
      const dx = touches[0].pageX - touches[1].pageX;
      const dy = touches[0].pageY - touches[1].pageY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (startDistance.current > 0) {
        const newScale = Math.min(
          Math.max(lastScale * (distance / startDistance.current), 1),
          4,
        );
        setScale(newScale);
      }
    } else if (touches.length === 1 && isDragging && scale > 1) {
      // Pan when zoomed
      const dx = touches[0].pageX - startTouches.current[0].x;
      const dy = touches[0].pageY - startTouches.current[0].y;

      setOffsetX(lastOffsetX + dx);
      setOffsetY(lastOffsetY + dy);
    }
  };

  const handleTouchEnd = () => {
    setLastScale(scale);
    setLastOffsetX(offsetX);
    setLastOffsetY(offsetY);
    setIsDragging(false);
    startTouches.current = [];

    // Reset if zoomed out too much
    if (scale < 1) {
      setScale(1);
      setLastScale(1);
      setOffsetX(0);
      setOffsetY(0);
      setLastOffsetX(0);
      setLastOffsetY(0);
    }
  };

  const handleDoubleTap = () => {
    if (scale > 1) {
      // Reset zoom
      setScale(1);
      setLastScale(1);
      setOffsetX(0);
      setOffsetY(0);
      setLastOffsetX(0);
      setLastOffsetY(0);
    } else {
      // Zoom in
      setScale(2);
      setLastScale(2);
    }
  };

  return (
    <View
      style={styles.zoomableContainer}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={handleDoubleTap}
        style={styles.zoomableTouchable}
      >
        <View
          style={[
            styles.zoomableImageContainer,
            {
              transform: [
                { scale },
                { translateX: offsetX },
                { translateY: offsetY },
              ],
            },
          ]}
        >
          <Image
            source={{ uri: `data:image/png;base64,${base64}` }}
            style={styles.zoomableImage}
            resizeMode="contain"
          />
        </View>
      </TouchableOpacity>

      {/* Zoom controls */}
      <View style={styles.zoomControls}>
        <TouchableOpacity
          style={styles.zoomButton}
          onPress={() => {
            const newScale = Math.min(scale * 1.5, 4);
            setScale(newScale);
            setLastScale(newScale);
          }}
        >
          <Text style={styles.zoomButtonText}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.zoomButton}
          onPress={() => {
            const newScale = Math.max(scale / 1.5, 1);
            setScale(newScale);
            setLastScale(newScale);
            if (newScale === 1) {
              setOffsetX(0);
              setOffsetY(0);
              setLastOffsetX(0);
              setLastOffsetY(0);
            }
          }}
        >
          <Text style={styles.zoomButtonText}>-</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.zoomButton} onPress={handleDoubleTap}>
          <Text style={styles.zoomButtonText}>⟲</Text>
        </TouchableOpacity>
      </View>

      {/* Instructions */}
      <View style={styles.zoomInstructions}>
        <Text style={styles.zoomInstructionsText}>
          Double tap to zoom • Pinch to zoom • Drag to pan
        </Text>
      </View>
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
  placeholder?: string;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  value,
  onChangeText,
  icon,
  keyboardType = "default",
  autoCapitalize = "sentences",
  required = false,
  placeholder,
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
        placeholder={placeholder}
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
  pdfCard: {
    backgroundColor: colors.primary + "08",
    borderWidth: 1,
    borderColor: colors.primary + "20",
  },
  pdfDescription: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  hintText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontStyle: "italic",
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
  datePickerContainer: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
    overflow: "hidden",
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
  pdfUploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: "dashed",
    gap: spacing.sm,
  },
  pdfUploadButtonDisabled: {
    borderColor: colors.textTertiary,
    opacity: 0.7,
  },
  pdfUploadText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.primary,
  },
  pdfInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  pdfName: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  extractionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.success + "15",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  extractionText: {
    fontSize: typography.sizes.xs,
    color: colors.success,
    fontWeight: typography.weights.medium,
  },
  pdfActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  pdfActionButton: {
    padding: spacing.xs,
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

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
  },
  loadingText: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
  },
  // Modal styles
  modalWrapper: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  modalStatusBarHack: {
    backgroundColor: colors.primary,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    minHeight: 56,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
    flex: 1,
    textAlign: "center",
  },
  modalSpacer: {
    width: 40,
  },
  modalContent: {
    flex: 1,
  },
  previewContainer: {
    padding: spacing.md,
    alignItems: "center",
  },
  previewImage: {
    width: "100%",
    height: 800,
    borderRadius: borderRadius.md,
  },
  // Zoomable image styles
  zoomableContainer: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: "hidden",
  },
  zoomableTouchable: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  zoomableImageContainer: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  zoomableImage: {
    width: "100%",
    height: "100%",
  },
  zoomControls: {
    position: "absolute",
    right: spacing.md,
    bottom: spacing.xl,
    flexDirection: "column",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  zoomButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  zoomButtonText: {
    fontSize: 24,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },
  zoomInstructions: {
    position: "absolute",
    bottom: spacing.md,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  zoomInstructionsText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    backgroundColor: colors.surface + "CC",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
});
