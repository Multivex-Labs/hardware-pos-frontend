import { useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { register } from '../services/api'
import toast from 'react-hot-toast'
import axios from 'axios'

const API = axios.create({ baseURL: 'http://localhost:5000/api' })
API.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

// ── Confirmation Modal ──────────────────────────────────────────────────────
const ConfirmModal = ({ onConfirm, onCancel }) => (
  <div style={{
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
  }}>
    <div style={{
      background: 'white', borderRadius: '16px', padding: '36px 32px',
      maxWidth: '420px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      fontFamily: 'Poppins, sans-serif', textAlign: 'center'
    }}>
      <div style={{ fontSize: '56px', marginBottom: '16px' }}>⚠️</div>
      <h2 style={{ margin: '0 0 10px', fontSize: '20px', fontWeight: '700', color: '#1e1e2e' }}>
        Clear All Data?
      </h2>
      <p style={{ margin: '0 0 8px', color: '#6b7280', fontSize: '14px', lineHeight: '1.6' }}>
        This will permanently delete all <strong>sales, purchases, products and clients</strong> from the database.
      </p>
      <p style={{ margin: '0 0 28px', color: '#dc2626', fontSize: '13px', fontWeight: '600' }}>
        This action cannot be undone.
      </p>
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
        <button onClick={onCancel} style={{
          padding: '12px 28px', background: '#f3f4f6', color: '#374151',
          border: 'none', borderRadius: '10px', cursor: 'pointer',
          fontWeight: '600', fontSize: '14px', fontFamily: 'Poppins, sans-serif'
        }}>
          Cancel
        </button>
        <button onClick={onConfirm} style={{
          padding: '12px 28px', background: 'linear-gradient(135deg, #dc2626, #991b1b)',
          color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer',
          fontWeight: '700', fontSize: '14px', fontFamily: 'Poppins, sans-serif',
          boxShadow: '0 4px 15px rgba(220,38,38,0.4)'
        }}>
          Yes, Clear All Data
        </button>
      </div>
    </div>
  </div>
)

// ── Main Settings Component ─────────────────────────────────────────────────
const Settings = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('business')
  const [loading, setLoading] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'cashier' })
  const [businessName, setBusinessName] = useState(localStorage.getItem('businessName') || 'PIUS HARDWARE')
  const [logoUrl, setLogoUrl] = useState(localStorage.getItem('logoUrl') || '')
  const [logoPreview, setLogoPreview] = useState(localStorage.getItem('logoUrl') || '')
  const fileRef = useRef()

  const handleLogoUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast.error('Logo must be under 2MB'); return }
    const reader = new FileReader()
    reader.onloadend = () => { setLogoPreview(reader.result); setLogoUrl(reader.result) }
    reader.readAsDataURL(file)
  }

  const handleSaveBusiness = () => {
    localStorage.setItem('businessName', businessName)
    localStorage.setItem('logoUrl', logoUrl)
    toast.success('Settings saved successfully!')
    window.dispatchEvent(new Event('businessUpdated'))
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await register(newUser)
      toast.success('User created successfully!')
      setNewUser({ name: '', email: '', password: '', role: 'cashier' })
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create user')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    const keys = ['products', 'sales', 'clients', 'purchases']
    const data = {}
    keys.forEach(k => { const v = localStorage.getItem(k); if (v) data[k] = JSON.parse(v) })
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'pos-backup-' + new Date().toISOString().slice(0, 10) + '.json'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Backup downloaded!')
  }

  const handleImport = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      try {
        const data = JSON.parse(reader.result)
        Object.entries(data).forEach(([k, v]) => localStorage.setItem(k, JSON.stringify(v)))
        toast.success('Data imported successfully!')
      } catch { toast.error('Invalid backup file') }
    }
    reader.readAsText(file)
  }

  const handleClearAll = async () => {
    setShowConfirm(false)
    setClearing(true)
    try {
      await API.post('/admin/clear-all')
      toast.success('All data cleared successfully!')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to clear data. Check your connection.')
    } finally {
      setClearing(false)
    }
  }

  // ── Styles ──
  const tabStyle = (active) => ({
    padding: '10px 22px', border: 'none', borderRadius: '8px', cursor: 'pointer',
    fontWeight: '600', fontSize: '14px', fontFamily: 'Poppins, sans-serif',
    background: active ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#f3f4f6',
    color: active ? 'white' : '#374151'
  })
  const card = {
    background: 'white', padding: '28px', borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)', maxWidth: '560px'
  }
  const lbl = { display: 'block', marginBottom: '6px', color: '#374151', fontWeight: '600', fontSize: '14px' }
  const inp = {
    width: '100%', padding: '10px 14px', border: '1px solid #d1d5db',
    borderRadius: '8px', fontSize: '14px', fontFamily: 'Poppins, sans-serif',
    boxSizing: 'border-box', outline: 'none'
  }
  const btn = (color, shadow) => ({
    padding: '11px 22px', background: color || '#7c3aed', color: 'white',
    border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600',
    fontSize: '14px', fontFamily: 'Poppins, sans-serif',
    boxShadow: shadow || 'none'
  })

  return (
    <div style={{ fontFamily: 'Poppins, sans-serif' }}>
      {showConfirm && <ConfirmModal onConfirm={handleClearAll} onCancel={() => setShowConfirm(false)} />}

      <h1 style={{ marginBottom: '6px', fontSize: '26px', fontWeight: '700' }}>Settings</h1>
      <p style={{ color: '#6b7280', marginBottom: '26px', fontSize: '14px' }}>Manage your POS system configuration</p>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '28px', flexWrap: 'wrap' }}>
        <button style={tabStyle(activeTab === 'business')} onClick={() => setActiveTab('business')}>Business Profile</button>
        <button style={tabStyle(activeTab === 'users')} onClick={() => setActiveTab('users')}>User Management</button>
        <button style={tabStyle(activeTab === 'data')} onClick={() => setActiveTab('data')}>Data & Backup</button>
      </div>

      {/* ── BUSINESS TAB ── */}
      {activeTab === 'business' && (
        <div style={card}>
          <h3 style={{ margin: '0 0 22px', fontSize: '18px', fontWeight: '700' }}>Business Profile</h3>
          <div style={{ marginBottom: '20px' }}>
            <label style={lbl}>Business Name</label>
            <input style={inp} value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="e.g. PIUS HARDWARE" />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={lbl}>Business Logo</label>
            {logoPreview && (
              <div style={{ marginBottom: '12px', padding: '14px', background: '#f9fafb', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={logoPreview} alt="Logo Preview" style={{ maxHeight: '100px', maxWidth: '220px', objectFit: 'contain' }} />
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button style={btn('#6b7280')} onClick={() => fileRef.current.click()}>
                {logoPreview ? 'Change Logo' : 'Upload Logo'}
              </button>
              {logoPreview && (
                <button style={btn('#ef4444')} onClick={() => { setLogoPreview(''); setLogoUrl('') }}>
                  Remove Logo
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
            </div>
            <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#9ca3af' }}>
              PNG or JPG, max 2MB. Appears in the sidebar and on all PDF exports.
            </p>
          </div>
          <button style={btn()} onClick={handleSaveBusiness}>Save Changes</button>
        </div>
      )}

      {/* ── USERS TAB ── */}
      {activeTab === 'users' && (
        <div style={card}>
          <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: '700' }}>Create New User</h3>
          <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '20px' }}>Only admins can create new system users</p>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '14px', marginBottom: '22px', fontSize: '13px', color: '#15803d', lineHeight: '1.8' }}>
            <strong>Role Permissions:</strong><br />
            Admin — Full access to everything<br />
            Manager — Sales, Inventory, Clients, Purchases, Reports<br />
            Cashier — Sales and Inventory only
          </div>
          <form onSubmit={handleCreateUser}>
            {[
              { field: 'name', type: 'text', label: 'Full Name' },
              { field: 'email', type: 'email', label: 'Email Address' },
              { field: 'password', type: 'password', label: 'Password' }
            ].map(({ field, type, label }) => (
              <div key={field} style={{ marginBottom: '16px' }}>
                <label style={lbl}>{label}</label>
                <input type={type} value={newUser[field]}
                  onChange={e => setNewUser({ ...newUser, [field]: e.target.value })}
                  style={inp} required placeholder={label} />
              </div>
            ))}
            <div style={{ marginBottom: '22px' }}>
              <label style={lbl}>Role</label>
              <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                style={{ ...inp, cursor: 'pointer' }}>
                <option value="cashier">Cashier</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button type="submit" disabled={loading} style={btn()}>
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </form>
        </div>
      )}

      {/* ── DATA TAB ── */}
      {activeTab === 'data' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '560px' }}>

          {/* Export */}
          <div style={card}>
            <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: '700' }}>Export Data</h3>
            <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '18px' }}>Download all data as a JSON backup file</p>
            <button style={btn('#059669')} onClick={handleExport}>Download Backup</button>
          </div>

          {/* Import */}
          <div style={card}>
            <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: '700' }}>Import Data</h3>
            <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '18px' }}>Restore data from a JSON backup file</p>
            <label style={{ ...btn('#7c3aed'), display: 'inline-block', cursor: 'pointer' }}>
              Choose Backup File
              <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
            </label>
          </div>

          {/* Clear All Data */}
          <div style={{ ...card, border: '2px solid #fecaca', background: '#fff5f5' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <div style={{ fontSize: '32px', lineHeight: 1 }}>🗑️</div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 6px', fontSize: '17px', fontWeight: '700', color: '#991b1b' }}>
                  Clear All Data
                </h3>
                <p style={{ margin: '0 0 18px', color: '#7f1d1d', fontSize: '13px', lineHeight: '1.6' }}>
                  Permanently removes all sales, purchases, products and clients from the database. User accounts are kept. Use this to reset the system after testing.
                </p>
                <button
                  onClick={() => setShowConfirm(true)}
                  disabled={clearing}
                  style={{
                    padding: '11px 22px',
                    background: clearing ? '#9ca3af' : 'linear-gradient(135deg, #dc2626, #991b1b)',
                    color: 'white', border: 'none', borderRadius: '8px',
                    cursor: clearing ? 'not-allowed' : 'pointer',
                    fontWeight: '700', fontSize: '14px', fontFamily: 'Poppins, sans-serif',
                    boxShadow: clearing ? 'none' : '0 4px 15px rgba(220,38,38,0.35)'
                  }}
                >
                  {clearing ? 'Clearing...' : 'Clear All Data'}
                </button>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}

export default Settings
