import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { usePayslipStore } from '../store/usePayslipStore';
import { PayslipItemRow } from '../components/results/PayslipItemRow';
import { TotalCard } from '../components/results/TotalCard';
import { formatCurrency, formatPercent } from '../utils/formatters';

export const ResultScreen: React.FC = () => {
  const { result } = usePayslipStore();

  if (!result) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          Inserisci i dati e premi "Calcola" per vedere il risultato
        </Text>
      </View>
    );
  }

  const { payslipItems, areaINPS, areaIRPEF } = result;

  return (
    <ScrollView style={styles.container}>
      <TotalCard
        totaleCompetenze={result.totaleCompetenze}
        totaleTrattenute={result.totaleTrattenute}
        netPayment={result.netPayment}
      />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Voci Retributive</Text>
        <PayslipItemRow label="Stipendio Base" item={payslipItems.basic} />
        {payslipItems.basic13th.total > 0 && (
          <PayslipItemRow label="Tredicesima" item={payslipItems.basic13th} />
        )}
        <PayslipItemRow label="Fixed Flight Pay" item={payslipItems.ffp} />
        <PayslipItemRow label="Scheduled Block Hours" item={payslipItems.sbh} />
        <PayslipItemRow label="Diaria Volo" item={payslipItems.flyDiaria} showDetails />
        <PayslipItemRow label="Diaria No-Fly" item={payslipItems.noFlyDiaria} />
        <PayslipItemRow label="Ferie (AL)" item={payslipItems.al} />
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
          <PayslipItemRow label="Sim Pay" item={payslipItems.simPay} />
        )}
        {payslipItems.trainingPay.total > 0 && (
          <PayslipItemRow label="Training Pay" item={payslipItems.trainingPay} />
        )}
        {payslipItems.ccTraining.total > 0 && (
          <PayslipItemRow label="CC Training" item={payslipItems.ccTraining} />
        )}
        {payslipItems.commissions.total > 0 && (
          <PayslipItemRow label="Provvigioni" item={payslipItems.commissions} />
        )}
      </View>

      {(payslipItems.ul.total.total > 0 ||
        payslipItems.parentalLeave.total.total > 0 ||
        payslipItems.leave104.total.total > 0) && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Assenze</Text>
          {payslipItems.ul.total.total > 0 && (
            <PayslipItemRow label="Unpaid Leave" item={payslipItems.ul.total} />
          )}
          {payslipItems.parentalLeave.total.total > 0 && (
            <PayslipItemRow label="Congedo Parentale" item={payslipItems.parentalLeave.total} />
          )}
          {payslipItems.leave104.total.total > 0 && (
            <PayslipItemRow label="Legge 104" item={payslipItems.leave104.total} />
          )}
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>INPS</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Imponibile</Text>
          <Text style={styles.value}>{formatCurrency(areaINPS.imponibile)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>IVS (9.19%)</Text>
          <Text style={styles.value}>{formatCurrency(areaINPS.contribuzione.ivs)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>IVS Add (3.59%)</Text>
          <Text style={styles.value}>{formatCurrency(areaINPS.contribuzione.ivsAdd)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.labelBold}>Totale Contributi</Text>
          <Text style={styles.valueBold}>{formatCurrency(areaINPS.contribuzioneTotale)}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>IRPEF</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Imponibile</Text>
          <Text style={styles.value}>{formatCurrency(areaIRPEF.imponibile)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Imposta Lorda</Text>
          <Text style={styles.value}>{formatCurrency(areaIRPEF.lordo)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Detrazioni Lavoro</Text>
          <Text style={styles.value}>-{formatCurrency(areaIRPEF.detrazioniLavoroDipendente)}</Text>
        </View>
        {areaIRPEF.taglioCuneoFiscale.amount > 0 && (
          <View style={styles.row}>
            <Text style={styles.label}>Taglio Cuneo</Text>
            <Text style={styles.value}>-{formatCurrency(areaIRPEF.taglioCuneoFiscale.amount)}</Text>
          </View>
        )}
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.labelBold}>Ritenute Nette</Text>
          <Text style={styles.valueBold}>{formatCurrency(areaIRPEF.ritenute)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Aliquota Media</Text>
          <Text style={styles.value}>{formatPercent(areaIRPEF.aliquotaMedia)}</Text>
        </View>
      </View>

      <View style={styles.bottomSpace} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
