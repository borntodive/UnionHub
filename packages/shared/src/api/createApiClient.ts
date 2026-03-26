import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";

export interface ApiClientConfig {
  baseURL: string;
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  onTokensRefreshed: (accessToken: string, refreshToken: string) => void;
  onLogout: () => void;
}

export function createApiClient({
  baseURL,
  getAccessToken,
  getRefreshToken,
  onTokensRefreshed,
  onLogout,
}: ApiClientConfig): AxiosInstance {
  const client = axios.create({
    baseURL,
    timeout: 30000,
    headers: {
      "Content-Type": "application/json",
    },
  });

  // Request interceptor — attach access token
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = getAccessToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error),
  );

  // Response interceptor — transparent token refresh on 401
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & {
        _retry?: boolean;
      };

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        const refreshToken = getRefreshToken();
        if (!refreshToken) {
          onLogout();
          return Promise.reject(error);
        }

        try {
          const response = await axios.post(`${baseURL}/auth/refresh`, {
            refreshToken,
          });
          const { accessToken: newAccess, refreshToken: newRefresh } =
            response.data;

          onTokensRefreshed(newAccess, newRefresh);

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccess}`;
          }
          return client(originalRequest);
        } catch (refreshError: unknown) {
          const isNetworkError = !(refreshError as AxiosError).response;
          if (!isNetworkError) {
            onLogout();
          }
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    },
  );

  return client;
}
