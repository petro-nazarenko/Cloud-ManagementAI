import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';
const TOKEN_KEY = process.env.REACT_APP_TOKEN_KEY || 'cloud_mgmt_token';

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
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  refreshToken: () => api.post('/auth/refresh'),
};

// ── Resources ─────────────────────────────────────────────────────────────────
export const resourcesAPI = {
  list: (params) => api.get('/resources', { params }),
  get: (id) => api.get(`/resources/${id}`),
  create: (data) => api.post('/resources', data),
  update: (id, data) => api.put(`/resources/${id}`, data),
  delete: (id) => api.delete(`/resources/${id}`),
  sync: () => api.post('/resources/sync'),
};

// ── Analytics ─────────────────────────────────────────────────────────────────
export const analyticsAPI = {
  costTrend: (params) => api.get('/analytics/cost-trend', { params }),
  costBreakdown: (params) => api.get('/analytics/cost-breakdown', { params }),
  usageMetrics: (params) => api.get('/analytics/usage', { params }),
  recommendations: () => api.get('/analytics/recommendations'),
  summary: () => api.get('/analytics/summary'),
};

// ── Providers ─────────────────────────────────────────────────────────────────
export const providersAPI = {
  list: () => api.get('/providers'),
  get: (id) => api.get(`/providers/${id}`),
  connect: (data) => api.post('/providers/connect', data),
  disconnect: (id) => api.delete(`/providers/${id}`),
  testConnection: (id) => api.post(`/providers/${id}/test`),
};

// ── Settings ──────────────────────────────────────────────────────────────────
export const settingsAPI = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
  notifications: () => api.get('/settings/notifications'),
  updateNotifications: (data) => api.put('/settings/notifications', data),
};

export default api;
