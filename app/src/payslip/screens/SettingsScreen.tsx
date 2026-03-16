import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Menu, Info } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { usePayslipStore } from '../store/usePayslipStore';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { UserRole } from '../../types';

// Available ranks by role
const PILOT_RANKS = ['cpt', 'fo', 'sfi', 'tri', 'tre', 'ltc', 'lcc', 'jfo', 'so'];
const CC_RANKS = ['sepe', 'sepi', 'pu', 'jpu', 'ju'];

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const { settings, setSettings } = usePayslipStore();

  const handleMenuPress = () => {
    // @ts-ignore - Now inside DrawerNavigator
    navigation.openDrawer?.();
  };

  const isPilot = settings.role === 'pil';
  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.SUPERADMIN;
  const isSuperAdmin = user?.role === UserRole.SUPERADMIN;

  const handlePensionChange = (value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0 && num <= 100) {
      setSettings({ voluntaryPensionContribution: num });
    }
  };

  const availableRanks = isPilot ? PILOT_RANKS : CC_RANKS;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleMenuPress} style={styles.menuButton}>
            <Menu size={24} color={colors.textInverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.placeholder} />
        </View>
      </SafeAreaView>
      
      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Profile</Text>
          
          {/* Role selection - SuperAdmin only */}
          {isSuperAdmin ? (
            <View style={styles.selectorContainer}>
              <Text style={styles.label}>Role</Text>
              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  style={[styles.roleButton, settings.role === 'pil' && styles.roleButtonActive]}
                  onPress={() => setSettings({ role: 'pil' })}
                >
                  <Text style={[styles.roleButtonText, settings.role === 'pil' && styles.roleButtonTextActive]}>
                    Pilot
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleButton, settings.role === 'cc' && styles.roleButtonActive]}
                  onPress={() => setSettings({ role: 'cc' })}
                >
                  <Text style={[styles.roleButtonText, settings.role === 'cc' && styles.roleButtonTextActive]}>
                    Cabin Crew
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Role</Text>
              <Text style={styles.infoValue}>{isPilot ? 'Pilot' : 'Cabin Crew'}</Text>
            </View>
          )}
          
          {/* Rank selection - Admin and SuperAdmin */}
          {isAdmin ? (
            <View style={styles.selectorContainer}>
              <Text style={styles.label}>Rank</Text>
              <View style={styles.rankContainer}>
                {availableRanks.map((rank) => (
                  <TouchableOpacity
                    key={rank}
                    style={[styles.rankButton, settings.rank === rank && styles.rankButtonActive]}
                    onPress={() => setSettings({ rank })}
                  >
                    <Text style={[styles.rankButtonText, settings.rank === rank && styles.rankButtonTextActive]}>
                      {rank.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Rank</Text>
              <Text style={styles.infoValue}>{settings.rank.toUpperCase()}</Text>
            </View>
          )}
          
          {/* New Captain - only for CPT */}
          {settings.rank === 'cpt' && (
            <View style={styles.checkboxRow}>
              <TouchableOpacity
                style={[styles.checkbox, settings.cu && styles.checkboxActive]}
                onPress={() => setSettings({ cu: !settings.cu })}
              >
                {settings.cu && <Text style={styles.checkboxCheck}>✓</Text>}
              </TouchableOpacity>
              <Text style={styles.checkboxLabel}>New Captain (first year)</Text>
            </View>
          )}
          
          {/* TRI acting as LTC - only for TRI */}
          {settings.rank === 'tri' && (
            <View style={styles.checkboxRow}>
              <TouchableOpacity
                style={[styles.checkbox, settings.triAndLtc && styles.checkboxActive]}
                onPress={() => setSettings({ triAndLtc: !settings.triAndLtc })}
              >
                {settings.triAndLtc && <Text style={styles.checkboxCheck}>✓</Text>}
              </TouchableOpacity>
              <Text style={styles.checkboxLabel}>TRI acting as LTC</Text>
            </View>
          )}
          
          {/* BTC based - for SFI, TRI, TRE */}
          {['sfi', 'tri', 'tre'].includes(settings.rank) && (
            <View style={styles.checkboxRow}>
              <TouchableOpacity
                style={[styles.checkbox, settings.btc && styles.checkboxActive]}
                onPress={() => setSettings({ btc: !settings.btc })}
              >
                {settings.btc && <Text style={styles.checkboxCheck}>✓</Text>}
              </TouchableOpacity>
              <Text style={styles.checkboxLabel}>BTC Based Contract</Text>
            </View>
          )}
          
          {/* Dependent Spouse */}
          <View style={styles.checkboxRow}>
            <TouchableOpacity
              style={[styles.checkbox, settings.coniugeCarico && styles.checkboxActive]}
              onPress={() => setSettings({ coniugeCarico: !settings.coniugeCarico })}
            >
              {settings.coniugeCarico && <Text style={styles.checkboxCheck}>✓</Text>}
            </TouchableOpacity>
            <Text style={styles.checkboxLabel}>Dependent Spouse</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Pension Fund</Text>
          <Text style={styles.label}>Voluntary Contribution (%)</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={settings.voluntaryPensionContribution.toString()}
              onChangeText={handlePensionChange}
              keyboardType="numeric"
              maxLength={5}
              placeholder="0"
            />
            <Text style={styles.percentSign}>%</Text>
          </View>
          <Text style={styles.hint}>
            Company contributes 2% only if your contribution is ≥ 2%
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Part-Time</Text>
          
          <View style={styles.checkboxRow}>
            <TouchableOpacity
              style={[styles.checkbox, settings.parttime && styles.checkboxActive]}
              onPress={() => setSettings({ parttime: !settings.parttime })}
            >
              {settings.parttime && <Text style={styles.checkboxCheck}>✓</Text>}
            </TouchableOpacity>
            <Text style={styles.checkboxLabel}>Part-time contract</Text>
          </View>
          
          {settings.parttime && (
            <View style={styles.selectorContainer}>
              <Text style={styles.label}>Percentage</Text>
              <View style={styles.buttonGroup}>
                {[0.5, 0.66, 0.75].map((pct) => (
                  <TouchableOpacity
                    key={pct}
                    style={[styles.roleButton, settings.parttimePercentage === pct && styles.roleButtonActive]}
                    onPress={() => setSettings({ parttimePercentage: pct })}
                  >
                    <Text style={[styles.roleButtonText, settings.parttimePercentage === pct && styles.roleButtonTextActive]}>
                      {Math.round(pct * 100)}%
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Local Taxes</Text>
          
          <Text style={styles.label}>Municipal Surcharge (%)</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={settings.addComunali.toString()}
              onChangeText={(value) => {
                const num = parseFloat(value);
                if (!isNaN(num) && num >= 0 && num <= 100) {
                  setSettings({ addComunali: num });
                }
              }}
              keyboardType="numeric"
              maxLength={5}
              placeholder="0"
            />
            <Text style={styles.percentSign}>%</Text>
          </View>

          <Text style={[styles.label, { marginTop: spacing.md }]}>Municipal Surcharge Advance (€)</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={settings.accontoAddComunali.toString()}
              onChangeText={(value) => {
                const num = parseFloat(value);
                if (!isNaN(num) && num >= 0) {
                  setSettings({ accontoAddComunali: num });
                }
              }}
              keyboardType="numeric"
              maxLength={10}
              placeholder="0"
            />
            <Text style={styles.percentSign}>€</Text>
          </View>

          <Text style={[styles.label, { marginTop: spacing.md }]}>Regional Surcharge (%)</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={settings.addRegionali.toString()}
              onChangeText={(value) => {
                const num = parseFloat(value);
                if (!isNaN(num) && num >= 0 && num <= 100) {
                  setSettings({ addRegionali: num });
                }
              }}
              keyboardType="numeric"
              maxLength={5}
              placeholder="0"
            />
            <Text style={styles.percentSign}>%</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Info size={20} color={colors.primary} />
          <Text style={styles.infoText}>
            Settings are automatically saved. Changes will apply to the next calculation.
          </Text>
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  infoLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.primary,
  },
  bottomSpace: {
    height: spacing.xl,
  },
  label: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    fontSize: typography.sizes.base,
    color: colors.text,
    paddingVertical: spacing.md,
  },
  percentSign: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  hint: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  checkboxActive: {
    backgroundColor: colors.primary,
  },
  checkboxCheck: {
    color: colors.textInverse,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  checkboxLabel: {
    fontSize: typography.sizes.base,
    color: colors.text,
  },
  selectorContainer: {
    marginBottom: spacing.md,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  roleButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  roleButtonText: {
    fontSize: typography.sizes.base,
    color: colors.text,
    fontWeight: typography.weights.medium,
  },
  roleButtonTextActive: {
    color: colors.textInverse,
  },
  rankContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  rankButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minWidth: 70,
    alignItems: 'center',
  },
  rankButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  rankButtonText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    fontWeight: typography.weights.medium,
  },
  rankButtonTextActive: {
    color: colors.textInverse,
  },
});
