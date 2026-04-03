import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { colors, spacing, typography, borderRadius } from "../../../theme";
import { getYear } from "../../utils/formatters";

interface MonthPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export const MonthPicker: React.FC<MonthPickerProps> = ({
  value,
  onChange,
}) => {
  const { t } = useTranslation();
  const date = new Date(value);
  const year = date.getFullYear();
  const month = date.getMonth();
  const months = t("payslip.months", { returnObjects: true }) as string[];

  const handlePrevMonth = () => {
    const newDate = new Date(date);
    newDate.setMonth(month - 1);
    onChange(newDate.toISOString().split("T")[0]);
  };

  const handleNextMonth = () => {
    const newDate = new Date(date);
    newDate.setMonth(month + 1);
    onChange(newDate.toISOString().split("T")[0]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.pickerContainer}>
        <TouchableOpacity onPress={handlePrevMonth} style={styles.button}>
          <ChevronLeft size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.monthText}>
          {months[month]} {year}
        </Text>
        <TouchableOpacity onPress={handleNextMonth} style={styles.button}>
          <ChevronRight size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  pickerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  button: {
    padding: spacing.sm,
  },
  monthText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    textTransform: "capitalize",
  },
});
