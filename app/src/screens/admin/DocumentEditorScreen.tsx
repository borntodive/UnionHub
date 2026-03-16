import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, DrawerActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import {
  Menu,
  Save,
  FileText,
  Sparkles,
  CheckCircle,
  Eye,
  ArrowRight,
  Download,
  ArrowLeft,
  X,
  RefreshCw,
  Languages,
} from 'lucide-react-native';

import { colors, spacing, typography, borderRadius } from '../../theme';
import { documentsApi, Document } from '../../api/documents';
import { RootStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';
import { UserRole } from '../../types';

type DocumentEditorRouteProp = RouteProp<RootStackParamList, 'DocumentEditor'>;
type DocumentEditorNavigationProp = NativeStackNavigationProp<RootStackParamList>;

type Step = 'edit' | 'review' | 'approve' | 'publish';

export const DocumentEditorScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<DocumentEditorNavigationProp>();
  const route = useRoute<DocumentEditorRouteProp>();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  
  const documentId = route.params?.documentId;
  const isEditing = !!documentId;

  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === UserRole.SUPERADMIN;

  const [step, setStep] = useState<Step>('edit');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [union, setUnion] = useState<'fit-cisl' | 'joint'>('fit-cisl');
  const [ruolo, setRuolo] = useState<'pilot' | 'cabin_crew'>('pilot');
  const [aiReviewedContent, setAiReviewedContent] = useState('');
  const [englishTranslation, setEnglishTranslation] = useState('');
  const [showCloseModal, setShowCloseModal] = useState(false);

  // Check if there are unsaved changes
  const hasUnsavedChanges = () => {
    if (!isEditing) {
      return title.trim() !== '' || content.trim() !== '';
    }
    return title !== existingDoc?.title || 
           content !== existingDoc?.originalContent ||
           aiReviewedContent !== (existingDoc?.aiReviewedContent || '');
  };

  // Fetch existing document
  const { data: existingDoc, isLoading: isLoadingDoc } = useQuery({
    queryKey: ['document', documentId],
    queryFn: () => documentsApi.getDocument(documentId!),
    enabled: isEditing,
  });

  useEffect(() => {
    if (existingDoc) {
      setTitle(existingDoc.title);
      setContent(existingDoc.originalContent);
      setUnion(existingDoc.union || 'fit-cisl');
      setRuolo(existingDoc.ruolo || 'pilot');
      setAiReviewedContent(existingDoc.aiReviewedContent || '');
      setEnglishTranslation(existingDoc.englishTranslation || '');
      
      if (existingDoc.status === 'published') setStep('publish');
      else if (existingDoc.status === 'verified') setStep('publish');
      else if (existingDoc.status === 'approved') setStep('publish');
      else if (existingDoc.status === 'reviewing') setStep('approve');
      else setStep('edit');
    } else if (!isEditing) {
      setStep('edit');
      setTitle('');
      setContent('');
      setUnion('fit-cisl');
      setAiReviewedContent('');
      setEnglishTranslation('');
    }
  }, [existingDoc, isEditing, documentId]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: documentsApi.createDocument,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      navigation.setParams({ documentId: data.id });
      Alert.alert(t('common.success'), t('documents.createDocument'));
    },
    onError: (error: any) => {
      Alert.alert(t('common.error'), error.response?.data?.message || t('errors.generic'));
    },
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      documentsApi.reviewDocument(id, { content }),
    onSuccess: (data) => {
      setAiReviewedContent(data.aiReviewedContent || '');
      setStep('approve');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document', documentId] });
    },
    onError: (error: any) => {
      Alert.alert(t('common.error'), error.response?.data?.message || t('errors.generic'));
    },
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, reviewedContent }: { id: string; reviewedContent: string }) =>
      documentsApi.approveDocument(id, { reviewedContent }),
    onSuccess: (data) => {
      setEnglishTranslation(data.englishTranslation || '');
      setStep('publish');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document', documentId] });
    },
    onError: (error: any) => {
      Alert.alert(t('common.error'), error.response?.data?.message || t('errors.generic'));
    },
  });

  const verifyMutation = useMutation({
    mutationFn: documentsApi.verifyDocument,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document', documentId] });
      if (data) {
        setAiReviewedContent(data.aiReviewedContent || '');
        setEnglishTranslation(data.englishTranslation || '');
      }
      Alert.alert(t('common.success'), t('documents.documentVerified'));
    },
    onError: (error: any) => {
      Alert.alert(t('common.error'), error.response?.data?.message || t('errors.generic'));
    },
  });

  const downloadMutation = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const base64Pdf = await documentsApi.getPdfBase64(id);
      if (!base64Pdf) {
        throw new Error('PDF not found');
      }
      
      const fileName = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
      const file = new FileSystem.File(FileSystem.Paths.document, fileName);
      
      const binaryString = atob(base64Pdf);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      await file.write(bytes);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/pdf',
          dialogTitle: title,
        });
      } else {
        Alert.alert(t('common.success'), `PDF saved to: ${file.uri}`);
      }
      
      return file.uri;
    },
    onError: (error: any) => {
      Alert.alert(t('common.error'), error.message || t('errors.generic'));
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: documentsApi.regeneratePdf,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document', documentId] });
      Alert.alert(t('common.success'), 'PDF regenerated successfully!');
    },
    onError: (error: any) => {
      Alert.alert(t('common.error'), error.response?.data?.message || t('errors.generic'));
    },
  });

  const regenerateTranslationsMutation = useMutation({
    mutationFn: documentsApi.regenerateTranslations,
    onSuccess: (data) => {
      setEnglishTranslation(data.englishTranslation || '');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document', documentId] });
      Alert.alert(t('common.success'), 'Translations regenerated successfully!');
    },
    onError: (error: any) => {
      Alert.alert(t('common.error'), error.response?.data?.message || t('errors.generic'));
    },
  });

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert(t('common.error'), t('errors.requiredField'));
      return;
    }

    if (!isEditing) {
      createMutation.mutate({ title, content, union, ruolo });
    }
  };

  const handleClose = () => {
    if (hasUnsavedChanges()) {
      setShowCloseModal(true);
    } else {
      navigation.goBack();
    }
  };

  const handleCloseAction = (action: 'cancel' | 'save' | 'discard') => {
    setShowCloseModal(false);
    
    if (action === 'cancel') {
      return;
    } else if (action === 'save') {
      if (!title.trim() || !content.trim()) {
        Alert.alert(t('common.error'), t('errors.requiredField'));
        return;
      }
      if (!isEditing) {
        createMutation.mutate({ title, content, union, ruolo }, {
          onSuccess: () => navigation.goBack(),
        });
      } else {
        navigation.goBack();
      }
    } else if (action === 'discard') {
      navigation.goBack();
    }
  };

  const handleRequestReview = () => {
    if (!documentId) {
      Alert.alert(t('common.error'), 'Save the document first');
      return;
    }
    reviewMutation.mutate({ id: documentId, content });
  };

  const handleApprove = () => {
    if (!documentId) return;
    const contentToApprove = aiReviewedContent || content;
    approveMutation.mutate({ id: documentId, reviewedContent: contentToApprove });
  };

  const handleVerify = () => {
    if (!documentId) return;
    verifyMutation.mutate(documentId);
  };

  const handleDownload = () => {
    if (!documentId || !existingDoc) return;
    downloadMutation.mutate({ id: documentId, title: existingDoc.title });
  };

  const handleRegenerate = () => {
    if (!documentId) return;
    regenerateMutation.mutate(documentId);
  };

  const handleRegenerateTranslations = () => {
    if (!documentId) return;
    regenerateTranslationsMutation.mutate(documentId);
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {(['edit', 'review', 'approve', 'publish'] as Step[]).map((s, index) => (
        <React.Fragment key={s}>
          <View style={[styles.stepDot, step === s && styles.stepDotActive]}>
            <Text style={[styles.stepNumber, step === s && styles.stepNumberActive]}>
              {index + 1}
            </Text>
          </View>
          {index < 3 && <View style={[styles.stepLine, step !== s && styles.stepLineInactive]} />}
        </React.Fragment>
      ))}
    </View>
  );

  const renderStepContent = () => {
    switch (step) {
      case 'edit':
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>{t('documents.stepWrite')}</Text>
            <Text style={styles.stepDescription}>
              {t('documents.enterContent')}
            </Text>
            
            <Text style={styles.label}>{t('documents.unionType')}</Text>
            <View style={styles.unionSelector}>
              <TouchableOpacity
                style={[styles.unionOption, union === 'fit-cisl' && styles.unionOptionActive]}
                onPress={() => setUnion('fit-cisl')}
              >
                <View style={[styles.unionDot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.unionText, union === 'fit-cisl' && styles.unionTextActive]}>
                  {t('documents.fitCislOnly')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.unionOption, union === 'joint' && styles.unionOptionActive]}
                onPress={() => setUnion('joint')}
              >
                <View style={styles.unionDotJoint}>
                  <View style={[styles.unionDotHalf, { backgroundColor: colors.primary }]} />
                  <View style={[styles.unionDotHalf, { backgroundColor: '#003399' }]} />
                </View>
                <Text style={[styles.unionText, union === 'joint' && styles.unionTextActive]}>
                  {t('documents.joint')}
                </Text>
              </TouchableOpacity>
            </View>

            {isSuperAdmin && !isEditing && (
              <>
                <Text style={styles.label}>{t('documents.recipients')}</Text>
                <View style={styles.unionSelector}>
                  <TouchableOpacity
                    style={[styles.unionOption, ruolo === 'pilot' && styles.unionOptionActive]}
                    onPress={() => setRuolo('pilot')}
                  >
                    <Text style={[styles.unionText, ruolo === 'pilot' && styles.unionTextActive]}>
                      {t('documents.pilots')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.unionOption, ruolo === 'cabin_crew' && styles.unionOptionActive]}
                    onPress={() => setRuolo('cabin_crew')}
                  >
                    <Text style={[styles.unionText, ruolo === 'cabin_crew' && styles.unionTextActive]}>
                      {t('documents.cabinCrew')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            <Text style={styles.label}>{t('documents.documentTitle')}</Text>
            <TextInput
              style={styles.titleInput}
              value={title}
              onChangeText={setTitle}
              placeholder={t('documents.enterTitle')}
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={styles.label}>{t('documents.documentContent')}</Text>
            <TextInput
              style={styles.contentInput}
              value={content}
              onChangeText={setContent}
              placeholder={t('documents.enterContent')}
              placeholderTextColor={colors.textSecondary}
              multiline
              textAlignVertical="top"
            />

            {!isEditing ? (
              <TouchableOpacity
                style={[styles.actionButton, styles.primaryButton]}
                onPress={handleSave}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <ActivityIndicator color={colors.textInverse} />
                ) : (
                  <>
                    <Save size={20} color={colors.textInverse} />
                    <Text style={styles.primaryButtonText}>{t('documents.saveDraft')}</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.aiButton]}
                  onPress={handleRequestReview}
                  disabled={reviewMutation.isPending}
                >
                  {reviewMutation.isPending ? (
                    <>
                      <ActivityIndicator color={colors.primary} />
                      <Text style={styles.aiButtonText}>{t('documents.aiReviewing')}</Text>
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} color={colors.primary} />
                      <Text style={styles.aiButtonText}>{t('documents.requestReview')}</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.secondaryButton]}
                  onPress={() => setStep('approve')}
                >
                  <ArrowRight size={20} color={colors.text} />
                  <Text style={styles.secondaryButtonText}>{t('common.next')}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        );

      case 'approve':
        const hasAIReview = !!aiReviewedContent;
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>{t('documents.stepReview')}</Text>
            <Text style={styles.stepDescription}>
              {hasAIReview 
                ? t('documents.aiReviewDescription')
                : t('documents.manualReviewDescription')}
            </Text>

            <Text style={styles.label}>{t('documents.originalText')}</Text>
            <View style={styles.originalBox}>
              <Text style={styles.originalText}>{content}</Text>
            </View>

            <Text style={styles.label}>{hasAIReview ? t('documents.aiReviewedVersion') : t('documents.versionToApprove')}</Text>
            <TextInput
              style={styles.reviewInput}
              value={aiReviewedContent || content}
              onChangeText={setAiReviewedContent}
              multiline
              textAlignVertical="top"
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={() => setStep('edit')}
              >
                <ArrowLeft size={20} color={colors.text} />
                <Text style={styles.secondaryButtonText}>{t('common.back')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.primaryButton]}
                onPress={handleApprove}
                disabled={approveMutation.isPending}
              >
                {approveMutation.isPending ? (
                  <ActivityIndicator color={colors.textInverse} />
                ) : (
                  <>
                    <CheckCircle size={20} color={colors.textInverse} />
                    <Text style={styles.primaryButtonText}>{t('documents.approveDocument')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'publish':
        const hasTranslation = !!englishTranslation;
        const isPublished = existingDoc?.status === 'published';
        const isVerified = existingDoc?.status === 'verified';
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>{t('documents.stepPublish')}</Text>
            <Text style={styles.stepDescription}>
              {isPublished
                ? t('documents.publishedDescription')
                : isVerified
                  ? t('documents.verifiedDescription')
                  : hasTranslation 
                    ? t('documents.approvedWithTranslationDescription')
                    : t('documents.approvedDescription')}
            </Text>

            <Text style={styles.label}>{t('documents.italianVersion')}</Text>
            <View style={styles.finalBox}>
              <Text style={styles.finalText}>{aiReviewedContent || content}</Text>
            </View>

            {hasTranslation && (
              <>
                <Text style={styles.label}>{t('documents.englishVersion')}</Text>
                <View style={styles.englishBox}>
                  <Text style={styles.englishText}>{englishTranslation}</Text>
                </View>
              </>
            )}

            <View style={styles.buttonColumn}>
              {!isPublished && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.secondaryButton, styles.fullWidthButton]}
                  onPress={() => setStep('approve')}
                >
                  <ArrowLeft size={20} color={colors.text} />
                  <Text style={styles.secondaryButtonText}>{t('common.back')}</Text>
                </TouchableOpacity>
              )}

              {isPublished || isVerified ? (
                <>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.publishButton, styles.fullWidthButton]}
                    onPress={handleDownload}
                    disabled={downloadMutation.isPending}
                  >
                    {downloadMutation.isPending ? (
                      <ActivityIndicator color={colors.textInverse} />
                    ) : (
                      <>
                        <Download size={20} color={colors.textInverse} />
                        <Text style={styles.primaryButtonText}>{t('documents.downloadDocument')}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionButton, styles.devButton, styles.fullWidthButton]}
                    onPress={handleRegenerate}
                    disabled={regenerateMutation.isPending}
                  >
                    {regenerateMutation.isPending ? (
                      <ActivityIndicator color={colors.primary} />
                    ) : (
                      <>
                        <RefreshCw size={20} color={colors.primary} />
                        <Text style={styles.devButtonText}>Rigenera PDF</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionButton, styles.devButton, styles.fullWidthButton]}
                    onPress={handleRegenerateTranslations}
                    disabled={regenerateTranslationsMutation.isPending}
                  >
                    {regenerateTranslationsMutation.isPending ? (
                      <ActivityIndicator color={colors.primary} />
                    ) : (
                      <>
                        <Languages size={20} color={colors.primary} />
                        <Text style={styles.devButtonText}>Rigenera Traduzioni</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={[styles.actionButton, styles.publishButton, styles.fullWidthButton]}
                  onPress={handleVerify}
                  disabled={verifyMutation.isPending}
                >
                  {verifyMutation.isPending ? (
                    <ActivityIndicator color={colors.textInverse} />
                  ) : (
                    <>
                      <CheckCircle size={20} color={colors.textInverse} />
                      <Text style={styles.primaryButtonText}>{t('documents.generatePDF')}</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  if (isLoadingDoc) {
    return (
      <View style={styles.container}>
        <View style={[styles.statusBarHack, { height: insets.top }]} />
        <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.statusBarHack, { height: insets.top }]} />
      <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            style={styles.menuButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Menu size={24} color={colors.textInverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditing ? t('documents.editDocument') : t('documents.createDocument')}
          </Text>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={24} color={colors.textInverse} />
          </TouchableOpacity>
        </View>

        {renderStepIndicator()}

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            {renderStepContent()}
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Close Confirmation Modal */}
        {showCloseModal && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t('common.close')}</Text>
              <Text style={styles.modalText}>
                {t('documents.unsavedChanges')}
              </Text>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={() => handleCloseAction('save')}
              >
                <Save size={20} color={colors.textInverse} />
                <Text style={styles.modalButtonPrimaryText}>{t('documents.saveDraft')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => handleCloseAction('discard')}
              >
                <X size={20} color={colors.error} />
                <Text style={styles.modalButtonSecondaryText}>{t('common.delete')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => handleCloseAction('cancel')}
              >
                <Text style={styles.modalButtonCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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
  closeButton: {
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
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotActive: {
    backgroundColor: colors.primary,
  },
  stepNumber: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
  },
  stepNumberActive: {
    color: colors.textInverse,
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: colors.primary,
    marginHorizontal: spacing.sm,
  },
  stepLineInactive: {
    backgroundColor: colors.border,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  stepDescription: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  titleInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.text,
  },
  unionSelector: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  unionOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  unionOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  unionDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  unionDotJoint: {
    width: 16,
    height: 16,
    borderRadius: 8,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  unionDotHalf: {
    width: 8,
    height: 16,
  },
  unionText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  unionTextActive: {
    color: colors.text,
    fontWeight: typography.weights.semibold,
  },
  contentInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.text,
    minHeight: 200,
  },
  reviewInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.text,
    minHeight: 200,
  },
  originalBox: {
    backgroundColor: colors.border + '40',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    maxHeight: 150,
  },
  originalText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  finalBox: {
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    maxHeight: 200,
  },
  finalText: {
    fontSize: typography.sizes.md,
    color: colors.text,
  },
  englishBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderLeftColor: colors.secondary,
    maxHeight: 150,
  },
  englishText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    color: colors.textInverse,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  secondaryButton: {
    backgroundColor: colors.border,
    flex: 1,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  aiButton: {
    backgroundColor: colors.primary + '10',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  aiButtonText: {
    color: colors.primary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  publishButton: {
    backgroundColor: colors.success,
    flex: 1,
  },
  devButton: {
    backgroundColor: colors.warning + '20',
    borderWidth: 1,
    borderColor: colors.warning,
    borderStyle: 'dashed',
  },
  devButtonText: {
    color: colors.warning,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  buttonColumn: {
    flexDirection: 'column',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  fullWidthButton: {
    width: '100%',
    justifyContent: 'center',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  modalText: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  modalButtonPrimary: {
    backgroundColor: colors.primary,
  },
  modalButtonPrimaryText: {
    color: colors.textInverse,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  modalButtonSecondary: {
    backgroundColor: colors.error + '10',
    borderWidth: 1,
    borderColor: colors.error,
  },
  modalButtonSecondaryText: {
    color: colors.error,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  modalButtonCancel: {
    backgroundColor: 'transparent',
  },
  modalButtonCancelText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.md,
  },
});

export default DocumentEditorScreen;
