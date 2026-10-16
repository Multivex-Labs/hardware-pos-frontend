const ALL_ACTIONS = ['view', 'create', 'edit', 'delete']

export const PERMISSION_MODULES = [
  { id: 'dashboard', label: 'Dashboard', actions: ['view'] },
  { id: 'sales', label: 'Sales', actions: ALL_ACTIONS },
  { id: 'inventory', label: 'Inventory', actions: ALL_ACTIONS },
  { id: 'dispensing', label: 'Dispensing', actions: ALL_ACTIONS },
  { id: 'expiry', label: 'Expiry & batches', actions: ['view'] },
  { id: 'procurement', label: 'Procurement', actions: ALL_ACTIONS },
  { id: 'purchases', label: 'Purchases', actions: ALL_ACTIONS },
  { id: 'expenses', label: 'Expenses', actions: ALL_ACTIONS },
  { id: 'clients', label: 'Clients', actions: ALL_ACTIONS },
  { id: 'reports', label: 'Reports', actions: ALL_ACTIONS }
]

const DEFAULT_PERMISSIONS = {
  manager: {
    dashboard: ['view'],
    sales: ['view', 'create', 'edit'],
    inventory: ['view', 'edit'],
    dispensing: ['view', 'create'],
    expiry: ['view'],
    procurement: ['view'],
    purchases: ['view'],
    expenses: ['view'],
    clients: ['view', 'create', 'edit'],
    reports: ['view']
  },
  cashier: {
    dashboard: ['view'],
    sales: ['view', 'create'],
    inventory: ['view'],
    dispensing: ['view', 'create'],
    expiry: ['view']
  }
}

export function hasPermission(user, module, action = 'view') {
  if (user?.role === 'admin') return true
  const permissions = user?.permissions || DEFAULT_PERMISSIONS[user?.role] || {}
  return permissions[module]?.includes(action) || false
}
