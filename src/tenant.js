import axios from 'axios'

// Lazima ilingane na api.js ili duka litambuliwe vilevile kila mahali.
const API_URL =
  import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api')

// Development: http://demo.localhost:5173 -> duka ni "demo", au weka VITE_TENANT kwenye .env ya frontend.
// Production: backend inasoma duka kutoka subdomain, header haihitajiki.
function detectTenant() {
  const host = window.location.hostname
  if (host.endsWith('.localhost')) return host.slice(0, -'.localhost'.length)
  return import.meta.env.VITE_TENANT || null
}

export const TENANT = detectTenant()

// Global interceptor kwa kurasa zinazoita `axios` moja kwa moja
// (Procurement, Returns, Sales, settings). Instance ya api.js haihusiki.
axios.interceptors.request.use((config) => {
  if (!TENANT) return config

  const url = config.url || ''
  const isAbsolute = /^https?:\/\//i.test(url)
  const isOurApi = !isAbsolute || url.startsWith(API_URL) || url.includes('/api/')

  if (isOurApi && !config.headers['X-Tenant']) {
    config.headers['X-Tenant'] = TENANT
  }
  return config
})
