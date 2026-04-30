import React, { useCallback, useState, useEffect } from "react";
import { View, Text, StyleSheet, TextInput } from "react-native";
import { Clock } from "lucide-react-native";
import { colors, spacing, typography, borderRadius } from "../theme";

const DEFAULT_MAX_HOURS = 23;

interface TimeInputProps {
  label?: string;
  hint?: string;
  value: string; // "HH:MM"
  onChange: (value: string) => void;
  placeholder?: string;
  maxHours?: number;
}

/**
 * TimeInput - type time as digits, formats to HH:MM
 */
export const TimeInput: React.FC<TimeInputProps> = ({
  label,
  hint,
  value,
  onChange,
  placeholder = "--:--",
  maxHours = DEFAULT_MAX_HOURS,
}) => {
  const [localValue, setLocalValue] = useState("");

  // Sync local value when external value changes (only when not focused)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const isEmpty = !value || value.length < 5;

  const handleChangeText = useCallback((text: string) => {
    // Only allow digits, max 4
    const digits = text.replace(/\D/g, "").slice(0, 4);
    setLocalValue(digits);
  }, []);

  const handleBlur = useCallback(() => {
    // Format the current input
    const digits = localValue.replace(/\D/g, "");

    if (digits.length === 0) {
      onChange("");
      setLocalValue("");
      return;
    }

    // Pad with zeros for formatting
    const padded = digits.padEnd(4, "0").slice(0, 4);
    const h = Math.min(parseInt(padded.slice(0, 2)) || 0, maxHours);
    const m = Math.min(parseInt(padded.slice(2, 4)) || 0, 59);
    const formatted = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

    onChange(formatted);
    setLocalValue(formatted);
  }, [localValue, maxHours, onChange]);

  const handleFocus = useCallback(() => {
    // Convert "HH:MM" to "HHMM" for editing
    const digits = value.replace(":", "");
    setLocalValue(digits);
  }, [value]);

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}

      <View style={styles.field}>
        <Clock
          size={18}
          color={isEmpty ? colors.textTertiary : colors.primary}
        />
        <TextInput
          style={[styles.fieldText, isEmpty && styles.fieldPlaceholder]}
          value={localValue}
          onChangeText={handleChangeText}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          keyboardType="number-pad"
          maxLength={4}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: spacing.sm },
  label: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs / 2,
  },
  hint: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
    marginBottom: spacing.xs,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    minHeight: 44,
  },
  fieldText: {
    flex: 1,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  fieldPlaceholder: {
    color: colors.textTertiary,
    fontWeight: typography.weights.regular,
  },
});
