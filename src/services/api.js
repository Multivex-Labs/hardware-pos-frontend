import axios from 'axios'

// Backend URL:
// 1) VITE_API_URL ikiwekwa (mfano ngrok, au install ya local), inatumika kama kawaida.
// 2) Production bila VITE_API_URL: '/api' (anwani ileile ya tovuti; server inapitisha /api kwenda backend).
// 3) Development: http://localhost:5000/api
const API_URL =
  import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api')

// Duka (tenant) kwenye development:
// - Ukifungua http://demo.localhost:5173, duka ni "demo" (linachukuliwa kutoka anwani).
// - Au weka VITE_TENANT=demo kwenye .env ya frontend.
// Production: backend inasoma duka kutoka anwani ya tovuti (duka.multivex.co.tz), header haihitajiki.
function detectTenant() {
  const host = window.location.hostname
  if (host.endsWith('.localhost')) return host.slice(0, -'.localhost'.length)
  return import.meta.env.VITE_TENANT || null
}

const TENANT = detectTenant()

const API = axios.create({
  baseURL: API_URL
})

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  if (TENANT) config.headers['X-Tenant'] = TENANT
  return config
})

API.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.data?.code === 'PASSWORD_CHANGE_REQUIRED') {
      window.dispatchEvent(new Event('passwordChangeRequired'))
    }
    return Promise.reject(error)
  }
)

// Auth
export const login = (data) => API.post('/auth/login', data)
export const register = (data) => API.post('/auth/register', data)
export const getMe = () => API.get('/auth/me')
export const changePassword = (data) => API.put('/auth/password', data)
export const getUsers = () => API.get('/auth/users')
export const getRoles = () => API.get('/auth/roles')
export const createRole = (data) => API.post('/auth/roles', data)
export const updateRole = (name, permissions) => API.put(`/auth/roles/${encodeURIComponent(name)}`, { permissions })
export const deleteRole = (name) => API.delete(`/auth/roles/${encodeURIComponent(name)}`)
export const updateUserRole = (id, role) => API.put(`/auth/users/${id}/role`, { role })
export const resetUserPassword = (id, temporaryPassword) => API.put(`/auth/users/${id}/password`, { temporaryPassword })
export const deleteUser = (id) => API.delete(`/auth/users/${id}`)

// Audit Logs
export const getAuditLogs = (limit = 200) => API.get(`/audit-logs?limit=${limit}`)
export const getAuditLogsByRecord = (table, id) => API.get(`/audit-logs/${table}/${id}`)

// Products
export const getProducts = () => API.get('/products')
export const getProduct = (id) => API.get(`/products/${id}`)
export const createProduct = (data) => API.post('/products', data)
export const updateProduct = (id, data) => API.put(`/products/${id}`, data)
export const deleteProduct = (id) => API.delete(`/products/${id}`)
export const getLowStock = () => API.get('/products/lowstock')
export const getExpiringSoon = (days = 30) => API.get(`/products/expiring-soon?days=${days}`) // MPYA - Pharmacy
export const getPharmacyBatches = (params = {}) => API.get('/pharmacy/batches', { params })
export const getPharmacyExpirySummary = () => API.get('/pharmacy/expiry-summary')
export const adjustPharmacyBatch = (id, data) => API.post(`/pharmacy/batches/${id}/adjustment`, data)
export const updatePharmacyBatchStatus = (id, data) => API.patch(`/pharmacy/batches/${id}/status`, data)
export const updatePharmacyBatchInfo = (id, data) => API.put(`/pharmacy/batches/${id}`, data)
export const getPharmacyBatchMovements = (id) => API.get(`/pharmacy/batches/${id}/movements`)
export const getEligiblePharmacyBatches = (productId) => API.get('/pharmacy/eligible-batches', { params: { product_id: productId } })
export const getPharmacyPrescriptions = (params = {}) => API.get('/pharmacy/prescriptions', { params })
export const createPharmacyPrescription = (data) => API.post('/pharmacy/prescriptions', data)

// Product Units (Unit Conversion / Item Packages)
export const getAllProductUnits = () => API.get('/products/units/all')
export const getProductUnits = (productId) => API.get(`/products/${productId}/units`)
export const createProductUnit = (productId, data) => API.post(`/products/${productId}/units`, data)
export const updateProductUnit = (productId, unitId, data) => API.put(`/products/${productId}/units/${unitId}`, data)
export const deleteProductUnit = (productId, unitId) => API.delete(`/products/${productId}/units/${unitId}`)

// Clients
export const getClients = () => API.get('/clients')
export const getClient = (id) => API.get(`/clients/${id}`)
export const createClient = (data) => API.post('/clients', data)
export const updateClient = (id, data) => API.put(`/clients/${id}`, data)
export const deleteClient = (id) => API.delete(`/clients/${id}`)
export const searchClients = (query) => API.get(`/clients/search?query=${query}`)
export const getClientHistory = (id) => API.get(`/clients/${id}/history`)
export const getClientProfile = (id) => API.get(`/clients/${id}/profile`)
export const getClientPayments = (id) => API.get(`/clients/${id}/payments`)
export const recordClientPayment = (id, data) => API.post(`/clients/${id}/payments`, data)
export const updateCreditLimit = (id, data) => API.patch(`/clients/${id}/credit-limit`, data)

// Deposits (Amana)
export const getClientDeposits = (id) => API.get(`/clients/${id}/deposits`)
export const addClientDeposit = (data) => API.post('/sales/add-deposit', data)
export const getDepositHistory = (limit = 200) => API.get(`/sales/deposit-history?limit=${limit}`)

// Sales
export const getSales = () => API.get('/sales')
export const getSale = (id) => API.get(`/sales/${id}`)
export const createSale = (data) => API.post('/sales', data)
export const getTodaySales = () => API.get('/sales/today')

// Reports
export const getTodayReport = () => API.get('/reports/today')
export const getMonthlyReport = (year, month) => API.get(`/reports/monthly/${year}/${month}`)
export const getBestSelling = (limit = 5) => API.get(`/reports/best-selling?limit=${limit}`)
export const getLastSevenDays = () => API.get('/reports/last-seven-days')
export const getPaymentMethods = () => API.get('/reports/payment-methods')

// Purchases (simple)
export const getPurchases = () => API.get('/purchases')
export const createPurchase = (data) => API.post('/purchases', data)
export const getPurchasesByProduct = (id) => API.get(`/purchases/product/${id}`)

// Expenses
export const getExpenses = () => API.get('/expenses')
export const createExpense = (data) => API.post('/expenses', data)
export const updateExpense = (id, data) => API.put(`/expenses/${id}`, data)
export const deleteExpense = (id) => API.delete(`/expenses/${id}`)

// Business Settings
export const getBusinessSettings = () => API.get('/business-settings')
export const updateBusinessSettings = (data) => API.put('/business-settings', data)

// Procurement — Vendors
export const getVendors = () => API.get('/procurement/vendors')
export const createVendor = (data) => API.post('/procurement/vendors', data)
export const updateVendor = (id, data) => API.put(`/procurement/vendors/${id}`, data)
export const deleteVendor = (id) => API.delete(`/procurement/vendors/${id}`)

// Procurement — Vendor Payments (MPYA)
export const getVendorPayments = (vendorId) => API.get(`/procurement/vendor-payments/${vendorId}`)
export const recordVendorPayment = (data) => API.post('/procurement/vendor-payments', data)

// Procurement — Purchase Orders
export const getPurchaseOrders = () => API.get('/procurement/orders')
export const getPurchaseOrder = (id) => API.get(`/procurement/orders/${id}`)
export const createPurchaseOrder = (data) => API.post('/procurement/orders', data)
export const updatePOStatus = (id, status) => API.patch(`/procurement/orders/${id}/status`, { status })

// Procurement — GRN
export const getGRNs = () => API.get('/procurement/grn')
export const getGRN = (id) => API.get(`/procurement/grn/${id}`)
export const receiveGoods = (data) => API.post('/procurement/grn/receive', data)

// Stock Movements
export const getStockMovements = (params = {}) => {
  const query = new URLSearchParams(params).toString()
  return API.get(`/stock-movements${query ? `?${query}` : ''}`)
}
export const getStockMovementsByProduct = (id, params = {}) => {
  const query = new URLSearchParams(params).toString()
  return API.get(`/stock-movements/product/${id}${query ? `?${query}` : ''}`)
}
export const createStockAdjustment = (data) => API.post('/stock-movements/adjustment', data)

// Stock Conversions (product -> product)
export const getStockConversions = () => API.get('/stock-conversions')
export const createStockConversion = (data) => API.post('/stock-conversions', data)

// Dispensing Register — MPYA (Pharmacy)
export const getDispensingLog = (limit = 100) => API.get(`/dispensing-log?limit=${limit}`)
export const createDispensingRecord = (data) => API.post('/dispensing-log', data)
