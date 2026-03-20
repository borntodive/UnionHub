import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import {
  ArrowLeft,
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  Download,
  AlertTriangle,
  Plane,
  Users,
} from "lucide-react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { colors, spacing, typography, borderRadius } from "../../theme";
import { Button } from "../../components/Button";
import { usersApi } from "../../api/users";
import { useAuthStore } from "../../store/authStore";
import { UserRole, Ruolo } from "../../types";

interface ImportResult {
  created: number;
  errors: { row: number; error: string }[];
  total: number;
}

export const BulkImportScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = user?.role === UserRole.SUPERADMIN;

  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    uri: string;
  } | null>(null);
  const [selectedRole, setSelectedRole] = useState<Ruolo | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleSelectFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "text/csv",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel",
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setSelectedFile({
          name: result.assets[0].name,
          uri: result.assets[0].uri,
        });
        setResult(null);
      }
    } catch (error) {
      console.error("Error selecting file:", error);
      Alert.alert("Error", "Failed to select file");
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    // For SuperAdmin, require role selection
    if (isSuperAdmin && !selectedRole) {
      Alert.alert(
        "Select Role",
        "Please select a role (Pilot or Cabin Crew) before importing.",
      );
      return;
    }

    Alert.alert(
      "Confirm Import",
      `Import ${selectedFile.name}?

${isSuperAdmin && selectedRole ? `Role: ${selectedRole === Ruolo.PILOT ? "Pilot" : "Cabin Crew"}\n` : ""}This will create new member accounts with default password "password".`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Import",
          style: "default",
          onPress: async () => {
            try {
              setImporting(true);
              const response = await usersApi.bulkImport(
                selectedFile.uri,
                selectedFile.name,
                isSuperAdmin ? selectedRole : undefined,
              );
              setResult(response);
            } catch (error: any) {
              Alert.alert(
                "Error",
                error.response?.data?.message || "Import failed",
              );
            } finally {
              setImporting(false);
            }
          },
        },
      ],
    );
  };

  const downloadTemplate = () => {
    const template = `CREWCODE,SURNAME,NAME,EMAIL,PHONE,BASE,GRADE,NOTE
ABC123,Rossi,Mario,mario.rossi@email.com,+39123456789,FCO,Captain,Note opzionali
DEF456,Bianchi,Laura,laura.bianchi@email.com,+39987654321,MXP,Purser,`;

    // Share template
    const fileUri = `${FileSystem.cacheDirectory}template_import.csv`;
    FileSystem.writeAsStringAsync(fileUri, template).then(() => {
      Sharing.shareAsync(fileUri, {
        mimeType: "text/csv",
        dialogTitle: "Download Template",
      });
    });
  };

  const renderRoleSelector = () => {
    if (!isSuperAdmin) return null;

    return (
      <View style={styles.roleCard}>
        <Text style={styles.roleTitle}>Select Role for Import</Text>
        <Text style={styles.roleDescription}>
          As SuperAdmin, you must select which role these members belong to:
        </Text>
        <View style={styles.roleButtons}>
          <TouchableOpacity
            style={[
              styles.roleButton,
              selectedRole === Ruolo.PILOT && styles.roleButtonActive,
            ]}
            onPress={() => setSelectedRole(Ruolo.PILOT)}
          >
            <Plane
              size={24}
              color={
                selectedRole === Ruolo.PILOT
                  ? colors.textInverse
                  : colors.primary
              }
            />
            <Text
              style={[
                styles.roleButtonText,
                selectedRole === Ruolo.PILOT && styles.roleButtonTextActive,
              ]}
            >
              Pilot
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.roleButton,
              selectedRole === Ruolo.CABIN_CREW && styles.roleButtonActive,
            ]}
            onPress={() => setSelectedRole(Ruolo.CABIN_CREW)}
          >
            <Users
              size={24}
              color={
                selectedRole === Ruolo.CABIN_CREW
                  ? colors.textInverse
                  : colors.primary
              }
            />
            <Text
              style={[
                styles.roleButtonText,
                selectedRole === Ruolo.CABIN_CREW &&
                  styles.roleButtonTextActive,
              ]}
            >
              Cabin Crew
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

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
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={24} color={colors.textInverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Bulk Import</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content}>
          {/* Template Download */}
          <View style={styles.templateCard}>
            <FileText size={32} color={colors.primary} />
            <Text style={styles.templateTitle}>Import Template</Text>
            <Text style={styles.templateDescription}>
              Download the template file (CSV format) with the correct column
              format
            </Text>
            <Button
              title="Download Template"
              onPress={downloadTemplate}
              variant="secondary"
            />
          </View>

          {/* Required Fields Info */}
          <View style={styles.infoCard}>
            <AlertTriangle size={20} color={colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>Required Fields</Text>
              <Text style={styles.infoText}>
                Crewcode, Nome, Cognome, Email{"\n"}
                Optional: Telefono, Base, Qualifica, Note
              </Text>
            </View>
          </View>

          {/* Role Selector (SuperAdmin only) */}
          {renderRoleSelector()}

          {/* File Selection */}
          <TouchableOpacity
            style={styles.uploadArea}
            onPress={handleSelectFile}
          >
            <Upload size={48} color={colors.primary} />
            <Text style={styles.uploadText}>
              {selectedFile
                ? selectedFile.name
                : "Tap to select CSV or Excel file"}
            </Text>
            <Text style={styles.uploadHint}>
              {selectedFile
                ? "Tap to change file"
                : "Supported formats: .csv, .xlsx, .xls"}
            </Text>
          </TouchableOpacity>

          {/* Import Button */}
          {selectedFile && !result && (
            <Button
              title={importing ? "Importing..." : "Start Import"}
              onPress={handleImport}
              loading={importing}
              disabled={importing || (isSuperAdmin && !selectedRole)}
              size="lg"
              style={styles.importButton}
            />
          )}

          {/* Results */}
          {result && (
            <View style={styles.resultCard}>
              <Text style={styles.resultTitle}>Import Results</Text>

              <View style={styles.resultStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{result.total}</Text>
                  <Text style={styles.statLabel}>Total</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: colors.success }]}>
                    {result.created}
                  </Text>
                  <Text style={styles.statLabel}>Created</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: colors.error }]}>
                    {result.errors.length}
                  </Text>
                  <Text style={styles.statLabel}>Errors</Text>
                </View>
              </View>

              {result.errors.length > 0 && (
                <View style={styles.errorsSection}>
                  <Text style={styles.errorsTitle}>Errors:</Text>
                  {result.errors.slice(0, 5).map((error, index) => (
                    <View key={index} style={styles.errorItem}>
                      <XCircle size={16} color={colors.error} />
                      <Text style={styles.errorText}>
                        Row {error.row}: {error.error}
                      </Text>
                    </View>
                  ))}
                  {result.errors.length > 5 && (
                    <Text style={styles.moreErrors}>
                      ...and {result.errors.length - 5} more errors
                    </Text>
                  )}
                </View>
              )}

              <Button
                title="Import Another File"
                onPress={() => {
                  setSelectedFile(null);
                  setSelectedRole(null);
                  setResult(null);
                }}
                variant="secondary"
                style={styles.newImportButton}
              />
            </View>
          )}
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
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
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
  content: {
    flex: 1,
    padding: spacing.md,
  },
  templateCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: "center",
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  templateTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: spacing.md,
  },
  templateDescription: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.warning + "15",
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  infoTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.warning,
  },
  infoText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  roleCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  roleDescription: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  roleButtons: {
    flexDirection: "row",
    gap: spacing.md,
  },
  roleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  roleButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  roleButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
  roleButtonTextActive: {
    color: colors.textInverse,
  },
  uploadArea: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: "dashed",
    marginBottom: spacing.md,
  },
  uploadText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.text,
    marginTop: spacing.md,
  },
  uploadHint: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  importButton: {
    marginTop: spacing.md,
  },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  resultStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: spacing.lg,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 32,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  statLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  errorsSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  errorsTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  errorItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  errorText: {
    fontSize: typography.sizes.sm,
    color: colors.error,
    flex: 1,
  },
  moreErrors: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontStyle: "italic",
    marginTop: spacing.xs,
  },
  newImportButton: {
    marginTop: spacing.lg,
  },
});
