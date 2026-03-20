import React, { useRef, useCallback } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import {
  RichEditor,
  RichToolbar,
  actions,
} from "react-native-pell-rich-editor";
import { colors, borderRadius, spacing } from "../theme";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  minHeight?: number;
  placeholder?: string;
  editable?: boolean;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  minHeight = 200,
  placeholder,
  editable = true,
}) => {
  const editorRef = useRef<RichEditor>(null);

  const handleChange = useCallback(
    (html: string) => {
      onChange(html);
    },
    [onChange],
  );

  return (
    <View style={styles.container}>
      {editable && (
        <RichToolbar
          editor={editorRef}
          style={styles.toolbar}
          iconTint={colors.text}
          selectedIconTint={colors.primary}
          disabledIconTint={colors.textSecondary}
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
      )}
      <RichEditor
        ref={editorRef}
        initialContentHTML={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={!editable}
        style={[styles.editor, { minHeight }]}
        editorStyle={{
          backgroundColor: colors.surface,
          color: colors.text,
          placeholderColor: colors.textSecondary,
          contentCSSText: `
            font-family: -apple-system, Arial, sans-serif;
            font-size: 15px;
            line-height: 1.6;
            padding: 4px 0;
          `,
        }}
        useContainer
        initialFocus={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  toolbar: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    height: 44,
  },
  editor: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
});
