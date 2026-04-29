import axios from 'axios'

const API = axios.create({
  baseURL: 'http://localhost:5000/api'
})

// Weka token kwa kila request automatically
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auth
export const login = (data) => API.post('/auth/login', data)
export const register = (data) => API.post('/auth/register', data)
export const getMe = () => API.get('/auth/me')

// Products
export const getProducts = () => API.get('/products')
export const getProduct = (id) => API.get(`/products/${id}`)
export const createProduct = (data) => API.post('/products', data)
export const updateProduct = (id, data) => API.put(`/products/${id}`, data)
export const deleteProduct = (id) => API.delete(`/products/${id}`)
export const getLowStock = () => API.get('/products/lowstock')

// Clients
export const getClients = () => API.get('/clients')
export const getClient = (id) => API.get(`/clients/${id}`)
export const createClient = (data) => API.post('/clients', data)
export const updateClient = (id, data) => API.put(`/clients/${id}`, data)
export const deleteClient = (id) => API.delete(`/clients/${id}`)
export const searchClients = (query) => API.get(`/clients/search?query=${query}`)
export const getClientHistory = (id) => API.get(`/clients/${id}/history`)

// Sales
export const getSales = () => API.get('/sales')
export const getSale = (id) => API.get(`/sales/${id}`)
export const createSale = (data) => API.post('/sales', data)
export const getTodaySales = () => API.get('/sales/today')

// Reports
export const getTodayReport = () => API.get('/reports/today')
export const getMonthlyReport = (year, month) => API.get(`/reports/monthly/${year}/${month}`)
export const getBestSelling = () => API.get('/reports/best-selling')
export const getLastSevenDays = () => API.get('/reports/last-seven-days')
export const getPaymentMethods = () => API.get('/reports/payment-methods')

// Purchases
export const getPurchases = () => API.get('/purchases')
export const createPurchase = (data) => API.post('/purchases', data)
export const getPurchasesByProduct = (product_id) => API.get(`/purchases/product/${product_id}`)