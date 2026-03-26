import React, { useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { colors } from "../theme";

interface AuthProviderProps {
  children: React.ReactNode;
}

// AuthProvider only blocks rendering until Zustand has finished rehydrating
// from AsyncStorage. Token refresh on 401 is handled by the Axios interceptor
// in api/client.ts — doing it here causes a race condition where refreshToken
// is read as null before rehydration completes, leading to spurious logouts.
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const isLoading = useAuthStore((state) => state.isLoading);
  const setLoading = useAuthStore((state) => state.setLoading);

  useEffect(() => {
    // Safety net: if AsyncStorage fails entirely, onRehydrateStorage won't fire
    // and isLoading would stay true forever. Unblock after 3 seconds at most.
    const timeout = setTimeout(() => {
      if (useAuthStore.getState().isLoading) {
        console.warn(
          "[AuthProvider] Rehydration timeout — forcing isLoading:false",
        );
        setLoading(false);
      }
    }, 3000);
    return () => clearTimeout(timeout);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
});
