import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Menu,
  Plus,
  FileText,
  Trash2,
  Edit3,
  Eye,
  CheckCircle,
  Send,
  Cpu,
} from 'lucide-react-native';

import { colors, spacing, typography, borderRadius } from '../../theme';
import { documentsApi, Document, DocumentStatus } from '../../api/documents';
import { RootStackParamList } from '../../navigation/types';

type DocumentsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const STATUS_LABELS: Record<DocumentStatus, string> = {
  draft: 'Bozza',
  reviewing: 'In Revisione',
  approved: 'Approvato',
  published: 'Pubblicato',
};

const STATUS_COLORS: Record<DocumentStatus, string> = {
  draft: colors.textSecondary,
  reviewing: '#f59e0b',
  approved: '#22c55e',
  published: colors.primary,
};

export const DocumentsScreen: React.FC = () => {
  const navigation = useNavigation<DocumentsScreenNavigationProp>();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const { data: documents, isLoading, refetch } = useQuery({
    queryKey: ['documents'],
    queryFn: documentsApi.getDocuments,
  });

  const { data: ollamaHealth } = useQuery({
    queryKey: ['ollamaHealth'],
    queryFn: documentsApi.getOllamaHealth,
    refetchInterval: 30000, // Check every 30 seconds
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentsApi.deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      Alert.alert('Success', 'Document deleted successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.message || 'Failed to delete document');
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleAdd = () => {
    navigation.navigate('DocumentEditor', {});
  };

  const handleEdit = (document: Document) => {
    navigation.navigate('DocumentEditor', { documentId: document.id });
  };

  const handleDelete = (document: Document) => {
    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete "${document.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(document.id),
        },
      ]
    );
  };

  const renderStatusBadge = (status: DocumentStatus) => (
    <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[status] + '20' }]}>
      <Text style={[styles.statusText, { color: STATUS_COLORS[status] }]}>
        {STATUS_LABELS[status]}
      </Text>
    </View>
  );

  const renderItem = ({ item }: { item: Document }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleEdit(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
          <FileText size={24} color={colors.primary} />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.cardMeta}>
            By {item.author?.nome} {item.author?.cognome} • {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
        {renderStatusBadge(item.status)}
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          onPress={() => handleEdit(item)}
          style={styles.actionButton}
        >
          <Edit3 size={18} color={colors.primary} />
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>

        {item.status === 'draft' && (
          <TouchableOpacity
            onPress={() => handleEdit(item)}
            style={styles.actionButton}
          >
            <Send size={18} color={colors.primary} />
            <Text style={styles.actionText}>Review</Text>
          </TouchableOpacity>
        )}

        {item.status === 'reviewing' && (
          <TouchableOpacity
            onPress={() => handleEdit(item)}
            style={styles.actionButton}
          >
            <CheckCircle size={18} color={colors.success} />
            <Text style={[styles.actionText, { color: colors.success }]}>Approve</Text>
          </TouchableOpacity>
        )}

        {item.status === 'approved' && (
          <TouchableOpacity
            onPress={() => handleEdit(item)}
            style={styles.actionButton}
          >
            <Eye size={18} color={colors.primary} />
            <Text style={styles.actionText}>Publish</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => handleDelete(item)}
          style={styles.actionButton}
        >
          <Trash2 size={18} color={colors.error} />
          <Text style={[styles.actionText, { color: colors.error }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={[styles.statusBarHack, { height: insets.top }]} />
        <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
          <View style={styles.centered}>
            <Text>Loading...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.statusBarHack, { height: insets.top }]} />
      <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
        {/* Ollama Status Bar */}
        {ollamaHealth && (
          <View style={[styles.ollamaBar, { backgroundColor: ollamaHealth.available ? '#22c55e' : colors.error }]}>
            <Cpu size={16} color={colors.textInverse} />
            <Text style={styles.ollamaText}>
              Ollama {ollamaHealth.isCloud && 'Cloud'} {ollamaHealth.available ? 'Online' : 'Offline'} 
              {ollamaHealth.available && ` • ${ollamaHealth.model}`}
            </Text>
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            style={styles.menuButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Menu size={24} color={colors.textInverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Comunicati Sindacali</Text>
          <TouchableOpacity
            onPress={handleAdd}
            style={styles.addButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Plus size={24} color={colors.textInverse} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <FlatList
          data={documents || []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <FileText size={64} color={colors.border} />
              <Text style={styles.emptyTitle}>No documents yet</Text>
              <Text style={styles.emptyText}>
                Create your first union communication
              </Text>
              <TouchableOpacity style={styles.emptyButton} onPress={handleAdd}>
                <Text style={styles.emptyButtonText}>Create Document</Text>
              </TouchableOpacity>
            </View>
          }
        />
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  statusBarHack: {
    backgroundColor: colors.primary,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ollamaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  ollamaText: {
    color: colors.textInverse,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primary,
    minHeight: 56,
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: spacing.md,
    flexGrow: 1,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardMeta: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  actionText: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    marginLeft: spacing.xs,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    marginTop: 100,
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  emptyButtonText: {
    color: colors.textInverse,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
});

export default DocumentsScreen;
