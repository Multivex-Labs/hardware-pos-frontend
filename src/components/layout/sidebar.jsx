import { useAuth } from '../../context/AuthContext'
import logo from '../../assets/logo.png'

const links = [
  { name: 'Dashboard', path: '/', icon: '📊' },
  { name: 'Sales', path: '/sales', icon: '🛒' },
  { name: 'Inventory', path: '/inventory', icon: '📦' },
  { name: 'Purchases', path: '/purchases', icon: '📥' },
  { name: 'Clients', path: '/clients', icon: '👥' },
  { name: 'Reports', path: '/reports', icon: '📈' },
  { name: 'Settings', path: '/settings', icon: '⚙️' },
]

const Sidebar = ({ activePage, setActivePage }) => {
  const { user, logout } = useAuth()

  return (
    <div style={{
      width: '260px',
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #1e1e2e 0%, #2d2d44 100%)',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      padding: '25px 0',
      boxShadow: '4px 0 20px rgba(0,0,0,0.15)'
    }}>
    {/* Logo */}
<div style={{ padding: '0 25px 25px', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'center', background: 'white', margin: '0 15px 25px', borderRadius: '16px' }}>
  <img src={logo} alt="PIUS HARDWARE" style={{ width: '160px', marginBottom: '15px', marginTop: '15px' }} />
  <h2 style={{ margin: '0 0 8px', fontSize: '22px', fontWeight: '700', color: '#1e1e2e' }}>
    PIUS HARDWARE
  </h2>
  <p style={{ margin: 0, fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: '600' }}>
    {user?.role}
  </p>
</div>

      {/* Links */}
      <nav style={{ flex: 1, padding: '25px 15px' }}>
        {links.map(link => (
          <div
            key={link.path}
            onClick={() => setActivePage(link.path)}
            style={{
              padding: '14px 18px',
              marginBottom: '8px',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: activePage === link.path ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
              fontWeight: activePage === link.path ? '700' : '500',
              fontSize: '14px',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {activePage === link.path && (
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: 'white', borderRadius: '0 4px 4px 0' }} />
            )}
            <span style={{ fontSize: '20px' }}>{link.icon}</span>
            <span>{link.name}</span>
          </div>
        ))}
      </nav>

      {/* User info + logout */}
      <div style={{ padding: '20px 25px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '12px', marginBottom: '15px' }}>
          <p style={{ margin: '0 0 5px', fontSize: '14px', fontWeight: '700' }}>{user?.name}</p>
          <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>{user?.email}</p>
        </div>
        <button
          onClick={logout}
          style={{
            width: '100%',
            padding: '12px',
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: '700',
            fontSize: '14px',
            boxShadow: '0 4px 15px rgba(240, 147, 251, 0.4)'
          }}
        >
          🚪 Logout
        </button>
      </div>
    </div>
  )
}

export default Sidebar