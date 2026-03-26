import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
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
import { issueUrgenciesApi } from "../../api/issue-urgencies";
import { RootStackParamList } from "../../navigation/types";

type RouteType = RouteProp<RootStackParamList, "IssueUrgencyForm">;

export const IssueUrgencyFormScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteType>();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const urgencyId = route.params?.urgencyId;
  const isEdit = !!urgencyId;

  const [nameIt, setNameIt] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [level, setLevel] = useState("3");

  const { data: existing } = useQuery({
    queryKey: ["issueUrgency", urgencyId],
    queryFn: () => issueUrgenciesApi.getById(urgencyId!),
    enabled: !!urgencyId,
  });

  useEffect(() => {
    if (existing) {
      setNameIt(existing.nameIt);
      setNameEn(existing.nameEn);
      setLevel(String(existing.level));
    }
  }, [existing]);

  const createMutation = useMutation({
    mutationFn: issueUrgenciesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issueUrgencies"] });
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
    mutationFn: (data: any) => issueUrgenciesApi.update(urgencyId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issueUrgencies"] });
      queryClient.invalidateQueries({ queryKey: ["issueUrgency", urgencyId] });
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
    const levelNum = parseInt(level, 10);
    if (isNaN(levelNum) || levelNum < 1 || levelNum > 5) {
      Alert.alert(t("common.error"), t("issues.levelInvalid"));
      return;
    }
    const data = {
      nameIt: nameIt.trim(),
      nameEn: nameEn.trim(),
      level: levelNum,
    };
    if (isEdit) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

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
            {isEdit ? t("issues.editUrgency") : t("issues.addUrgency")}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={insets.top + 56}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.label}>{t("issues.nameEn")}</Text>
            <TextInput
              style={styles.input}
              value={nameEn}
              onChangeText={setNameEn}
              placeholder="Urgency name in English"
              placeholderTextColor={colors.textTertiary}
            />

            <Text style={styles.label}>{t("issues.nameIt")}</Text>
            <TextInput
              style={styles.input}
              value={nameIt}
              onChangeText={setNameIt}
              placeholder="Nome urgenza in italiano"
              placeholderTextColor={colors.textTertiary}
            />

            <Text style={styles.label}>{t("issues.level")} (1-5)</Text>
            <TextInput
              style={styles.input}
              value={level}
              onChangeText={setLevel}
              keyboardType="numeric"
              maxLength={1}
              placeholderTextColor={colors.textTertiary}
            />

            <TouchableOpacity
              style={[
                styles.saveButton,
                isPending && styles.saveButtonDisabled,
              ]}
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
        </KeyboardAvoidingView>
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
