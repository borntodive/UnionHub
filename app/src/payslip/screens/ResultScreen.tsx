import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Menu } from 'lucide-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { usePayslipStore } from '../store/usePayslipStore';
import { PayslipItemRow } from '../components/results/PayslipItemRow';
import { TotalCard } from '../components/results/TotalCard';
import { formatCurrency, formatPercent } from '../utils/formatters';

export const ResultScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const { result, settings, calculate } = usePayslipStore();

  // Get user flags from profile
  const itud = user?.itud ?? false;
  const rsa = user?.rsa ?? false;

  // Auto-calculate when screen is focused
  useFocusEffect(
    useCallback(() => {
      calculate({ itud, rsa });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [calculate, itud, rsa, settings.voluntaryPensionContribution])
  );

  const handleMenuPress = () => {
    // @ts-ignore - Now inside DrawerNavigator
    navigation.openDrawer?.();
  };

  if (!result) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleMenuPress} style={styles.menuButton}>
              <Menu size={24} color={colors.textInverse} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Payslip Results</Text>
            <View style={styles.placeholder} />
          </View>
        </SafeAreaView>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            Go to the Input tab to enter your flight data
          </Text>
        </View>
      </View>
    );
  }

  const { payslipItems, areaINPS, areaIRPEF } = result;

  // Calculate sum of all earnings (positive) minus deductions (positive values to subtract)
  const earningsBreakdown = {
    basic: payslipItems.basic.total,
    basic13th: payslipItems.basic13th.total,
    ffp: payslipItems.ffp.total,
    sbh: payslipItems.sbh.total,
    flyDiaria: payslipItems.flyDiaria.total,
    noFlyDiaria: payslipItems.noFlyDiaria.total,
    al: payslipItems.al.total,
    woff: payslipItems.woff.total,
    oob: payslipItems.oob.total,
    rsa: payslipItems.rsa.total,
    oobUnplanned: payslipItems.oobUnplanned.total,
    simPay: payslipItems.simPay.total,
    trainingPay: payslipItems.trainingPay.total,
    ccTraining: payslipItems.ccTraining.total,
    commissions: payslipItems.commissions.total,
  };
  
  const deductionsBreakdown = {
    union: payslipItems.union.total,
    ul: payslipItems.ul.total.total,
    parentalLeave: payslipItems.parentalLeave.total.total,
    leave104: payslipItems.leave104.total.total,
  };
  
  const sumOfEarnings = Object.values(earningsBreakdown).reduce((a, b) => a + b, 0);
  const sumOfDeductions = Object.values(deductionsBreakdown).reduce((a, b) => a + b, 0);
  const totalEarnings = sumOfEarnings - sumOfDeductions;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleMenuPress} style={styles.menuButton}>
            <Menu size={24} color={colors.textInverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payslip Results</Text>
          <View style={styles.placeholder} />
        </View>
      </SafeAreaView>
      
      <ScrollView style={styles.content}>
        <TotalCard
          totaleCompetenze={result.totaleCompetenze}
          totaleTrattenute={result.totaleTrattenute}
          netPayment={result.netPayment}
          grossPay={result.grossPay}
          taxArea={result.taxArea}
          taxFreeArea={result.taxFreeArea}
          esenzioneIVS={result.areaINPS.esenzioneIVS.amount}
          trattamentoIntegrativo={result.areaIRPEF.trattamentoIntegrativo}
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
            <PayslipItemRow label="Working Day Off" item={payslipItems.woff} />
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
          
          {/* Deductions */}
          {(payslipItems.union.total !== 0 || 
            payslipItems.ul.total.total !== 0 ||
            payslipItems.parentalLeave.total.total !== 0 || 
            payslipItems.leave104.total.total !== 0) && (
            <>
              <View style={styles.divider} />
              <Text style={styles.subsectionTitle}>Deductions</Text>
              {payslipItems.union.total !== 0 && (
                <PayslipItemRow label="Union Fee" item={payslipItems.union} />
              )}
              {payslipItems.ul.total.total !== 0 && (
                <PayslipItemRow label="Unpaid Leave" item={payslipItems.ul.total} />
              )}
              {payslipItems.parentalLeave.total.total !== 0 && (
                <PayslipItemRow label="Parental Leave" item={payslipItems.parentalLeave.total} />
              )}
              {payslipItems.leave104.total.total !== 0 && (
                <PayslipItemRow label="Law 104 Leave" item={payslipItems.leave104.total} />
              )}
            </>
          )}
          
          {/* Totals */}
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.label}>Sum of Earnings</Text>
            <Text style={styles.value}>{formatCurrency(sumOfEarnings)}</Text>
          </View>
          {sumOfDeductions > 0 && (
            <View style={styles.row}>
              <Text style={styles.label}>Less: Deductions</Text>
              <Text style={styles.valueNegative}>-{formatCurrency(sumOfDeductions)}</Text>
            </View>
          )}
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.labelBold}>Total Earnings (before tax)</Text>
            <Text style={styles.valueBold}>{formatCurrency(totalEarnings)}</Text>
          </View>
        </View>



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
          <View style={styles.row}>
            <Text style={styles.label}>FIS</Text>
            <Text style={styles.value}>{formatCurrency(areaINPS.contribuzione.fis)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>CIGS</Text>
            <Text style={styles.value}>{formatCurrency(areaINPS.contribuzione.cigs)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>FSTA</Text>
            <Text style={styles.value}>{formatCurrency(areaINPS.contribuzione.fsta)}</Text>
          </View>
          {areaINPS.esenzioneIVS.amount > 0 && (
            <View style={styles.row}>
              <Text style={styles.label}>IVS Exemption</Text>
              <Text style={styles.value}>{formatCurrency(areaINPS.esenzioneIVS.amount)}</Text>
            </View>
          )}
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
          {areaIRPEF.detrazioneConiuge > 0 && (
            <View style={styles.row}>
              <Text style={styles.label}>Spouse Deduction</Text>
              <Text style={styles.value}>-{formatCurrency(areaIRPEF.detrazioneConiuge)}</Text>
            </View>
          )}
          {areaIRPEF.taglioCuneoFiscale.amount > 0 && (
            <View style={styles.row}>
              <Text style={styles.label}>Tax Cut</Text>
              <Text style={styles.value}>-{formatCurrency(areaIRPEF.taglioCuneoFiscale.amount)}</Text>
            </View>
          )}
          {areaIRPEF.trattamentoIntegrativo > 0 && (
            <View style={styles.row}>
              <Text style={styles.label}>Bonus (Trattamento Integrativo)</Text>
              <Text style={styles.value}>{formatCurrency(areaIRPEF.trattamentoIntegrativo)}</Text>
            </View>
          )}
          {(areaIRPEF.addizionaliComunali > 0 || areaIRPEF.accontoAddizionaliComunali > 0 || areaIRPEF.addizionaliRegionali > 0) && (
            <>
              <View style={styles.divider} />
              <Text style={styles.subsectionTitle}>Local Taxes</Text>
              {areaIRPEF.addizionaliComunali > 0 && (
                <View style={styles.row}>
                  <Text style={styles.label}>Municipal Surcharge</Text>
                  <Text style={styles.value}>{formatCurrency(areaIRPEF.addizionaliComunali)}</Text>
                </View>
              )}
              {areaIRPEF.accontoAddizionaliComunali > 0 && (
                <View style={styles.row}>
                  <Text style={styles.label}>Municipal Surcharge Advance</Text>
                  <Text style={styles.value}>{formatCurrency(areaIRPEF.accontoAddizionaliComunali)}</Text>
                </View>
              )}
              {areaIRPEF.addizionaliRegionali > 0 && (
                <View style={styles.row}>
                  <Text style={styles.label}>Regional Surcharge</Text>
                  <Text style={styles.value}>{formatCurrency(areaIRPEF.addizionaliRegionali)}</Text>
                </View>
              )}
            </>
          )}
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.labelBold}>Total Tax Withheld</Text>
            <Text style={styles.valueBold}>
              {formatCurrency(
                areaIRPEF.ritenute +
                areaIRPEF.addizionaliComunali + 
                areaIRPEF.accontoAddizionaliComunali + 
                areaIRPEF.addizionaliRegionali
              )}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Average Tax Rate</Text>
            <Text style={styles.value}>{formatPercent(areaIRPEF.aliquotaMedia)}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>TFR (Severance Pay)</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Useful Salary (RUT)</Text>
            <Text style={styles.value}>{formatCurrency(areaIRPEF.retribuzioneUtileTFR)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>TFR Amount</Text>
            <Text style={styles.value}>{formatCurrency(areaIRPEF.tfr)}</Text>
          </View>
          {(areaIRPEF.fondoPensione.volontaria > 0 || areaIRPEF.fondoPensione.aziendale > 0) && (
            <>
              <View style={styles.divider} />
              <Text style={styles.subsectionTitle}>Pension Fund</Text>
              {areaIRPEF.fondoPensione.volontaria > 0 && (
                <View style={styles.row}>
                  <Text style={styles.label}>Voluntary Contribution</Text>
                  <Text style={styles.value}>{formatCurrency(areaIRPEF.fondoPensione.volontaria)}</Text>
                </View>
              )}
              {areaIRPEF.fondoPensione.aziendale > 0 && (
                <View style={styles.row}>
                  <Text style={styles.label}>Company Contribution (2%)</Text>
                  <Text style={styles.value}>{formatCurrency(areaIRPEF.fondoPensione.aziendale)}</Text>
                </View>
              )}
              <View style={styles.divider} />
              <View style={styles.row}>
                <Text style={styles.labelBold}>Total Pension Fund</Text>
                <Text style={styles.valueBold}>{formatCurrency(areaIRPEF.fondoPensione.totale)}</Text>
              </View>
            </>
          )}
          {(areaIRPEF.tfr > 0 || areaIRPEF.fondoPensione.totale > 0) && (
            <>
              <View style={styles.divider} />
              <View style={styles.row}>
                <Text style={styles.labelBold}>Total (TFR + Pension Fund)</Text>
                <Text style={styles.valueBold}>{formatCurrency(areaIRPEF.tfr + areaIRPEF.fondoPensione.totale)}</Text>
              </View>
            </>
          )}
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    backgroundColor: colors.primary,
  },
  header: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  menuButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textInverse,
  },
  placeholder: {
    width: 40,
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
  valueNegative: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.error,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  subsectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  bottomSpace: {
    height: spacing.xl,
  },
});
