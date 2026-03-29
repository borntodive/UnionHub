import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { WebView } from "react-native-webview";
import * as FileSystem from "expo-file-system/legacy";
import { ArrowLeft, Download } from "lucide-react-native";
import * as Sharing from "expo-sharing";

import { colors, spacing, typography } from "../../theme";
import { documentsApi } from "../../api/documents";
import { RootStackParamList } from "../../navigation/types";

type PdfViewerRouteProp = RouteProp<RootStackParamList, "PdfViewer">;

export const PdfViewerScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<PdfViewerRouteProp>();
  const insets = useSafeAreaInsets();
  const { documentId, url, title } = route.params;

  const [fileUri, setFileUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const cachedUriRef = React.useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadPdf = async () => {
      try {
        let base64: string;

        if (url) {
          // Direct base64 data URL provided (e.g. from registrationFormUrl)
          const prefix = "data:application/pdf;base64,";
          base64 = url.startsWith(prefix) ? url.slice(prefix.length) : url;
        } else if (documentId) {
          const result = await documentsApi.getPdfBase64(documentId);
          if (!result) {
            setError("PDF non disponibile");
            return;
          }
          base64 = result;
        } else {
          setError("Nessun documento specificato");
          return;
        }

        const id = documentId || "reg";
        const uri = FileSystem.cacheDirectory + `doc_${id}_${Date.now()}.pdf`;
        await FileSystem.writeAsStringAsync(uri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        if (!cancelled) {
          cachedUriRef.current = uri;
          setFileUri(uri);
        } else {
          FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Errore nel caricamento del PDF");
      }
    };

    loadPdf();
    return () => {
      cancelled = true;
      // Delete cached file on unmount to avoid unbounded disk accumulation
      if (cachedUriRef.current) {
        FileSystem.deleteAsync(cachedUriRef.current, {
          idempotent: true,
        }).catch(() => {});
        cachedUriRef.current = null;
      }
    };
  }, [documentId, url]);

  const handleShare = async () => {
    if (!fileUri) return;
    setIsSharing(true);
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/pdf",
          dialogTitle: title,
        });
      }
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.statusBarHack, { height: insets.top }]} />
      <SafeAreaView
        style={styles.container}
        edges={["bottom", "left", "right"]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.headerBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={24} color={colors.textInverse} />
          </TouchableOpacity>

          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>

          <TouchableOpacity
            onPress={handleShare}
            style={styles.headerBtn}
            disabled={!fileUri || isSharing}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {isSharing ? (
              <ActivityIndicator size="small" color={colors.textInverse} />
            ) : (
              <Download
                size={22}
                color={fileUri ? colors.textInverse : colors.textInverse + "60"}
              />
            )}
          </TouchableOpacity>
        </View>

        {/* Content */}
        {error ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : !fileUri ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Caricamento PDF…</Text>
          </View>
        ) : Platform.OS === "ios" ? (
          <WebView
            source={{ uri: fileUri }}
            style={styles.webView}
            originWhitelist={["file://*", "http://*", "https://*"]}
            allowFileAccess
          />
        ) : (
          // Android: WebView doesn't render local PDFs — wrap in HTML embed
          <WebView
            source={{
              html: `<!DOCTYPE html><html><head>
                <meta name="viewport" content="width=device-width,initial-scale=1">
                <style>*{margin:0;padding:0;}html,body,iframe{width:100%;height:100%;border:none;}</style>
              </head><body>
                <iframe src="${fileUri}" width="100%" height="100%"></iframe>
              </body></html>`,
            }}
            style={styles.webView}
            allowFileAccess
          />
        )}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  statusBarHack: {
    backgroundColor: colors.primary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    minHeight: 56,
  },
  headerBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
    textAlign: "center",
    marginHorizontal: spacing.xs,
  },
  webView: {
    flex: 1,
    backgroundColor: "#f0f0f0",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
  },
  loadingText: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: typography.sizes.md,
    color: colors.error,
    textAlign: "center",
    paddingHorizontal: spacing.lg,
  },
});

export default PdfViewerScreen;
