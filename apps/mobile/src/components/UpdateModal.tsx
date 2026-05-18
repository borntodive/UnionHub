import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeUpdateInfo } from "../hooks/useVersionCheck";
import { OTAUpdateInfo } from "../hooks/useOTAUpdate";
import { IOS_APP_STORE_URL, getAndroidApkUrl } from "../constants/updateUrls";
import { colors, spacing, typography, borderRadius } from "../theme";

interface UpdateModalProps {
  nativeUpdate: NativeUpdateInfo | null;
  otaUpdate: OTAUpdateInfo | null;
  isDownloading: boolean;
  onApplyOTA: () => void;
  onDismiss: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  nativeUpdate,
  otaUpdate,
  isDownloading,
  onApplyOTA,
  onDismiss,
}) => {
  const insets = useSafeAreaInsets();
  const isForced = nativeUpdate?.isForced ?? false;
  const visible = !!(nativeUpdate || otaUpdate);

  function handleUpdateNow() {
    if (nativeUpdate) {
      const url =
        Platform.OS === "ios"
          ? IOS_APP_STORE_URL
          : getAndroidApkUrl(nativeUpdate.id);
      Linking.openURL(url).catch(console.error);
    } else {
      onApplyOTA();
    }
  }

  if (!visible) return null;

  const title = nativeUpdate
    ? `Versione ${nativeUpdate.latestVersion} disponibile`
    : "Aggiornamento disponibile";

  const body = nativeUpdate
    ? (nativeUpdate.releaseNotes ?? "Aggiorna l'app per le ultime novità.")
    : otaUpdate
      ? `Versione ${otaUpdate.version} pronta all'installazione.`
      : "";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={isForced ? undefined : onDismiss}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            { paddingBottom: Math.max(insets.bottom, spacing.lg) },
          ]}
        >
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>

          {isForced && (
            <Text style={styles.forcedNote}>
              Questa versione è obbligatoria per continuare a usare l'app.
            </Text>
          )}

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleUpdateNow}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <Text style={styles.primaryButtonText}>Aggiorna ora</Text>
            )}
          </TouchableOpacity>

          {!isForced && (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onDismiss}
            >
              <Text style={styles.secondaryButtonText}>Più tardi</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    gap: spacing.md,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    textAlign: "center",
  },
  body: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.regular,
    color: colors.textSecondary,
    textAlign: "center",
  },
  forcedNote: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.secondary,
    textAlign: "center",
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.textInverse,
  },
  secondaryButton: {
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.regular,
    color: colors.textSecondary,
  },
});
