import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'

const allLinks = [
  { name: 'Dashboard', path: '/', icon: '📊', roles: ['admin', 'manager', 'cashier'] },
  { name: 'Sales', path: '/sales', icon: '🛒', roles: ['admin', 'manager', 'cashier'] },
  { name: 'Inventory', path: '/inventory', icon: '📦', roles: ['admin', 'manager', 'cashier'] },
  { name: 'Purchases', path: '/purchases', icon: '📥', roles: ['admin', 'manager'] },
  { name: 'Clients', path: '/clients', icon: '👥', roles: ['admin', 'manager'] },
  { name: 'Reports', path: '/reports', icon: '📈', roles: ['admin', 'manager'] },
  { name: 'Settings', path: '/settings', icon: '⚙️', roles: ['admin'] },
]

const Sidebar = ({ activePage, setActivePage }) => {
  const { user, logout } = useAuth()
  const role = user?.role || 'cashier'
  const links = allLinks.filter(l => l.roles.includes(role))

  const [businessName, setBusinessName] = useState(localStorage.getItem('businessName') || 'PIUS HARDWARE')
  const [logoUrl, setLogoUrl] = useState(localStorage.getItem('logoUrl') || '')

  useEffect(() => {
    const handleUpdate = () => {
      setBusinessName(localStorage.getItem('businessName') || 'PIUS HARDWARE')
      setLogoUrl(localStorage.getItem('logoUrl') || '')
    }
    window.addEventListener('businessUpdated', handleUpdate)
    return () => window.removeEventListener('businessUpdated', handleUpdate)
  }, [])

  return (
    <div style={{
      width: '260px',
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #1e1e2e 0%, #2d2d44 100%)',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 0',
      boxShadow: '4px 0 20px rgba(0,0,0,0.15)',
      fontFamily: 'Poppins, sans-serif'
    }}>

      {/* Logo & Business Name */}
      <div style={{
        margin: '0 14px 22px',
        padding: '18px 14px',
        background: 'white',
        borderRadius: '14px',
        textAlign: 'center',
        minHeight: '130px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={businessName}
            style={{
              width: '180px',
              height: '90px',
              objectFit: 'contain',
              display: 'block',
              marginBottom: '10px'
            }}
          />
        ) : (
          <div style={{
            width: '72px', height: '72px',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '30px',
            marginBottom: '10px'
          }}>
            🏪
          </div>
        )}
        <h2 style={{
          margin: '0 0 4px',
          fontSize: '13px',
          fontWeight: '700',
          color: '#1e1e2e',
          wordBreak: 'break-word',
          lineHeight: '1.3'
        }}>
          {businessName}
        </h2>
        <span style={{
          fontSize: '10px',
          color: '#999',
          textTransform: 'uppercase',
          letterSpacing: '1.5px',
          fontWeight: '600'
        }}>
          {role}
        </span>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '0 14px' }}>
        {links.map(link => {
          const isActive = activePage === link.path
          return (
            <div
              key={link.path}
              onClick={() => setActivePage(link.path)}
              style={{
                padding: '12px 16px',
                marginBottom: '5px',
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '11px',
                background: isActive ? 'linear-gradient(135deg, #667eea, #764ba2)' : 'transparent',
                fontWeight: isActive ? '700' : '500',
                fontSize: '14px',
                position: 'relative',
                transition: 'background 0.2s ease',
                color: 'white'
              }}
            >
              {isActive && (
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0,
                  width: '4px', background: 'white', borderRadius: '0 4px 4px 0'
                }} />
              )}
              <span style={{ fontSize: '17px' }}>{link.icon}</span>
              <span>{link.name}</span>
            </div>
          )
        })}
      </nav>

      {/* User + Logout */}
      <div style={{ padding: '16px 14px 0', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ background: 'rgba(255,255,255,0.07)', padding: '13px', borderRadius: '10px', marginBottom: '10px' }}>
          <p style={{ margin: '0 0 3px', fontSize: '13px', fontWeight: '700' }}>{user?.name}</p>
          <p style={{ margin: 0, fontSize: '11px', color: '#aaa' }}>{user?.email}</p>
        </div>
        <button onClick={logout} style={{
          width: '100%', padding: '11px',
          background: 'linear-gradient(135deg, #f093fb, #f5576c)',
          color: 'white', border: 'none', borderRadius: '10px',
          cursor: 'pointer', fontWeight: '700', fontSize: '13px',
          fontFamily: 'Poppins, sans-serif'
        }}>
          Logout
        </button>
      </div>
    </div>
  )
}

export default Sidebar
