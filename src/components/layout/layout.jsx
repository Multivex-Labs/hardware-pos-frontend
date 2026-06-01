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
      setSidebarOpen(false)
    }
  }

  const renderPage = () => {
    if (!allowed.includes(activePage)) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', textAlign: 'center', padding: '20px' }}>
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
    <>
      <style>{`
        .pos-layout { display: flex; min-height: 100vh; }
        .pos-sidebar-desktop { width: 260px; flex-shrink: 0; position: relative; }
        .pos-sidebar-desktop > div { position: fixed; top: 0; left: 0; bottom: 0; width: 260px; }
        .pos-sidebar-mobile { display: none; }
        .pos-overlay { display: none; }
        .pos-topbar { display: none; }
        .pos-main { flex: 1; background: #f5f5f5; min-height: 100vh; overflow-x: hidden; }
        .pos-content { padding: 30px; }

        @media (max-width: 767px) {
          .pos-sidebar-desktop { display: none; }
          .pos-topbar { 
            display: flex; align-items: center; gap: 15px;
            padding: 14px 20px; background: white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            position: sticky; top: 0; z-index: 30;
          }
          .pos-topbar button {
            background: none; border: none; cursor: pointer;
            font-size: 24px; padding: 0; line-height: 1;
          }
          .pos-topbar span { font-weight: 700; font-size: 16px; }
          .pos-sidebar-mobile {
            display: block;
            position: fixed; top: 0; left: 0; bottom: 0; width: 260px;
            z-index: 50;
            transform: translateX(-100%);
            transition: transform 0.3s ease;
          }
          .pos-sidebar-mobile.open { transform: translateX(0); }
          .pos-overlay {
            display: block;
            position: fixed; inset: 0;
            background: rgba(0,0,0,0.5);
            z-index: 40;
            opacity: 0; pointer-events: none;
            transition: opacity 0.3s ease;
          }
          .pos-overlay.open { opacity: 1; pointer-events: all; }
          .pos-content { padding: 16px; }
        }
      `}</style>

      <div className="pos-layout">
        {/* Desktop sidebar */}
        <div className="pos-sidebar-desktop">
          <div><Sidebar activePage={activePage} setActivePage={navigate} /></div>
        </div>

        {/* Mobile overlay */}
        <div className={`pos-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

        {/* Mobile sidebar */}
        <div className={`pos-sidebar-mobile ${sidebarOpen ? 'open' : ''}`}>
          <Sidebar activePage={activePage} setActivePage={navigate} />
        </div>

        {/* Main */}
        <main className="pos-main">
          {/* Mobile topbar */}
          <div className="pos-topbar">
            <button onClick={() => setSidebarOpen(true)}>☰</button>
            <span>PIUS HARDWARE</span>
          </div>

          <div className="pos-content">
            {renderPage()}
          </div>
        </main>
      </div>
    </>
  )
}

export default Layout
