import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "../store/authStore";
import Constants from "expo-constants";

// API URL — loaded from .env.development (API_URL) via app.config.js extra.apiUrl
const API_BASE_URL =
  Constants.expoConfig?.extra?.apiUrl ||
  (__DEV__
    ? "http://localhost:3000/api/v1"
    : "https://api.unionhub.app/api/v1");

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const { accessToken } = useAuthStore.getState();
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor - handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const { refreshToken, setAuth, logout } = useAuthStore.getState();

        if (!refreshToken) {
          logout();
          return Promise.reject(error);
        }

        // Call refresh token endpoint
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
          response.data;

        setAuth({
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        });

        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError: any) {
        // Only logout if the refresh endpoint explicitly rejected the token (401/403).
        // Network errors (no internet) must NOT trigger a logout so the user can
        // keep using offline-capable screens with their existing session.
        const isNetworkError = !refreshError.response;
        if (!isNetworkError) {
          useAuthStore.getState().logout();
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
