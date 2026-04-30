import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { colors, spacing, typography, borderRadius } from "../../../theme";

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  prefix?: string;
  placeholder?: string;
  decimals?: number;
  description?: string;
}

export const NumberInput: React.FC<NumberInputProps> = ({
  label,
  value,
  onChange,
  suffix,
  prefix,
  placeholder = "0",
  decimals,
  description,
}) => {
  const [localText, setLocalText] = useState("");

  const formatValue = (val: number): string => {
    if (val === 0) return "";
    if (decimals !== undefined) {
      return val.toFixed(decimals);
    }
    return val.toString();
  };

  const handleTextChange = (text: string) => {
    setLocalText(text);
    const trimmed = text.trim();
    if (trimmed === "") {
      onChange(0);
      return;
    }
    const parsed = parseFloat(trimmed);
    if (!isNaN(parsed)) {
      onChange(parsed);
    }
  };

  const displayValue = localText || formatValue(value);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      <View style={styles.inputContainer}>
        {prefix && <Text style={styles.prefix}>{prefix}</Text>}
        <TextInput
          style={styles.input}
          value={displayValue}
          onChangeText={handleTextChange}
          keyboardType="decimal-pad"
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
        />
        {suffix && <Text style={styles.suffix}>{suffix}</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
    marginBottom: spacing.xs,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  prefix: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: typography.sizes.base,
    color: colors.text,
  },
  suffix: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
});
