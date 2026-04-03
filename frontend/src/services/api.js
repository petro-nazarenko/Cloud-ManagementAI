import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
const TOKEN_KEY = process.env.REACT_APP_TOKEN_KEY || 'cloud_mgmt_token';
const REFRESH_KEY = 'cloud_mgmt_refresh_token';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach bearer token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401 globally
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem(REFRESH_KEY);
      if (refreshToken) {
        try {
          const res = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
          const newToken = res.data.accessToken;
          localStorage.setItem(TOKEN_KEY, newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        } catch {
          // Refresh failed — clear tokens and redirect to login
        }
      }
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
      localStorage.removeItem('cloud_mgmt_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (name, email, password, role) => api.post('/auth/register', { name, email, password, role }),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
};

// ── Resources ─────────────────────────────────────────────────────────────────
export const resourcesAPI = {
  list: (params) => api.get('/resources', { params }),
  get: (id) => api.get(`/resources/${id}`),
  create: (data) => api.post('/resources', data),
  update: (id, data) => api.put(`/resources/${id}`, data),
  delete: (id) => api.delete(`/resources/${id}`),
};

// ── Analytics ─────────────────────────────────────────────────────────────────
export const analyticsAPI = {
  costs: (params) => api.get('/analytics/costs', { params }),
  usage: (params) => api.get('/analytics/usage', { params }),
  recommendations: (params) => api.get('/analytics/recommendations', { params }),
  updateRecommendation: (id, status) => api.patch(`/analytics/recommendations/${id}`, { status }),
};

// ── Providers ─────────────────────────────────────────────────────────────────
export const providersAPI = {
  list: () => api.get('/providers'),
  health: () => api.get('/providers/health'),
  resources: (name, params) => api.get(`/providers/${name}/resources`, { params }),
  deploy: (name, data) => api.post(`/providers/${name}/deploy`, data),
};

// ── Users / Settings ──────────────────────────────────────────────────────────
export const usersAPI = {
  me: () => api.get('/users/me'),
  updateProfile: (data) => api.put('/users/profile', data),
  updatePassword: (currentPassword, newPassword) => api.put('/users/password', { currentPassword, newPassword }),
  updateNotifications: (data) => api.put('/users/notifications', data),
  updateSettings: (data) => api.put('/users/settings', data),
  saveCloudCredentials: (provider, credentials) => api.post('/users/cloud-credentials', { provider, credentials }),
};

export default api;
