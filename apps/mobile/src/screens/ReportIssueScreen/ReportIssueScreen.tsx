import React, { useState } from "react";
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
import { useNavigation } from "@react-navigation/native";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Menu,
  Send,
  WifiOff,
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import * as DocumentPicker from "expo-document-picker";

import { colors, spacing, typography, borderRadius } from "../../theme";
import { useAuthStore } from "../../store/authStore";
import { useOfflineStore } from "../../store/offlineStore";
import { issuesApi } from "../../api/issues";
import { issueCategoriesApi } from "../../api/issue-categories";
import { issueUrgenciesApi } from "../../api/issue-urgencies";
import { IssueCategory, IssueUrgency } from "../../types";
import { Select } from "../../components/Select";

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

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
  const [pickedFiles, setPickedFiles] = useState<
    DocumentPicker.DocumentPickerAsset[]
  >([]);
  const [isUploading, setIsUploading] = useState(false);

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

  React.useEffect(() => {
    if (fetchedCategories)
      useOfflineStore.getState().setCategories(fetchedCategories);
  }, [fetchedCategories]);

  React.useEffect(() => {
    if (fetchedUrgencies)
      useOfflineStore.getState().setUrgencies(fetchedUrgencies);
  }, [fetchedUrgencies]);

  const categories: IssueCategory[] = fetchedCategories ?? cachedCategories;
  const urgencies: IssueUrgency[] = fetchedUrgencies ?? cachedUrgencies;

  const hasNoOfflineData =
    !isOnline && categories.length === 0 && urgencies.length === 0;

  const mutation = useMutation({
    mutationFn: issuesApi.createIssue,
    onSuccess: async (issue) => {
      queryClient.invalidateQueries({ queryKey: ["myIssues"] });

      if (pickedFiles.length > 0) {
        setIsUploading(true);
        try {
          await issuesApi.uploadAttachments(
            issue.id,
            pickedFiles.map((f) => ({
              uri: f.uri,
              name: f.name ?? "file",
              mimeType: f.mimeType ?? "application/octet-stream",
            })),
          );
          queryClient.invalidateQueries({ queryKey: ["myIssues"] });
        } catch {
          // Non-blocking: issue was saved, attachments failed
        } finally {
          setIsUploading(false);
        }
      }

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

  const handlePickFiles = async () => {
    if (pickedFiles.length >= 5) {
      Alert.alert(t("common.error"), t("issues.maxAttachments"));
      return;
    }
    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/*", "application/pdf"],
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const remaining = 5 - pickedFiles.length;
    const toAdd = result.assets.slice(0, remaining);
    setPickedFiles((prev) => [...prev, ...toAdd]);
  };

  const handleRemoveFile = (index: number) => {
    setPickedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    if (!isOnline) {
      if (pickedFiles.length > 0) {
        Alert.alert(
          t("common.warning"),
          t("issues.attachmentsOfflineWarning"),
          [
            { text: t("common.cancel"), style: "cancel" },
            {
              text: t("common.ok"),
              onPress: () => {
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
              },
            },
          ],
        );
      } else {
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
      }
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
  const isBusy = mutation.isPending || isUploading;

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
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={insets.top + 56}
          >
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

              <Select
                label={t("issues.category")}
                value={selectedCategoryId ?? undefined}
                onValueChange={(v) => setSelectedCategoryId(v ?? null)}
                options={categories.map((cat) => ({
                  label: localName(cat),
                  value: cat.id,
                }))}
                placeholder={t("issues.categoryPlaceholder")}
              />

              <Select
                label={t("issues.urgency")}
                value={selectedUrgencyId ?? undefined}
                onValueChange={(v) => setSelectedUrgencyId(v ?? null)}
                options={urgencies.map((urg) => ({
                  label: `${urg.level} - ${localName(urg)}`,
                  value: urg.id,
                }))}
                placeholder={t("issues.urgencyPlaceholder")}
              />

              {/* Attachments */}
              <Text style={styles.label}>
                {t("issues.attachmentsOptional")}
              </Text>
              {pickedFiles.map((file, index) => (
                <View key={index} style={styles.fileRow}>
                  {file.mimeType?.startsWith("image/") ? (
                    <ImageIcon size={18} color={colors.primary} />
                  ) : (
                    <FileText size={18} color={colors.primary} />
                  )}
                  <Text style={styles.fileName} numberOfLines={1}>
                    {file.name ?? "file"}
                  </Text>
                  <Text style={styles.fileSize}>
                    {file.size ? formatBytes(file.size) : ""}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveFile(index)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <X size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              ))}
              {pickedFiles.length < 5 && (
                <TouchableOpacity
                  style={styles.addFileButton}
                  onPress={handlePickFiles}
                >
                  <Paperclip size={16} color={colors.primary} />
                  <Text style={styles.addFileText}>{t("issues.addFile")}</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  isBusy && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={isBusy}
              >
                {isBusy ? (
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
          </KeyboardAvoidingView>
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
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  fileName: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  fileSize: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  addFileButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: "dashed",
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  addFileText: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
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
