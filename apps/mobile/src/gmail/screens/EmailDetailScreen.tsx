import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Paperclip,
  FileText,
  Image as ImageIcon,
  File,
} from "lucide-react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useTranslation } from "react-i18next";

import { colors, spacing, typography, borderRadius } from "../../theme";
import { gmailApi, EmailAttachment } from "../api/gmail";
import { RootStackParamList } from "../../navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, "EmailDetail">;

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getAttachmentIcon = (mimeType: string) => {
  if (mimeType === "application/pdf")
    return <FileText size={20} color={colors.error} />;
  if (mimeType.startsWith("image/"))
    return <ImageIcon size={20} color={colors.primary} />;
  return <File size={20} color={colors.textSecondary} />;
};

interface AttachmentRowProps {
  attachment: EmailAttachment;
  messageId: string;
  ruolo?: string;
  onPressPdf: (
    messageId: string,
    attachmentId: string,
    filename: string,
  ) => void;
}

const AttachmentRow: React.FC<AttachmentRowProps> = ({
  attachment,
  messageId,
  ruolo,
  onPressPdf,
}) => {
  const [downloading, setDownloading] = useState(false);
  const { t } = useTranslation();

  const handlePress = async () => {
    if (attachment.mimeType === "application/pdf") {
      onPressPdf(messageId, attachment.attachmentId, attachment.filename);
      return;
    }

    setDownloading(true);
    try {
      const res = await gmailApi.getAttachment(
        messageId,
        attachment.attachmentId,
        ruolo,
      );
      const base64 = res.data.data.replace(/-/g, "+").replace(/_/g, "/");
      const uri = `${FileSystem.cacheDirectory}${attachment.filename}`;
      await FileSystem.writeAsStringAsync(uri, base64, {
        encoding: "base64",
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: attachment.mimeType });
      } else {
        Alert.alert(t("common.error"), t("gmail.sharingNotAvailable"));
      }
    } catch (err: any) {
      console.error("Attachment download error:", err?.message || err);
      Alert.alert(t("common.error"), err?.message || t("gmail.downloadError"));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <TouchableOpacity
      style={styles.attachmentRow}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.attachmentIcon}>
        {getAttachmentIcon(attachment.mimeType)}
      </View>
      <View style={styles.attachmentInfo}>
        <Text style={styles.attachmentName} numberOfLines={1}>
          {attachment.filename}
        </Text>
        <Text style={styles.attachmentSize}>
          {formatBytes(attachment.size)}
        </Text>
      </View>
      {downloading && <ActivityIndicator size="small" color={colors.primary} />}
    </TouchableOpacity>
  );
};

export const EmailDetailScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { messageId, subject, ruolo } = route.params;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["gmail-email", messageId, ruolo],
    queryFn: async () => {
      const res = await gmailApi.getEmail(messageId, ruolo);
      return res.data;
    },
    staleTime: 5 * 60_000,
  });

  const handlePdfAttachment = async (
    msgId: string,
    attachmentId: string,
    filename: string,
  ) => {
    try {
      const res = await gmailApi.getAttachment(msgId, attachmentId, ruolo);
      const base64 = res.data.data.replace(/-/g, "+").replace(/_/g, "/");
      const uri = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(uri, base64, {
        encoding: "base64",
      });
      // Navigate to PdfViewer — needs a documentId but we have a local file URI
      // Use share sheet instead for email attachments
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "application/pdf" });
      }
    } catch (err: any) {
      console.error("PDF attachment error:", err?.message || err);
      Alert.alert(t("common.error"), err?.message || t("gmail.downloadError"));
    }
  };

  const bodyHtml = data?.bodyHtml
    ? `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"/><style>body{font-family:sans-serif;font-size:15px;color:#222;padding:8px;word-break:break-word;}img{max-width:100%;}</style></head><body>${data.bodyHtml}</body></html>`
    : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={24} color={colors.textInverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {subject || t("gmail.noSubject")}
          </Text>
          <View style={styles.headerButton} />
        </View>

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : isError ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{t("gmail.loadError")}</Text>
          </View>
        ) : data ? (
          <View style={styles.content}>
            {/* Meta */}
            <View style={styles.metaSection}>
              <Text style={styles.metaSubject} numberOfLines={2}>
                {data.subject || t("gmail.noSubject")}
              </Text>
              <Text style={styles.metaFrom}>{data.from}</Text>
              <Text style={styles.metaDate}>{data.date}</Text>
            </View>

            {/* Body */}
            <View style={styles.bodyContainer}>
              {bodyHtml ? (
                <WebView
                  source={{ html: bodyHtml }}
                  style={styles.webview}
                  scrollEnabled={true}
                  scalesPageToFit={false}
                  showsVerticalScrollIndicator={false}
                  originWhitelist={["*"]}
                />
              ) : data.bodyText ? (
                <ScrollView style={styles.textBody}>
                  <Text style={styles.bodyText}>{data.bodyText}</Text>
                </ScrollView>
              ) : (
                <View style={styles.centered}>
                  <Text style={styles.emptyBody}>{t("gmail.emptyBody")}</Text>
                </View>
              )}
            </View>

            {/* Attachments */}
            {data.attachments.length > 0 && (
              <View style={styles.attachmentsSection}>
                <View style={styles.attachmentsHeader}>
                  <Paperclip size={16} color={colors.textSecondary} />
                  <Text style={styles.attachmentsTitle}>
                    {t("gmail.attachments")} ({data.attachments.length})
                  </Text>
                </View>
                {data.attachments.map((att) => (
                  <AttachmentRow
                    key={att.attachmentId}
                    attachment={att}
                    messageId={data.id}
                    ruolo={ruolo}
                    onPressPdf={handlePdfAttachment}
                  />
                ))}
              </View>
            )}
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    color: colors.textInverse,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    textAlign: "center",
    marginHorizontal: spacing.sm,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: colors.error,
    fontSize: typography.sizes.base,
  },
  content: {
    flex: 1,
  },
  metaSection: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  metaSubject: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  metaFrom: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  metaDate: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
  },
  bodyContainer: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: colors.background,
  },
  textBody: {
    flex: 1,
    padding: spacing.lg,
  },
  bodyText: {
    fontSize: typography.sizes.base,
    color: colors.text,
    lineHeight: 22,
  },
  emptyBody: {
    color: colors.textTertiary,
    fontSize: typography.sizes.base,
  },
  attachmentsSection: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    maxHeight: 200,
  },
  attachmentsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  attachmentsTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
  },
  attachmentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  attachmentIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  attachmentInfo: {
    flex: 1,
  },
  attachmentName: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    fontWeight: typography.weights.medium,
  },
  attachmentSize: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
    marginTop: 2,
  },
});
