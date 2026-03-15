import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Menu } from 'lucide-react-native';
import {
  fetchAllClaContracts,
  deactivateClaContract,
  activateClaContract,
  cloneClaContract,
  ClaContract,
} from '../services/claContractsApi';
import { clearContractCache } from '../services/contractDataService';
import { colors, spacing, typography, shadows } from '../../theme';
import { useAuthStore } from '../../store/authStore';

interface GroupedContracts {
  [role: string]: {
    [rank: string]: ClaContract[];
  };
}

export default function AdminContractsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user } = useAuthStore();
  const [contracts, setContracts] = useState<ClaContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const loadContracts = useCallback(async () => {
    try {
      const data = await fetchAllClaContracts(selectedYear);
      setContracts(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load contracts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    loadContracts();
  }, [loadContracts]);

  const onRefresh = () => {
    setRefreshing(true);
    loadContracts();
  };

  const handleDeactivate = async (contract: ClaContract) => {
    Alert.alert(
      'Confirm Deactivation',
      `Deactivate contract for ${contract.rank.toUpperCase()} (${contract.effectiveYear})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              await deactivateClaContract(contract.id);
              await clearContractCache();
              loadContracts();
            } catch (error) {
              Alert.alert('Error', 'Failed to deactivate contract');
            }
          },
        },
      ]
    );
  };

  const handleActivate = async (contract: ClaContract) => {
    try {
      await activateClaContract(contract.id);
      await clearContractCache();
      loadContracts();
    } catch (error) {
      Alert.alert('Error', 'Failed to activate contract');
    }
  };

  const handleClone = async (contract: ClaContract) => {
    const nextYear = contract.effectiveYear + 1;
    Alert.alert(
      'Clone Contract',
      `Clone ${contract.rank.toUpperCase()} contract for year ${nextYear}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clone',
          onPress: async () => {
            try {
              await cloneClaContract(contract.id, nextYear);
              Alert.alert('Success', `Contract cloned for ${nextYear}`);
              loadContracts();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to clone contract');
            }
          },
        },
      ]
    );
  };

  const groupContracts = (): GroupedContracts => {
    const grouped: GroupedContracts = {};
    contracts.forEach((contract) => {
      if (!grouped[contract.role]) {
        grouped[contract.role] = {};
      }
      if (!grouped[contract.role][contract.rank]) {
        grouped[contract.role][contract.rank] = [];
      }
      grouped[contract.role][contract.rank].push(contract);
    });
    return grouped;
  };

  const renderContractCard = (contract: ClaContract) => (
    <View key={contract.id} style={[styles.card, !contract.isActive && styles.inactiveCard]}>
      <View style={styles.cardHeader}>
        <View style={styles.rankBadge}>
          <Text style={styles.rankText}>{contract.rank.toUpperCase()}</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={[styles.statusText, contract.isActive ? styles.activeText : styles.inactiveText]}>
            {contract.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.row}>
          <Text style={styles.label}>Basic (annual):</Text>
          <Text style={styles.value}>€{Number((contract.basic || 0) * 12).toFixed(2)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>FFP (annual):</Text>
          <Text style={styles.value}>€{Number((contract.ffp || 0) * 12).toFixed(2)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Allowance (annual):</Text>
          <Text style={styles.value}>€{Number((contract.allowance || 0) * 12).toFixed(2)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Diaria:</Text>
          <Text style={styles.value}>€{Number(contract.diaria || 0).toFixed(4)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Version:</Text>
          <Text style={styles.value}>v{contract.version}</Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.editBtn]}
          onPress={() => navigation.navigate('ContractEditor', { contract })}
        >
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>

        {contract.isActive ? (
          <TouchableOpacity
            style={[styles.actionBtn, styles.deactivateBtn]}
            onPress={() => handleDeactivate(contract)}
          >
            <Text style={styles.deactivateBtnText}>Deactivate</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionBtn, styles.activateBtn]}
            onPress={() => handleActivate(contract)}
          >
            <Text style={styles.activateBtnText}>Activate</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionBtn, styles.cloneBtn]}
          onPress={() => handleClone(contract)}
        >
          <Text style={styles.cloneBtnText}>Clone</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const grouped = groupContracts();

  if (loading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.headerSafeArea} edges={['top', 'left', 'right']}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.menuBtn}
              onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            >
              <Menu size={24} color={colors.textInverse} />
            </TouchableOpacity>
            <Text style={styles.title}>CLA Contracts</Text>
            <View style={styles.yearSelector}>
              <Text style={styles.yearText}>{selectedYear}</Text>
            </View>
          </View>
        </SafeAreaView>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
      
      {/* Green Header with Hamburger - includes notch area */}
      <SafeAreaView style={styles.headerSafeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
        <TouchableOpacity
          style={styles.menuBtn}
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        >
          <Menu size={24} color={colors.textInverse} />
        </TouchableOpacity>
        <Text style={styles.title}>CLA Contracts</Text>
        <View style={styles.yearSelector}>
          <TouchableOpacity
            style={styles.yearBtn}
            onPress={() => setSelectedYear((y) => y - 1)}
          >
            <Text style={styles.yearBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.yearText}>{selectedYear}</Text>
          <TouchableOpacity
            style={styles.yearBtn}
            onPress={() => setSelectedYear((y) => y + 1)}
          >
            <Text style={styles.yearBtnText}>→</Text>
          </TouchableOpacity>
        </View>
        </View>
      </SafeAreaView>

      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => navigation.navigate('ContractEditor', {})}
      >
        <Text style={styles.addBtnText}>+ New Contract</Text>
      </TouchableOpacity>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {Object.entries(grouped).map(([role, ranks]) => (
          <View key={role} style={styles.section}>
            <Text style={styles.sectionTitle}>
              {role === 'pil' ? 'Pilots' : 'Cabin Crew'}
            </Text>
            {Object.entries(ranks).map(([rank, rankContracts]) => (
              <View key={rank}>
                {rankContracts.map(renderContractCard)}
              </View>
            ))}
          </View>
        ))}

        {contracts.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No contracts found for {selectedYear}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerSafeArea: {
    backgroundColor: colors.primary,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
  },
  menuBtn: {
    padding: spacing.sm,
    marginRight: spacing.sm,
  },
  title: {
    fontSize: typography.sizes.xl,
    color: colors.textInverse,
    fontWeight: 'bold',
  },
  yearSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  yearBtn: {
    padding: spacing.sm,
    backgroundColor: colors.primaryDark,
    borderRadius: 8,
  },
  yearBtnText: {
    color: colors.textInverse,
    fontSize: 18,
    fontWeight: 'bold',
  },
  yearText: {
    fontSize: typography.sizes.lg,
    color: colors.textInverse,
    fontWeight: 'bold',
    minWidth: 60,
    textAlign: 'center',
  },
  addBtn: {
    margin: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: 12,
    alignItems: 'center',
  },
  addBtnText: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
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
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  inactiveCard: {
    opacity: 0.7,
    backgroundColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  rankBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  rankText: {
    color: colors.textInverse,
    fontWeight: 'bold',
    fontSize: 16,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  activeText: {
    color: colors.success,
  },
  inactiveText: {
    color: colors.error,
  },
  cardBody: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  value: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  editBtn: {
    backgroundColor: colors.primary,
  },
  editBtnText: {
    color: colors.textInverse,
    fontWeight: '600',
  },
  deactivateBtn: {
    backgroundColor: colors.error,
  },
  deactivateBtnText: {
    color: colors.textInverse,
    fontWeight: '600',
  },
  activateBtn: {
    backgroundColor: colors.success,
  },
  activateBtnText: {
    color: colors.textInverse,
    fontWeight: '600',
  },
  cloneBtn: {
    backgroundColor: colors.border,
  },
  cloneBtnText: {
    color: colors.text,
    fontWeight: '600',
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
});
