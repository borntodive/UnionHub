import { createApiClient } from "@unionhub/shared/api";
import { useAuthStore } from "../store/authStore";

const API_BASE_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  "http://localhost:3000/api/v1";

export const apiClient = createApiClient({
  baseURL: API_BASE_URL,
  getAccessToken: () => useAuthStore.getState().accessToken,
  getRefreshToken: () => useAuthStore.getState().refreshToken,
  onTokensRefreshed: (accessToken, refreshToken) => {
    useAuthStore.getState().setAuth({ accessToken, refreshToken });
  },
  onLogout: () => useAuthStore.getState().logout(),
});

export default apiClient;
