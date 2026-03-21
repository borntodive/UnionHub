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
import { ArrowLeft, Save, Building2, Hash } from "lucide-react-native";

import { colors, spacing, typography, borderRadius } from "../../theme";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { basesApi } from "../../api/bases";
import { RootStackParamList } from "../../navigation/types";

type BaseFormRouteProp = RouteProp<RootStackParamList, "BaseForm">;
type BaseFormNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const BaseFormScreen: React.FC = () => {
  const navigation = useNavigation<BaseFormNavigationProp>();
  const route = useRoute<BaseFormRouteProp>();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { baseId } = route.params || {};
  const isEditing = !!baseId;

  const [formData, setFormData] = useState({
    codice: "",
    nome: "",
  });

  // Fetch base data if editing
  const { data: base, isLoading: isLoadingBase } = useQuery({
    queryKey: ["base", baseId],
    queryFn: () => basesApi.getBaseById(baseId!),
    enabled: isEditing,
  });

  // Populate form when data loads
  useEffect(() => {
    if (base) {
      setFormData({
        codice: base.codice,
        nome: base.nome,
      });
    }
  }, [base]);

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => basesApi.createBase(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bases"] });
      Alert.alert("Success", "Base created successfully");
      navigation.goBack();
    },
    onError: (error: any) => {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to create base",
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) => basesApi.updateBase(baseId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bases"] });
      queryClient.invalidateQueries({ queryKey: ["base", baseId] });
      Alert.alert("Success", "Base updated successfully");
      navigation.goBack();
    },
    onError: (error: any) => {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to update base",
      );
    },
  });

  const validateForm = (): boolean => {
    if (!formData.codice.trim()) {
      Alert.alert("Error", "Code is required");
      return false;
    }
    if (!formData.nome.trim()) {
      Alert.alert("Error", "Name is required");
      return false;
    }
    return true;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    const data = {
      codice: formData.codice.toUpperCase(),
      nome: formData.nome,
    };

    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading =
    createMutation.isPending || updateMutation.isPending || isLoadingBase;

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
            {isEditing ? "Edit Base" : "New Base"}
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
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>
                  Code <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.inputContainer}>
                  <View style={styles.inputIcon}>
                    <Hash size={20} color={colors.primary} />
                  </View>
                  <TextInput
                    style={styles.input}
                    value={formData.codice}
                    onChangeText={(text) =>
                      setFormData({ ...formData, codice: text.toUpperCase() })
                    }
                    placeholder="e.g. FCO, MXP, VCE"
                    placeholderTextColor={colors.textTertiary}
                    autoCapitalize="characters"
                    maxLength={10}
                  />
                </View>
                <Text style={styles.hint}>
                  Airport code (e.g. FCO for Roma Fiumicino)
                </Text>
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>
                  Name <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.inputContainer}>
                  <View style={styles.inputIcon}>
                    <Building2 size={20} color={colors.primary} />
                  </View>
                  <TextInput
                    style={styles.input}
                    value={formData.nome}
                    onChangeText={(text) =>
                      setFormData({ ...formData, nome: text })
                    }
                    placeholder="e.g. Roma Fiumicino"
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>
                <Text style={styles.hint}>Full name of the base</Text>
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
                title={isEditing ? "Update Base" : "Create Base"}
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
