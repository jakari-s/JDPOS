import api from './client';

// Auth
export const authApi = {
  login: (data) => api.post('/auth/login', data),
  pinLogin: (data) => api.post('/auth/pin-login', data),
  refresh: () => api.post('/auth/refresh'),
  logout: () => api.post('/auth/logout'),
};

// Sales
export const salesApi = {
  create: (data) => api.post('/sales', data),
  list: (params) => api.get('/sales', { params }),
  get: (id) => api.get(`/sales/${id}`),
  refund: (id, data) => api.post(`/sales/${id}/refund`, data),
  park: (data) => api.post('/sales/park', data),
  getParked: (params) => api.get('/sales/parked', { params }),
  recallParked: (id) => api.get(`/sales/parked/${id}/recall`),
};

// Products
export const productsApi = {
  list: (params) => api.get('/products', { params }),
  get: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  createVariant: (id, data) => api.post(`/products/${id}/variants`, data),
  createBundle: (data) => api.post('/products/bundles', data),
  import: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/products/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  export: () => api.get('/products/export', { responseType: 'blob' }),
};

// Inventory
export const inventoryApi = {
  getStock: (params) => api.get('/stock', { params }),
  adjust: (data) => api.post('/stock/adjust', data),
  createTransfer: (data) => api.post('/stock/transfer', data),
  updateTransfer: (id, data) => api.put(`/stock/transfer/${id}`, data),
  getMovements: (params) => api.get('/stock/movements', { params }),
  getExpiring: (params) => api.get('/stock/expiring', { params }),
};

// Customers
export const customersApi = {
  list: (params) => api.get('/customers', { params }),
  get: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
  getPurchases: (id, params) => api.get(`/customers/${id}/purchases`, { params }),
  creditPayment: (id, data) => api.post(`/customers/${id}/credit-payment`, data),
  redeemPoints: (id, data) => api.post(`/customers/${id}/redeem-points`, data),
};

// Suppliers
export const suppliersApi = {
  list: (params) => api.get('/suppliers', { params }),
  get: (id) => api.get(`/suppliers/${id}`),
  create: (data) => api.post('/suppliers', data),
  update: (id, data) => api.put(`/suppliers/${id}`, data),
  delete: (id) => api.delete(`/suppliers/${id}`),
  recordPayment: (id, data) => api.post(`/suppliers/${id}/payments`, data),
};

// Purchase Orders
export const purchaseOrdersApi = {
  list: (params) => api.get('/purchase-orders', { params }),
  get: (id) => api.get(`/purchase-orders/${id}`),
  create: (data) => api.post('/purchase-orders', data),
  updateStatus: (id, data) => api.put(`/purchase-orders/${id}/status`, data),
  createGRN: (data) => api.post('/purchase-orders/grn', data),
};

// Users
export const usersApi = {
  list: (params) => api.get('/users', { params }),
  get: (id) => api.get(`/users/${id}`),
  getMe: () => api.get('/users/me'),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

// Branches
export const branchesApi = {
  list: () => api.get('/branches'),
  get: (id) => api.get(`/branches/${id}`),
  create: (data) => api.post('/branches', data),
  update: (id, data) => api.put(`/branches/${id}`, data),
  delete: (id) => api.delete(`/branches/${id}`),
};

// Categories
export const categoriesApi = {
  list: () => api.get('/categories'),
  get: (id) => api.get(`/categories/${id}`),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
};

// Shifts
export const shiftsApi = {
  list: (params) => api.get('/shifts', { params }),
  get: (id) => api.get(`/shifts/${id}`),
  getActive: () => api.get('/shifts/active'),
  open: (data) => api.post('/shifts/open', data),
  close: (id, data) => api.post(`/shifts/${id}/close`, data),
  addCashMovement: (id, data) => api.post(`/shifts/${id}/cash-movement`, data),
  generateEod: (data) => api.post('/shifts/eod', data),
  getXReport: () => api.get('/shifts/x-report'),
};

// Promotions
export const promotionsApi = {
  list: () => api.get('/promotions'),
  getActive: () => api.get('/promotions/active'),
  get: (id) => api.get(`/promotions/${id}`),
  create: (data) => api.post('/promotions', data),
  update: (id, data) => api.put(`/promotions/${id}`, data),
  delete: (id) => api.delete(`/promotions/${id}`),
  validateCoupon: (code) => api.post('/promotions/validate-coupon', { code }),
};

// Reports
export const reportsApi = {
  sales: (params) => api.get('/reports/sales', { params }),
  inventory: (params) => api.get('/reports/inventory', { params }),
  cashier: (params) => api.get('/reports/cashier', { params }),
  profit: (params) => api.get('/reports/profit', { params }),
  eod: (date) => api.get(`/reports/eod/${date}`),
  kra: (params) => api.get('/reports/kra', { params }),
  accountsReceivable: () => api.get('/reports/accounts-receivable'),
  accountsPayable: () => api.get('/reports/accounts-payable'),
  export: (type, params) => api.get(`/reports/${type}/export`, { params, responseType: 'blob' }),
};

// M-Pesa
export const mpesaApi = {
  stkPush: (data) => api.post('/mpesa/stk-push', data),
  checkStatus: (id) => api.get(`/mpesa/status/${id}`),
};

// eTIMS
export const etimsApi = {
  submissions: (params) => api.get('/etims/submissions', { params }),
  retry: () => api.post('/etims/retry'),
};

// SMS
export const smsApi = {
  send: (data) => api.post('/sms/send', data),
  bulk: (data) => api.post('/sms/bulk', data),
  logs: (params) => api.get('/sms/logs', { params }),
};

// Printer
export const printerApi = {
  getReceipt: (saleId) => api.get(`/printer/receipt/${saleId}/pdf`, { responseType: 'blob' }),
  getEscPos: (saleId, width) => api.get(`/printer/receipt/${saleId}/escpos`, { params: { width } }),
  openCashDrawer: () => api.post('/printer/cash-drawer'),
};
