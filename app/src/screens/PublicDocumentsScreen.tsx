import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Menu,
  FileText,
  Calendar,
  ChevronRight,
  Users,
  Eye,
  Sparkles,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { colors, spacing, typography, borderRadius } from '../theme';
import apiClient from '../api/client';
import { RootStackParamList } from '../navigation/types';
import { UnionType } from '../api/documents';

type PublicDocumentsNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface PublishedDocument {
  id: string;
  title: string;
  englishTitle: string | null;
  status: 'published';
  union: UnionType;
  publishedAt: string;
  createdAt: string;
  author?: {
    id: string;
    nome: string;
    cognome: string;
    crewcode: string;
  };
}

const READ_DOCUMENTS_KEY = '@read_documents';

export const PublicDocumentsScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<PublicDocumentsNavigationProp>();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [readDocuments, setReadDocuments] = useState<Set<string>>(new Set());

  // Load read documents from storage
  useEffect(() => {
    const loadReadDocuments = async () => {
      try {
        const stored = await AsyncStorage.getItem(READ_DOCUMENTS_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setReadDocuments(new Set(parsed));
        }
      } catch (error) {
        console.error('Error loading read documents:', error);
      }
    };
    loadReadDocuments();
  }, []);

  const { data: documents, isLoading, refetch, error } = useQuery({
    queryKey: ['published-documents'],
    queryFn: async (): Promise<PublishedDocument[]> => {
      const response = await apiClient.get('/documents/public/published');
      return response.data;
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const markAsRead = async (documentId: string) => {
    if (!readDocuments.has(documentId)) {
      const newReadDocs = new Set(readDocuments);
      newReadDocs.add(documentId);
      setReadDocuments(newReadDocs);
      try {
        await AsyncStorage.setItem(READ_DOCUMENTS_KEY, JSON.stringify([...newReadDocs]));
      } catch (error) {
        console.error('Error saving read documents:', error);
      }
    }
  };

  const handleDownload = async (document: PublishedDocument) => {
    // Mark as read when opening
    await markAsRead(document.id);
    
    setDownloadingId(document.id);
    try {
      const pdfUrl = `${apiClient.defaults.baseURL}/documents/public/${document.id}/download`;
      await WebBrowser.openBrowserAsync(pdfUrl);
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || 'Impossibile aprire il PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const getUnionConfig = (union: UnionType) => {
    if (union === 'joint') {
      return {
        label: t('documents.joint'),
        color: '#003399',
        bgColor: '#00339915',
      };
    }
    return {
      label: t('documents.fitCislOnly'),
      color: colors.primary,
      bgColor: colors.primary + '15',
    };
  };

  const isNew = (publishedAt: string) => {
    const published = new Date(publishedAt);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - published.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 7; // Consider new if published within last 7 days
  };

  const renderItem = ({ item }: { item: PublishedDocument }) => {
    const unionConfig = getUnionConfig(item.union);
    const isDownloading = downloadingId === item.id;
    const isRead = readDocuments.has(item.id);
    const isNewDoc = isNew(item.publishedAt);

    return (
      <TouchableOpacity
        style={[styles.card, !isRead && styles.cardUnread]}
        onPress={() => handleDownload(item)}
        activeOpacity={0.9}
      >
        {/* Header with icon, status badges and union badge */}
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: unionConfig.bgColor }]}>
            <FileText size={24} color={unionConfig.color} />
          </View>
          
          {/* Status Badges */}
          <View style={styles.statusContainer}>
            {!isRead && (
              <View style={styles.newBadge}>
                <Sparkles size={12} color={colors.textInverse} />
                <Text style={styles.newBadgeText}>NEW</Text>
              </View>
            )}
            {isRead && (
              <View style={styles.readBadge}>
                <Eye size={12} color={colors.success} />
                <Text style={styles.readBadgeText}>{t('documents.read')}</Text>
              </View>
            )}
          </View>

          <View style={styles.unionBadge}>
            <View style={[styles.unionDot, { backgroundColor: unionConfig.color }]} />
            <Text style={[styles.unionText, { color: unionConfig.color }]}>
              {unionConfig.label}
            </Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.cardContent}>
          <Text style={[styles.title, !isRead && styles.titleUnread]} numberOfLines={2}>
            {item.title}
          </Text>
          
          {item.englishTitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {item.englishTitle}
            </Text>
          )}
        </View>

        {/* Footer with date and download */}
        <View style={styles.cardFooter}>
          <View style={styles.dateRow}>
            <Calendar size={14} color={colors.textSecondary} />
            <Text style={styles.dateText}>
              {new Date(item.publishedAt).toLocaleDateString('it-IT', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </View>

          <View style={styles.downloadRow}>
            {isDownloading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Text style={styles.downloadText}>
                  {isRead ? t('documents.read') : t('documents.downloadPDF')}
                </Text>
                <ChevronRight size={16} color={colors.primary} />
              </>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={[styles.statusBarHack, { height: insets.top }]} />
        <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
              style={styles.menuButton}
            >
              <Menu size={24} color={colors.textInverse} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('documents.title')}</Text>
            <View style={styles.menuButton} />
          </View>
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={[styles.statusBarHack, { height: insets.top }]} />
        <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
              style={styles.menuButton}
            >
              <Menu size={24} color={colors.textInverse} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Comunicati</Text>
            <View style={styles.menuButton} />
          </View>
          <View style={styles.centered}>
            <Text style={styles.errorText}>Errore caricamento</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Count unread documents
  const unreadCount = documents?.filter(doc => !readDocuments.has(doc.id)).length || 0;

  return (
    <View style={styles.container}>
      <View style={[styles.statusBarHack, { height: insets.top }]} />
      <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            style={styles.menuButton}
          >
            <Menu size={24} color={colors.textInverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Comunicati</Text>
          <View style={styles.menuButton} />
        </View>

        {/* Subtitle with unread count */}
        <View style={styles.subHeader}>
          <Users size={16} color={colors.textSecondary} />
          <Text style={styles.subHeaderText}>
            {t('documents.publishedCount', { count: documents?.length || 0 })}
          </Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>
                {unreadCount} nuovi
              </Text>
            </View>
          )}
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
              <View style={styles.emptyIconContainer}>
                <FileText size={48} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>{t('documents.noDocuments')}</Text>
              <Text style={styles.emptyText}>
                {t('documents.noDocuments')}
              </Text>
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
  errorText: {
    fontSize: typography.sizes.md,
    color: colors.error,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    height: 56,
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.xs,
  },
  subHeaderText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  unreadBadge: {
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginLeft: spacing.sm,
  },
  unreadBadgeText: {
    fontSize: typography.sizes.xs,
    color: colors.textInverse,
    fontWeight: typography.weights.bold,
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardUnread: {
    borderLeftWidth: 4,
    borderLeftColor: colors.secondary,
    backgroundColor: colors.surface,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  newBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  newBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },
  readBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.success + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  readBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.success,
  },
  unionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
  },
  unionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  unionText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  cardContent: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    lineHeight: 28,
    marginBottom: spacing.xs,
  },
  titleUnread: {
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dateText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  downloadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  downloadText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    marginTop: 60,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default PublicDocumentsScreen;
