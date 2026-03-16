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
} from 'lucide-react-native';

import { colors, spacing, typography, borderRadius } from '../../theme';
import { documentsApi, Document } from '../../api/documents';
import { RootStackParamList } from '../../navigation/types';

type DocumentEditorRouteProp = RouteProp<RootStackParamList, 'DocumentEditor'>;
type DocumentEditorNavigationProp = NativeStackNavigationProp<RootStackParamList>;

type Step = 'edit' | 'review' | 'approve' | 'publish';

export const DocumentEditorScreen: React.FC = () => {
  const navigation = useNavigation<DocumentEditorNavigationProp>();
  const route = useRoute<DocumentEditorRouteProp>();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  
  const documentId = route.params?.documentId;
  const isEditing = !!documentId;

  const [step, setStep] = useState<Step>('edit');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [aiReviewedContent, setAiReviewedContent] = useState('');
  const [englishTranslation, setEnglishTranslation] = useState('');
  const [showCloseModal, setShowCloseModal] = useState(false);

  // Check if there are unsaved changes
  const hasUnsavedChanges = () => {
    if (!isEditing) {
      // New document: check if anything was entered
      return title.trim() !== '' || content.trim() !== '';
    }
    // Existing document: compare with loaded data
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
      setAiReviewedContent(existingDoc.aiReviewedContent || '');
      setEnglishTranslation(existingDoc.englishTranslation || '');
      
      // Set step based on status
      if (existingDoc.status === 'published') setStep('publish');
      else if (existingDoc.status === 'approved') setStep('publish');
      else if (existingDoc.status === 'reviewing') setStep('approve');
      else setStep('edit');
    } else if (!isEditing) {
      // Reset state for new document
      setStep('edit');
      setTitle('');
      setContent('');
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
      Alert.alert('Success', 'Document created');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.message || 'Failed to create');
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
      Alert.alert('Error', error.response?.data?.message || 'AI review failed');
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
      Alert.alert('Error', error.response?.data?.message || 'Approval failed');
    },
  });

  const publishMutation = useMutation({
    mutationFn: documentsApi.publishDocument,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document', documentId] });
      // Update local state with published data
      if (data) {
        setAiReviewedContent(data.aiReviewedContent || '');
        setEnglishTranslation(data.englishTranslation || '');
      }
      Alert.alert('Success', 'Document published! You can now download the PDF.');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.message || 'Publish failed');
    },
  });

  const downloadMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      documentsApi.downloadPdf(id, title),
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.message || 'Download failed');
    },
  });

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Error', 'Title and content are required');
      return;
    }

    if (!isEditing) {
      createMutation.mutate({ title, content });
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
        Alert.alert('Error', 'Title and content are required to save');
        return;
      }
      if (!isEditing) {
        createMutation.mutate({ title, content }, {
          onSuccess: () => navigation.goBack(),
        });
      } else {
        // For existing docs, just go back (auto-saved)
        navigation.goBack();
      }
    } else if (action === 'discard') {
      navigation.goBack();
    }
  };

  const handleRequestReview = () => {
    if (!documentId) {
      Alert.alert('Error', 'Save the document first');
      return;
    }
    reviewMutation.mutate({ id: documentId, content });
  };

  const handleApprove = () => {
    if (!documentId) return;
    // Use AI reviewed content if available, otherwise use content (which may have been edited)
    const contentToApprove = aiReviewedContent || content;
    approveMutation.mutate({ id: documentId, reviewedContent: contentToApprove });
  };

  const handlePublish = () => {
    if (!documentId) return;
    publishMutation.mutate(documentId);
  };

  const handleDownload = () => {
    if (!documentId || !existingDoc) return;
    downloadMutation.mutate({ id: documentId, title: existingDoc.title });
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
            <Text style={styles.stepTitle}>1. Scrivi il Comunicato</Text>
            <Text style={styles.stepDescription}>
              Inserisci il titolo e il testo del comunicato sindacale.
            </Text>
            
            <Text style={styles.label}>Titolo</Text>
            <TextInput
              style={styles.titleInput}
              value={title}
              onChangeText={setTitle}
              placeholder="Titolo del comunicato..."
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={styles.label}>Contenuto</Text>
            <TextInput
              style={styles.contentInput}
              value={content}
              onChangeText={setContent}
              placeholder="Scrivi qui il testo del comunicato..."
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
                    <Text style={styles.primaryButtonText}>Salva Bozza</Text>
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
                      <Text style={styles.aiButtonText}>AI sta revisionando...</Text>
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} color={colors.primary} />
                      <Text style={styles.aiButtonText}>Richiedi Revisione AI</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.secondaryButton]}
                  onPress={() => setStep('approve')}
                >
                  <ArrowRight size={20} color={colors.text} />
                  <Text style={styles.secondaryButtonText}>Avanti senza AI</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        );

      case 'approve':
        const hasAIReview = !!aiReviewedContent;
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>2. Revisione {hasAIReview ? 'AI' : 'Manuale'}</Text>
            <Text style={styles.stepDescription}>
              {hasAIReview 
                ? "L'AI ha riscritto il testo come comunicato sindacale. Puoi modificarlo prima di approvarlo."
                : "Revisione manuale del comunicato. Puoi modificare il testo prima di approvarlo."}
            </Text>

            <Text style={styles.label}>Testo Originale</Text>
            <View style={styles.originalBox}>
              <Text style={styles.originalText}>{content}</Text>
            </View>

            <Text style={styles.label}>{hasAIReview ? 'Versione Rivista dall\'AI' : 'Versione da Approvare'}</Text>
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
                <Text style={styles.secondaryButtonText}>Indietro</Text>
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
                    <Text style={styles.primaryButtonText}>Approva & Traduci</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'publish':
        const hasTranslation = !!englishTranslation;
        const isPublished = existingDoc?.status === 'published';
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>3. Pubblicazione</Text>
            <Text style={styles.stepDescription}>
              {isPublished
                ? "Il documento è stato pubblicato. Scarica il PDF finale con carta intestata."
                : hasTranslation 
                  ? "Il documento è stato approvato e tradotto. Genera il PDF finale con carta intestata."
                  : "Il documento è stato approvato. Genera il PDF finale con carta intestata."}
            </Text>

            <Text style={styles.label}>Versione Italiana (Finale)</Text>
            <View style={styles.finalBox}>
              <Text style={styles.finalText}>{aiReviewedContent || content}</Text>
            </View>

            {hasTranslation && (
              <>
                <Text style={styles.label}>Versione Inglese (Allegato)</Text>
                <View style={styles.englishBox}>
                  <Text style={styles.englishText}>{englishTranslation}</Text>
                </View>
              </>
            )}

            <View style={styles.buttonRow}>
              {!isPublished && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.secondaryButton]}
                  onPress={() => setStep('approve')}
                >
                  <ArrowLeft size={20} color={colors.text} />
                  <Text style={styles.secondaryButtonText}>Indietro</Text>
                </TouchableOpacity>
              )}

              {isPublished ? (
                <TouchableOpacity
                  style={[styles.actionButton, styles.publishButton, { flex: 1 }]}
                  onPress={handleDownload}
                  disabled={downloadMutation.isPending}
                >
                  {downloadMutation.isPending ? (
                    <ActivityIndicator color={colors.textInverse} />
                  ) : (
                    <>
                      <Download size={20} color={colors.textInverse} />
                      <Text style={styles.primaryButtonText}>Scarica PDF</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.actionButton, styles.publishButton]}
                  onPress={handlePublish}
                  disabled={publishMutation.isPending}
                >
                  {publishMutation.isPending ? (
                    <ActivityIndicator color={colors.textInverse} />
                  ) : (
                    <>
                      <Eye size={20} color={colors.textInverse} />
                      <Text style={styles.primaryButtonText}>Genera PDF & Pubblica</Text>
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
            {isEditing ? 'Modifica Comunicato' : 'Nuovo Comunicato'}
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
              <Text style={styles.modalTitle}>Chiudi Comunicato</Text>
              <Text style={styles.modalText}>
                Hai delle modifiche non salvate. Cosa vuoi fare?
              </Text>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={() => handleCloseAction('save')}
              >
                <Save size={20} color={colors.textInverse} />
                <Text style={styles.modalButtonPrimaryText}>Salva come Bozza</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => handleCloseAction('discard')}
              >
                <X size={20} color={colors.error} />
                <Text style={styles.modalButtonSecondaryText}>Elimina Modifiche</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => handleCloseAction('cancel')}
              >
                <Text style={styles.modalButtonCancelText}>Annulla, Continua a Modificare</Text>
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
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
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
