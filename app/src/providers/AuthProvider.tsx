import React, { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/auth';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { colors } from '../theme';

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const logout = useAuthStore((state) => state.logout);
  const setAuth = useAuthStore((state) => state.setAuth);
  const setLoading = useAuthStore((state) => state.setLoading);
  const isLoading = useAuthStore((state) => state.isLoading);
  
  // Track if this is the initial mount
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Skip on initial mount - let the persisted state load
    if (isInitialMount.current) {
      isInitialMount.current = false;
      
      // Only validate if we have a refresh token but need to verify it's still valid
      const validateOnStartup = async () => {
        if (!refreshToken) {
          setLoading(false);
          return;
        }

        try {
          const tokens = await authApi.refreshToken(refreshToken);
          setAuth({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
          });
        } catch (error) {
          console.log('[AuthProvider] Token refresh failed on startup, but keeping session');
          // Don't logout automatically - let the API calls handle 401 errors
          // This prevents logout when app comes back from background
        } finally {
          setLoading(false);
        }
      };

      validateOnStartup();
    }
  }, []); // Empty dependency array - only run on mount

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
