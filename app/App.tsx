import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./src/i18n";

import { AuthProvider } from "./src/providers/AuthProvider";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { useNotifications } from "./src/hooks/useNotifications";
import { useOTAUpdate } from "./src/hooks/useOTAUpdate";
import { useNetworkStatus } from "./src/hooks/useNetworkStatus";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={errorStyles.container}>
          <Text style={errorStyles.title}>Something went wrong</Text>
          <Text style={errorStyles.message}>
            {this.state.error?.message ?? "An unexpected error occurred"}
          </Text>
          <TouchableOpacity
            style={errorStyles.button}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={errorStyles.buttonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#111",
  },
  message: {
    fontSize: 14,
    color: "#666",
    marginBottom: 24,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#177246",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function AppContent() {
  // Initialize push notifications
  useNotifications();

  // Check for OTA updates
  useOTAUpdate();

  // Monitor network status and sync pending offline data
  useNetworkStatus();

  return (
    <AuthProvider>
      <StatusBar style="light" backgroundColor="#177246" />
      <AppNavigator />
    </AuthProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <AppContent />
        </SafeAreaProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
