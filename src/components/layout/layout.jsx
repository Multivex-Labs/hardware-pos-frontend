import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import Sidebar from './Sidebar'
import Dashboard from '../../pages/Dashboard'
import Sales from '../../pages/Sales'
import Inventory from '../../pages/Inventory'
import Clients from '../../pages/Clients'
import Reports from '../../pages/Reports'
import Settings from '../../pages/Settings'
import Purchases from '../../pages/Purchases'

// Role permissions - pages zinazoruhusiwa kwa kila role
const rolePages = {
  admin:   ['/', '/sales', '/inventory', '/purchases', '/clients', '/reports', '/settings'],
  manager: ['/', '/sales', '/inventory', '/purchases', '/clients', '/reports'],
  cashier: ['/', '/sales', '/inventory'],
}

const Layout = () => {
  const { user } = useAuth()
  const [activePage, setActivePage] = useState('/')
  const role = user?.role || 'cashier'
  const allowed = rolePages[role] || rolePages['cashier']

  // Guarded navigation - cashier hawezi ku-access settings manually
  const navigate = (path) => {
    if (allowed.includes(path)) {
      setActivePage(path)
    }
  }

  const renderPage = () => {
    if (!allowed.includes(activePage)) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', fontFamily: "'Poppins', sans-serif" }}>
          <div style={{ fontSize: '80px', marginBottom: '20px' }}>🚫</div>
          <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '10px' }}>Huna Ruhusa</h2>
          <p style={{ color: '#6b7280', fontSize: '15px' }}>Ukurasa huu unahitaji ruhusa ya juu. Wasiliana na Admin wako.</p>
        </div>
      )
    }
    switch (activePage) {
      case '/': return <Dashboard />
      case '/sales': return <Sales />
      case '/inventory': return <Inventory />
      case '/purchases': return <Purchases />
      case '/clients': return <Clients />
      case '/reports': return <Reports />
      case '/settings': return <Settings />
      default: return <Dashboard />
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar activePage={activePage} setActivePage={navigate} />
      <main style={{ flex: 1, background: '#f5f5f5', padding: '30px', overflowY: 'auto' }}>
        {renderPage()}
      </main>
    </div>
  )
}

export default Layout
