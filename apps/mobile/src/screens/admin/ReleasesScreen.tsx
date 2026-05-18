import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Menu, Plus, Smartphone, Paperclip, X } from "lucide-react-native";
import * as DocumentPicker from "expo-document-picker";
import {
  releasesApi,
  AppRelease,
  CreateReleasePayload,
} from "../../api/releases";
import { QUERY_KEYS } from "../../api/queryKeys";
import { colors, spacing, typography, borderRadius } from "../../theme";
import { Card } from "../../components/Card";

const PLATFORMS = ["all", "ios", "android"] as const;

interface ApkFile {
  uri: string;
  name: string;
  type: string;
  size?: number;
}

export const ReleasesScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [version, setVersion] = useState("");
  const [minVersion, setMinVersion] = useState("");
  const [platform, setPlatform] = useState<"all" | "ios" | "android">("all");
  const [releaseNotes, setReleaseNotes] = useState("");
  const [apkFile, setApkFile] = useState<ApkFile | null>(null);

  const needsApk = platform === "android" || platform === "all";

  const { data: releases, isLoading } = useQuery({
    queryKey: QUERY_KEYS.appReleases,
    queryFn: releasesApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateReleasePayload) => releasesApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.appReleases });
      setVersion("");
      setMinVersion("");
      setPlatform("all");
      setReleaseNotes("");
      setApkFile(null);
      Alert.alert(
        "Successo",
        "Release pubblicata e notifica inviata agli utenti.",
      );
    },
    onError: (error: any) => {
      Alert.alert(
        "Errore",
        error.response?.data?.message ?? "Impossibile pubblicare la release.",
      );
    },
  });

  async function handlePickApk() {
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/vnd.android.package-archive",
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];

    if (!asset.name.toLowerCase().endsWith(".apk")) {
      Alert.alert("File non valido", "Seleziona un file con estensione .apk");
      return;
    }

    const MAX_BYTES = 200 * 1024 * 1024; // 200 MB
    if (asset.size && asset.size > MAX_BYTES) {
      Alert.alert(
        "File troppo grande",
        `L'APK supera il limite di 200 MB (${(asset.size / 1024 / 1024).toFixed(1)} MB).`,
      );
      return;
    }

    setApkFile({
      uri: asset.uri,
      name: asset.name,
      type: asset.mimeType ?? "application/vnd.android.package-archive",
      size: asset.size ?? undefined,
    });
  }

  function handlePublish() {
    const trimmed = version.trim();
    if (!/^\d+\.\d+\.\d+$/.test(trimmed)) {
      Alert.alert(
        "Versione non valida",
        "Inserisci una versione nel formato X.Y.Z (es. 1.0.7)",
      );
      return;
    }
    const trimmedMin = minVersion.trim();
    if (trimmedMin && !/^\d+\.\d+\.\d+$/.test(trimmedMin)) {
      Alert.alert(
        "minVersion non valida",
        "Inserisci una versione nel formato X.Y.Z o lascia vuoto",
      );
      return;
    }
    if (needsApk && !apkFile) {
      Alert.alert("APK mancante", "Allega il file APK per Android/All.");
      return;
    }

    Alert.alert(
      "Pubblica release",
      `Pubblicare versione ${trimmed} per ${platform}?\n\nVerrà inviata una notifica push a tutti gli utenti.`,
      [
        { text: "Annulla", style: "cancel" },
        {
          text: "Pubblica",
          onPress: () =>
            createMutation.mutate({
              version: trimmed,
              ...(trimmedMin ? { minVersion: trimmedMin } : {}),
              platform,
              ...(releaseNotes.trim()
                ? { releaseNotes: releaseNotes.trim() }
                : {}),
              ...(apkFile ? { apk: apkFile } : {}),
            }),
        },
      ],
    );
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  const renderRelease = ({ item }: { item: AppRelease }) => (
    <Card style={styles.releaseCard}>
      <View style={styles.releaseRow}>
        <Smartphone size={20} color={colors.primary} />
        <View style={styles.releaseInfo}>
          <Text style={styles.releaseVersion}>v{item.version}</Text>
          <Text style={styles.releaseMeta}>
            {item.platform.toUpperCase()} · {formatDate(item.createdAt)}
            {item.minVersion ? ` · min ${item.minVersion}` : ""}
            {item.apkFilename ? " · APK" : ""}
          </Text>
          {item.releaseNotes ? (
            <Text style={styles.releaseNotes} numberOfLines={2}>
              {item.releaseNotes}
            </Text>
          ) : null}
        </View>
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container} edges={["bottom", "left", "right"]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity
          onPress={() => (navigation as any).openDrawer?.()}
          style={styles.backButton}
        >
          <Menu size={24} color={colors.textInverse} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Releases</Text>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.content}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
          keyboardShouldPersistTaps="handled"
        >
          <Card style={styles.formCard}>
            <Text style={styles.sectionTitle}>Pubblica nuova release</Text>

            <Text style={styles.label}>Versione *</Text>
            <TextInput
              style={styles.input}
              value={version}
              onChangeText={setVersion}
              placeholder="es. 1.0.7"
              placeholderTextColor={colors.textTertiary}
              keyboardType="numbers-and-punctuation"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Versione minima (force update)</Text>
            <TextInput
              style={styles.input}
              value={minVersion}
              onChangeText={setMinVersion}
              placeholder="es. 1.0.5 (opzionale)"
              placeholderTextColor={colors.textTertiary}
              keyboardType="numbers-and-punctuation"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Piattaforma</Text>
            <View style={styles.platformRow}>
              {PLATFORMS.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.platformChip,
                    platform === p && styles.platformChipActive,
                  ]}
                  onPress={() => {
                    setPlatform(p);
                    if (p === "ios") setApkFile(null);
                  }}
                >
                  <Text
                    style={[
                      styles.platformChipText,
                      platform === p && styles.platformChipTextActive,
                    ]}
                  >
                    {p.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {needsApk && (
              <>
                <Text style={styles.label}>File APK *</Text>
                {apkFile ? (
                  <View style={styles.apkRow}>
                    <Paperclip size={16} color={colors.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.apkName} numberOfLines={1}>
                        {apkFile.name}
                      </Text>
                      {apkFile.size != null && (
                        <Text style={styles.apkSize}>
                          {(apkFile.size / 1024 / 1024).toFixed(1)} MB
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity onPress={() => setApkFile(null)}>
                      <X size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.pickApkButton}
                    onPress={handlePickApk}
                  >
                    <Paperclip size={16} color={colors.primary} />
                    <Text style={styles.pickApkText}>Seleziona APK</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            <Text style={styles.label}>Note di rilascio (opzionale)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={releaseNotes}
              onChangeText={setReleaseNotes}
              placeholder="Descrivi le novità di questa versione..."
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[
                styles.publishButton,
                createMutation.isPending && styles.publishButtonDisabled,
              ]}
              onPress={handlePublish}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <>
                  <Plus size={18} color={colors.textInverse} />
                  <Text style={styles.publishButtonText}>
                    Pubblica e notifica
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </Card>

          <Text style={styles.historyTitle}>Storico releases</Text>

          {isLoading ? (
            <ActivityIndicator
              color={colors.primary}
              style={{ marginTop: spacing.lg }}
            />
          ) : !releases?.length ? (
            <Text style={styles.emptyText}>Nessuna release pubblicata.</Text>
          ) : (
            releases.map((item) => (
              <React.Fragment key={item.id}>
                {renderRelease({ item })}
              </React.Fragment>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    flex: 1,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.textInverse,
    textAlign: "center",
  },
  headerRight: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  formCard: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
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
    backgroundColor: colors.surface,
  },
  textArea: {
    height: 96,
    paddingTop: spacing.sm,
  },
  platformRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  platformChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  platformChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  platformChipText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
  },
  platformChipTextActive: {
    color: colors.textInverse,
  },
  pickApkButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    borderStyle: "dashed",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  pickApkText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.primary,
  },
  apkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  apkName: {
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  apkSize: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
    marginTop: 1,
  },
  publishButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  publishButtonDisabled: {
    opacity: 0.6,
  },
  publishButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.textInverse,
  },
  historyTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  releaseCard: {
    marginBottom: spacing.sm,
  },
  releaseRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  releaseInfo: {
    flex: 1,
  },
  releaseVersion: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  releaseMeta: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  releaseNotes: {
    fontSize: typography.sizes.sm,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  emptyText: {
    fontSize: typography.sizes.base,
    color: colors.textTertiary,
    textAlign: "center",
    marginTop: spacing.lg,
  },
});
