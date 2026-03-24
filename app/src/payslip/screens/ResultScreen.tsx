import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Menu, AlertTriangle } from "lucide-react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { colors, spacing, typography, borderRadius } from "../../theme";
import { useAuthStore } from "../../store/authStore";
import { usePayslipStore } from "../store/usePayslipStore";
import { PayslipItemRow } from "../components/results/PayslipItemRow";
import { TotalCard } from "../components/results/TotalCard";
import { formatCurrency, formatPercent } from "../utils/formatters";

export const ResultScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const {
    result,
    settings,
    overrideActive,
    overrideSettings,
    overrideRsa,
    overrideItud,
    calculate,
  } = usePayslipStore();

  const activeSettings = overrideActive ? overrideSettings : settings;

  // When override is active, use override flags; otherwise use the real user profile
  const itud = overrideActive ? overrideItud : (user?.itud ?? false);
  const rsa = overrideActive ? overrideRsa : (user?.rsa ?? false);

  // Auto-calculate when screen is focused
  useFocusEffect(
    useCallback(() => {
      calculate({ itud, rsa });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [calculate, itud, rsa, activeSettings.voluntaryPensionContribution]),
  );

  const handleMenuPress = () => {
    // @ts-ignore - Now inside DrawerNavigator
    navigation.openDrawer?.();
  };

  if (!result) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={handleMenuPress}
              style={styles.menuButton}
            >
              <Menu size={24} color={colors.textInverse} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t("payslip.title")}</Text>
            <View style={styles.placeholder} />
          </View>
        </SafeAreaView>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t("payslip.noResultsYet")}</Text>
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

  const sumOfEarnings = Object.values(earningsBreakdown).reduce(
    (a, b) => a + b,
    0,
  );
  const sumOfDeductions = Object.values(deductionsBreakdown).reduce(
    (a, b) => a + b,
    0,
  );
  const totalEarnings = sumOfEarnings - sumOfDeductions;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleMenuPress} style={styles.menuButton}>
            <Menu size={24} color={colors.textInverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("payslip.title")}</Text>
          <View style={styles.placeholder} />
        </View>
      </SafeAreaView>

      {overrideActive && (
        <View style={styles.overrideBanner}>
          <AlertTriangle size={14} color={colors.warning} />
          <Text style={styles.overrideBannerText}>
            {t("payslip.overrideActive")}
          </Text>
        </View>
      )}

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
          <Text style={styles.cardTitle}>{t("payslip.earnings")}</Text>
          <PayslipItemRow
            label={t("payslip.basicPay")}
            item={payslipItems.basic}
          />
          {payslipItems.basic13th.total > 0 && (
            <PayslipItemRow
              label={t("payslip.thirteenthMonth")}
              item={payslipItems.basic13th}
            />
          )}
          <PayslipItemRow
            label={t("payslip.fixedFlightPay")}
            item={payslipItems.ffp}
          />
          <PayslipItemRow
            label={t("payslip.scheduledBlockHours")}
            item={payslipItems.sbh}
          />
          <PayslipItemRow
            label={t("payslip.flyingPerDiem")}
            item={payslipItems.flyDiaria}
            showDetails
          />
          <PayslipItemRow
            label={t("payslip.nonFlyingPerDiem")}
            item={payslipItems.noFlyDiaria}
          />
          <PayslipItemRow
            label={t("payslip.annualLeave")}
            item={payslipItems.al}
          />
          {payslipItems.woff.total > 0 && (
            <PayslipItemRow
              label={t("payslip.workingDayOff")}
              item={payslipItems.woff}
            />
          )}
          <PayslipItemRow
            label={t("payslip.outOfBase")}
            item={payslipItems.oob}
          />
          {payslipItems.oobUnplanned.total > 0 && (
            <PayslipItemRow
              label={t("payslip.oobUnplanned")}
              item={payslipItems.oobUnplanned}
            />
          )}
          {payslipItems.rsa.total > 0 && (
            <PayslipItemRow label="RSA" item={payslipItems.rsa} />
          )}
          {payslipItems.simPay.total > 0 && (
            <PayslipItemRow
              label={t("payslip.simulatorPay")}
              item={payslipItems.simPay}
            />
          )}
          {payslipItems.trainingPay.total > 0 && (
            <PayslipItemRow
              label={t("payslip.trainingPay")}
              item={payslipItems.trainingPay}
            />
          )}
          {payslipItems.ccTraining.total > 0 && (
            <PayslipItemRow
              label={t("payslip.cabinCrewTraining")}
              item={payslipItems.ccTraining}
            />
          )}
          {payslipItems.commissions.total > 0 && (
            <PayslipItemRow
              label={t("payslip.commissions")}
              item={payslipItems.commissions}
            />
          )}

          {/* Additional Payments */}
          {payslipItems.additionalPayments.length > 0 && (
            <>
              <View style={styles.divider} />
              <Text style={styles.subsectionTitle}>
                {t("payslip.additionalPayments")}
              </Text>
              {payslipItems.additionalPayments.map((ap, index) => (
                <View key={index} style={styles.row}>
                  <Text style={styles.label}>
                    {ap.isSLR
                      ? t("payslip.statutoryLeaveRefund")
                      : t("payslip.additionalPayment")}
                    {ap.isConguaglio && ` (${t("payslip.conguaglio")})`}
                  </Text>
                  <Text style={styles.value}>{formatCurrency(ap.total)}</Text>
                </View>
              ))}
            </>
          )}

          {/* Deductions */}
          {(payslipItems.union.total !== 0 ||
            payslipItems.ul.total.total !== 0 ||
            payslipItems.parentalLeave.total.total !== 0 ||
            payslipItems.leave104.total.total !== 0) && (
            <>
              <View style={styles.divider} />
              <Text style={styles.subsectionTitle}>
                {t("payslip.deductions")}
              </Text>
              {payslipItems.union.total !== 0 && (
                <PayslipItemRow
                  label={t("payslip.unionFee")}
                  item={payslipItems.union}
                />
              )}
              {payslipItems.ul.total.total !== 0 && (
                <PayslipItemRow
                  label={t("payslip.unpaidLeave")}
                  item={payslipItems.ul.total}
                />
              )}
              {payslipItems.parentalLeave.total.total !== 0 && (
                <PayslipItemRow
                  label={t("payslip.parentalLeave")}
                  item={payslipItems.parentalLeave.total}
                />
              )}
              {payslipItems.leave104.total.total !== 0 && (
                <PayslipItemRow
                  label={t("payslip.law104")}
                  item={payslipItems.leave104.total}
                />
              )}
            </>
          )}

          {/* Additional Deductions */}
          {payslipItems.additionalDeductions.length > 0 && (
            <>
              <View style={styles.divider} />
              <Text style={styles.subsectionTitle}>
                {t("payslip.additionalDeductions")}
              </Text>
              {payslipItems.additionalDeductions.map((ded, index) => (
                <View key={index} style={styles.row}>
                  <Text style={styles.label}>
                    {t("payslip.additionalDeduction")}
                    {ded.isConguaglio && ` (${t("payslip.conguaglio")})`}
                  </Text>
                  <Text style={styles.valueNegative}>
                    -{formatCurrency(ded.total)}
                  </Text>
                </View>
              ))}
            </>
          )}

          {/* Totals */}
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.label}>{t("payslip.sumOfEarnings")}</Text>
            <Text style={styles.value}>{formatCurrency(sumOfEarnings)}</Text>
          </View>
          {sumOfDeductions > 0 && (
            <View style={styles.row}>
              <Text style={styles.label}>{t("payslip.lessDeductions")}</Text>
              <Text style={styles.valueNegative}>
                -{formatCurrency(sumOfDeductions)}
              </Text>
            </View>
          )}
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.labelBold}>{t("payslip.totalEarningsBT")}</Text>
            <Text style={styles.valueBold}>
              {formatCurrency(totalEarnings)}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("payslip.inps")}</Text>
          <View style={styles.row}>
            <Text style={styles.label}>{t("payslip.taxableAmount")}</Text>
            <Text style={styles.value}>
              {formatCurrency(areaINPS.imponibile)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>IVS (9.19%)</Text>
            <Text style={styles.value}>
              {formatCurrency(areaINPS.contribuzione.ivs)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>IVS Additional (3.59%)</Text>
            <Text style={styles.value}>
              {formatCurrency(areaINPS.contribuzione.ivsAdd)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>FIS</Text>
            <Text style={styles.value}>
              {formatCurrency(areaINPS.contribuzione.fis)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>CIGS</Text>
            <Text style={styles.value}>
              {formatCurrency(areaINPS.contribuzione.cigs)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>FSTA</Text>
            <Text style={styles.value}>
              {formatCurrency(areaINPS.contribuzione.fsta)}
            </Text>
          </View>
          {areaINPS.esenzioneIVS.amount > 0 && (
            <View style={styles.row}>
              <Text style={styles.label}>{t("payslip.ivsExemption")}</Text>
              <Text style={styles.value}>
                {formatCurrency(areaINPS.esenzioneIVS.amount)}
              </Text>
            </View>
          )}
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.labelBold}>
              {t("payslip.totalContributions")}
            </Text>
            <Text style={styles.valueBold}>
              {formatCurrency(areaINPS.contribuzioneTotale)}
            </Text>
          </View>
        </View>

        {__DEV__ && (
          <View style={[styles.card, styles.devCard]}>
            <Text style={[styles.cardTitle, styles.devTitle]}>
              DEV: INPS Imponibile Breakdown
            </Text>
            <Text style={styles.devSubtitle}>Voci incluse nel calcolo:</Text>

            <View style={styles.row}>
              <Text style={styles.label}>Basic Pay (taxable)</Text>
              <Text style={styles.value}>
                {formatCurrency(payslipItems.basic.taxable)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>13th Month (taxable)</Text>
              <Text style={styles.value}>
                {formatCurrency(payslipItems.basic13th.taxable)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>FFP (taxable)</Text>
              <Text style={styles.value}>
                {formatCurrency(payslipItems.ffp.taxable)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>SBH (taxable)</Text>
              <Text style={styles.value}>
                {formatCurrency(payslipItems.sbh.taxable)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Flying Diaria (taxable)</Text>
              <Text style={styles.value}>
                {formatCurrency(payslipItems.flyDiaria.taxable)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Non-Flying Diaria (taxable)</Text>
              <Text style={styles.value}>
                {formatCurrency(payslipItems.noFlyDiaria.taxable)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Annual Leave (taxable)</Text>
              <Text style={styles.value}>
                {formatCurrency(payslipItems.al.taxable)}
              </Text>
            </View>
            {payslipItems.woff.total > 0 && (
              <View style={styles.row}>
                <Text style={styles.label}>Working Day Off (taxable)</Text>
                <Text style={styles.value}>
                  {formatCurrency(payslipItems.woff.taxable)}
                </Text>
              </View>
            )}
            <View style={styles.row}>
              <Text style={styles.label}>Out Of Base (taxable)</Text>
              <Text style={styles.value}>
                {formatCurrency(payslipItems.oob.taxable)}
              </Text>
            </View>
            {payslipItems.rsa.total > 0 && (
              <View style={styles.row}>
                <Text style={styles.label}>RSA (taxable)</Text>
                <Text style={styles.value}>
                  {formatCurrency(payslipItems.rsa.taxable)}
                </Text>
              </View>
            )}
            {payslipItems.simPay.total > 0 && (
              <View style={styles.row}>
                <Text style={styles.label}>Simulator Pay (taxable)</Text>
                <Text style={styles.value}>
                  {formatCurrency(payslipItems.simPay.taxable)}
                </Text>
              </View>
            )}
            {payslipItems.trainingPay.total > 0 && (
              <View style={styles.row}>
                <Text style={styles.label}>Training Pay (taxable)</Text>
                <Text style={styles.value}>
                  {formatCurrency(payslipItems.trainingPay.taxable)}
                </Text>
              </View>
            )}
            {payslipItems.ccTraining.total > 0 && (
              <View style={styles.row}>
                <Text style={styles.label}>CC Training (taxable)</Text>
                <Text style={styles.value}>
                  {formatCurrency(payslipItems.ccTraining.taxable)}
                </Text>
              </View>
            )}
            {payslipItems.commissions.total > 0 && (
              <View style={styles.row}>
                <Text style={styles.label}>Commissions (taxable)</Text>
                <Text style={styles.value}>
                  {formatCurrency(payslipItems.commissions.taxable)}
                </Text>
              </View>
            )}

            {/* Additional Payments taxable */}
            {payslipItems.additionalPayments.map((ap, index) => (
              <View key={`ap-${index}`} style={styles.row}>
                <Text style={styles.label}>
                  Additional Payment #{index + 1} (
                  {ap.taxable > 0
                    ? `${Math.round((ap.taxable / ap.total) * 100)}%`
                    : "0%"}{" "}
                  taxable)
                </Text>
                <Text style={styles.value}>{formatCurrency(ap.taxable)}</Text>
              </View>
            ))}

            <View style={styles.divider} />

            {/* Deductions */}
            <Text style={styles.devSubtitle}>Voci sottratte:</Text>
            {payslipItems.ul.total.total !== 0 && (
              <View style={styles.row}>
                <Text style={styles.label}>Unpaid Leave</Text>
                <Text style={styles.valueNegative}>
                  -{formatCurrency(payslipItems.ul.total.total)}
                </Text>
              </View>
            )}
            {payslipItems.parentalLeave.total.total !== 0 && (
              <View style={styles.row}>
                <Text style={styles.label}>Parental Leave</Text>
                <Text style={styles.valueNegative}>
                  -{formatCurrency(payslipItems.parentalLeave.total.total)}
                </Text>
              </View>
            )}
            {payslipItems.leave104.total.total !== 0 && (
              <View style={styles.row}>
                <Text style={styles.label}>Law 104 Leave</Text>
                <Text style={styles.valueNegative}>
                  -{formatCurrency(payslipItems.leave104.total.total)}
                </Text>
              </View>
            )}
            {payslipItems.union.total !== 0 && (
              <View style={styles.row}>
                <Text style={styles.label}>Union Fee</Text>
                <Text style={styles.valueNegative}>
                  -{formatCurrency(payslipItems.union.total)}
                </Text>
              </View>
            )}

            {/* Additional Deductions */}
            {payslipItems.additionalDeductions.map((ded, index) => (
              <View key={`ded-${index}`} style={styles.row}>
                <Text style={styles.label}>
                  Additional Deduction #{index + 1}
                </Text>
                <Text style={styles.valueNegative}>
                  -{formatCurrency(ded.total)}
                </Text>
              </View>
            ))}

            <View style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.label}>
                Min Imponibile INPS (
                {result.areaINPS.imponibile > 0
                  ? Math.round(
                      result.areaINPS.imponibile /
                        (result.areaINPS.imponibile / 26),
                    )
                  : 26}{" "}
                gg × €
                {formatCurrency(
                  result.areaINPS.imponibile / 26 || 56.87,
                ).replace("€", "")}
                )
              </Text>
              <Text style={styles.value}>
                {formatCurrency(result.areaINPS.imponibile)}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={[styles.labelBold, styles.devHighlight]}>
                Imponibile Finale INPS
              </Text>
              <Text style={[styles.valueBold, styles.devHighlight]}>
                {formatCurrency(result.areaINPS.imponibile)}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("payslip.irpef")}</Text>
          <View style={styles.row}>
            <Text style={styles.label}>{t("payslip.taxableAmount")}</Text>
            <Text style={styles.value}>
              {formatCurrency(areaIRPEF.imponibile)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{t("payslip.grossTax")}</Text>
            <Text style={styles.value}>{formatCurrency(areaIRPEF.lordo)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{t("payslip.workDeductions")}</Text>
            <Text style={styles.value}>
              -{formatCurrency(areaIRPEF.detrazioniLavoroDipendente)}
            </Text>
          </View>
          {areaIRPEF.detrazioneConiuge > 0 && (
            <View style={styles.row}>
              <Text style={styles.label}>{t("payslip.spouseDeduction")}</Text>
              <Text style={styles.value}>
                -{formatCurrency(areaIRPEF.detrazioneConiuge)}
              </Text>
            </View>
          )}
          {areaIRPEF.taglioCuneoFiscale.amount > 0 && (
            <View style={styles.row}>
              <Text style={styles.label}>{t("payslip.taxCut")}</Text>
              <Text style={styles.value}>
                -{formatCurrency(areaIRPEF.taglioCuneoFiscale.amount)}
              </Text>
            </View>
          )}
          {areaIRPEF.trattamentoIntegrativo > 0 && (
            <View style={styles.row}>
              <Text style={styles.label}>Bonus (Trattamento Integrativo)</Text>
              <Text style={styles.value}>
                {formatCurrency(areaIRPEF.trattamentoIntegrativo)}
              </Text>
            </View>
          )}
          {(areaIRPEF.addizionaliComunali > 0 ||
            areaIRPEF.accontoAddizionaliComunali > 0 ||
            areaIRPEF.addizionaliRegionali > 0) && (
            <>
              <View style={styles.divider} />
              <Text style={styles.subsectionTitle}>
                {t("settings.payslipLocalTaxes")}
              </Text>
              {areaIRPEF.addizionaliComunali > 0 && (
                <View style={styles.row}>
                  <Text style={styles.label}>
                    {t("settings.payslipMunicipalSurcharge")}
                  </Text>
                  <Text style={styles.value}>
                    {formatCurrency(areaIRPEF.addizionaliComunali)}
                  </Text>
                </View>
              )}
              {areaIRPEF.accontoAddizionaliComunali > 0 && (
                <View style={styles.row}>
                  <Text style={styles.label}>
                    {t("settings.payslipMunicipalSurchargeAdvance")}
                  </Text>
                  <Text style={styles.value}>
                    {formatCurrency(areaIRPEF.accontoAddizionaliComunali)}
                  </Text>
                </View>
              )}
              {areaIRPEF.addizionaliRegionali > 0 && (
                <View style={styles.row}>
                  <Text style={styles.label}>
                    {t("settings.payslipRegionalSurcharge")}
                  </Text>
                  <Text style={styles.value}>
                    {formatCurrency(areaIRPEF.addizionaliRegionali)}
                  </Text>
                </View>
              )}
            </>
          )}
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.labelBold}>
              {t("payslip.totalTaxWithheld")}
            </Text>
            <Text style={styles.valueBold}>
              {formatCurrency(
                areaIRPEF.ritenute +
                  areaIRPEF.addizionaliComunali +
                  areaIRPEF.accontoAddizionaliComunali +
                  areaIRPEF.addizionaliRegionali,
              )}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{t("payslip.averageTaxRate")}</Text>
            <Text style={styles.value}>
              {formatPercent(areaIRPEF.aliquotaMedia)}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("payslip.tfr")}</Text>
          <View style={styles.row}>
            <Text style={styles.label}>{t("payslip.usefulSalary")}</Text>
            <Text style={styles.value}>
              {formatCurrency(areaIRPEF.retribuzioneUtileTFR)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{t("payslip.tfrAmount")}</Text>
            <Text style={styles.value}>{formatCurrency(areaIRPEF.tfr)}</Text>
          </View>
          {(areaIRPEF.fondoPensione.volontaria > 0 ||
            areaIRPEF.fondoPensione.aziendale > 0) && (
            <>
              <View style={styles.divider} />
              <Text style={styles.subsectionTitle}>
                {t("payslip.pensionFund")}
              </Text>
              {areaIRPEF.fondoPensione.volontaria > 0 && (
                <View style={styles.row}>
                  <Text style={styles.label}>
                    {t("payslip.voluntaryContribution")}
                  </Text>
                  <Text style={styles.value}>
                    {formatCurrency(areaIRPEF.fondoPensione.volontaria)}
                  </Text>
                </View>
              )}
              {areaIRPEF.fondoPensione.aziendale > 0 && (
                <View style={styles.row}>
                  <Text style={styles.label}>
                    {t("payslip.companyContribution")}
                  </Text>
                  <Text style={styles.value}>
                    {formatCurrency(areaIRPEF.fondoPensione.aziendale)}
                  </Text>
                </View>
              )}
              <View style={styles.divider} />
              <View style={styles.row}>
                <Text style={styles.labelBold}>
                  {t("payslip.totalPensionFund")}
                </Text>
                <Text style={styles.valueBold}>
                  {formatCurrency(areaIRPEF.fondoPensione.totale)}
                </Text>
              </View>
            </>
          )}
          {(areaIRPEF.tfr > 0 || areaIRPEF.fondoPensione.totale > 0) && (
            <>
              <View style={styles.divider} />
              <View style={styles.row}>
                <Text style={styles.labelBold}>
                  {t("payslip.totalTfrPension")}
                </Text>
                <Text style={styles.valueBold}>
                  {formatCurrency(
                    areaIRPEF.tfr + areaIRPEF.fondoPensione.totale,
                  )}
                </Text>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  menuButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.textInverse,
  },
  overrideBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.warning + "20",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.warning + "40",
  },
  overrideBannerText: {
    fontSize: typography.sizes.sm,
    color: colors.warning,
    fontWeight: typography.weights.semibold,
    flex: 1,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    textAlign: "center",
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  devCard: {
    backgroundColor: "#fff8e1", // Light yellow for dev mode
    borderColor: "#ffc107",
    borderWidth: 2,
  },
  devTitle: {
    color: "#f57c00",
  },
  devSubtitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: "#f57c00",
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  devHighlight: {
    color: "#e65100",
  },
});
