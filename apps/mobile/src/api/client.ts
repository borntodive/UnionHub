import Constants from "expo-constants";
import { createApiClient } from "@unionhub/shared/api";
import { useAuthStore } from "../store/authStore";
import { usePayslipStore } from "../payslip/store/usePayslipStore";

export const API_BASE_URL: string =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ||
  (__DEV__
    ? "http://localhost:3000/api/v1"
    : "https://api.unionhub.app/api/v1");

const apiClient = createApiClient({
  baseURL: API_BASE_URL,
  getAccessToken: () => useAuthStore.getState().accessToken,
  getRefreshToken: () => useAuthStore.getState().refreshToken,
  onTokensRefreshed: (accessToken, refreshToken) => {
    useAuthStore.getState().setAuth({ accessToken, refreshToken });
  },
  onLogout: () => {
    // Reset payslip settings before logout to prevent next user inheriting them
    usePayslipStore.getState().resetSettings();
    useAuthStore.getState().logout();
  },
});

export default apiClient;
