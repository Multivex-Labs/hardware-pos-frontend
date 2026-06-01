import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import Sidebar from './sidebar'
import Dashboard from '../../pages/dashboard'
import Sales from '../../pages/sales'
import Inventory from '../../pages/inventory'
import Clients from '../../pages/clients'
import Reports from '../../pages/Reports'
import Settings from '../../pages/settings'
import Purchases from '../../pages/Purchases'

const rolePages = {
  admin:   ['/', '/sales', '/inventory', '/purchases', '/clients', '/reports', '/settings'],
  manager: ['/', '/sales', '/inventory', '/purchases', '/clients', '/reports'],
  cashier: ['/', '/sales', '/inventory'],
}

const Layout = () => {
  const { user } = useAuth()
  const [activePage, setActivePage] = useState('/')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const role = user?.role || 'cashier'
  const allowed = rolePages[role] || rolePages['cashier']

  const navigate = (path) => {
    if (allowed.includes(path)) {
      setActivePage(path)
      setSidebarOpen(false) // Close sidebar on mobile after navigation
    }
  }

  const renderPage = () => {
    if (!allowed.includes(activePage)) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', fontFamily: 'Poppins, sans-serif', padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '60px', marginBottom: '20px' }}>🚫</div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '10px' }}>Access Denied</h2>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>You do not have permission to view this page.</p>
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
    <div style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 40,
            display: 'block'
          }}
        />
      )}

      {/* Sidebar */}
      <div style={{
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        zIndex: 50,
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s ease',
        width: '260px',
      }}
        className="sidebar-wrapper"
      >
        <Sidebar activePage={activePage} setActivePage={navigate} />
      </div>

      {/* Desktop sidebar — always visible on large screens */}
      <div style={{ width: '260px', flexShrink: 0 }} className="sidebar-desktop">
        <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: '260px' }}>
          <Sidebar activePage={activePage} setActivePage={navigate} />
        </div>
      </div>

      {/* Main content */}
      <main style={{ flex: 1, background: '#f5f5f5', minHeight: '100vh', width: '100%' }}>

        {/* Mobile top bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '15px',
          padding: '15px 20px',
          background: 'white',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          position: 'sticky',
          top: 0,
          zIndex: 30,
        }} className="mobile-topbar">
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              background: 'none', border: 'none',
              cursor: 'pointer', padding: '5px',
              fontSize: '22px', lineHeight: 1
            }}
          >
            ☰
          </button>
          <span style={{ fontWeight: '700', fontSize: '16px', fontFamily: 'Poppins, sans-serif' }}>
            PIUS HARDWARE
          </span>
        </div>

        <div style={{ padding: '20px' }}>
          {renderPage()}
        </div>
      </main>

      {/* Responsive CSS */}
      <style>{`
        @media (min-width: 768px) {
          .sidebar-wrapper { transform: translateX(0) !important; position: relative !important; }
          .sidebar-desktop { display: block !important; }
          .mobile-topbar { display: none !important; }
        }
        @media (max-width: 767px) {
          .sidebar-desktop { display: none !important; }
          .mobile-topbar { display: flex !important; }
        }
      `}</style>
    </div>
  )
}

export default Layout
