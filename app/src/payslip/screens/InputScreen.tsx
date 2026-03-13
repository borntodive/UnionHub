import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Button } from '../../components/Button';
import { usePayslipStore } from '../store/usePayslipStore';
import { MonthPicker } from '../components/input/MonthPicker';
import { SbhPicker } from '../components/input/SbhPicker';
import { NumberInput } from '../components/input/NumberInput';

export const InputScreen: React.FC = () => {
  const { input, settings, setInput, calculate, isCalculating } = usePayslipStore();

  const isPilot = settings.role === 'pil';
  const isLTC = settings.rank === 'ltc';
  const isInstructor = ['sfi', 'tri', 'tre'].includes(settings.rank);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Payslip Calculator</Text>
      </View>
      
      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <MonthPicker value={input.date} onChange={(date) => setInput({ date })} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Flight Activity</Text>
          <SbhPicker value={input.sbh} onChange={(sbh) => setInput({ sbh })} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Per Diem</Text>
          <NumberInput
            label="Flying Per Diem Days"
            value={input.flyDiaria}
            onChange={(flyDiaria) => setInput({ flyDiaria })}
          />
          <NumberInput
            label="Non-Flying Per Diem Days"
            value={input.noFlyDiaria}
            onChange={(noFlyDiaria) => setInput({ noFlyDiaria })}
          />
          {isPilot && (
            <NumberInput
              label="Landings on Day Off"
              value={input.landingInOffDay}
              onChange={(landingInOffDay) => setInput({ landingInOffDay })}
            />
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Leave & Absences</Text>
          <NumberInput
            label="Annual Leave Days"
            value={input.al}
            onChange={(al) => setInput({ al })}
          />
          {isPilot ? (
            <NumberInput
              label="Week Off Days"
              value={input.woff}
              onChange={(woff) => setInput({ woff })}
            />
          ) : (
            <NumberInput
              label="Bank Holidays"
              value={input.bankHolydays}
              onChange={(bankHolydays) => setInput({ bankHolydays })}
            />
          )}
          <NumberInput
            label="Out Of Base Nights"
            value={input.oob}
            onChange={(oob) => setInput({ oob })}
          />
          {!isPilot && (
            <NumberInput
              label="OOB Unplanned"
              value={input.oobUnplanned}
              onChange={(oobUnplanned) => setInput({ oobUnplanned })}
            />
          )}
          <NumberInput
            label="Unpaid Leave Days"
            value={input.ul}
            onChange={(ul) => setInput({ ul })}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Special Leave</Text>
          <NumberInput
            label="Parental Leave Days"
            value={input.parentalDays}
            onChange={(parentalDays) => setInput({ parentalDays })}
          />
          <NumberInput
            label="Law 104 Leave Days"
            value={input.days104}
            onChange={(days104) => setInput({ days104 })}
          />
        </View>

        {isLTC && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>LTC Training</Text>
            <NumberInput
              label="Training Sectors"
              value={input.trainingSectors}
              onChange={(trainingSectors) => setInput({ trainingSectors })}
            />
          </View>
        )}

        {isInstructor && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Instructor</Text>
            <NumberInput
              label="Simulator Days"
              value={input.simDays}
              onChange={(simDays) => setInput({ simDays })}
            />
          </View>
        )}

        {!isPilot && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Cabin Crew</Text>
            <NumberInput
              label="CC Training Days"
              value={input.ccTrainingDays}
              onChange={(ccTrainingDays) => setInput({ ccTrainingDays })}
            />
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Other</Text>
          <NumberInput
            label="ITUD Days"
            value={input.itud}
            onChange={(itud) => setInput({ itud })}
          />
          <NumberInput
            label="Commissions"
            value={input.commissions}
            onChange={(commissions) => setInput({ commissions })}
          />
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title={isCalculating ? 'Calculating...' : 'Calculate Payslip'}
            onPress={calculate}
            loading={isCalculating}
            disabled={isCalculating}
            size="lg"
          />
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  buttonContainer: {
    padding: spacing.md,
    marginTop: spacing.md,
  },
  bottomSpace: {
    height: spacing.xl,
  },
});
