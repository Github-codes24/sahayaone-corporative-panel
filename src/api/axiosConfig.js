import axios from 'axios';
import useAuthStore from '../store/authStore';
import useLoadingStore from '../store/loadingStore';

// Base API URL configuration:
// - In local development (Vite dev server), default to '/api' to leverage Vite's local proxy
//   (unless explicitly overridden by VITE_FORCE_DIRECT_API).
// - In production builds (Netlify, VPS, .com), connect directly to the backend API
//   (e.g., https://devapi.sahayaone.com/api) so that standalone hosts without custom
//   reverse proxy configurations do not return HTML fallbacks.
let apiBaseUrl = '/api';

const rawApiUrl = (import.meta.env.VITE_API_URL || 'https://devapi.sahayaone.com/').trim();
const normalizedBackendUrl = rawApiUrl.endsWith('/api')
  ? rawApiUrl
  : `${rawApiUrl.replace(/\/+$/, '')}/api`;

if (!import.meta.env.DEV) {
  // Production (Netlify, VPS .com): Use backend API URL directly unless explicitly set to relative '/api'
  apiBaseUrl = rawApiUrl === '/api' ? '/api' : normalizedBackendUrl;
} else if (import.meta.env.VITE_FORCE_DIRECT_API === 'true') {
  // Local development override
  apiBaseUrl = rawApiUrl === '/api' ? '/api' : normalizedBackendUrl;
}

const axiosInstance = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Mutex & Queue for token refresh to avoid race conditions with multiple requests
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Helper to determine if global loader overlay should be displayed
const shouldTriggerGlobalLoader = (config) => {
  if (config.skipLoader) return false;
  if (config.showLoader === true) return true;
  // Automatically show global loader for mutations (creates, updates, deletes, purchases, transfers)
  const method = (config.method || 'get').toUpperCase();
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  const isAuthRefresh = config.url?.includes('/auth/refresh');
  return isMutation && !isAuthRefresh;
};

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    if (shouldTriggerGlobalLoader(config)) {
      config._hasTriggeredLoader = true;
      useLoadingStore.getState().showLoader();
    }

    const authState = useAuthStore.getState();
    const token = authState.accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Automatically remove Content-Type header if sending FormData so browser sets boundary
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      if (config.headers) {
        delete config.headers['Content-Type'];
        delete config.headers['content-type'];
      }
    }

    return config;
  },
  (error) => {
    if (error.config?._hasTriggeredLoader) {
      useLoadingStore.getState().hideLoader();
    }
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    if (response.config?._hasTriggeredLoader) {
      useLoadingStore.getState().hideLoader();
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (originalRequest?._hasTriggeredLoader) {
      useLoadingStore.getState().hideLoader();
      originalRequest._hasTriggeredLoader = false;
    }

    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Check for 401 Unauthorized (exclude auth endpoints)
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosInstance(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = useAuthStore.getState().refreshToken;

      if (!refreshToken) {
        isRefreshing = false;
        useLoadingStore.getState().resetLoader();
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const baseURL = axiosInstance.defaults.baseURL || '/api';
        const response = await axios.post(`${baseURL}/v1/society/auth/refresh`, {
          refreshToken,
        });

        if (response.data && response.data.success && response.data.data) {
          const newAccessToken = response.data.data.accessToken || response.data.data.tokens?.accessToken || response.data.data.token;
          const newRefreshToken = response.data.data.refreshToken || response.data.data.tokens?.refreshToken || null;

          useAuthStore.getState().setTokens({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
          });

          processQueue(null, newAccessToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return axiosInstance(originalRequest);
        } else {
          throw new Error('Invalid refresh response payload');
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        useLoadingStore.getState().resetLoader();
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
