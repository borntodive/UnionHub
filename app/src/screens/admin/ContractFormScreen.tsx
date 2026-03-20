import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import {
  useNavigation,
  useRoute,
  RouteProp,
  DrawerActions,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Menu, Save, Briefcase, Hash } from "lucide-react-native";

import { colors, spacing, typography, borderRadius } from "../../theme";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { contractsApi } from "../../api/contracts";
import { RootStackParamList } from "../../navigation/types";

type ContractFormRouteProp = RouteProp<RootStackParamList, "ContractForm">;
type ContractFormNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const ContractFormScreen: React.FC = () => {
  const navigation = useNavigation<ContractFormNavigationProp>();
  const route = useRoute<ContractFormRouteProp>();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { contractId } = route.params || {};
  const isEditing = !!contractId;

  const [formData, setFormData] = useState({
    codice: "",
    nome: "",
  });

  // Fetch contract data if editing
  const { data: contract, isLoading: isLoadingContract } = useQuery({
    queryKey: ["contract", contractId],
    queryFn: () => contractsApi.getContractById(contractId!),
    enabled: isEditing,
  });

  // Populate form when data loads
  useEffect(() => {
    if (contract) {
      setFormData({
        codice: contract.codice,
        nome: contract.nome,
      });
    }
  }, [contract]);

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => contractsApi.createContract(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      Alert.alert("Success", "Contract created successfully");
      navigation.goBack();
    },
    onError: (error: any) => {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to create contract",
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) =>
      contractsApi.updateContract(contractId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["contract", contractId] });
      Alert.alert("Success", "Contract updated successfully");
      navigation.goBack();
    },
    onError: (error: any) => {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to update contract",
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
    createMutation.isPending || updateMutation.isPending || isLoadingContract;

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
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            style={styles.menuButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Menu size={24} color={colors.textInverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditing ? "Edit Contract" : "New Contract"}
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

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
                  placeholder="e.g. MAY-PI, CC-AFA"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="characters"
                  maxLength={20}
                />
              </View>
              <Text style={styles.hint}>
                Contract code (e.g. MAY-PI for Pilots, MAY-CC for Cabin Crew)
              </Text>
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>
                Name <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputContainer}>
                <View style={styles.inputIcon}>
                  <Briefcase size={20} color={colors.primary} />
                </View>
                <TextInput
                  style={styles.input}
                  value={formData.nome}
                  onChangeText={(text) =>
                    setFormData({ ...formData, nome: text })
                  }
                  placeholder="e.g. CCNL Naviganti Piloti"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
              <Text style={styles.hint}>Full name of the contract</Text>
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
              title={isEditing ? "Update Contract" : "Create Contract"}
              onPress={handleSave}
              loading={isLoading}
              style={styles.actionButton}
            />
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
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
  menuButton: {
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
