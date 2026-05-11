import Constants from "expo-constants";
import { createApiClient } from "@unionhub/shared/api";
import { useAuthStore } from "../store/authStore";

export const API_BASE_URL: string =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ||
  (__DEV__
    ? "http://localhost:3000/api/v1"
    : "https://api.unionhub.app/api/v1");

let payslipResetCallback: (() => void) | null = null;

export const registerPayslipReset = (callback: () => void) => {
  payslipResetCallback = callback;
};

const apiClient = createApiClient({
  baseURL: API_BASE_URL,
  getAccessToken: () => useAuthStore.getState().accessToken,
  getRefreshToken: () => useAuthStore.getState().refreshToken,
  onTokensRefreshed: async (accessToken, refreshToken) => {
    useAuthStore.getState().setAuth({ accessToken, refreshToken });
    // Also update biometric credentials if enabled
    await useAuthStore.getState().updateBiometricCredentials(refreshToken);
  },
  onLogout: async () => {
    payslipResetCallback?.();
    // Clear biometric credentials on logout - they'll need to re-enable after login
    await useAuthStore.getState().disableBiometric();
    useAuthStore.getState().logout();
  },
});

export default apiClient;
