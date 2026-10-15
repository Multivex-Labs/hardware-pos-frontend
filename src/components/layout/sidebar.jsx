import { useLanguage } from '../../context/LanguageContext'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { LayoutDashboard, ShoppingCart, Package, Pill, ClipboardList, PackageCheck, Receipt, Users, BarChart3, Settings, LogOut, PanelLeftClose, PanelLeftOpen, ChevronsUpDown, Palette, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getBusinessSettings } from '../../services/api'
import { hasPermission } from '../../services/permissions'
import Modal from '../Modal'
import ThemeSettings from '../ThemeSettings'

// Nav imepangwa kwa makundi; ruhusa huwekwa kwa kila mtumiaji.
const navGroups = [
  {
    label: 'Operations', tkey: 'nav.operations',
    links: [
      { name: 'Dashboard', tkey: 'nav.dashboard',  path: '/',           icon: LayoutDashboard, permission: 'dashboard' },
      { name: 'Sales', tkey: 'nav.sales',      path: '/sales',      icon: ShoppingCart,    permission: 'sales' },
      { name: 'Inventory', tkey: 'nav.inventory',  path: '/inventory',  icon: Package,         permission: 'inventory' },
      { name: 'Dispensing', tkey: 'nav.dispensing', path: '/dispensing', icon: Pill,            permission: 'dispensing', pharmacyOnly: true },
    ],
  },
  {
    label: 'Purchasing', tkey: 'nav.purchasing',
    links: [
      { name: 'Procurement', tkey: 'nav.procurement', path: '/procurement', icon: ClipboardList, permission: 'procurement' },
      { name: 'Purchases', tkey: 'nav.purchases',   path: '/purchases',   icon: PackageCheck,  permission: 'purchases' },
    ],
  },
  {
    label: 'Management', tkey: 'nav.management',
    links: [
      { name: 'Expenses', tkey: 'nav.expenses', path: '/expenses', icon: Receipt,   permission: 'expenses' },
      { name: 'Clients', tkey: 'nav.clients',  path: '/clients',  icon: Users,     permission: 'clients' },
      { name: 'Reports', tkey: 'nav.reports',  path: '/reports',  icon: BarChart3, permission: 'reports' },
      { name: 'Settings', tkey: 'nav.settings', path: '/settings', icon: Settings,  roles: ['admin'] },
    ],
  },
]

// collapsed = rail ya icons tu (desktop). onClose = kitufe cha X ndani ya drawer ya simu.
const Sidebar = ({ activePage, setActivePage, collapsed = false, onToggle, onClose }) => {
  const { t } = useLanguage()
  const { user, logout } = useAuth()
  const role = user?.role || 'cashier'

  const [businessName, setBusinessName] = useState(localStorage.getItem('businessName') || '')
  const [logoUrl, setLogoUrl] = useState(localStorage.getItem('logoUrl') || '')
  const [businessType, setBusinessType] = useState(localStorage.getItem('businessType') || 'general')
  const [menuPos, setMenuPos] = useState(null)
  const [showAppearance, setShowAppearance] = useState(false)

  const groups = navGroups
    .map(g => ({ ...g, links: g.links.filter(l => hasPermission(user, l.permission) && (!l.pharmacyOnly || businessType === 'pharmacy')) }))
    .filter(g => g.links.length > 0)

  const loadFromApi = () => {
    getBusinessSettings()
      .then(res => {
        const s = res.data || {}
        if (s.business_name) { setBusinessName(s.business_name); localStorage.setItem('businessName', s.business_name) }
        if (s.logo !== undefined) { setLogoUrl(s.logo || ''); localStorage.setItem('logoUrl', s.logo || '') }
        if (s.business_type) { setBusinessType(s.business_type); localStorage.setItem('businessType', s.business_type) }
      })
      .catch(() => {})
  }

  useEffect(() => {
    loadFromApi()
    window.addEventListener('businessUpdated', loadFromApi)
    return () => window.removeEventListener('businessUpdated', loadFromApi)
  }, [])

  useEffect(() => {
    if (!menuPos) return
    const onKey = (e) => { if (e.key === 'Escape') setMenuPos(null) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menuPos])

  const initials = businessName
    ? businessName.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : 'POS'

  const openMenu = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    setMenuPos(collapsed
      ? { left: r.right + 8, bottom: window.innerHeight - r.bottom }
      : { left: r.left, bottom: window.innerHeight - r.top + 8, width: r.width })
  }

  const logo = (
    <div style={{
      width: '36px', height: '36px', borderRadius: '6px', flexShrink: 0, overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: logoUrl ? '#fff' : 'var(--primary)', border: logoUrl ? '1px solid var(--border)' : 'none',
    }}>
      {logoUrl
        ? <img src={logoUrl} alt={businessName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        : <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--on-primary)' }}>{initials}</span>}
    </div>
  )

  const avatar = (
    <div style={{
      width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0, background: 'var(--surface-3)', color: 'var(--text)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '600',
    }}>
      {user?.name?.charAt(0).toUpperCase()}
    </div>
  )

  return (
    <div className="glass-flat" style={{
      width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      borderRight: '1px solid var(--border)', color: 'var(--text)',
    }}>
      <style>{`
        .nav-item {
          display: flex; align-items: center; gap: 12px; width: 100%; text-align: left;
          height: 38px; padding: 0 12px; margin-bottom: 2px; white-space: nowrap;
          border: none; border-radius: 6px; background: transparent; cursor: pointer;
          font-size: 14.5px; font-weight: 400; color: var(--text-muted);
        }
        .nav-item svg { flex-shrink: 0; }
        .nav-item:hover { background: var(--surface-3); color: var(--text); }
        .nav-item.active { background: var(--primary-soft); color: var(--primary); font-weight: 600; box-shadow: inset 3px 0 0 var(--primary); }
        .nav-item.rail { justify-content: center; padding: 0; }
        .user-btn { display: flex; align-items: center; gap: 10px; width: 100%; padding: 6px; border: none; border-radius: 8px; background: transparent; cursor: pointer; color: var(--text); text-align: left; }
        .user-btn:hover { background: var(--surface-3); }
        .menu-item { display: flex; align-items: center; gap: 10px; width: 100%; height: 36px; padding: 0 10px; border: none; border-radius: 6px; background: transparent; cursor: pointer; font-size: 14px; color: var(--text); text-align: left; }
        .menu-item:hover { background: var(--surface-3); }
        .menu-item.danger:hover { background: var(--danger-soft); color: var(--danger); }
      `}</style>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px', padding: collapsed ? '14px 0' : '16px',
        flexDirection: collapsed ? 'column' : 'row', borderBottom: '1px solid var(--border)',
      }}>
        {logo}
        {!collapsed && (
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontSize: '14px', fontWeight: '600', lineHeight: '1.3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{businessName || t('shell.yourBusiness')}</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{role}</p>
          </div>
        )}
        {onClose ? (
          <button className="icon-btn" onClick={onClose} aria-label={t('shell.closeMenu')}><X size={18} strokeWidth={1.75} /></button>
        ) : onToggle && (
          <button className="icon-btn" onClick={onToggle} aria-label={collapsed ? t('shell.expand') : t('shell.collapse')} title={collapsed ? t('shell.expandTip') : t('shell.collapseTip')}>
            {collapsed ? <PanelLeftOpen size={19} strokeWidth={1.75} /> : <PanelLeftClose size={19} strokeWidth={1.75} />}
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '4px 10px', overflowY: 'auto', overflowX: 'hidden' }}>
        {groups.map((group, gi) => (
          <div key={t(group.tkey)} style={{ padding: collapsed ? '10px 0 6px' : '14px 0 8px', borderTop: gi > 0 ? '1px solid var(--border)' : 'none' }}>
            {!collapsed && (
              <p style={{ padding: '0 12px 8px', fontSize: '11px', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-subtle)' }}>{t(group.tkey)}</p>
            )}
            {group.links.map(link => {
              const Icon = link.icon
              return (
                <button
                  key={link.path}
                  className={`nav-item${activePage === link.path ? ' active' : ''}${collapsed ? ' rail' : ''}`}
                  aria-current={activePage === link.path ? 'page' : undefined}
                  title={collapsed ? t(link.tkey) : undefined}
                  aria-label={t(link.tkey)}
                  onClick={() => setActivePage(link.path)}
                >
                  <Icon size={20} strokeWidth={1.75} />
                  {!collapsed && <span>{t(link.tkey)}</span>}
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User menu — kila role anaipata (Appearance + Logout) */}
      <div style={{ padding: collapsed ? '10px 0' : '10px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'center' }}>
        <button className="user-btn" style={collapsed ? { width: 'auto', padding: '4px' } : undefined} onClick={openMenu} aria-haspopup="menu" aria-label={t('shell.userMenu')} title={collapsed ? user?.name : undefined}>
          {avatar}
          {!collapsed && (
            <>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ fontSize: '13px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</p>
              </div>
              <ChevronsUpDown size={16} strokeWidth={1.75} style={{ color: 'var(--text-subtle)', flexShrink: 0 }} />
            </>
          )}
        </button>
      </div>

      {/* Popover + Appearance modal — portal ili zisikatwe na sidebar */}
      {menuPos && createPortal(
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 1400 }} onClick={() => setMenuPos(null)} />
          <div className="glass" role="menu" style={{
            position: 'fixed', left: menuPos.left, bottom: menuPos.bottom, width: menuPos.width || 230, minWidth: 220, zIndex: 1401,
            borderRadius: '8px', padding: '6px', boxShadow: 'var(--shadow-lg)',
          }}>
            <div style={{ padding: '8px 10px 10px', borderBottom: '1px solid var(--border-light)', marginBottom: '6px' }}>
              <p style={{ fontSize: '13px', fontWeight: '600' }}>{user?.name}</p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{role} · {user?.email}</p>
            </div>
            <button className="menu-item" role="menuitem" onClick={() => { setMenuPos(null); setShowAppearance(true); onClose && onClose() }}>
              <Palette size={17} strokeWidth={1.75} /> {t('shell.appearance')}
            </button>
            <button className="menu-item danger" role="menuitem" onClick={logout}>
              <LogOut size={17} strokeWidth={1.75} /> {t('shell.logout')}
            </button>
          </div>
        </>,
        document.body
      )}

      <Modal open={showAppearance} onClose={() => setShowAppearance(false)} title={t('shell.appearance')} subtitle={t('shell.appearanceSub')} size="md" dismissOnOverlay>
        <ThemeSettings />
      </Modal>
    </div>
  )
}

export default Sidebar
