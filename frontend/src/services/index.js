import { api, toQueryString } from './api.js';

export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  changePassword: (payload) => api.put('/auth/change-password', payload),
};

export const dashboardService = {
  getStats: () => api.get('/dashboard'),
};

export const categoryService = {
  list: () => api.get('/categories'),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  remove: (id) => api.delete(`/categories/${id}`),
};

export const productService = {
  list: (params) => api.get(`/products${toQueryString(params)}`),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  remove: (id) => api.delete(`/products/${id}`),
};

export const inventoryService = {
  summary: () => api.get('/inventory/summary'),
  movements: (limit = 25) => api.get(`/inventory/movements?limit=${limit}`),
  adjust: (productId, data) => api.post(`/inventory/${productId}/adjust`, data),
};

export const salesService = {
  list: (params) => api.get(`/sales${toQueryString(params)}`),
  getById: (id) => api.get(`/sales/${id}`),
  create: (data) => api.post('/sales', data),
};

export const customerService = {
  list: (params) => api.get(`/customers${toQueryString(params)}`),
  history: (id) => api.get(`/customers/${id}/history`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  remove: (id) => api.delete(`/customers/${id}`),
};

export const supplierService = {
  list: (params) => api.get(`/suppliers${toQueryString(params)}`),
  getById: (id) => api.get(`/suppliers/${id}`),
  create: (data) => api.post('/suppliers', data),
  update: (id, data) => api.put(`/suppliers/${id}`, data),
  remove: (id) => api.delete(`/suppliers/${id}`),
};

export const reportService = {
  get: (params) => api.get(`/reports${toQueryString(params)}`),
};

export const userService = {
  list: (params) => api.get(`/users${toQueryString(params)}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  toggleStatus: (id) => api.patch(`/users/${id}/toggle-status`),
  resetPassword: (id, newPassword) =>
    api.put(`/users/${id}/reset-password`, { newPassword }),
};

export const settingsService = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
  notifications: () => api.get('/settings/notifications'),
};
