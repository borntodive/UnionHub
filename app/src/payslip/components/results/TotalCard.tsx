import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../../theme';
import { formatCurrency } from '../../utils/formatters';

interface TotalCardProps {
  totaleCompetenze: number;
  totaleTrattenute: number;
  netPayment: number;
}

export const TotalCard: React.FC<TotalCardProps> = ({
  totaleCompetenze,
  totaleTrattenute,
  netPayment,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Total</Text>

      <View style={styles.row}>
        <Text style={styles.label}>Total Earnings</Text>
        <Text style={styles.valuePositive}>{formatCurrency(totaleCompetenze)}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Total Deductions</Text>
        <Text style={styles.valueNegative}>{formatCurrency(-totaleTrattenute)}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.row}>
        <Text style={styles.netLabel}>Net Payment</Text>
        <Text style={styles.netValue}>{formatCurrency(netPayment)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    margin: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
  },
  valuePositive: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.success,
  },
  valueNegative: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.error,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  netLabel: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  netValue: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
});
