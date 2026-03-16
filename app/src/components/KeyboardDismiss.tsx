import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Keyboard,
  InputAccessoryView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, typography } from '../theme';

interface KeyboardDismissProps {
  inputAccessoryViewID?: string;
}

// Component to be used as InputAccessoryView for iOS
export const KeyboardDismissAccessory: React.FC = () => {
  const { t } = useTranslation();
  
  if (Platform.OS !== 'ios') return null;
  
  return (
    <InputAccessoryView nativeID="keyboardDismiss">
      <View style={styles.container}>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => Keyboard.dismiss()}
        >
          <Text style={styles.buttonText}>{t('common.done')}</Text>
        </TouchableOpacity>
      </View>
    </InputAccessoryView>
  );
};

// Hook to get the inputAccessoryViewID prop
export const useKeyboardDismiss = (id: string = 'keyboardDismiss') => {
  return Platform.OS === 'ios' ? { inputAccessoryViewID: id } : {};
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  button: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  buttonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
});

export default KeyboardDismissAccessory;
