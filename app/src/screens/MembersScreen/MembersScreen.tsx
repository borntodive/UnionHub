import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Users,
  SlidersHorizontal,
  MapPin,
  Briefcase,
  Award,
  ChevronRight,
  X,
  Plus,
} from 'lucide-react-native';

import { colors, spacing, typography, borderRadius } from '../../theme';
import { Card } from '../../components/Card';
import { usersApi } from '../../api/users';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { basesApi } from '../../api/bases';
import { contractsApi } from '../../api/contracts';
import { gradesApi } from '../../api/grades';
import { useAuthStore } from '../../store/authStore';
import { FilterSheet } from './FilterSheet';
import { User as UserType, Ruolo, UserRole } from '../../types';

const ITEMS_PER_PAGE = 20;

type MembersScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const MembersScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<MembersScreenNavigationProp>();
  const currentUser = useAuthStore((state) => state.user);
  const isSuperAdmin = currentUser?.role === UserRole.SUPERADMIN;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Filters state
  const [selectedRuolo, setSelectedRuolo] = useState<Ruolo | undefined>(undefined);
  const [selectedBaseId, setSelectedBaseId] = useState<string | undefined>(undefined);
  const [selectedContrattoId, setSelectedContrattoId] = useState<string | undefined>(undefined);
  const [selectedGradeId, setSelectedGradeId] = useState<string | undefined>(undefined);

  // Fetch filter options
  const { data: bases } = useQuery({
    queryKey: ['bases'],
    queryFn: basesApi.getBases,
  });

  const { data: contracts } = useQuery({
    queryKey: ['contracts'],
    queryFn: contractsApi.getContracts,
  });

  const { data: grades } = useQuery({
    queryKey: ['grades'],
    queryFn: gradesApi.getGrades,
  });

  // Build filters object for API
  const filters = useMemo(() => {
    const f: Parameters<typeof usersApi.getUsersPaginated>[2] = {};
    if (searchQuery) f.search = searchQuery;
    if (selectedRuolo) f.ruolo = selectedRuolo;
    if (selectedBaseId) f.baseId = selectedBaseId;
    if (selectedContrattoId) f.contrattoId = selectedContrattoId;
    if (selectedGradeId) f.gradeId = selectedGradeId;
    return f;
  }, [searchQuery, selectedRuolo, selectedBaseId, selectedContrattoId, selectedGradeId]);

  // Infinite scroll query with filters
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['users', filters],
    queryFn: ({ pageParam = 1 }) => usersApi.getUsersPaginated(pageParam as number, ITEMS_PER_PAGE, filters),
    getNextPageParam: (lastPage) => {
      if (!lastPage || typeof lastPage.total !== 'number' || typeof lastPage.page !== 'number') {
        return undefined;
      }
      const totalPages = Math.ceil(lastPage.total / ITEMS_PER_PAGE);
      if (lastPage.page < totalPages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });

  // Flatten all pages into single array
  const allMembers = useMemo(() => {
    if (!data || !data.pages || !Array.isArray(data.pages)) {
      return [];
    }
    return data.pages.flatMap((page) => page.data || []);
  }, [data]);

  const total = data?.pages?.[0]?.total || 0;

  // Load more when reaching end of list
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Clear all filters
  const clearFilters = () => {
    setSelectedRuolo(undefined);
    setSelectedBaseId(undefined);
    setSelectedContrattoId(undefined);
    setSelectedGradeId(undefined);
  };

  const hasActiveFilters = selectedRuolo || selectedBaseId || selectedContrattoId || selectedGradeId;

  // Count active filters
  const activeFiltersCount = [
    selectedRuolo,
    selectedBaseId,
    selectedContrattoId,
    selectedGradeId,
  ].filter(Boolean).length;

  const getRuoloLabel = (ruolo: Ruolo | null) => {
    switch (ruolo) {
      case Ruolo.PILOT:
        return t('members.pilots');
      case Ruolo.CABIN_CREW:
        return t('members.cabinCrew');
      default:
        return t('common.none');
    }
  };

  const getRuoloColor = (ruolo: Ruolo | null) => {
    switch (ruolo) {
      case Ruolo.PILOT:
        return '#3b82f6';
      case Ruolo.CABIN_CREW:
        return '#8b5cf6';
      default:
        return colors.textTertiary;
    }
  };

  const renderMember = ({ item }: { item: UserType }) => (
    <TouchableOpacity 
      style={styles.memberCard}
      onPress={() => navigation.navigate('MemberDetail', { memberId: item.id })}
    >
      <View style={styles.memberHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.nome?.[0]}{item.cognome?.[0]}
          </Text>
        </View>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{item.nome} {item.cognome}</Text>
          <Text style={styles.memberCrewcode}>{item.crewcode}</Text>
        </View>
        <ChevronRight size={20} color={colors.textTertiary} />
      </View>

      <View style={styles.memberDetails}>
        <View style={styles.detailRow}>
          <Briefcase size={14} color={getRuoloColor(item.ruolo)} />
          <Text style={[styles.detailText, { color: getRuoloColor(item.ruolo) }]}>
            {getRuoloLabel(item.ruolo)}
          </Text>
        </View>

        {item.contratto && (
          <View style={styles.detailRow}>
            <Briefcase size={14} color={colors.textSecondary} />
            <Text style={styles.detailText}>
              {isSuperAdmin ? item.contratto.codice : item.contratto.codice.replace(/-(PI|CC)$/, '')}
            </Text>
          </View>
        )}

        {item.grade && (
          <View style={styles.detailRow}>
            <Award size={14} color={colors.textSecondary} />
            <Text style={styles.detailText}>{item.grade.codice}</Text>
          </View>
        )}

        {item.base && (
          <View style={styles.detailRow}>
            <MapPin size={14} color={colors.textSecondary} />
            <Text style={styles.detailText}>{item.base.codice}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.footerText}>{t('common.loading')}</Text>
      </View>
    );
  };

  // Get active filter labels for chips
  const getFilterChips = () => {
    const chips = [];
    
    if (selectedRuolo) {
      chips.push({ label: getRuoloLabel(selectedRuolo), onRemove: () => setSelectedRuolo(undefined) });
    }
    if (selectedBaseId) {
      const base = bases?.find(b => b.id === selectedBaseId);
      if (base) chips.push({ label: base.codice, onRemove: () => setSelectedBaseId(undefined) });
    }
    if (selectedContrattoId) {
      const contract = contracts?.find(c => c.id === selectedContrattoId);
      if (contract) chips.push({ label: contract.codice, onRemove: () => setSelectedContrattoId(undefined) });
    }
    if (selectedGradeId) {
      const grade = grades?.find(g => g.id === selectedGradeId);
      if (grade) chips.push({ label: grade.codice, onRemove: () => setSelectedGradeId(undefined) });
    }
    
    return chips;
  };

  const filterChips = getFilterChips();

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      {/* Header Stats */}
      <View style={styles.statsContainer}>
        <Card style={styles.statCard}>
          <Users size={24} color={colors.primary} />
          <View style={styles.statInfo}>
            <Text style={styles.statNumber}>{total}</Text>
            <Text style={styles.statLabel}>{t('members.title')}</Text>
          </View>
        </Card>
      </View>

      {/* Search and Filter Button */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('members.searchPlaceholder')}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.textTertiary}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity 
          style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]} 
          onPress={() => setShowFilters(true)}
        >
          <SlidersHorizontal size={20} color={hasActiveFilters ? colors.textInverse : colors.text} />
          {activeFiltersCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('MemberCreate')}
        >
          <Plus size={20} color={colors.textInverse} />
        </TouchableOpacity>
      </View>

      {/* Active Filter Chips */}
      {filterChips.length > 0 && (
        <View style={styles.chipsContainer}>
          {filterChips.map((chip, index) => (
            <View key={index} style={styles.chip}>
              <Text style={styles.chipText}>{chip.label}</Text>
              <TouchableOpacity onPress={chip.onRemove}>
                <X size={14} color={colors.textInverse} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity onPress={clearFilters}>
            <Text style={styles.clearAllText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Results Count */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsText}>
          {isLoading ? t('common.loading') : `${total} ${t('members.title').toLowerCase()}`}
        </Text>
      </View>

      {/* Members List */}
      <FlatList
        data={allMembers || []}
        keyExtractor={(item) => item.id}
        renderItem={renderMember}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {isLoading ? (
              <ActivityIndicator size="large" color={colors.primary} />
            ) : (
              <>
                <Users size={48} color={colors.textTertiary} />
                <Text style={styles.emptyText}>
                  {hasActiveFilters || searchQuery
                    ? t('errors.notFound')
                    : t('errors.notFound')}
                </Text>
              </>
            )}
          </View>
        }
      />

      {/* Filter Sheet */}
      <FilterSheet
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        userRole={currentUser?.role}
        userRuolo={currentUser?.ruolo}
        bases={bases || []}
        contracts={contracts || []}
        grades={grades || []}
        selectedRuolo={selectedRuolo}
        selectedBaseId={selectedBaseId}
        selectedContrattoId={selectedContrattoId}
        selectedGradeId={selectedGradeId}
        onSelectRuolo={setSelectedRuolo}
        onSelectBase={setSelectedBaseId}
        onSelectContratto={setSelectedContrattoId}
        onSelectGrade={setSelectedGradeId}
        onReset={clearFilters}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  statsContainer: {
    padding: spacing.md,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  statInfo: {
    flex: 1,
  },
  statNumber: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  statLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.base,
    color: colors.text,
    paddingVertical: spacing.xs,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.full,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    fontSize: typography.sizes.xs,
    color: colors.textInverse,
    fontWeight: typography.weights.bold,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  chipText: {
    fontSize: typography.sizes.sm,
    color: colors.textInverse,
    fontWeight: typography.weights.medium,
  },
  clearAllText: {
    fontSize: typography.sizes.sm,
    color: colors.error,
    fontWeight: typography.weights.medium,
    marginLeft: spacing.sm,
  },
  resultsHeader: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  resultsText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  listContainer: {
    padding: spacing.md,
    paddingTop: 0,
    gap: spacing.sm,
  },
  memberCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },
  memberInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  memberName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  memberCrewcode: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  memberDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  footerText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: typography.sizes.base,
    color: colors.textTertiary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
