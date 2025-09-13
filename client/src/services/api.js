import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Functions API
export const functionsAPI = {
  getAll: () => api.get('/functions'),
  getById: (id) => api.get(`/functions/${id}`),
  create: (data) => api.post('/functions', data),
  update: (id, data) => api.put(`/functions/${id}`, data),
  delete: (id) => api.delete(`/functions/${id}`),
  execute: (id, input) => api.post(`/functions/${id}/execute`, { input }),
  getLogs: (id, params = {}) => api.get(`/functions/${id}/logs`, { params }),
};

// Metrics API
export const metricsAPI = {
  getOverview: () => api.get('/metrics'),
  getExecutionHistory: (hours = 24) => api.get('/metrics/executions/history', { params: { hours } }),
  getScalingHistory: (hours = 24) => api.get('/metrics/scaling/history', { params: { hours } }),
};

// Costs API
export const costsAPI = {
  getPricing: () => api.get('/costs/pricing'),
  estimateCost: (functionId, input, estimatedDuration) => 
    api.post('/costs/estimate', { functionId, input, estimatedDuration }),
  getFunctionCosts: (functionId, startDate, endDate) => 
    api.get(`/costs/function/${functionId}`, { params: { startDate, endDate } }),
  getSystemCosts: (startDate, endDate) => 
    api.get('/costs/system', { params: { startDate, endDate } }),
  getExecutions: (limit = 50, functionId) => 
    api.get('/costs/executions', { params: { limit, functionId } }),
  getTrends: (startDate, endDate, granularity = 'hour') => 
    api.get('/costs/trends', { params: { startDate, endDate, granularity } }),
  getBreakdown: (startDate, endDate) => 
    api.get('/costs/breakdown', { params: { startDate, endDate } }),
};

export default api;
