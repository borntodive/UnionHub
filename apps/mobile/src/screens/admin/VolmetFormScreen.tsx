import React, { useState, useEffect } from "react";
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
  Platform,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Save,
  Radio,
  Hash,
  MapPin,
  Globe,
  Plus,
  X,
} from "lucide-react-native";

import { colors, spacing, typography, borderRadius } from "../../theme";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { volmetApi, Volmet } from "../../api/volmet";
import { RootStackParamList } from "../../navigation/types";

type VolmetFormRouteProp = RouteProp<RootStackParamList, "VolmetForm">;
type VolmetFormNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const COMMON_REGIONS = [
  "Italy",
  "Spain",
  "United Kingdom",
  "Ireland",
  "Portugal",
  "France",
  "Germany",
  "Netherlands",
  "Belgium",
  "Poland",
  "Greece",
  "Malta",
  "Croatia",
  "Morocco",
  "Bulgaria",
  "Romania",
  "Hungary",
  "Czech Republic",
  "Austria",
  "Switzerland",
  "Denmark",
  "Sweden",
  "Norway",
  "Finland",
  "Iceland",
  "Cyprus",
  "Turkey",
  "Other",
];

export const VolmetFormScreen: React.FC = () => {
  const navigation = useNavigation<VolmetFormNavigationProp>();
  const route = useRoute<VolmetFormRouteProp>();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { volmetId } = route.params || {};
  const isEditing = !!volmetId;

  const [formData, setFormData] = useState({
    icao: "",
    iata: "",
    name: "",
    city: "",
    country: "",
    region: "",
    frequencies: [""] as string[],
    isActive: true,
  });

  const [showRegionPicker, setShowRegionPicker] = useState(false);

  // Fetch volmet data if editing
  const { data: volmet, isLoading: isLoadingVolmet } = useQuery({
    queryKey: ["volmet", volmetId],
    queryFn: () => volmetApi.getById(volmetId!),
    enabled: isEditing,
  });

  // Populate form when data loads
  useEffect(() => {
    if (volmet) {
      setFormData({
        icao: volmet.icao,
        iata: volmet.iata || "",
        name: volmet.name,
        city: volmet.city,
        country: volmet.country,
        region: volmet.region,
        frequencies: volmet.frequencies.length > 0 ? volmet.frequencies : [""],
        isActive: volmet.isActive,
      });
    }
  }, [volmet]);

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) =>
      volmetApi.create({
        icao: data.icao,
        iata: data.iata || undefined,
        name: data.name,
        city: data.city,
        country: data.country,
        region: data.region,
        frequencies: data.frequencies.filter((f) => f.trim()),
        isActive: data.isActive,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["volmets-admin"] });
      queryClient.invalidateQueries({ queryKey: ["volmets"] });
      queryClient.invalidateQueries({ queryKey: ["volmet-regions"] });
      Alert.alert("Success", "VOLMET entry created successfully");
      navigation.goBack();
    },
    onError: (error: any) => {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to create VOLMET entry",
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) =>
      volmetApi.update(volmetId!, {
        icao: data.icao,
        iata: data.iata || undefined,
        name: data.name,
        city: data.city,
        country: data.country,
        region: data.region,
        frequencies: data.frequencies.filter((f) => f.trim()),
        isActive: data.isActive,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["volmets-admin"] });
      queryClient.invalidateQueries({ queryKey: ["volmets"] });
      queryClient.invalidateQueries({ queryKey: ["volmet-regions"] });
      Alert.alert("Success", "VOLMET entry updated successfully");
      navigation.goBack();
    },
    onError: (error: any) => {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to update VOLMET entry",
      );
    },
  });

  const validateForm = (): boolean => {
    if (!formData.icao.trim()) {
      Alert.alert("Error", "ICAO code is required");
      return false;
    }
    if (formData.icao.length !== 4) {
      Alert.alert("Error", "ICAO code must be 4 characters");
      return false;
    }
    if (!formData.name.trim()) {
      Alert.alert("Error", "Airport name is required");
      return false;
    }
    if (!formData.city.trim()) {
      Alert.alert("Error", "City is required");
      return false;
    }
    if (!formData.country.trim()) {
      Alert.alert("Error", "Country code is required");
      return false;
    }
    if (formData.country.length !== 2) {
      Alert.alert(
        "Error",
        "Country code must be 2 characters (e.g., IT, ES, GB)",
      );
      return false;
    }
    if (!formData.region.trim()) {
      Alert.alert("Error", "Region is required");
      return false;
    }
    const validFrequencies = formData.frequencies.filter((f) => f.trim());
    if (validFrequencies.length === 0) {
      Alert.alert("Error", "At least one frequency is required");
      return false;
    }
    return true;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    const data = {
      ...formData,
      icao: formData.icao.toUpperCase(),
      iata: formData.iata.toUpperCase(),
      country: formData.country.toUpperCase(),
    };

    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const addFrequency = () => {
    setFormData({ ...formData, frequencies: [...formData.frequencies, ""] });
  };

  const updateFrequency = (index: number, value: string) => {
    const newFreqs = [...formData.frequencies];
    newFreqs[index] = value;
    setFormData({ ...formData, frequencies: newFreqs });
  };

  const removeFrequency = (index: number) => {
    if (formData.frequencies.length <= 1) {
      Alert.alert("Error", "At least one frequency is required");
      return;
    }
    const newFreqs = formData.frequencies.filter((_, i) => i !== index);
    setFormData({ ...formData, frequencies: newFreqs });
  };

  const isLoading =
    createMutation.isPending || updateMutation.isPending || isLoadingVolmet;

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
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={24} color={colors.textInverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditing ? "Edit VOLMET" : "New VOLMET"}
          </Text>
          <TouchableOpacity
            onPress={handleSave}
            style={styles.saveButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            disabled={isLoading}
          >
            {isLoading ? (
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
            <Card style={styles.formCard}>
              {/* ICAO Code */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>
                  ICAO Code <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.inputContainer}>
                  <View style={styles.inputIcon}>
                    <Hash size={20} color={colors.primary} />
                  </View>
                  <TextInput
                    style={styles.input}
                    value={formData.icao}
                    onChangeText={(text) =>
                      setFormData({ ...formData, icao: text.toUpperCase() })
                    }
                    placeholder="e.g. LIRF"
                    placeholderTextColor={colors.textTertiary}
                    autoCapitalize="characters"
                    maxLength={4}
                  />
                </View>
              </View>

              {/* IATA Code */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>IATA Code</Text>
                <View style={styles.inputContainer}>
                  <View style={styles.inputIcon}>
                    <Hash size={20} color={colors.primary} />
                  </View>
                  <TextInput
                    style={styles.input}
                    value={formData.iata}
                    onChangeText={(text) =>
                      setFormData({ ...formData, iata: text.toUpperCase() })
                    }
                    placeholder="e.g. FCO"
                    placeholderTextColor={colors.textTertiary}
                    autoCapitalize="characters"
                    maxLength={3}
                  />
                </View>
                <Text style={styles.hint}>3-letter IATA code (optional)</Text>
              </View>

              {/* Airport Name */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>
                  Airport Name <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.inputContainer}>
                  <View style={styles.inputIcon}>
                    <Radio size={20} color={colors.primary} />
                  </View>
                  <TextInput
                    style={styles.input}
                    value={formData.name}
                    onChangeText={(text) =>
                      setFormData({ ...formData, name: text })
                    }
                    placeholder="e.g. Rome Fiumicino Airport"
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>
              </View>

              {/* City */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>
                  City <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.inputContainer}>
                  <View style={styles.inputIcon}>
                    <MapPin size={20} color={colors.primary} />
                  </View>
                  <TextInput
                    style={styles.input}
                    value={formData.city}
                    onChangeText={(text) =>
                      setFormData({ ...formData, city: text })
                    }
                    placeholder="e.g. Rome"
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>
              </View>

              {/* Country Code */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>
                  Country Code <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.inputContainer}>
                  <View style={styles.inputIcon}>
                    <Globe size={20} color={colors.primary} />
                  </View>
                  <TextInput
                    style={styles.input}
                    value={formData.country}
                    onChangeText={(text) =>
                      setFormData({ ...formData, country: text.toUpperCase() })
                    }
                    placeholder="e.g. IT"
                    placeholderTextColor={colors.textTertiary}
                    autoCapitalize="characters"
                    maxLength={2}
                  />
                </View>
                <Text style={styles.hint}>
                  2-letter country code (ISO 3166-1 alpha-2)
                </Text>
              </View>

              {/* Region */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>
                  Region <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setShowRegionPicker(!showRegionPicker)}
                >
                  <Text style={styles.pickerButtonText}>
                    {formData.region || "Select region"}
                  </Text>
                </TouchableOpacity>

                {showRegionPicker && (
                  <View style={styles.regionGrid}>
                    {COMMON_REGIONS.map((region) => (
                      <TouchableOpacity
                        key={region}
                        style={[
                          styles.regionOption,
                          formData.region === region &&
                            styles.regionOptionSelected,
                        ]}
                        onPress={() => {
                          setFormData({ ...formData, region });
                          setShowRegionPicker(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.regionOptionText,
                            formData.region === region &&
                              styles.regionOptionTextSelected,
                          ]}
                        >
                          {region}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Frequencies */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>
                  Frequencies <Text style={styles.required}>*</Text>
                </Text>
                <Text style={styles.hint}>
                  VOLMET frequencies in MHz (e.g., 127.6)
                </Text>

                {formData.frequencies.map((freq, index) => (
                  <View key={index} style={styles.frequencyRow}>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        value={freq}
                        onChangeText={(value) => updateFrequency(index, value)}
                        placeholder="127.6"
                        placeholderTextColor={colors.textTertiary}
                        keyboardType="numbers-and-punctuation"
                      />
                    </View>
                    {formData.frequencies.length > 1 && (
                      <TouchableOpacity
                        style={styles.removeFreqButton}
                        onPress={() => removeFrequency(index)}
                      >
                        <X size={20} color={colors.error} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}

                <TouchableOpacity
                  style={styles.addFreqButton}
                  onPress={addFrequency}
                >
                  <Plus size={18} color={colors.primary} />
                  <Text style={styles.addFreqText}>Add Frequency</Text>
                </TouchableOpacity>
              </View>

              {/* Active Status */}
              <View style={styles.fieldContainer}>
                <View style={styles.switchRow}>
                  <Text style={styles.fieldLabel}>Active</Text>
                  <TouchableOpacity
                    style={[
                      styles.switch,
                      formData.isActive && styles.switchActive,
                    ]}
                    onPress={() =>
                      setFormData({ ...formData, isActive: !formData.isActive })
                    }
                  >
                    <View
                      style={[
                        styles.switchKnob,
                        formData.isActive && styles.switchKnobActive,
                      ]}
                    />
                  </TouchableOpacity>
                </View>
                <Text style={styles.hint}>
                  Inactive entries are hidden from users
                </Text>
              </View>
            </Card>

            <View style={styles.actionsContainer}>
              <Button
                title="Cancel"
                onPress={() => navigation.goBack()}
                variant="secondary"
                style={styles.actionButton}
              />
              <Button
                title={isEditing ? "Update" : "Create"}
                onPress={handleSave}
                loading={isLoading}
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
  formCard: {
    margin: spacing.md,
    padding: spacing.md,
  },
  fieldContainer: {
    marginBottom: spacing.lg,
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
  hint: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pickerButtonText: {
    fontSize: typography.sizes.base,
    color: colors.text,
  },
  regionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  regionOption: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  regionOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  regionOptionText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  regionOptionTextSelected: {
    color: colors.textInverse,
    fontWeight: typography.weights.medium,
  },
  frequencyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  removeFreqButton: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: borderRadius.md,
    backgroundColor: colors.error + "10",
  },
  addFreqButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    borderStyle: "dashed",
  },
  addFreqText: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    fontWeight: typography.weights.medium,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  switch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    padding: 2,
  },
  switchActive: {
    backgroundColor: colors.primary,
  },
  switchKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  switchKnobActive: {
    transform: [{ translateX: 20 }],
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
});
