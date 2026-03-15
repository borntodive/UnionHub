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
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { Lock, User, ChevronDown } from 'lucide-react-native';

import { colors, spacing, typography, borderRadius } from '../../theme';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';

// Dev quick login options
const DEV_USERS = [
  { label: 'Manual Entry', crewcode: '', password: '' },
  { label: 'SuperAdmin', crewcode: 'SUPERADMIN', password: 'changeme' },
  { label: 'Admin Piloti', crewcode: 'ADMINPILOT', password: 'password' },
  { label: 'Admin CC', crewcode: 'ADMINCC', password: 'password' },
  { label: 'PIL0001', crewcode: 'PIL0001', password: 'password' },
  { label: 'CC0001', crewcode: 'CC0001', password: 'password' },
];

export const LoginScreen: React.FC = () => {
  const setAuth = useAuthStore((state) => state.setAuth);
  
  const [crewcode, setCrewcode] = useState('');
  const [password, setPassword] = useState('');
  const [selectedDevUser, setSelectedDevUser] = useState(DEV_USERS[0]);
  const [showDevSelect, setShowDevSelect] = useState(false);

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setAuth(data);
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Invalid credentials';
      Alert.alert('Error', message);
    },
  });

  const handleLogin = useCallback(() => {
    if (!crewcode.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter crewcode and password');
      return;
    }
    
    loginMutation.mutate({ crewcode: crewcode.trim(), password });
  }, [crewcode, password, loginMutation]);

  const handleDevUserSelect = useCallback((user: typeof DEV_USERS[0]) => {
    setSelectedDevUser(user);
    setCrewcode(user.crewcode);
    setPassword(user.password);
    setShowDevSelect(false);
    
    // Auto login if credentials are provided
    if (user.crewcode && user.password) {
      setTimeout(() => {
        loginMutation.mutate({ crewcode: user.crewcode, password: user.password });
      }, 100);
    }
  }, [loginMutation]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Logo Section */}
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <Text style={styles.logoText}>UNION</Text>
              </View>
              <Text style={styles.appName}>UnionConnect</Text>
              <Text style={styles.appTagline}>Platform for air transport workers</Text>
            </View>

            {/* Form Section */}
            <View style={styles.formContainer}>
              <Text style={styles.formTitle}>Sign In</Text>

              {/* Dev Quick Login Select */}
              {__DEV__ && (
                <View style={styles.devSelectContainer}>
                  <Text style={styles.devSelectLabel}>Quick Login (Dev Only):</Text>
                  <TouchableOpacity
                    style={styles.devSelectButton}
                    onPress={() => setShowDevSelect(!showDevSelect)}
                  >
                    <Text style={styles.devSelectText}>{selectedDevUser.label}</Text>
                    <ChevronDown size={20} color={colors.primary} />
                  </TouchableOpacity>
                  
                  {showDevSelect && (
                    <View style={styles.devSelectDropdown}>
                      {DEV_USERS.map((user, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.devSelectOption}
                          onPress={() => handleDevUserSelect(user)}
                        >
                          <Text style={styles.devSelectOptionText}>{user.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}
              
              <Input
                label="Crewcode"
                placeholder="Enter your crewcode"
                value={crewcode}
                onChangeText={setCrewcode}
                autoCapitalize="characters"
                autoCorrect={false}
                leftIcon={<User size={20} color={colors.textTertiary} />}
                containerStyle={styles.inputContainer}
              />

              <Input
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                leftIcon={<Lock size={20} color={colors.textTertiary} />}
                containerStyle={styles.inputContainer}
              />

              <Button
                title="Sign In"
                onPress={handleLogin}
                loading={loginMutation.isPending}
                disabled={!crewcode.trim() || !password.trim()}
                size="lg"
                style={styles.loginButton}
              />

              <Text style={styles.hint}>
                For access issues, contact your union delegate
              </Text>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                © 2025 UnionConnect - All rights reserved
              </Text>
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
    justifyContent: 'space-between',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  logoText: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },
  appName: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  appTagline: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
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
  formTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  loginButton: {
    marginTop: spacing.sm,
  },
  hint: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  footer: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  footerText: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
  },
  // Dev select styles
  devSelectContainer: {
    marginBottom: spacing.md,
  },
  devSelectLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  devSelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  devSelectText: {
    fontSize: typography.sizes.base,
    color: colors.text,
    fontWeight: typography.weights.medium,
  },
  devSelectDropdown: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
    overflow: 'hidden',
  },
  devSelectOption: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  devSelectOptionText: {
    fontSize: typography.sizes.base,
    color: colors.text,
  },
});
