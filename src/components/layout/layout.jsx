import { useLanguage } from '../../context/LanguageContext'
import { useState, useEffect } from 'react'
import { Menu } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import Sidebar from './sidebar'
import Dashboard from '../../pages/dashboard'
import Sales from '../../pages/sales'
import Inventory from '../../pages/inventory'
import Clients from '../../pages/clients'
import Reports from '../../pages/Reports'
import Settings from '../../pages/settings'
import Purchases from '../../pages/Purchases'
import Expenses from '../../pages/Expenses'
import Procurement from '../../pages/Procurement'
import DispensingRegister from '../../pages/DispensingRegister' // MPYA - Pharmacy
import { hasPermission } from '../../services/permissions'

const EXPANDED = 220
const COLLAPSED = 72

const pagePermissions = {
  '/': 'dashboard',
  '/sales': 'sales',
  '/inventory': 'inventory',
  '/dispensing': 'dispensing',
  '/purchases': 'purchases',
  '/procurement': 'procurement',
  '/expenses': 'expenses',
  '/clients': 'clients',
  '/reports': 'reports'
}

// Hali ya sidebar inakumbukwa. Kama hakuna chaguo lililohifadhiwa, skrini ndogo (<1100px) inaanza ikiwa imefungwa.
const readCollapsed = () => {
  const saved = localStorage.getItem('pos-sidebar-collapsed')
  if (saved !== null) return saved === '1'
  return typeof window !== 'undefined' && window.innerWidth < 1100
}

const Layout = () => {
  const { t } = useLanguage()
  const { user } = useAuth()
  const { colors } = useTheme()
  const [activePage, setActivePage] = useState('/')
  const [sidebarOpen, setSidebarOpen] = useState(false)    // drawer ya simu
  const [collapsed, setCollapsed] = useState(readCollapsed) // rail ya desktop
  const role = user?.role || 'cashier'
  const allowed = Object.keys(pagePermissions).filter(path => hasPermission(user, pagePermissions[path]))
  if (role === 'admin') allowed.push('/settings')
  const width = collapsed ? COLLAPSED : EXPANDED

  const navigate = (path) => {
    if (allowed.includes(path)) { setActivePage(path); setSidebarOpen(false) }
  }

  const toggleCollapsed = () => {
    setCollapsed(c => {
      const next = !c
      localStorage.setItem('pos-sidebar-collapsed', next ? '1' : '0')
      return next
    })
  }

  // Ctrl+B (au Cmd+B) = kunja/fungua sidebar
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') { e.preventDefault(); toggleCollapsed() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const renderPage = () => {
    if (!allowed.includes(activePage)) return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', textAlign: 'center' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '6px', color: colors.text }}>{t('shell.accessDenied')}</h2>
        <p style={{ fontSize: '14px', color: colors.textMuted }}>{t('shell.noPermission')}</p>
      </div>
    )
    switch (activePage) {
      case '/': return <Dashboard />
      case '/sales': return <Sales />
      case '/inventory': return <Inventory />
      case '/dispensing': return <DispensingRegister />
      case '/purchases': return <Purchases />
      case '/procurement': return <Procurement />
      case '/expenses': return <Expenses />
      case '/clients': return <Clients />
      case '/reports': return <Reports />
      case '/settings': return <Settings />
      default: return <Dashboard />
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'transparent' }}>

      {/* Sidebar — desktop (rail inayofunguka/kufungwa) */}
      <div className="pos-sidebar-desktop" style={{ width: `${width}px`, flexShrink: 0, position: 'relative', display: 'flex', transition: 'width 0.22s ease' }}>
        <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: `${width}px`, zIndex: 20, transition: 'width 0.22s ease' }}>
          <Sidebar activePage={activePage} setActivePage={navigate} collapsed={collapsed} onToggle={toggleCollapsed} />
        </div>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="scrim" onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
      )}

      {/* Sidebar — mobile drawer */}
      <div className="pos-sidebar-mobile" style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: `${EXPANDED}px`, zIndex: 50,
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.22s ease',
        boxShadow: sidebarOpen ? colors.shadowLg : 'none',
      }}>
        <Sidebar activePage={activePage} setActivePage={navigate} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <main style={{ flex: 1, minWidth: 0, background: 'transparent', minHeight: '100vh' }}>
        {/* Mobile topbar */}
        <div className="pos-topbar glass" style={{
          display: 'none', alignItems: 'center', gap: '12px', height: '52px', padding: '0 12px',
          borderTop: 'none', borderLeft: 'none', borderRight: 'none', position: 'sticky', top: 0, zIndex: 30,
        }}>
          <button onClick={() => setSidebarOpen(true)} aria-label={t('shell.openMenu')} className="btn" style={{ width: '38px', height: '38px', padding: 0 }}>
            <Menu size={20} strokeWidth={1.75} />
          </button>
          <span style={{ fontWeight: '600', fontSize: '15px', color: colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {localStorage.getItem('businessName') || 'POS'}
          </span>
        </div>

        <div className="pos-content" style={{ padding: '24px' }}>
          {renderPage()}
        </div>
      </main>

      <style>{`
        @keyframes pageIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
        .pos-content > * { animation: pageIn 0.2s ease; }
        @media (max-width: 767px) {
          .pos-sidebar-desktop { display: none !important; }
          .pos-topbar { display: flex !important; }
          .pos-content { padding: 16px !important; }
        }
        @media (min-width: 768px) {
          .pos-sidebar-mobile { display: none; }
        }
      `}</style>
    </div>
  )
}

export default Layout
