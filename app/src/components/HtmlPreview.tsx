import React from "react";
import { View, useWindowDimensions, StyleSheet } from "react-native";
import RenderHtml, { MixedStyleDeclaration } from "react-native-render-html";
import { colors, spacing, typography } from "../theme";
import { truncateHtml } from "../utils/truncateHtml";

interface HtmlPreviewProps {
  html: string;
  /** Approx number of visible text lines to show before clipping (default 6) */
  maxLines?: number;
  /** Max visible text chars passed to truncateHtml (default 400) */
  maxChars?: number;
}

const LINE_HEIGHT = 22;

const tagsStyles: Record<string, MixedStyleDeclaration> = {
  body: {
    margin: 0,
    padding: 0,
    color: colors.text,
    fontSize: typography.sizes.md,
    lineHeight: LINE_HEIGHT,
    fontFamily: "-apple-system",
  },
  p: { marginTop: 0, marginBottom: 4 },
  ul: { marginTop: 0, marginBottom: 4, paddingLeft: 16 },
  ol: { marginTop: 0, marginBottom: 4, paddingLeft: 16 },
  li: { marginBottom: 2 },
  b: { fontWeight: "bold" as const },
  strong: { fontWeight: "bold" as const },
  i: { fontStyle: "italic" as const },
  em: { fontStyle: "italic" as const },
  u: { textDecorationLine: "underline" as const },
};

export const HtmlPreview: React.FC<HtmlPreviewProps> = ({
  html,
  maxLines = 6,
  maxChars = 400,
}) => {
  const { width } = useWindowDimensions();
  const contentWidth = width - spacing.md * 2 - 2; // account for border + padding

  const source = { html: truncateHtml(html, maxChars) };

  return (
    <View style={[styles.container, { maxHeight: maxLines * LINE_HEIGHT + 8 }]}>
      <RenderHtml
        contentWidth={contentWidth}
        source={source}
        tagsStyles={tagsStyles}
        enableExperimentalBRCollapsing
        enableExperimentalGhostLinesPrevention
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
});
