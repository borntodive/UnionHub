import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Menu } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { usePayslipStore } from '../store/usePayslipStore';
import { MonthPicker } from '../components/input/MonthPicker';
import { SbhPicker } from '../components/input/SbhPicker';
import { NumberInput } from '../components/input/NumberInput';

export const InputScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const { input, settings, setInput } = usePayslipStore();

  const isPilot = settings.role === 'pil';
  const isLTC = settings.rank === 'ltc';
  const isInstructor = ['sfi', 'tri', 'tre'].includes(settings.rank);

  // Get ITUD flag from user profile
  const hasItud = user?.itud ?? false;

  const handleMenuPress = () => {
    // @ts-ignore - Now inside DrawerNavigator
    navigation.openDrawer?.();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleMenuPress} style={styles.menuButton}>
            <Menu size={24} color={colors.textInverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payslip Calculator</Text>
          <View style={styles.placeholder} />
        </View>
      </SafeAreaView>
      
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
          <NumberInput
            label="Out Of Base Nights"
            value={input.oob}
            onChange={(oob) => setInput({ oob })}
          />
          {isPilot && (
            <NumberInput
              label="Working Day Off"
              value={input.woff}
              onChange={(woff) => setInput({ woff })}
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
          {!isPilot && (
            <NumberInput
              label="Bank Holidays"
              value={input.bankHolydays}
              onChange={(bankHolydays) => setInput({ bankHolydays })}
            />
          )}
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
            <NumberInput
              label="Landings on Day Off"
              value={input.landingInOffDay}
              onChange={(landingInOffDay) => setInput({ landingInOffDay })}
            />
            <NumberInput
              label="Commissions"
              value={input.commissions}
              onChange={(commissions) => setInput({ commissions })}
            />
          </View>
        )}

        {hasItud && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Other</Text>
            <NumberInput
              label="ITUD Days"
              value={input.itud}
              onChange={(itud) => setInput({ itud })}
            />
          </View>
        )}

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
