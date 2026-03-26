import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Switch } from "react-native";
import { Plus, Trash2 } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { colors, spacing, typography, borderRadius } from "../../../theme";
import { NumberInput } from "./NumberInput";
import { AdditionalInput } from "../../types";

interface AdditionalPaymentsSectionProps {
  items: AdditionalInput[];
  onAdd: () => void;
  onUpdate: (index: number, item: AdditionalInput) => void;
  onRemove: (index: number) => void;
}

export const AdditionalPaymentsSection: React.FC<
  AdditionalPaymentsSectionProps
> = ({ items, onAdd, onUpdate, onRemove }) => {
  const { t } = useTranslation();

  const TAX_OPTIONS = [
    { value: 100, label: t("payslip.basic") },
    { value: 50, label: t("payslip.ffp") },
    { value: 0, label: t("payslip.free") },
    { value: 999, label: t("payslip.conguaglio") },
  ];

  const handleTaxChange = (index: number, newTax: number) => {
    const item = items[index];
    onUpdate(index, { ...item, tax: newTax, isConguaglio: newTax === 999 });
  };

  const handleSLRChange = (index: number, isSLR: boolean) => {
    const item = items[index];
    onUpdate(index, { ...item, isSLR, tax: isSLR ? 100 : item.tax });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("payslip.additionalPayments")}</Text>
        <TouchableOpacity style={styles.addButton} onPress={onAdd}>
          <Plus size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {items.map((item, index) => (
        <View key={index} style={styles.itemCard}>
          <View style={styles.itemHeader}>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => onRemove(index)}
            >
              <Trash2 size={18} color={colors.error} />
            </TouchableOpacity>
          </View>

          <NumberInput
            label={t("payslip.amount")}
            value={item.amount}
            onChange={(amount) => onUpdate(index, { ...item, amount })}
            suffix="€"
          />

          <View style={styles.taxContainer}>
            <Text style={[styles.label, item.isSLR && styles.labelDisabled]}>
              {t("payslip.taxation")}
            </Text>
            <View style={styles.taxOptions}>
              {TAX_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.taxOption,
                    item.tax === option.value && styles.taxOptionActive,
                    item.isSLR && styles.taxOptionDisabled,
                  ]}
                  onPress={() =>
                    !item.isSLR && handleTaxChange(index, option.value)
                  }
                  disabled={item.isSLR}
                >
                  <Text
                    style={[
                      styles.taxOptionText,
                      item.tax === option.value && styles.taxOptionTextActive,
                      item.isSLR && styles.taxOptionTextDisabled,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{t("payslip.isSlr")}</Text>
            <Switch
              value={item.isSLR}
              onValueChange={(isSLR) => handleSLRChange(index, isSLR)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  addButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: spacing.sm,
  },
  removeButton: {
    padding: spacing.xs,
  },
  taxContainer: {
    marginTop: spacing.md,
  },
  label: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  taxOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  taxOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  taxOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  taxOptionText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  taxOptionTextActive: {
    color: colors.textInverse,
    fontWeight: typography.weights.semibold,
  },
  taxOptionDisabled: {
    backgroundColor: colors.border,
    borderColor: colors.border,
    opacity: 0.5,
  },
  taxOptionTextDisabled: {
    color: colors.textSecondary,
  },
  labelDisabled: {
    color: colors.textSecondary,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  switchLabel: {
    fontSize: typography.sizes.base,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
});
