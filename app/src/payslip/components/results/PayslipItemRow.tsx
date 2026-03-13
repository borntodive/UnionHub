import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../../theme';
import { PayslipItem as PayslipItemType } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface PayslipItemRowProps {
  label: string;
  item: PayslipItemType;
  showDetails?: boolean;
}

export const PayslipItemRow: React.FC<PayslipItemRowProps> = ({
  label,
  item,
  showDetails = false,
}) => {
  if (item.total === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.mainRow}>
        <View style={styles.labelContainer}>
          <Text style={styles.label}>{label}</Text>
          {item.quantity !== null && item.quantity > 0 && item.unit !== null && (
            <Text style={styles.quantity}>
              {item.quantity} × {formatCurrency(item.unit || 0)}
            </Text>
          )}
        </View>
        <View style={styles.valuesContainer}>
          <Text style={[styles.total, item.isDeduction && styles.deduction]}>
            {formatCurrency(item.total)}
          </Text>
        </View>
      </View>

      {showDetails && (item.taxable !== item.total || item.taxFree > 0) && (
        <View style={styles.detailsRow}>
          {item.taxable > 0 && item.taxable !== item.total && (
            <Text style={styles.detailText}>
              Tassabile: {formatCurrency(item.taxable)}
            </Text>
          )}
          {item.taxFree > 0 && (
            <Text style={styles.detailText}>
              Tax-free: {formatCurrency(item.taxFree)}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.xs,
  },
  mainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelContainer: {
    flex: 1,
  },
  label: {
    fontSize: typography.sizes.base,
    color: colors.text,
  },
  quantity: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  valuesContainer: {
    alignItems: 'flex-end',
  },
  total: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  deduction: {
    color: colors.error,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  detailText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
});
