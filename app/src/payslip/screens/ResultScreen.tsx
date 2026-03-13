import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { usePayslipStore } from '../store/usePayslipStore';
import { PayslipItemRow } from '../components/results/PayslipItemRow';
import { TotalCard } from '../components/results/TotalCard';
import { formatCurrency, formatPercent } from '../utils/formatters';

export const ResultScreen: React.FC = () => {
  const { result } = usePayslipStore();

  if (!result) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Payslip Results</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            Enter data and press "Calculate Payslip" to see the result
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const { payslipItems, areaINPS, areaIRPEF } = result;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Payslip Results</Text>
      </View>
      
      <ScrollView style={styles.content}>
        <TotalCard
          totaleCompetenze={result.totaleCompetenze}
          totaleTrattenute={result.totaleTrattenute}
          netPayment={result.netPayment}
        />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Earnings</Text>
          <PayslipItemRow label="Basic Pay" item={payslipItems.basic} />
          {payslipItems.basic13th.total > 0 && (
            <PayslipItemRow label="13th Month" item={payslipItems.basic13th} />
          )}
          <PayslipItemRow label="Fixed Flight Pay" item={payslipItems.ffp} />
          <PayslipItemRow label="Scheduled Block Hours" item={payslipItems.sbh} />
          <PayslipItemRow label="Flying Per Diem" item={payslipItems.flyDiaria} showDetails />
          <PayslipItemRow label="Non-Flying Per Diem" item={payslipItems.noFlyDiaria} />
          <PayslipItemRow label="Annual Leave" item={payslipItems.al} />
          {payslipItems.woff.total > 0 && (
            <PayslipItemRow label="Week Off" item={payslipItems.woff} />
          )}
          <PayslipItemRow label="Out Of Base" item={payslipItems.oob} />
          {payslipItems.oobUnplanned.total > 0 && (
            <PayslipItemRow label="OOB Unplanned" item={payslipItems.oobUnplanned} />
          )}
          {payslipItems.rsa.total > 0 && (
            <PayslipItemRow label="RSA" item={payslipItems.rsa} />
          )}
          {payslipItems.simPay.total > 0 && (
            <PayslipItemRow label="Simulator Pay" item={payslipItems.simPay} />
          )}
          {payslipItems.trainingPay.total > 0 && (
            <PayslipItemRow label="Training Pay" item={payslipItems.trainingPay} />
          )}
          {payslipItems.ccTraining.total > 0 && (
            <PayslipItemRow label="CC Training" item={payslipItems.ccTraining} />
          )}
          {payslipItems.commissions.total > 0 && (
            <PayslipItemRow label="Commissions" item={payslipItems.commissions} />
          )}
        </View>

        {(payslipItems.ul.total.total > 0 ||
          payslipItems.parentalLeave.total.total > 0 ||
          payslipItems.leave104.total.total > 0) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Absences</Text>
            {payslipItems.ul.total.total > 0 && (
              <PayslipItemRow label="Unpaid Leave" item={payslipItems.ul.total} />
            )}
            {payslipItems.parentalLeave.total.total > 0 && (
              <PayslipItemRow label="Parental Leave" item={payslipItems.parentalLeave.total} />
            )}
            {payslipItems.leave104.total.total > 0 && (
              <PayslipItemRow label="Law 104 Leave" item={payslipItems.leave104.total} />
            )}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>INPS (Social Security)</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Taxable Amount</Text>
            <Text style={styles.value}>{formatCurrency(areaINPS.imponibile)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>IVS (9.19%)</Text>
            <Text style={styles.value}>{formatCurrency(areaINPS.contribuzione.ivs)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>IVS Additional (3.59%)</Text>
            <Text style={styles.value}>{formatCurrency(areaINPS.contribuzione.ivsAdd)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.labelBold}>Total Contributions</Text>
            <Text style={styles.valueBold}>{formatCurrency(areaINPS.contribuzioneTotale)}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>IRPEF (Income Tax)</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Taxable Income</Text>
            <Text style={styles.value}>{formatCurrency(areaIRPEF.imponibile)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Gross Tax</Text>
            <Text style={styles.value}>{formatCurrency(areaIRPEF.lordo)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Work Deductions</Text>
            <Text style={styles.value}>-{formatCurrency(areaIRPEF.detrazioniLavoroDipendente)}</Text>
          </View>
          {areaIRPEF.taglioCuneoFiscale.amount > 0 && (
            <View style={styles.row}>
              <Text style={styles.label}>Tax Cut</Text>
              <Text style={styles.value}>-{formatCurrency(areaIRPEF.taglioCuneoFiscale.amount)}</Text>
            </View>
          )}
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.labelBold}>Net Tax Withheld</Text>
            <Text style={styles.valueBold}>{formatCurrency(areaIRPEF.ritenute)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Average Tax Rate</Text>
            <Text style={styles.value}>{formatPercent(areaIRPEF.aliquotaMedia)}</Text>
          </View>
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textInverse,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  label: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  labelBold: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  value: {
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  valueBold: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  bottomSpace: {
    height: spacing.xl,
  },
});
