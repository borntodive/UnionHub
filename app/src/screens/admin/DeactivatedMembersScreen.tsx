import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import {
  Search,
  UserX,
  RefreshCw,
  Trash2,
  AlertTriangle,
  ArrowLeft,
  X,
  History,
  CheckCircle2,
  XCircle,
} from 'lucide-react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { usersApi } from '../../api/users';
import { User, StatusLogEntry } from '../../types';

export const DeactivatedMembersScreen: React.FC = () => {
  const navigation = useNavigation();
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const fetchDeactivatedMembers = async (pageNum: number = 1, search: string = '') => {
    try {
      setLoading(true);
      const response = await usersApi.getDeactivated({
        page: pageNum,
        perPage: 20,
        search: search || undefined,
      });
      
      if (pageNum === 1) {
        setMembers(response.data);
      } else {
        setMembers((prev) => [...prev, ...response.data]);
      }
      
      setTotal(response.total);
      setHasMore(response.data.length === 20);
    } catch (error) {
      console.error('Error fetching deactivated members:', error);
      Alert.alert('Error', 'Failed to load deactivated members');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDeactivatedMembers(1, searchQuery);
      setPage(1);
    }, [])
  );

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    setPage(1);
    fetchDeactivatedMembers(1, text);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchDeactivatedMembers(nextPage, searchQuery);
    }
  };

  const handleReactivate = (member: User) => {
    Alert.alert(
      'Reactivate Member',
      `Are you sure you want to reactivate ${member.nome} ${member.cognome}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reactivate',
          style: 'default',
          onPress: async () => {
            try {
              await usersApi.reactivateDeactivated(member.id);
              Alert.alert('Success', 'Member reactivated successfully');
              fetchDeactivatedMembers(1, searchQuery);
              setPage(1);
            } catch (error) {
              console.error('Error reactivating member:', error);
              Alert.alert('Error', 'Failed to reactivate member');
            }
          },
        },
      ]
    );
  };

  const handlePermanentDelete = (member: User) => {
    Alert.alert(
      'Permanent Delete',
      `Are you sure you want to permanently delete ${member.nome} ${member.cognome}?\n\nThis action cannot be undone!`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              await usersApi.permanentlyDelete(member.id);
              Alert.alert('Success', 'Member permanently deleted');
              fetchDeactivatedMembers(1, searchQuery);
              setPage(1);
            } catch (error) {
              console.error('Error deleting member:', error);
              Alert.alert('Error', 'Failed to delete member');
            }
          },
        },
      ]
    );
  };

  const handleShowHistory = (member: User) => {
    setSelectedMember(member);
    setShowHistory(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderHistoryItem = ({ item, index }: { item: StatusLogEntry; index: number }) => (
    <View style={styles.historyItem}>
      <View style={styles.historyIcon}>
        {item.isActive ? (
          <CheckCircle2 size={20} color={colors.success} />
        ) : (
          <XCircle size={20} color={colors.error} />
        )}
      </View>
      <View style={styles.historyContent}>
        <Text style={styles.historyStatus}>
          {item.isActive ? 'Activated' : 'Deactivated'}
        </Text>
        <Text style={styles.historyDate}>{formatDate(item.timestamp)}</Text>
        {item.reason && (
          <Text style={styles.historyReason}>{item.reason}</Text>
        )}
      </View>
    </View>
  );

  const renderMember = ({ item }: { item: User }) => (
    <View style={styles.memberCard}>
      <TouchableOpacity 
        style={styles.memberInfo}
        onPress={() => handleShowHistory(item)}
        activeOpacity={0.7}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.nome?.[0]}{item.cognome?.[0]}
          </Text>
        </View>
        <View style={styles.memberDetails}>
          <Text style={styles.memberName}>
            {item.cognome} {item.nome}
          </Text>
          <Text style={styles.memberCrewcode}>{item.crewcode}</Text>
          <Text style={styles.memberEmail}>{item.email}</Text>
          {item.ruolo && (
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>
                {item.ruolo === 'pilot' ? 'Pilot' : 'Cabin Crew'}
              </Text>
            </View>
          )}
          {item.statusLog && item.statusLog.length > 0 && (
            <View style={styles.historyHint}>
              <History size={12} color={colors.primary} />
              <Text style={styles.historyHintText}>
                Tap to view history ({item.statusLog.length} entries)
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
      
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.reactivateButton]}
          onPress={() => handleReactivate(item)}
        >
          <RefreshCw size={18} color={colors.success} />
          <Text style={[styles.actionText, { color: colors.success }]}>
            Reactivate
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handlePermanentDelete(item)}
        >
          <Trash2 size={18} color={colors.error} />
          <Text style={[styles.actionText, { color: colors.error }]}>
            Delete
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={24} color={colors.textInverse} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Deactivated Members</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <AlertTriangle size={20} color={colors.warning} />
        <Text style={styles.infoText}>
          {total} deactivated member{total !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Search size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, crewcode, or email..."
          value={searchQuery}
          onChangeText={handleSearch}
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      {/* Members List */}
      {loading && members.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : members.length === 0 ? (
        <View style={styles.emptyContainer}>
          <UserX size={64} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>No Deactivated Members</Text>
          <Text style={styles.emptySubtitle}>
            There are no deactivated members in the system
          </Text>
        </View>
      ) : (
        <FlatList
          data={members}
          renderItem={renderMember}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loading && hasMore ? (
              <ActivityIndicator style={styles.loadMoreIndicator} color={colors.primary} />
            ) : null
          }
        />
      )}

      {/* History Action Sheet Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showHistory}
        onRequestClose={() => setShowHistory(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackground}
            onPress={() => setShowHistory(false)}
          />
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <History size={24} color={colors.primary} />
                <Text style={styles.modalTitle}>Status History</Text>
              </View>
              <TouchableOpacity 
                onPress={() => setShowHistory(false)}
                style={styles.modalCloseButton}
              >
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            {selectedMember && (
              <View style={styles.modalMemberInfo}>
                <Text style={styles.modalMemberName}>
                  {selectedMember.cognome} {selectedMember.nome}
                </Text>
                <Text style={styles.modalMemberCrewcode}>
                  {selectedMember.crewcode}
                </Text>
              </View>
            )}

            <ScrollView style={styles.modalContent}>
              {selectedMember?.statusLog && selectedMember.statusLog.length > 0 ? (
                <View style={styles.historyList}>
                  {[...selectedMember.statusLog]
                    .reverse()
                    .map((item, index) => (
                      <View key={index} style={styles.historyItem}>
                        <View style={styles.historyIcon}>
                          {item.isActive ? (
                            <CheckCircle2 size={20} color={colors.success} />
                          ) : (
                            <XCircle size={20} color={colors.error} />
                          )}
                        </View>
                        <View style={styles.historyContent}>
                          <Text style={styles.historyStatus}>
                            {item.isActive ? 'Activated' : 'Deactivated'}
                          </Text>
                          <Text style={styles.historyDate}>
                            {formatDate(item.timestamp)}
                          </Text>
                          {item.reason && (
                            <Text style={styles.historyReason}>{item.reason}</Text>
                          )}
                        </View>
                      </View>
                    ))}
                </View>
              ) : (
                <View style={styles.emptyHistory}>
                  <History size={48} color={colors.textTertiary} />
                  <Text style={styles.emptyHistoryText}>No history available</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    paddingTop: 50,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },
  headerRight: {
    width: 40,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '20',
    padding: spacing.md,
    gap: spacing.sm,
  },
  infoText: {
    fontSize: typography.sizes.base,
    color: colors.warning,
    fontWeight: typography.weights.medium,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    margin: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    fontSize: typography.sizes.base,
    color: colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  listContent: {
    padding: spacing.md,
  },
  memberCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  memberInfo: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  memberDetails: {
    flex: 1,
    marginLeft: spacing.md,
  },
  memberName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  memberCrewcode: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  memberEmail: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  roleBadge: {
    backgroundColor: colors.primary + '10',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  roleText: {
    fontSize: typography.sizes.xs,
    color: colors.primary,
    fontWeight: typography.weights.medium,
  },
  historyHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  historyHintText: {
    fontSize: typography.sizes.xs,
    color: colors.primary,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  reactivateButton: {
    backgroundColor: colors.success + '10',
  },
  deleteButton: {
    backgroundColor: colors.error + '10',
  },
  actionText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  loadMoreIndicator: {
    padding: spacing.md,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalBackground: {
    flex: 1,
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  modalCloseButton: {
    padding: spacing.sm,
  },
  modalMemberInfo: {
    padding: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalMemberName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  modalMemberCrewcode: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  modalContent: {
    padding: spacing.md,
    maxHeight: 400,
  },
  historyList: {
    gap: spacing.md,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  historyIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyContent: {
    flex: 1,
  },
  historyStatus: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  historyDate: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  historyReason: {
    fontSize: typography.sizes.sm,
    color: colors.textTertiary,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  emptyHistory: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyHistoryText: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
});
