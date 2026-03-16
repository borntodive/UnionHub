import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Plus, Trash2 } from 'lucide-react-native';
import { colors, spacing, typography, borderRadius } from '../../../theme';
import { NumberInput } from './NumberInput';
import { AdditionalDeductionInput } from '../../types';

interface AdditionalDeductionsSectionProps {
  items: AdditionalDeductionInput[];
  onAdd: () => void;
  onUpdate: (index: number, item: AdditionalDeductionInput) => void;
  onRemove: (index: number) => void;
}

const TAX_OPTIONS = [
  { value: 100, label: 'Basic' },
  { value: 50, label: 'FFP' },
  { value: 0, label: 'Free' },
  { value: 999, label: 'Conguaglio' },
];

export const AdditionalDeductionsSection: React.FC<AdditionalDeductionsSectionProps> = ({
  items,
  onAdd,
  onUpdate,
  onRemove,
}) => {
  const handleTaxChange = (index: number, newTax: number) => {
    const item = items[index];
    onUpdate(index, { ...item, tax: newTax, isConguaglio: newTax === 999 });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Additional Deductions</Text>
        <TouchableOpacity style={styles.addButton} onPress={onAdd}>
          <Plus size={20} color={colors.primary} />
          <Text style={styles.addButtonText}>ADD</Text>
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
            label="Amount"
            value={item.amount}
            onChange={(amount) => onUpdate(index, { ...item, amount })}
            suffix="€"
          />

          <View style={styles.taxContainer}>
            <Text style={styles.label}>Taxation</Text>
            <View style={styles.taxOptions}>
              {TAX_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.taxOption,
                    item.tax === option.value && styles.taxOptionActive,
                  ]}
                  onPress={() => handleTaxChange(index, option.value)}
                >
                  <Text
                    style={[
                      styles.taxOptionText,
                      item.tax === option.value && styles.taxOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
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
    flexDirection: 'row',
    justifyContent: 'flex-end',
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
    flexDirection: 'row',
    flexWrap: 'wrap',
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
});
