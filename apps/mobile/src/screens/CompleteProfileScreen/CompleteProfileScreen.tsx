import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Calendar, CheckCircle } from "lucide-react-native";

import { colors, spacing, typography, borderRadius } from "../../theme";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { usersApi } from "../../api/users";
import { useAuthStore } from "../../store/authStore";

const CAPTAIN_GRADES = ["CPT", "LTC", "LCC", "TRI", "TRE"];

const parseDate = (dateStr: string | undefined): Date | null => {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  const date = new Date(
    parseInt(parts[2], 10),
    parseInt(parts[1], 10) - 1,
    parseInt(parts[0], 10),
  );
  return isNaN(date.getTime()) ? null : date;
};

const formatDate = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export const CompleteProfileScreen: React.FC = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  const isCaptainGrade = CAPTAIN_GRADES.includes(user?.grade?.codice || "");

  const [dateOfEntry, setDateOfEntry] = useState(user?.dateOfEntry || "");
  const [dateOfCaptaincy, setDateOfCaptaincy] = useState(
    user?.dateOfCaptaincy || "",
  );
  const [activePicker, setActivePicker] = useState<
    "dateOfEntry" | "dateOfCaptaincy" | null
  >(null);

  const mutation = useMutation({
    mutationFn: () =>
      usersApi.updateMe({
        dateOfEntry: dateOfEntry || undefined,
        dateOfCaptaincy: dateOfCaptaincy || undefined,
      }),
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
    },
    onError: (error: any) => {
      Alert.alert(
        t("common.error"),
        error.response?.data?.message || t("errors.generic"),
      );
    },
  });

  const handleSave = () => {
    if (!dateOfEntry) {
      Alert.alert(t("common.error"), t("members.dateOfEntryRequired"));
      return;
    }
    if (isCaptainGrade && !dateOfCaptaincy) {
      Alert.alert(t("common.error"), t("members.dateOfCaptaincyRequired"));
      return;
    }
    mutation.mutate();
  };

  const activeValue =
    activePicker === "dateOfEntry" ? dateOfEntry : dateOfCaptaincy;

  return (
    <View style={styles.wrapper}>
      <View style={[styles.statusBarHack, { height: insets.top }]} />
      <SafeAreaView style={{ flex: 1 }} edges={["bottom", "left", "right"]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <CheckCircle size={40} color={colors.textInverse} />
          </View>
          <Text style={styles.headerTitle}>{t("completeProfile.title")}</Text>
          <Text style={styles.headerSubtitle}>
            {t("completeProfile.description")}
          </Text>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>
              {t("members.professionalDates")}
            </Text>

            {/* Date of Entry */}
            <Text style={styles.fieldLabel}>
              {t("members.dateOfEntry")}
              <Text style={styles.required}> *</Text>
            </Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setActivePicker("dateOfEntry")}
            >
              <View style={styles.datePickerIcon}>
                <Calendar size={20} color={colors.primary} />
              </View>
              <View style={styles.datePickerContent}>
                <Text
                  style={[
                    styles.datePickerValue,
                    !dateOfEntry && styles.datePickerPlaceholder,
                  ]}
                >
                  {dateOfEntry || t("completeProfile.selectDate")}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Date of Captaincy — only for captain grades */}
            {isCaptainGrade && (
              <>
                <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>
                  {t("members.dateOfCaptaincy")}
                  <Text style={styles.required}> *</Text>
                </Text>
                <TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={() => setActivePicker("dateOfCaptaincy")}
                >
                  <View style={styles.datePickerIcon}>
                    <Calendar size={20} color={colors.primary} />
                  </View>
                  <View style={styles.datePickerContent}>
                    <Text
                      style={[
                        styles.datePickerValue,
                        !dateOfCaptaincy && styles.datePickerPlaceholder,
                      ]}
                    >
                      {dateOfCaptaincy || t("completeProfile.selectDate")}
                    </Text>
                  </View>
                </TouchableOpacity>
              </>
            )}
          </Card>

          <Button
            title={
              mutation.isPending
                ? t("common.pleaseWait")
                : t("completeProfile.save")
            }
            onPress={handleSave}
            loading={mutation.isPending}
            style={styles.saveButton}
          />
        </ScrollView>

        {/* Date Picker Modal */}
        <Modal
          visible={activePicker !== null}
          transparent
          animationType="slide"
          onRequestClose={() => setActivePicker(null)}
        >
          <View style={styles.actionSheetOverlay}>
            <View style={styles.actionSheetContainer}>
              <View style={styles.actionSheetHeader}>
                <Text style={styles.actionSheetTitle}>
                  {t("completeProfile.selectDate")}
                </Text>
                <TouchableOpacity
                  onPress={() => setActivePicker(null)}
                  style={styles.actionSheetDoneButton}
                >
                  <Text style={styles.actionSheetDoneText}>
                    {t("common.done")}
                  </Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={parseDate(activeValue) || new Date()}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                onChange={(_, selectedDate) => {
                  if (selectedDate && activePicker) {
                    const formatted = formatDate(selectedDate);
                    if (activePicker === "dateOfEntry") {
                      setDateOfEntry(formatted);
                    } else {
                      setDateOfCaptaincy(formatted);
                    }
                  }
                }}
              />
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  statusBarHack: {
    backgroundColor: colors.primary,
  },
  header: {
    backgroundColor: colors.primary,
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  headerIcon: {
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  headerSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textInverse + "CC",
    textAlign: "center",
    lineHeight: 20,
  },
  content: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: spacing.md,
    paddingTop: spacing.lg,
  },
  card: {
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  required: {
    color: colors.error,
  },
  datePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  datePickerIcon: {
    marginRight: spacing.sm,
  },
  datePickerContent: {
    flex: 1,
  },
  datePickerValue: {
    fontSize: typography.sizes.base,
    color: colors.text,
    fontWeight: typography.weights.medium,
  },
  datePickerPlaceholder: {
    color: colors.textTertiary,
    fontWeight: typography.weights.regular,
  },
  saveButton: {
    marginTop: spacing.sm,
  },
  actionSheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  actionSheetContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    paddingBottom: spacing.xl,
  },
  actionSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionSheetTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  actionSheetDoneButton: {
    paddingHorizontal: spacing.sm,
  },
  actionSheetDoneText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.primary,
  },
});
