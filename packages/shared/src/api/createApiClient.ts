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

  // Refresh token queue — prevents concurrent refresh calls that trigger
  // replay detection on the backend (which revokes ALL user sessions)
  let isRefreshing = false;
  let failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: unknown) => void;
  }> = [];

  function processQueue(error: unknown, token: string | null) {
    failedQueue.forEach(({ resolve, reject }) => {
      if (error) reject(error);
      else resolve(token!);
    });
    failedQueue = [];
  }

  // Request interceptor — attach access token
  // Skip authentication for public routes
  const publicRoutes = ["/documents/public", "/auth/login", "/auth/register"];
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      // Skip Authorization header for public routes
      const isPublicRoute = publicRoutes.some((route) =>
        config.url?.includes(route),
      );
      if (isPublicRoute) {
        return config;
      }

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

      const isAuthEndpoint =
        originalRequest.url?.includes("/auth/login") ||
        originalRequest.url?.includes("/auth/register");

      if (
        error.response?.status === 401 &&
        !originalRequest._retry &&
        !isAuthEndpoint
      ) {
        originalRequest._retry = true;

        // If a refresh is already in progress, queue this request
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({
              resolve: (newToken: string) => {
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${newToken}`;
                }
                resolve(client(originalRequest));
              },
              reject,
            });
          });
        }

        const refreshToken = getRefreshToken();
        if (!refreshToken) {
          onLogout();
          return Promise.reject(error);
        }

        isRefreshing = true;

        try {
          const response = await axios.post(`${baseURL}/auth/refresh`, {
            refreshToken,
          });
          const { accessToken: newAccess, refreshToken: newRefresh } =
            response.data;

          onTokensRefreshed(newAccess, newRefresh);
          processQueue(null, newAccess);

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccess}`;
          }
          return client(originalRequest);
        } catch (refreshError: unknown) {
          processQueue(refreshError, null);
          const isNetworkError = !(refreshError as AxiosError).response;
          if (!isNetworkError) {
            onLogout();
          }
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      return Promise.reject(error);
    },
  );

  return client;
}
