import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const clearApiCache = () => {
  cache.clear();
};

const originalGet = api.get;
api.get = async (url, config) => {
  const key = url + (config ? JSON.stringify(config) : '');
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return Promise.resolve(cached.response);
  }
  const response = await originalGet.call(api, url, config);
  cache.set(key, { timestamp: Date.now(), response });
  return response;
};

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('arbitragex_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-redirect on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('arbitragex_token');
      localStorage.removeItem('arbitragex_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// --- AUTH ---
export const authService = {
  login: async (username, password) => {
    const response = await api.post('/auth/login', { username, password });
    const { token, user } = response.data;
    localStorage.setItem('arbitragex_token', token);
    localStorage.setItem('arbitragex_user', JSON.stringify(user));
    return { token, user };
  },
  register: async (username, password) => {
    const response = await api.post('/auth/register', { username, password });
    const { token, user } = response.data;
    localStorage.setItem('arbitragex_token', token);
    localStorage.setItem('arbitragex_user', JSON.stringify(user));
    return { token, user };
  },
  logout: () => {
    localStorage.removeItem('arbitragex_token');
    localStorage.removeItem('arbitragex_user');
    localStorage.removeItem('arbitragex_selected_account');
    clearApiCache();
  },
  isLoggedIn: () => !!localStorage.getItem('arbitragex_token'),
  getUser: () => JSON.parse(localStorage.getItem('arbitragex_user') || 'null'),
  validateToken: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  checkSetupStatus: async () => {
    const response = await api.get('/auth/status');
    return response.data;
  },
  getUsers: async () => {
    const response = await api.get('/auth/users');
    return response.data;
  },
  createUser: async (username, password, role) => {
    const response = await api.post('/auth/users', { username, password, role });
    return response.data;
  },
  deleteUser: async (id) => {
    const response = await api.delete(`/auth/users/${id}`);
    return response.data;
  }
};

// Helper to append accountId to query params
function withAccount(url, accountId, extraParams = {}) {
  const params = new URLSearchParams();
  if (accountId) params.set('accountId', accountId);
  Object.entries(extraParams).forEach(([k, v]) => {
    if (v !== undefined && v !== null) params.set(k, v);
  });
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

// --- ACCOUNTS ---
export const accountService = {
  getAll: async () => {
    const response = await api.get('/accounts');
    return response.data;
  },
  create: async (label, popadsApiKey, adsterraApiKey) => {
    const response = await api.post('/accounts', { label, popadsApiKey, adsterraApiKey });
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/accounts/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/accounts/${id}`);
    return response.data;
  }
};

// --- DASHBOARD ---
export const dashboardService = {
  getOverview: async (date, accountId) => {
    const response = await api.get(withAccount('/dashboard/overview', accountId, { date }));
    return response.data;
  },
};

// --- CAMPAIGNS ---
export const campaignService = {
  getCampaigns: async (accountId) => {
    const response = await api.get(withAccount('/campaigns', accountId));
    return response.data;
  },
  updateCampaignStatus: async (id, status, accountId) => {
    const response = await api.post(withAccount(`/campaigns/${id}/status`, accountId), { status });
    clearApiCache();
    return response.data;
  },
  updateCampaignSettings: async (id, data, accountId) => {
    const response = await api.put(withAccount(`/campaigns/${id}/settings`, accountId), data);
    clearApiCache();
    return response.data;
  }
};

// --- REPORTS ---
export const reportService = {
  getGeoReports: async (date, accountId) => {
    const response = await api.get(withAccount('/reports/geo', accountId, { date }));
    return response.data;
  },
  getProfitability: async (startDate, endDate, accountId) => {
    const response = await api.get(withAccount('/reports/profitability', accountId, { start: startDate, end: endDate }));
    return response.data;
  },
  getTrend: async (days = 7, accountId) => {
    const response = await api.get(withAccount('/reports/trend', accountId, { days }));
    return response.data;
  },
  getCampaignProfitability: async (date, accountId) => {
    const response = await api.get(withAccount('/reports/campaign-profitability', accountId, { date }));
    return response.data;
  },
};

// --- SOURCES ---
export const sourceService = {
  getSources: async (date, accountId) => {
    const response = await api.get(withAccount('/sources', accountId, { date }));
    return response.data;
  },
};

// --- ALERTS ---
export const alertService = {
  getAlerts: async (accountId) => {
    const response = await api.get(withAccount('/alerts', accountId));
    return response.data;
  },
  getSummary: async (accountId) => {
    const response = await api.get(withAccount('/alerts/summary', accountId));
    return response.data;
  },
  markRead: async (id) => {
    const response = await api.patch(`/alerts/${id}/read`);
    return response.data;
  },
  markAllRead: async (accountId) => {
    const response = await api.patch(withAccount('/alerts/read-all', accountId));
    return response.data;
  },
};

// --- SETTINGS ---
export const settingsService = {
  triggerSync: async () => {
    const response = await api.post('/sync/manual');
    clearApiCache();
    return response.data;
  }
};

// --- RECOMMENDATIONS ---
export const recommendationService = {
  getRecommendations: async (accountId) => {
    const response = await api.get(withAccount('/recommendations', accountId));
    return response.data;
  },
};

// --- SYNC LOGS ---
export const syncLogService = {
  getLogs: async (accountId) => {
    const response = await api.get(withAccount('/sync-logs', accountId));
    return response.data;
  },
};

// --- EXPORT ---
export const exportService = {
  downloadProfitability: (start, end, accountId) => {
    const token = localStorage.getItem('arbitragex_token');
    const params = new URLSearchParams({ start, end, token });
    if (accountId) params.set('accountId', accountId);
    window.open(`${API_BASE_URL}/export/profitability?${params}`, '_blank');
  },
  downloadGeo: (date, accountId) => {
    const token = localStorage.getItem('arbitragex_token');
    const params = new URLSearchParams({ date, token });
    if (accountId) params.set('accountId', accountId);
    window.open(`${API_BASE_URL}/export/geo?${params}`, '_blank');
  },
};

export default api;
