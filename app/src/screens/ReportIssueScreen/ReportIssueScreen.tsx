import React, { useState } from "react";
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
import { useNavigation } from "@react-navigation/native";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Menu, Send, WifiOff } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { colors, spacing, typography, borderRadius } from "../../theme";
import { useAuthStore } from "../../store/authStore";
import { useOfflineStore } from "../../store/offlineStore";
import { issuesApi } from "../../api/issues";
import { issueCategoriesApi } from "../../api/issue-categories";
import { issueUrgenciesApi } from "../../api/issue-urgencies";
import { IssueCategory, IssueUrgency } from "../../types";

export const ReportIssueScreen: React.FC = () => {
  const navigation = useNavigation<DrawerNavigationProp<any>>();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const {
    isOnline,
    categories: cachedCategories,
    urgencies: cachedUrgencies,
    addPendingIssue,
  } = useOfflineStore();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [selectedUrgencyId, setSelectedUrgencyId] = useState<string | null>(
    null,
  );

  const localName = (item: IssueCategory | IssueUrgency) =>
    i18n.language === "it" ? item.nameIt : item.nameEn;

  const { data: fetchedCategories } = useQuery({
    queryKey: ["issueCategories", user?.ruolo],
    queryFn: () => issueCategoriesApi.getAll(user?.ruolo ?? undefined),
    enabled: isOnline,
  });

  const { data: fetchedUrgencies } = useQuery({
    queryKey: ["issueUrgencies"],
    queryFn: issueUrgenciesApi.getAll,
    enabled: isOnline,
  });

  // When online and data is fresh, update the offline cache
  React.useEffect(() => {
    if (fetchedCategories)
      useOfflineStore.getState().setCategories(fetchedCategories);
  }, [fetchedCategories]);

  React.useEffect(() => {
    if (fetchedUrgencies)
      useOfflineStore.getState().setUrgencies(fetchedUrgencies);
  }, [fetchedUrgencies]);

  // Use fetched data when online, cached data when offline
  const categories: IssueCategory[] = fetchedCategories ?? cachedCategories;
  const urgencies: IssueUrgency[] = fetchedUrgencies ?? cachedUrgencies;

  // No cached data available offline
  const hasNoOfflineData =
    !isOnline && categories.length === 0 && urgencies.length === 0;

  const mutation = useMutation({
    mutationFn: issuesApi.createIssue,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myIssues"] });
      Alert.alert(t("common.success"), t("issues.reportSuccess"), [
        {
          text: t("common.ok"),
          onPress: () => navigation.navigate("MyIssues"),
        },
      ]);
    },
    onError: (error: any) => {
      Alert.alert(
        t("common.error"),
        error.response?.data?.message || t("issues.reportError"),
      );
    },
  });

  const validateForm = (): boolean => {
    if (!title.trim()) {
      Alert.alert(t("common.error"), t("issues.titleRequired"));
      return false;
    }
    if (!description.trim()) {
      Alert.alert(t("common.error"), t("issues.descriptionRequired"));
      return false;
    }
    if (!selectedCategoryId) {
      Alert.alert(t("common.error"), t("issues.categoryRequired"));
      return false;
    }
    if (!selectedUrgencyId) {
      Alert.alert(t("common.error"), t("issues.urgencyRequired"));
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    if (!isOnline) {
      addPendingIssue({
        title: title.trim(),
        description: description.trim(),
        categoryId: selectedCategoryId!,
        urgencyId: selectedUrgencyId!,
      });
      Alert.alert(t("common.success"), t("issues.savedOffline"), [
        {
          text: t("common.ok"),
          onPress: () => navigation.navigate("MyIssues"),
        },
      ]);
      return;
    }

    mutation.mutate({
      title: title.trim(),
      description: description.trim(),
      categoryId: selectedCategoryId!,
      urgencyId: selectedUrgencyId!,
    });
  };

  const insets = useSafeAreaInsets();

  return (
    <View style={styles.wrapper}>
      <View style={[styles.statusBarHack, { height: insets.top }]} />
      <SafeAreaView
        style={styles.container}
        edges={["bottom", "left", "right"]}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.openDrawer()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Menu size={24} color={colors.textInverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("issues.reportTitle")}</Text>
          {!isOnline ? (
            <View style={styles.offlineBadge}>
              <WifiOff size={16} color={colors.textInverse} />
            </View>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>

        {!isOnline && (
          <View style={styles.offlineBanner}>
            <WifiOff size={14} color={colors.warning} />
            <Text style={styles.offlineBannerText}>
              {t("common.offlineMode")}
            </Text>
          </View>
        )}

        {hasNoOfflineData ? (
          <View style={styles.noDataContainer}>
            <WifiOff size={48} color={colors.textTertiary} />
            <Text style={styles.noDataTitle}>{t("common.noOfflineData")}</Text>
            <Text style={styles.noDataText}>{t("common.connectToLoad")}</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.label}>{t("issues.title")}</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder={t("issues.titlePlaceholder")}
              placeholderTextColor={colors.textTertiary}
              maxLength={200}
            />

            <Text style={styles.label}>{t("issues.description")}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder={t("issues.descriptionPlaceholder")}
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />

            <Text style={styles.label}>{t("issues.category")}</Text>
            <View style={styles.optionsList}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.optionItem,
                    selectedCategoryId === cat.id && styles.optionItemSelected,
                  ]}
                  onPress={() => setSelectedCategoryId(cat.id)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selectedCategoryId === cat.id &&
                        styles.optionTextSelected,
                    ]}
                  >
                    {localName(cat)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>{t("issues.urgency")}</Text>
            <View style={styles.optionsList}>
              {urgencies.map((urg) => (
                <TouchableOpacity
                  key={urg.id}
                  style={[
                    styles.optionItem,
                    selectedUrgencyId === urg.id && styles.optionItemSelected,
                  ]}
                  onPress={() => setSelectedUrgencyId(urg.id)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selectedUrgencyId === urg.id && styles.optionTextSelected,
                    ]}
                  >
                    {`${urg.level} - ${localName(urg)}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.submitButton,
                mutation.isPending && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <>
                  <Send size={18} color={colors.textInverse} />
                  <Text style={styles.submitButtonText}>
                    {isOnline ? t("issues.submit") : t("issues.saveOffline")}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        )}
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
  offlineBadge: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: "#f59e0b20",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "#f59e0b40",
  },
  offlineBannerText: {
    fontSize: typography.sizes.sm,
    color: "#f59e0b",
    fontWeight: typography.weights.medium,
  },
  noDataContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.xl,
  },
  noDataTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    textAlign: "center",
  },
  noDataText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.base,
    color: colors.text,
    borderRadius: borderRadius.md,
  },
  textArea: { minHeight: 120, paddingTop: spacing.sm },
  optionsList: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
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
  submitButton: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: {
    color: colors.textInverse,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
  },
});
