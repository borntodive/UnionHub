import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { colors, spacing, typography, borderRadius } from "../../theme";
import { issueCategoriesApi } from "../../api/issue-categories";
import { Ruolo } from "../../types";
import { RootStackParamList } from "../../navigation/types";

type RouteType = RouteProp<RootStackParamList, "IssueCategoryForm">;

export const IssueCategoryFormScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteType>();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const categoryId = route.params?.categoryId;
  const isEdit = !!categoryId;

  const [nameIt, setNameIt] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [ruolo, setRuolo] = useState<Ruolo>(Ruolo.PILOT);

  const { data: existing } = useQuery({
    queryKey: ["issueCategory", categoryId],
    queryFn: () => issueCategoriesApi.getById(categoryId!),
    enabled: !!categoryId,
  });

  useEffect(() => {
    if (existing) {
      setNameIt(existing.nameIt);
      setNameEn(existing.nameEn);
      setRuolo(existing.ruolo);
    }
  }, [existing]);

  const createMutation = useMutation({
    mutationFn: issueCategoriesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issueCategories"] });
      navigation.goBack();
    },
    onError: (error: any) => {
      Alert.alert(
        t("common.error"),
        error.response?.data?.message || t("errors.generic"),
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => issueCategoriesApi.update(categoryId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issueCategories"] });
      queryClient.invalidateQueries({
        queryKey: ["issueCategory", categoryId],
      });
      navigation.goBack();
    },
    onError: (error: any) => {
      Alert.alert(
        t("common.error"),
        error.response?.data?.message || t("errors.generic"),
      );
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSave = () => {
    if (!nameIt.trim() || !nameEn.trim()) {
      Alert.alert(t("common.error"), t("issues.nameRequired"));
      return;
    }
    const data = { nameIt: nameIt.trim(), nameEn: nameEn.trim(), ruolo };
    if (isEdit) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const RUOLO_OPTIONS = [
    { value: Ruolo.PILOT, label: "Pilot" },
    { value: Ruolo.CABIN_CREW, label: "Cabin Crew" },
  ];

  return (
    <View style={styles.wrapper}>
      <View style={[styles.statusBarHack, { height: insets.top }]} />
      <SafeAreaView
        style={styles.container}
        edges={["bottom", "left", "right"]}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={24} color={colors.textInverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEdit ? t("issues.editCategory") : t("issues.addCategory")}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.label}>{t("issues.nameEn")}</Text>
          <TextInput
            style={styles.input}
            value={nameEn}
            onChangeText={setNameEn}
            placeholder="Category name in English"
            placeholderTextColor={colors.textTertiary}
          />

          <Text style={styles.label}>{t("issues.nameIt")}</Text>
          <TextInput
            style={styles.input}
            value={nameIt}
            onChangeText={setNameIt}
            placeholder="Nome categoria in italiano"
            placeholderTextColor={colors.textTertiary}
          />

          <Text style={styles.label}>{t("members.role")}</Text>
          <View style={styles.optionsList}>
            {RUOLO_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.optionItem,
                  ruolo === opt.value && styles.optionItemSelected,
                ]}
                onPress={() => setRuolo(opt.value)}
              >
                <Text
                  style={[
                    styles.optionText,
                    ruolo === opt.value && styles.optionTextSelected,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.saveButton, isPending && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isPending}
          >
            {isPending ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <Text style={styles.saveButtonText}>{t("common.save")}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.primary },
  statusBarHack: { backgroundColor: colors.primary },
  container: { flex: 1, backgroundColor: colors.background },
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
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.base,
    color: colors.text,
  },
  optionsList: { flexDirection: "row", gap: spacing.sm },
  optionItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionItemSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionText: { fontSize: typography.sizes.sm, color: colors.text },
  optionTextSelected: {
    color: colors.textInverse,
    fontWeight: typography.weights.medium,
  },
  saveButton: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: {
    color: colors.textInverse,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
  },
});
