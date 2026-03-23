import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import {
  Menu,
  Database,
  Trash2,
  Upload,
  RefreshCw,
  FileText,
  X,
  ChevronDown,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { colors, spacing, typography, borderRadius } from "../../theme";
import { knowledgeBaseApi, KbDocument } from "../api/knowledge-base";

type Nav = DrawerNavigationProp<any>;

const ACCESS_LEVELS: Array<{ value: "all" | "admin"; labelKey: string }> = [
  { value: "all", labelKey: "kb.accessAll" },
  { value: "admin", labelKey: "kb.accessAdmin" },
];

const RUOLI: Array<{ value: "pilot" | "cabin_crew" | ""; labelKey: string }> = [
  { value: "", labelKey: "kb.ruoloAll" },
  { value: "pilot", labelKey: "home.pilot" },
  { value: "cabin_crew", labelKey: "home.cabinCrew" },
];

export const KnowledgeBaseScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();

  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [accessLevel, setAccessLevel] = useState<"all" | "admin">("all");
  const [ruolo, setRuolo] = useState<"pilot" | "cabin_crew" | "">("");
  const [pickedFile, setPickedFile] = useState<{
    uri: string;
    name: string;
  } | null>(null);

  const {
    data: docs,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["knowledge-base"],
    queryFn: () => knowledgeBaseApi.list().then((r) => r.data),
  });

  const uploadMutation = useMutation({
    mutationFn: () =>
      knowledgeBaseApi.upload(
        pickedFile!.uri,
        pickedFile!.name,
        title.trim(),
        accessLevel,
        ruolo || undefined,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-base"] });
      closeModal();
      Alert.alert(t("kb.uploadSuccess"), t("kb.uploadSuccessMessage"));
    },
    onError: (err: any) => {
      Alert.alert(
        t("errors.generic"),
        err.response?.data?.message ?? err.message,
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => knowledgeBaseApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-base"] });
    },
    onError: (err: any) => {
      Alert.alert(
        t("errors.generic"),
        err.response?.data?.message ?? err.message,
      );
    },
  });

  const reindexMutation = useMutation({
    mutationFn: (id: string) => knowledgeBaseApi.reindex(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-base"] });
      Alert.alert(t("kb.reindexSuccess"), t("kb.reindexSuccessMessage"));
    },
    onError: (err: any) => {
      Alert.alert(
        t("errors.generic"),
        err.response?.data?.message ?? err.message,
      );
    },
  });

  const closeModal = () => {
    setModalVisible(false);
    setTitle("");
    setAccessLevel("all");
    setRuolo("");
    setPickedFile(null);
  };

  const pickPdf = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setPickedFile({ uri: asset.uri, name: asset.name });
    if (!title) setTitle(asset.name.replace(/\.pdf$/i, ""));
  };

  const confirmDelete = (doc: KbDocument) => {
    Alert.alert(
      t("kb.deleteTitle"),
      t("kb.deleteMessage", { title: doc.title }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => deleteMutation.mutate(doc.id),
        },
      ],
    );
  };

  const confirmReindex = (doc: KbDocument) => {
    Alert.alert(
      t("kb.reindexTitle"),
      t("kb.reindexMessage", { title: doc.title }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("kb.reindex"),
          onPress: () => reindexMutation.mutate(doc.id),
        },
      ],
    );
  };

  const renderDoc = ({ item }: { item: KbDocument }) => (
    <View style={styles.docCard}>
      <View style={styles.docIcon}>
        <FileText size={20} color={colors.primary} />
      </View>
      <View style={styles.docInfo}>
        <Text style={styles.docTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.docMeta}>
          {item.filename} · {item.chunkCount} chunk
        </Text>
        <View style={styles.docBadges}>
          <View
            style={[
              styles.badge,
              item.accessLevel === "admin" && styles.badgeAdmin,
            ]}
          >
            <Text style={styles.badgeText}>
              {item.accessLevel === "all"
                ? t("kb.accessAll")
                : t("kb.accessAdmin")}
            </Text>
          </View>
          {item.ruolo && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.ruolo}</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.docActions}>
        <TouchableOpacity
          onPress={() => confirmReindex(item)}
          style={styles.iconButton}
          disabled={reindexMutation.isPending}
        >
          <RefreshCw size={18} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => confirmDelete(item)}
          style={styles.iconButton}
          disabled={deleteMutation.isPending}
        >
          <Trash2 size={18} color={colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const canUpload =
    !!pickedFile && title.trim().length > 0 && !uploadMutation.isPending;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.openDrawer()}
            style={styles.headerButton}
          >
            <Menu size={24} color={colors.textInverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("kb.title")}</Text>
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            style={styles.headerButton}
          >
            <Upload size={22} color={colors.textInverse} />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator style={styles.centered} color={colors.primary} />
        ) : (
          <FlatList
            data={docs ?? []}
            keyExtractor={(item) => item.id}
            renderItem={renderDoc}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={false} onRefresh={refetch} />
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <Database size={48} color={colors.textTertiary} />
                <Text style={styles.emptyText}>{t("kb.empty")}</Text>
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => setModalVisible(true)}
                >
                  <Text style={styles.emptyButtonText}>
                    {t("kb.uploadFirst")}
                  </Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}

        {/* Upload Modal */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent
          onRequestClose={closeModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t("kb.uploadTitle")}</Text>
                <TouchableOpacity onPress={closeModal}>
                  <X size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Pick file */}
                <TouchableOpacity style={styles.filePicker} onPress={pickPdf}>
                  <FileText
                    size={20}
                    color={pickedFile ? colors.primary : colors.textTertiary}
                  />
                  <Text
                    style={[
                      styles.filePickerText,
                      pickedFile && styles.filePickerTextActive,
                    ]}
                  >
                    {pickedFile ? pickedFile.name : t("kb.pickPdf")}
                  </Text>
                </TouchableOpacity>

                {/* Title */}
                <Text style={styles.label}>{t("kb.labelTitle")}</Text>
                <TextInput
                  style={styles.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder={t("kb.titlePlaceholder")}
                  placeholderTextColor={colors.textTertiary}
                />

                {/* Access Level */}
                <Text style={styles.label}>{t("kb.labelAccess")}</Text>
                <View style={styles.segmented}>
                  {ACCESS_LEVELS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.segment,
                        accessLevel === opt.value && styles.segmentActive,
                      ]}
                      onPress={() => setAccessLevel(opt.value)}
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          accessLevel === opt.value && styles.segmentTextActive,
                        ]}
                      >
                        {t(opt.labelKey)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Ruolo */}
                <Text style={styles.label}>{t("kb.labelRuolo")}</Text>
                <View style={styles.segmented}>
                  {RUOLI.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.segment,
                        ruolo === opt.value && styles.segmentActive,
                      ]}
                      onPress={() => setRuolo(opt.value)}
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          ruolo === opt.value && styles.segmentTextActive,
                        ]}
                      >
                        {t(opt.labelKey)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={[
                    styles.uploadButton,
                    !canUpload && styles.uploadButtonDisabled,
                  ]}
                  onPress={() => uploadMutation.mutate()}
                  disabled={!canUpload}
                >
                  {uploadMutation.isPending ? (
                    <ActivityIndicator color={colors.textInverse} />
                  ) : (
                    <>
                      <Upload size={18} color={colors.textInverse} />
                      <Text style={styles.uploadButtonText}>
                        {t("kb.upload")}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {uploadMutation.isPending && (
                  <Text style={styles.uploadingHint}>
                    {t("kb.uploadingHint")}
                  </Text>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.primary },
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerButton: { padding: spacing.sm, minWidth: 44, alignItems: "center" },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: colors.textInverse,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  centered: { flex: 1, justifyContent: "center" },
  list: { padding: spacing.md, gap: spacing.sm },
  docCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  docIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  docInfo: { flex: 1 },
  docTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  docMeta: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  docBadges: { flexDirection: "row", gap: 4, marginTop: spacing.xs },
  badge: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeAdmin: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}15`,
  },
  badgeText: { fontSize: typography.sizes.xs, color: colors.textSecondary },
  docActions: { flexDirection: "row", gap: spacing.xs },
  iconButton: { padding: spacing.xs },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: spacing.md,
  },
  emptyText: { color: colors.textSecondary, fontSize: typography.sizes.base },
  emptyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  emptyButtonText: {
    color: colors.textInverse,
    fontWeight: typography.weights.medium,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  filePicker: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: "dashed",
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  filePickerText: {
    flex: 1,
    color: colors.textTertiary,
    fontSize: typography.sizes.sm,
  },
  filePickerTextActive: { color: colors.primary },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.base,
    color: colors.text,
    backgroundColor: colors.background,
  },
  segmented: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    overflow: "hidden",
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: "center",
    backgroundColor: colors.background,
  },
  segmentActive: { backgroundColor: colors.primary },
  segmentText: { fontSize: typography.sizes.sm, color: colors.textSecondary },
  segmentTextActive: {
    color: colors.textInverse,
    fontWeight: typography.weights.medium,
  },
  uploadButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  uploadButtonDisabled: { opacity: 0.4 },
  uploadButtonText: {
    color: colors.textInverse,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.base,
  },
  uploadingHint: {
    textAlign: "center",
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    marginTop: spacing.sm,
  },
});
