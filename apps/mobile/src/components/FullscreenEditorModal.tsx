import React, { useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import {
  RichEditor,
  RichToolbar,
  actions,
} from "react-native-pell-rich-editor";
import { X } from "lucide-react-native";
import { colors, spacing, typography, borderRadius } from "../theme";

interface FullscreenEditorModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export const FullscreenEditorModal: React.FC<FullscreenEditorModalProps> = ({
  visible,
  onClose,
  title,
  value,
  onChange,
  placeholder,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const editorRef = useRef<RichEditor>(null);
  const scrollRef = useRef<ScrollView>(null);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.textInverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.doneButton}>
            <Text style={styles.doneText}>{t("common.done")}</Text>
          </TouchableOpacity>
        </View>

        <RichToolbar
          editor={editorRef}
          style={styles.toolbar}
          iconTint={colors.text}
          selectedIconTint={colors.primary}
          actions={[
            actions.setBold,
            actions.setItalic,
            actions.setUnderline,
            actions.insertBulletsList,
            actions.insertOrderedList,
            actions.indent,
            actions.outdent,
          ]}
        />

        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <RichEditor
            ref={editorRef}
            initialContentHTML={value}
            onChange={onChange}
            placeholder={placeholder}
            style={styles.editor}
            editorStyle={{
              backgroundColor: colors.surface,
              color: colors.text,
              placeholderColor: colors.textSecondary,
              contentCSSText: `font-family: -apple-system, Arial, sans-serif; font-size: 15px; line-height: 1.6; padding: 8px 0;`,
            }}
            useContainer
            onCursorPosition={(offsetY) => {
              scrollRef.current?.scrollTo({
                y: Math.max(0, offsetY - 120),
                animated: true,
              });
            }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.primary,
    minHeight: 56,
  },
  headerTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
    flex: 1,
    textAlign: "center",
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  doneButton: {
    width: 60,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  doneText: {
    color: colors.textInverse,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  toolbar: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    height: 44,
  },
  scroll: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  editor: {
    minHeight: 300,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
});
