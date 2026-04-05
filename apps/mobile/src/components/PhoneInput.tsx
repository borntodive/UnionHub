import React, { forwardRef } from "react";
import { View, Text, StyleSheet, TextInput } from "react-native";
import { Phone, AlertTriangle } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Input } from "./Input";
import { colors, spacing, typography } from "../theme";

type InputProps = React.ComponentProps<typeof Input>;

interface PhoneInputProps extends Omit<
  InputProps,
  "keyboardType" | "leftIcon"
> {}

/** Normalize phone: strip spaces, convert leading 00 → + */
export function normalizePhone(s?: string): string | undefined {
  if (!s) return s;
  const trimmed = s.trim().replace(/\s+/g, "");
  return trimmed.startsWith("00") ? "+" + trimmed.slice(2) : trimmed;
}

export const PhoneInput = forwardRef<TextInput, PhoneInputProps>(
  ({ value, onChangeText, ...props }, ref) => {
    const { t } = useTranslation();

    const handleChange = (text: string) => {
      if (onChangeText) {
        onChangeText(normalizePhone(text) ?? text);
      }
    };

    const showWarning = !!value && !value.trim().startsWith("+");

    return (
      <View>
        <Input
          ref={ref}
          value={value}
          onChangeText={handleChange}
          keyboardType="phone-pad"
          autoCorrect={false}
          autoCapitalize="none"
          placeholder="+39 333 1234567"
          leftIcon={<Phone size={20} color={colors.textTertiary} />}
          {...props}
        />
        {showWarning && (
          <View style={styles.warning}>
            <AlertTriangle size={14} color={colors.warning} />
            <Text style={styles.warningText}>
              {t("errors.phonePrefixWarning")}
            </Text>
          </View>
        )}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  warning: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: -spacing.sm,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  warningText: {
    fontSize: typography.sizes.sm,
    color: colors.warning,
  },
});

export default PhoneInput;
