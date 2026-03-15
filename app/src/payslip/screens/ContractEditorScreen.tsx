import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, DrawerActions } from '@react-navigation/native';
import { Menu, ChevronLeft } from 'lucide-react-native';
import {
  createClaContract,
  updateClaContract,
  CreateClaContractData,
  ClaContract,
} from '../services/claContractsApi';
import { clearContractCache } from '../services/contractDataService';
import { colors, spacing, typography, shadows } from '../../theme';

type RouteParams = {
  contract?: ClaContract;
};

const ROLES = [
  { value: 'pil', label: 'Pilot' },
  { value: 'cc', label: 'Cabin Crew' },
];

const RANKS = {
  pil: [
    { value: 'cpt', label: 'Captain (CPT)' },
    { value: 'fo', label: 'First Officer (FO)' },
    { value: 'sfi', label: 'SFI' },
    { value: 'tri', label: 'TRI' },
    { value: 'tre', label: 'TRE' },
    { value: 'ltc', label: 'LTC' },
    { value: 'lcc', label: 'LCC' },
    { value: 'jfo', label: 'JFO' },
    { value: 'so', label: 'SO' },
  ],
  cc: [
    { value: 'sepe', label: 'SEPE' },
    { value: 'sepi', label: 'SEPI' },
    { value: 'pu', label: 'PU' },
    { value: 'jpu', label: 'JPU' },
    { value: 'ju', label: 'JU' },
  ],
};

export default function ContractEditorScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const existingContract = route.params?.contract;
  const isEditing = !!existingContract;

  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState(existingContract?.role || 'pil');
  const [rank, setRank] = useState(existingContract?.rank || 'cpt');
  const [year, setYear] = useState(
    existingContract?.effectiveYear?.toString() || new Date().getFullYear().toString()
  );
  const [month, setMonth] = useState(
    existingContract?.effectiveMonth?.toString() || '1'
  );

  // Contract values (stored as monthly in DB, shown as annual in UI)
  const [basic, setBasic] = useState(
    existingContract?.basic ? (existingContract.basic * 12).toString() : ''
  );
  const [ffp, setFfp] = useState(
    existingContract?.ffp ? (existingContract.ffp * 12).toString() : ''
  );
  const [sbh, setSbh] = useState(existingContract?.sbh?.toString() || '');
  const [al, setAl] = useState(existingContract?.al?.toString() || '');
  const [oob, setOob] = useState(existingContract?.oob?.toString() || '');
  const [woff, setWoff] = useState(existingContract?.woff?.toString() || '');
  const [allowance, setAllowance] = useState(
    existingContract?.allowance ? (existingContract.allowance * 12).toString() : ''
  );
  const [diaria, setDiaria] = useState(existingContract?.diaria?.toString() || '');
  const [rsa, setRsa] = useState(existingContract?.rsa?.toString() || '51.92');
  const [isActive, setIsActive] = useState(existingContract?.isActive ?? true);

  // Update rank when role changes
  useEffect(() => {
    const availableRanks = RANKS[role as keyof typeof RANKS];
    if (availableRanks && !availableRanks.find((r) => r.value === rank)) {
      setRank(availableRanks[0].value);
    }
  }, [role]);

  // Update form values when contract changes (for when navigating between contracts)
  useEffect(() => {
    if (existingContract) {
      setRole(existingContract.role || 'pil');
      setRank(existingContract.rank || 'cpt');
      setYear(existingContract.effectiveYear?.toString() || new Date().getFullYear().toString());
      setMonth(existingContract.effectiveMonth?.toString() || '1');
      setBasic(existingContract.basic ? (existingContract.basic * 12).toString() : '');
      setFfp(existingContract.ffp ? (existingContract.ffp * 12).toString() : '');
      setSbh(existingContract.sbh?.toString() || '');
      setAl(existingContract.al?.toString() || '');
      setOob(existingContract.oob?.toString() || '');
      setWoff(existingContract.woff?.toString() || '');
      setAllowance(existingContract.allowance ? (existingContract.allowance * 12).toString() : '');
      setDiaria(existingContract.diaria?.toString() || '');
      setRsa(existingContract.rsa?.toString() || '51.92');
      setIsActive(existingContract.isActive ?? true);
    }
  }, [existingContract]);

  const validateForm = (): boolean => {
    if (!basic || parseFloat(basic) < 0) {
      Alert.alert('Error', 'Basic salary is required');
      return false;
    }
    if (!ffp || parseFloat(ffp) < 0) {
      Alert.alert('Error', 'FFP is required');
      return false;
    }
    if (!diaria || parseFloat(diaria) < 0) {
      Alert.alert('Error', 'Diaria is required');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const data: CreateClaContractData = {
        company: 'RYR',
        role,
        rank,
        // Divide annual values by 12 to store as monthly
        basic: parseFloat(basic) / 12,
        ffp: parseFloat(ffp) / 12,
        sbh: parseFloat(sbh) || 0,
        al: parseFloat(al) || 0,
        oob: parseFloat(oob) || 0,
        woff: parseFloat(woff) || 0,
        allowance: parseFloat(allowance) / 12,
        diaria: parseFloat(diaria),
        rsa: parseFloat(rsa) || 51.92,
        effectiveYear: parseInt(year),
        effectiveMonth: parseInt(month),
        isActive,
      };

      if (isEditing) {
        await updateClaContract(existingContract.id, data);
        Alert.alert('Success', 'Contract updated successfully');
      } else {
        await createClaContract(data);
        Alert.alert('Success', 'Contract created successfully');
      }

      await clearContractCache();
      navigation.goBack();
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to save contract'
      );
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (
    label: string,
    value: string,
    onChange: (text: string) => void,
    placeholder: string = '0.00',
    keyboardType: 'numeric' | 'decimal-pad' = 'decimal-pad'
  ) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        keyboardType={keyboardType}
        placeholderTextColor={colors.textSecondary}
      />
    </View>
  );

  const renderSelect = (
    label: string,
    value: string,
    onChange: (val: string) => void,
    options: { value: string; label: string }[]
  ) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.selectContainer}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.selectOption, value === opt.value && styles.selectOptionActive]}
            onPress={() => onChange(opt.value)}
          >
            <Text
              style={[
                styles.selectOptionText,
                value === opt.value && styles.selectOptionTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
      
      {/* Green Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft size={24} color={colors.textInverse} />
        </TouchableOpacity>
        <Text style={styles.title}>
          {isEditing ? 'Edit Contract' : 'New Contract'}
        </Text>
        <View style={{ width: 40 }} />{/* Spacer for alignment */}
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Role Selection */}
        {renderSelect('Role', role, setRole, ROLES)}

        {/* Rank Selection */}
        {renderSelect('Rank', rank, setRank, RANKS[role as keyof typeof RANKS] || [])}

        {/* Year and Month */}
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <View style={{ flex: 1 }}>
            {renderInput('Effective Year', year, setYear, '2026', 'numeric')}
          </View>
          <View style={{ flex: 1 }}>
            {renderInput('Effective Month (1-12)', month, setMonth, '4', 'numeric')}
          </View>
        </View>

        {/* Contract Values */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Salary Components (Annual)</Text>
          {renderInput('Basic Salary (annual)', basic, setBasic, '15000')}
          {renderInput('FFP - Fixed Flight Pay (annual)', ffp, setFfp, '82044')}
          {renderInput('Scheduled Block Hours Rate (SBH)', sbh, setSbh, '18.21')}
          {renderInput('Annual Leave Daily Rate (AL)', al, setAl, '165.00')}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Allowances</Text>
          {renderInput('Out of Base Daily (OOB)', oob, setOob, '155.00')}
          {role === 'pil' && renderInput('Weekly Off (WOFF)', woff, setWoff, '450.00')}
          {renderInput('Allowance (annual)', allowance, setAllowance, '8000')}
          {renderInput('Per Diem Rate (Diaria)', diaria, setDiaria, '46.48')}
          {renderInput('RSA Amount (monthly)', rsa, setRsa, '51.92')}
        </View>

        {/* Active Status */}
        <View style={styles.switchContainer}>
          <Text style={styles.label}>Active</Text>
          <Switch
            value={isActive}
            onValueChange={setIsActive}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.textInverse}
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.textInverse} />
          ) : (
            <Text style={styles.saveBtnText}>
              {isEditing ? 'Update Contract' : 'Create Contract'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Cancel Button */}
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
  },
  backBtn: {
    padding: spacing.sm,
  },
  title: {
    fontSize: typography.sizes.xl,
    color: colors.textInverse,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
    padding: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    color: colors.text,
    fontWeight: 'bold',
    marginBottom: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  selectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  selectOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
  },
  selectOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  selectOptionText: {
    color: colors.text,
    fontSize: 14,
  },
  selectOptionTextActive: {
    color: colors.textInverse,
    fontWeight: '600',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.lg,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
  },
  cancelBtn: {
    backgroundColor: colors.border,
    padding: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  cancelBtnText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
