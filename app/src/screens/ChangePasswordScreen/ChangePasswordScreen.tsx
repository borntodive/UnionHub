import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { Lock, Shield, AlertTriangle } from 'lucide-react-native';

import { colors, spacing, typography, borderRadius } from '../../theme';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';

export const ChangePasswordScreen: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Store mustChangePassword value before the mutation clears it
  const wasMandatoryChange = user?.mustChangePassword ?? false;

  const changePasswordMutation = useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: () => {
      // Use setTimeout to delay the alert and avoid re-render issues
      setTimeout(() => {
        Alert.alert(
          'Password Updated',
          wasMandatoryChange
            ? 'Your password has been changed successfully. Please sign in again.'
            : 'Your password has been changed successfully.',
          [
            {
              text: 'OK',
              onPress: async () => {
                if (wasMandatoryChange) {
                  await logout();
                }
              },
            },
          ]
        );
      }, 100);
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 
        error.response?.data?.error || 
        'Error changing password. Please ensure the password meets all requirements.';
      Alert.alert('Error', Array.isArray(message) ? message.join('\n') : message);
    },
  });

  const handleChangePassword = useCallback(() => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (newPassword.length < 12) {
      Alert.alert('Error', 'Password must be at least 12 characters');
      return;
    }

    // Check password meets all requirements
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[@$!%*?&]/.test(newPassword);
    
    if (!hasLowercase || !hasUppercase || !hasNumber || !hasSpecial) {
      Alert.alert('Error', 'Password must contain at least one lowercase, one uppercase, one number, and one special character (@ $ ! % * ? &)');
      return;
    }

    changePasswordMutation.mutate({
      currentPassword,
      newPassword,
    });
  }, [currentPassword, newPassword, confirmPassword, changePasswordMutation]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Shield size={48} color={colors.secondary} />
              </View>
              <Text style={styles.title}>Change Password</Text>
              <Text style={styles.subtitle}>
                {user?.mustChangePassword 
                  ? 'Password change is required on first login'
                  : 'Update your password for enhanced security'}
              </Text>
            </View>

            {/* Alert Box */}
            {user?.mustChangePassword && (
              <View style={styles.alertBox}>
                <AlertTriangle size={20} color={colors.secondary} />
                <Text style={styles.alertText}>
                  For security reasons, you must change your password before proceeding.
                </Text>
              </View>
            )}

            {/* Form */}
            <View style={styles.formContainer}>
              <Input
                label="Current Password"
                placeholder="Enter your current password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                leftIcon={<Lock size={20} color={colors.textTertiary} />}
                containerStyle={styles.inputContainer}
              />

              <Input
                label="New Password"
                placeholder="Enter your new password"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                leftIcon={<Lock size={20} color={colors.textTertiary} />}
                containerStyle={styles.inputContainer}
              />

              <Input
                label="Confirm New Password"
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                leftIcon={<Lock size={20} color={colors.textTertiary} />}
                containerStyle={styles.inputContainer}
                error={confirmPassword && newPassword !== confirmPassword ? 'Passwords do not match' : undefined}
              />

              <View style={styles.passwordHints}>
                <Text style={styles.hintTitle}>Password requirements:</Text>
                <Text style={[
                  styles.hint,
                  newPassword.length >= 12 && styles.hintValid
                ]}>
                  • At least 12 characters
                </Text>
                <Text style={[
                  styles.hint,
                  /[a-z]/.test(newPassword) && styles.hintValid
                ]}>
                  • At least one lowercase letter
                </Text>
                <Text style={[
                  styles.hint,
                  /[A-Z]/.test(newPassword) && styles.hintValid
                ]}>
                  • At least one uppercase letter
                </Text>
                <Text style={[
                  styles.hint,
                  /[0-9]/.test(newPassword) && styles.hintValid
                ]}>
                  • At least one number
                </Text>
                <Text style={[
                  styles.hint,
                  /[@$!%*?&]/.test(newPassword) && styles.hintValid
                ]}>
                  • At least one special character: @ $ ! % * ? &
                </Text>
              </View>

              <Button
                title="Change Password"
                onPress={handleChangePassword}
                loading={changePasswordMutation.isPending}
                disabled={!currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                size="lg"
                style={styles.button}
              />
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary + '15',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  alertText: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  formContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  passwordHints: {
    marginBottom: spacing.lg,
  },
  hintTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  hint: {
    fontSize: typography.sizes.sm,
    color: colors.textTertiary,
  },
  hintValid: {
    color: colors.success,
  },
  button: {
    marginTop: spacing.sm,
  },
});
