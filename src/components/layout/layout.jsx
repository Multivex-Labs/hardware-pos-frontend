import { useState } from 'react'
import Sidebar from './Sidebar'
import Dashboard from '../../pages/Dashboard'
import Sales from '../../pages/Sales'
import Inventory from '../../pages/Inventory'
import Clients from '../../pages/Clients'
import Reports from '../../pages/Reports'
import Settings from '../../pages/Settings'
import Purchases from '../../pages/Purchases'

const Layout = () => {
  const [activePage, setActivePage] = useState('/')

  const renderPage = () => {
  switch(activePage) {
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
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      <main style={{
        flex: 1,
        background: '#f5f5f5',
        padding: '30px',
        overflowY: 'auto'
      }}>
        {renderPage()}
      </main>
    </div>
  )
}

export default Layout