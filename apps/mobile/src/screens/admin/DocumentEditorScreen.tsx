import React, { useState, useEffect } from "react";
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
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import {
  useNavigation,
  useRoute,
  RouteProp,
  DrawerActions,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Menu,
  Save,
  FileText,
  Sparkles,
  CheckCircle,
  Eye,
  ArrowRight,
  ArrowLeft,
  X,
  XCircle,
  RefreshCw,
  Languages,
  Edit2,
  Upload,
} from "lucide-react-native";

import { colors, spacing, typography, borderRadius } from "../../theme";
import { documentsApi, Document } from "../../api/documents";
import { RootStackParamList } from "../../navigation/types";
import { useAuthStore } from "../../store/authStore";
import { UserRole } from "../../types";
import { FullscreenEditorModal } from "../../components/FullscreenEditorModal";
import { HtmlPreview } from "../../components/HtmlPreview";

type DocumentEditorRouteProp = RouteProp<RootStackParamList, "DocumentEditor">;
type DocumentEditorNavigationProp =
  NativeStackNavigationProp<RootStackParamList>;

type Step = "edit" | "publish";

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

  const [step, setStep] = useState<Step>("edit");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [union, setUnion] = useState<"fit-cisl" | "joint">("fit-cisl");
  const [ruolo, setRuolo] = useState<"pilot" | "cabin_crew">("pilot");
  const [aiReviewedContent, setAiReviewedContent] = useState("");
  const [englishTranslation, setEnglishTranslation] = useState("");
  const [englishTitle, setEnglishTitle] = useState("");
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [translationDirty, setTranslationDirty] = useState(false);
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [showTranslationEditorModal, setShowTranslationEditorModal] =
    useState(false);
  const [isProcessed, setIsProcessed] = useState(false);

  const hasUnsavedChanges = () => {
    if (!isEditing) {
      return title.trim() !== "" || content.trim() !== "";
    }
    if (isLoadingDoc || !existingDoc) return false;
    return (
      title !== existingDoc.title ||
      content !== existingDoc.originalContent ||
      aiReviewedContent !== (existingDoc.aiReviewedContent || "")
    );
  };

  const { data: existingDoc, isLoading: isLoadingDoc } = useQuery({
    queryKey: ["document", documentId],
    queryFn: () => documentsApi.getDocument(documentId!),
    enabled: isEditing,
  });

  useEffect(() => {
    if (existingDoc) {
      setTitle(existingDoc.title);
      setContent(existingDoc.originalContent);
      setUnion(existingDoc.union || "fit-cisl");
      setRuolo(existingDoc.ruolo || "pilot");
      setAiReviewedContent(existingDoc.aiReviewedContent || "");
      setEnglishTranslation(existingDoc.englishTranslation || "");
      setEnglishTitle(existingDoc.englishTitle || "");
      setIsProcessed(
        !!existingDoc.aiReviewedContent && !!existingDoc.finalPdfUrl,
      );

      if (existingDoc.status === "published") setStep("publish");
      else setStep("edit");
    } else if (!isEditing) {
      setStep("edit");
      setTitle("");
      setContent("");
      setUnion("fit-cisl");
      setAiReviewedContent("");
      setEnglishTranslation("");
      setEnglishTitle("");
      setIsProcessed(false);
    }
  }, [existingDoc, isEditing, documentId]);

  const createMutation = useMutation({
    mutationFn: documentsApi.createDocument,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      navigation.setParams({ documentId: data.id });
      Alert.alert(t("common.success"), t("documents.createDocument"));
    },
    onError: (error: any) => {
      Alert.alert(
        t("common.error"),
        error.response?.data?.message || t("errors.generic"),
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      title,
      content,
    }: {
      id: string;
      title?: string;
      content?: string;
    }) => documentsApi.updateDocument(id, { title, content }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["document", documentId] });
      Alert.alert(t("common.success"), "Document updated successfully!");
    },
    onError: (error: any) => {
      Alert.alert(
        t("common.error"),
        error.response?.data?.message || t("errors.generic"),
      );
    },
  });

  const processMutation = useMutation({
    mutationFn: documentsApi.processDocument,
    onSuccess: (data) => {
      setAiReviewedContent(data.aiReviewedContent || "");
      setEnglishTranslation(data.englishTranslation || "");
      setEnglishTitle(data.englishTitle || "");
      setIsProcessed(true);
      setStep("publish");
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["document", documentId] });
      Alert.alert(t("common.success"), "Document processed successfully!");
    },
    onError: (error: any) => {
      Alert.alert(
        t("common.error"),
        error.response?.data?.message || t("errors.generic"),
      );
    },
  });

  const publishMutation = useMutation({
    mutationFn: documentsApi.publishDocument,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["document", documentId] });
      Alert.alert(t("common.success"), t("documents.documentPublished"), [
        {
          text: t("common.ok"),
          onPress: () => navigation.navigate("Documents" as never),
        },
      ]);
    },
    onError: (error: any) => {
      Alert.alert(
        t("common.error"),
        error.response?.data?.message || t("errors.generic"),
      );
    },
  });

  const handleViewPdf = () => {
    if (!documentId || !existingDoc) return;
    navigation.navigate("PdfViewer", {
      documentId,
      title: existingDoc.title,
    });
  };

  const regeneratePdfMutation = useMutation({
    mutationFn: documentsApi.regeneratePdf,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["document", documentId] });
      Alert.alert(t("common.success"), "PDF regenerated successfully!");
    },
    onError: (error: any) => {
      Alert.alert(
        t("common.error"),
        error.response?.data?.message || t("errors.generic"),
      );
    },
  });

  const regenerateAiMutation = useMutation({
    mutationFn: documentsApi.regenerateAi,
    onSuccess: (data) => {
      setAiReviewedContent(data.aiReviewedContent || "");
      setEnglishTranslation(data.englishTranslation || "");
      setEnglishTitle(data.englishTitle || "");
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["document", documentId] });
      Alert.alert(t("common.success"), "AI content regenerated successfully!");
    },
    onError: (error: any) => {
      Alert.alert(
        t("common.error"),
        error.response?.data?.message || t("errors.generic"),
      );
    },
  });

  const translateMutation = useMutation({
    mutationFn: documentsApi.translateDocument,
    onSuccess: (data) => {
      setEnglishTranslation(data.englishTranslation || "");
      setEnglishTitle(data.englishTitle || "");
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["document", documentId] });
      Alert.alert(t("common.success"), "Translation updated successfully!");
    },
    onError: (error: any) => {
      Alert.alert(
        t("common.error"),
        error.response?.data?.message || t("errors.generic"),
      );
    },
  });

  const updateTranslationMutation = useMutation({
    mutationFn: ({
      id,
      englishTranslation,
      englishTitle,
    }: {
      id: string;
      englishTranslation: string;
      englishTitle?: string;
    }) => documentsApi.updateTranslation(id, englishTranslation, englishTitle),
    onSuccess: (data) => {
      setEnglishTranslation(data.englishTranslation || "");
      setEnglishTitle(data.englishTitle || "");
      setTranslationDirty(false);
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["document", documentId] });
      Alert.alert(t("common.success"), t("documents.translationSaved"));
    },
    onError: (error: any) => {
      Alert.alert(
        t("common.error"),
        error.response?.data?.message || t("errors.generic"),
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: documentsApi.deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      Alert.alert(t("common.success"), "Document deleted", [
        {
          text: t("common.ok"),
          onPress: () => navigation.navigate("Documents" as never),
        },
      ]);
    },
    onError: (error: any) => {
      Alert.alert(
        t("common.error"),
        error.response?.data?.message || t("errors.generic"),
      );
    },
  });

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert(t("common.error"), t("errors.requiredField"));
      return;
    }

    if (!isEditing) {
      createMutation.mutate({ title, content, union, ruolo });
    } else {
      // Update existing document
      updateMutation.mutate({
        id: documentId!,
        title,
        content,
      });
    }
  };

  const handleClose = () => {
    if (hasUnsavedChanges()) {
      setShowCloseModal(true);
    } else {
      navigation.navigate("Documents" as never);
    }
  };

  const handleCloseAction = (action: "cancel" | "save" | "discard") => {
    setShowCloseModal(false);

    if (action === "cancel") {
      return;
    } else if (action === "save") {
      if (!title.trim() || !content.trim()) {
        Alert.alert(t("common.error"), t("errors.requiredField"));
        return;
      }
      if (!isEditing) {
        createMutation.mutate(
          { title, content, union, ruolo },
          {
            onSuccess: () => navigation.navigate("Documents" as never),
          },
        );
      } else {
        navigation.navigate("Documents" as never);
      }
    } else if (action === "discard") {
      navigation.navigate("Documents" as never);
    }
  };

  const handleProcess = () => {
    if (!documentId) {
      Alert.alert(t("common.error"), "Save the document first");
      return;
    }
    Alert.alert(
      "Process Document",
      "This will run AI rewrite, translation, and generate PDF. Continue?",
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: "Process",
          onPress: () => processMutation.mutate(documentId),
        },
      ],
    );
  };

  const handlePublish = () => {
    if (!documentId) return;
    publishMutation.mutate(documentId);
  };

  const handleRegeneratePdf = () => {
    if (!documentId) return;
    regeneratePdfMutation.mutate(documentId);
  };

  const handleRegenerateAi = () => {
    if (!documentId) return;
    regenerateAiMutation.mutate(documentId);
  };

  const handleTranslate = () => {
    if (!documentId) return;
    translateMutation.mutate(documentId);
  };

  const handleSaveTranslation = () => {
    if (!documentId) return;
    updateTranslationMutation.mutate({
      id: documentId,
      englishTranslation,
      englishTitle,
    });
  };

  const handleDelete = () => {
    if (!documentId) return;
    Alert.alert(
      "Delete Document",
      "Are you sure you want to delete this document?",
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMutation.mutate(documentId),
        },
      ],
    );
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      <View style={[styles.stepDot, step === "edit" && styles.stepDotActive]}>
        <Text
          style={[
            styles.stepNumber,
            step === "edit" && styles.stepNumberActive,
          ]}
        >
          1
        </Text>
      </View>
      <View
        style={[styles.stepLine, step === "publish" && styles.stepLineInactive]}
      />
      <View
        style={[styles.stepDot, step === "publish" && styles.stepDotActive]}
      >
        <Text
          style={[
            styles.stepNumber,
            step === "publish" && styles.stepNumberActive,
          ]}
        >
          2
        </Text>
      </View>
    </View>
  );

  const renderStepContent = () => {
    switch (step) {
      case "edit":
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>{t("documents.stepWrite")}</Text>
            <Text style={styles.stepDescription}>
              Create a new document or edit existing content
            </Text>

            <Text style={styles.label}>{t("documents.unionType")}</Text>
            <View style={styles.unionSelector}>
              <TouchableOpacity
                style={[
                  styles.unionOption,
                  union === "fit-cisl" && styles.unionOptionActive,
                ]}
                onPress={() => setUnion("fit-cisl")}
              >
                <View
                  style={[styles.unionDot, { backgroundColor: colors.primary }]}
                />
                <Text
                  style={[
                    styles.unionText,
                    union === "fit-cisl" && styles.unionTextActive,
                  ]}
                >
                  {t("documents.fitCislOnly")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.unionOption,
                  union === "joint" && styles.unionOptionActive,
                ]}
                onPress={() => setUnion("joint")}
              >
                <View style={styles.unionDotJoint}>
                  <View
                    style={[
                      styles.unionDotHalf,
                      { backgroundColor: colors.primary },
                    ]}
                  />
                  <View
                    style={[
                      styles.unionDotHalf,
                      { backgroundColor: "#003399" },
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.unionText,
                    union === "joint" && styles.unionTextActive,
                  ]}
                >
                  {t("documents.joint")}
                </Text>
              </TouchableOpacity>
            </View>

            {isSuperAdmin && !isEditing && (
              <>
                <Text style={styles.label}>{t("documents.recipients")}</Text>
                <View style={styles.unionSelector}>
                  <TouchableOpacity
                    style={[
                      styles.unionOption,
                      ruolo === "pilot" && styles.unionOptionActive,
                    ]}
                    onPress={() => setRuolo("pilot")}
                  >
                    <Text
                      style={[
                        styles.unionText,
                        ruolo === "pilot" && styles.unionTextActive,
                      ]}
                    >
                      {t("documents.pilots")}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.unionOption,
                      ruolo === "cabin_crew" && styles.unionOptionActive,
                    ]}
                    onPress={() => setRuolo("cabin_crew")}
                  >
                    <Text
                      style={[
                        styles.unionText,
                        ruolo === "cabin_crew" && styles.unionTextActive,
                      ]}
                    >
                      {t("documents.cabinCrew")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            <Text style={styles.label}>{t("documents.documentTitle")}</Text>
            <TextInput
              style={styles.titleInput}
              value={title}
              onChangeText={setTitle}
              placeholder={t("documents.enterTitle")}
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={styles.label}>{t("documents.documentContent")}</Text>
            <TouchableOpacity
              style={styles.contentPreview}
              onPress={() => setShowEditorModal(true)}
            >
              {content ? (
                <HtmlPreview html={content} />
              ) : (
                <Text style={styles.contentPreviewPlaceholder}>
                  {t("documents.enterContent")}
                </Text>
              )}
              <View style={styles.contentPreviewEdit}>
                <Edit2 size={14} color={colors.primary} />
                <Text style={styles.contentPreviewEditText}>
                  {t("common.edit")}
                </Text>
              </View>
            </TouchableOpacity>

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
                    <Text style={styles.primaryButtonText}>
                      {t("documents.saveDraft")}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.primaryButton]}
                  onPress={handleSave}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <ActivityIndicator color={colors.textInverse} />
                  ) : (
                    <>
                      <Save size={20} color={colors.textInverse} />
                      <Text style={styles.primaryButtonText}>Save Changes</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.aiButton]}
                  onPress={handleProcess}
                  disabled={processMutation.isPending || !documentId}
                >
                  {processMutation.isPending ? (
                    <>
                      <ActivityIndicator color={colors.primary} />
                      <Text style={styles.aiButtonText}>Processing...</Text>
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} color={colors.primary} />
                      <Text style={styles.aiButtonText}>Process & Preview</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.secondaryButton]}
                  onPress={() => setStep("publish")}
                >
                  <ArrowRight size={20} color={colors.text} />
                  <Text style={styles.secondaryButtonText}>
                    {t("common.next")}
                  </Text>
                </TouchableOpacity>

                {existingDoc?.status === "draft" && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={handleDelete}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? (
                      <ActivityIndicator color={colors.error} />
                    ) : (
                      <>
                        <XCircle size={20} color={colors.error} />
                        <Text style={styles.deleteButtonText}>Delete</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        );

      case "publish":
        const isPublished = existingDoc?.status === "published";
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>{t("documents.stepPublish")}</Text>
            <Text style={styles.stepDescription}>
              {isPublished
                ? "This document has been published"
                : isProcessed
                  ? "Review and publish the document"
                  : "Process the document first to generate AI content and PDF"}
            </Text>

            <Text style={styles.label}>Italian Version</Text>
            <View style={styles.finalBox}>
              <HtmlPreview html={aiReviewedContent || content} maxLines={8} />
            </View>

            <Text style={styles.label}>English Version</Text>
            <TouchableOpacity
              style={styles.contentPreview}
              onPress={() => setShowTranslationEditorModal(true)}
            >
              {englishTranslation ? (
                <HtmlPreview html={englishTranslation} />
              ) : (
                <Text style={styles.contentPreviewPlaceholder}>
                  No translation yet
                </Text>
              )}
              <View style={styles.contentPreviewEdit}>
                <Edit2 size={14} color={colors.primary} />
                <Text style={styles.contentPreviewEditText}>
                  {t("common.edit")}
                </Text>
              </View>
            </TouchableOpacity>

            {translationDirty && (
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.primaryButton,
                  styles.fullWidthButton,
                ]}
                onPress={handleSaveTranslation}
                disabled={updateTranslationMutation.isPending}
              >
                {updateTranslationMutation.isPending ? (
                  <ActivityIndicator color={colors.textInverse} />
                ) : (
                  <>
                    <Save size={20} color={colors.textInverse} />
                    <Text style={styles.primaryButtonText}>
                      {t("documents.saveTranslation")}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            <View style={styles.buttonColumn}>
              {isPublished ? (
                <>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      styles.publishButton,
                      styles.fullWidthButton,
                    ]}
                    onPress={handleViewPdf}
                  >
                    <Eye size={20} color={colors.textInverse} />
                    <Text style={styles.primaryButtonText}>
                      {t("documents.viewDocument")}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      styles.devButton,
                      styles.fullWidthButton,
                    ]}
                    onPress={handleRegeneratePdf}
                    disabled={regeneratePdfMutation.isPending}
                  >
                    {regeneratePdfMutation.isPending ? (
                      <ActivityIndicator color={colors.primary} />
                    ) : (
                      <>
                        <RefreshCw size={20} color={colors.primary} />
                        <Text style={styles.devButtonText}>Regenerate PDF</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      styles.devButton,
                      styles.fullWidthButton,
                    ]}
                    onPress={handleRegenerateAi}
                    disabled={regenerateAiMutation.isPending}
                  >
                    {regenerateAiMutation.isPending ? (
                      <ActivityIndicator color={colors.primary} />
                    ) : (
                      <>
                        <Languages size={20} color={colors.primary} />
                        <Text style={styles.devButtonText}>Regenerate AI</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      styles.deleteButton,
                      styles.fullWidthButton,
                    ]}
                    onPress={handleDelete}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? (
                      <ActivityIndicator color={colors.error} />
                    ) : (
                      <>
                        <XCircle size={20} color={colors.error} />
                        <Text style={styles.deleteButtonText}>Delete</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {existingDoc?.finalPdfUrl && (
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        styles.publishButton,
                        styles.fullWidthButton,
                      ]}
                      onPress={handleViewPdf}
                    >
                      <Eye size={20} color={colors.textInverse} />
                      <Text style={styles.primaryButtonText}>
                        {t("documents.viewDocument")}
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      styles.devButton,
                      styles.fullWidthButton,
                    ]}
                    onPress={handleRegeneratePdf}
                    disabled={regeneratePdfMutation.isPending}
                  >
                    {regeneratePdfMutation.isPending ? (
                      <ActivityIndicator color={colors.warning} />
                    ) : (
                      <>
                        <RefreshCw size={20} color={colors.warning} />
                        <Text style={styles.devButtonText}>Generate PDF</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      styles.devButton,
                      styles.fullWidthButton,
                    ]}
                    onPress={handleTranslate}
                    disabled={translateMutation.isPending}
                  >
                    {translateMutation.isPending ? (
                      <ActivityIndicator color={colors.warning} />
                    ) : (
                      <>
                        <Languages size={20} color={colors.warning} />
                        <Text style={styles.devButtonText}>Translate Only</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      styles.publishButton,
                      styles.fullWidthButton,
                    ]}
                    onPress={handlePublish}
                    disabled={publishMutation.isPending || !isProcessed}
                  >
                    {publishMutation.isPending ? (
                      <ActivityIndicator color={colors.textInverse} />
                    ) : (
                      <>
                        <CheckCircle size={20} color={colors.textInverse} />
                        <Text style={styles.primaryButtonText}>
                          Publish Document
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      styles.secondaryButton,
                      styles.fullWidthButton,
                    ]}
                    onPress={() => setStep("edit")}
                  >
                    <ArrowLeft size={20} color={colors.text} />
                    <Text style={styles.secondaryButtonText}>
                      {t("common.back")}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      styles.deleteButton,
                      styles.fullWidthButton,
                    ]}
                    onPress={handleDelete}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? (
                      <ActivityIndicator color={colors.error} />
                    ) : (
                      <>
                        <XCircle size={20} color={colors.error} />
                        <Text style={styles.deleteButtonText}>Delete</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
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
        <SafeAreaView
          style={styles.container}
          edges={["bottom", "left", "right"]}
        >
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
      <SafeAreaView
        style={styles.container}
        edges={["bottom", "left", "right"]}
      >
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
            {isEditing
              ? t("documents.editDocument")
              : t("documents.createDocument")}
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
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={insets.top + 56}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {renderStepContent()}
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Fullscreen Editor Modal */}
        <FullscreenEditorModal
          visible={showEditorModal}
          onClose={() => setShowEditorModal(false)}
          title={t("documents.documentContent")}
          value={content}
          onChange={setContent}
          placeholder={t("documents.enterContent")}
        />

        {/* Fullscreen Editor Modal - Translation */}
        <FullscreenEditorModal
          visible={showTranslationEditorModal}
          onClose={() => setShowTranslationEditorModal(false)}
          title="English Translation"
          value={englishTranslation}
          onChange={(html) => {
            setEnglishTranslation(html);
            setTranslationDirty(
              html !== (existingDoc?.englishTranslation || ""),
            );
          }}
          placeholder="Enter English translation"
        />

        {/* Close Confirmation Modal */}
        {showCloseModal && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t("common.close")}</Text>
              <Text style={styles.modalText}>
                {t("documents.unsavedChanges")}
              </Text>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={() => handleCloseAction("save")}
              >
                <Save size={20} color={colors.textInverse} />
                <Text style={styles.modalButtonPrimaryText}>
                  {t("documents.saveDraft")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => handleCloseAction("discard")}
              >
                <X size={20} color={colors.error} />
                <Text style={styles.modalButtonSecondaryText}>
                  {t("common.delete")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => handleCloseAction("cancel")}
              >
                <Text style={styles.modalButtonCancelText}>
                  {t("common.cancel")}
                </Text>
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
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primary,
    minHeight: 56,
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
    flex: 1,
    textAlign: "center",
  },
  stepIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
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
    justifyContent: "center",
    alignItems: "center",
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
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  unionOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  unionOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "10",
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
    flexDirection: "row",
    overflow: "hidden",
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
  contentPreview: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 100,
  },
  contentPreviewPlaceholder: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
  },
  contentPreviewEdit: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  contentPreviewEditText: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  finalBox: {
    backgroundColor: colors.primary + "10",
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    maxHeight: 200,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
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
    backgroundColor: colors.primary + "10",
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
  },
  devButton: {
    backgroundColor: colors.warning + "20",
    borderWidth: 1,
    borderColor: colors.warning,
    borderStyle: "dashed",
  },
  devButtonText: {
    color: colors.warning,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  deleteButton: {
    backgroundColor: colors.error + "10",
    borderWidth: 1,
    borderColor: colors.error,
  },
  deleteButtonText: {
    color: colors.error,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  buttonColumn: {
    flexDirection: "column",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  fullWidthButton: {
    width: "100%",
    justifyContent: "center",
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: "100%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  modalText: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  modalButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
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
    backgroundColor: colors.error + "10",
    borderWidth: 1,
    borderColor: colors.error,
  },
  modalButtonSecondaryText: {
    color: colors.error,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  modalButtonCancel: {
    backgroundColor: "transparent",
  },
  modalButtonCancelText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.md,
  },
});

export default DocumentEditorScreen;
