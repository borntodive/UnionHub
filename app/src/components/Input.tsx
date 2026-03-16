import React, { forwardRef } from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  Platform,
  Keyboard,
  TouchableOpacity,
  InputAccessoryView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, typography } from '../theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  showDoneButton?: boolean;
  inputAccessoryViewID?: string;
}

// iOS Done Button Component
const InputAccessoryDone: React.FC<{ id: string }> = ({ id }) => {
  const { t } = useTranslation();
  
  if (Platform.OS !== 'ios') return null;
  
  return (
    <InputAccessoryView nativeID={id}>
      <View style={styles.accessoryContainer}>
        <TouchableOpacity 
          style={styles.accessoryButton}
          onPress={() => Keyboard.dismiss()}
        >
          <Text style={styles.accessoryButtonText}>{t('common.done')}</Text>
        </TouchableOpacity>
      </View>
    </InputAccessoryView>
  );
};

export const Input = forwardRef<TextInput, InputProps>(
  ({ 
    label, 
    error, 
    containerStyle, 
    leftIcon, 
    rightIcon, 
    showDoneButton = true,
    inputAccessoryViewID,
    style, 
    ...props 
  }, ref) => {
    const accessoryId = inputAccessoryViewID || `input-accessory-${Math.random().toString(36).substr(2, 9)}`;
    const shouldShowAccessory = showDoneButton && Platform.OS === 'ios';
    
    return (
      <View style={[styles.container, containerStyle]}>
        {shouldShowAccessory && <InputAccessoryDone id={accessoryId} />}
        {label && <Text style={styles.label}>{label}</Text>}
        <View style={[styles.inputContainer, error && styles.inputError]}>
          {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
          <TextInput
            ref={ref}
            style={[
              styles.input,
              !!leftIcon && styles.inputWithLeftIcon,
              !!rightIcon && styles.inputWithRightIcon,
              style,
            ]}
            placeholderTextColor={colors.textTertiary}
            returnKeyType={props.returnKeyType || (showDoneButton ? 'done' : undefined)}
            onSubmitEditing={props.onSubmitEditing || (showDoneButton ? () => Keyboard.dismiss() : undefined)}
            blurOnSubmit={props.blurOnSubmit ?? showDoneButton}
            {...(shouldShowAccessory && { inputAccessoryViewID: accessoryId })}
            {...props}
          />
          {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
        </View>
        {error && <Text style={styles.error}>{error}</Text>}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    minHeight: 48,
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.base,
    color: colors.text,
  },
  inputWithLeftIcon: {
    paddingLeft: spacing.sm,
  },
  inputWithRightIcon: {
    paddingRight: spacing.sm,
  },
  inputError: {
    borderColor: colors.error,
  },
  leftIcon: {
    paddingLeft: spacing.md,
  },
  rightIcon: {
    paddingRight: spacing.md,
  },
  error: {
    fontSize: typography.sizes.xs,
    color: colors.error,
    marginTop: spacing.xs,
  },
  // iOS Accessory View Styles
  accessoryContainer: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  accessoryButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  accessoryButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
});

export default Input;
