import { useState, useRef, useEffect } from 'react'
import { Building2, Users, Palette, Database, Store, Wrench, Pill, TriangleAlert, Trash2, Upload, Download, FolderOpen, ImagePlus, RefreshCcw, Plus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { register, getBusinessSettings, updateBusinessSettings } from '../services/api'
import toast from 'react-hot-toast'
import axios from 'axios'
import ThemeSettings from '../components/ThemeSettings'
import Modal from '../components/Modal'

const API = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api' })
API.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

const BUSINESS_TYPES = [
  { value: 'general', label: 'General', icon: Store, desc: 'Standard retail — no extra fields' },
  { value: 'hardware', label: 'Hardware', icon: Wrench, desc: 'Hardware / building materials store' },
  { value: 'pharmacy', label: 'Pharmacy', icon: Pill, desc: 'Unlocks expiry dates, batch numbers, and the Dispensing Register' }
]

const Settings = () => {
  const [showUserForm, setShowUserForm] = useState(false)
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('business')
  const [loading, setLoading] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'cashier' })
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [userToDelete, setUserToDelete] = useState(null)
  const [deletingUser, setDeletingUser] = useState(false)

  const [bLoading, setBLoading] = useState(true)
  const [bSaving, setBSaving] = useState(false)
  const [biz, setBiz] = useState({ business_name: '', address: '', phone: '', motto: '', logo: '', tin_number: '', bank_name: '', bank_account: '', bank_branch: '', business_type: 'general' })
  const [logoPreview, setLogoPreview] = useState('')
  const fileRef = useRef()
  const importRef = useRef()

  const loadBiz = () => {
    setBLoading(true)
    getBusinessSettings().then(res => {
      const s = res.data || {}
      setBiz({
        business_name: s.business_name || '', address: s.address || '', phone: s.phone || '', motto: s.motto || '', logo: s.logo || '',
        tin_number: s.tin_number || '', bank_name: s.bank_name || '', bank_account: s.bank_account || '', bank_branch: s.bank_branch || '',
        business_type: s.business_type || 'general'
      })
      setLogoPreview(s.logo || '')
    }).catch(() => toast.error('Failed to load')).finally(() => setBLoading(false))
  }

  const loadUsers = () => {
    setUsersLoading(true)
    API.get('/auth/users').then(r => setUsers(r.data)).catch(() => toast.error('Failed to load')).finally(() => setUsersLoading(false))
  }

  useEffect(() => { loadBiz() }, [])
  useEffect(() => { if (activeTab === 'users') loadUsers() }, [activeTab])

  const handleLogoUpload = (e) => {
    const file = e.target.files[0]; if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast.error('Logo max 2MB'); return }
    const reader = new FileReader()
    reader.onloadend = () => { setLogoPreview(reader.result); setBiz(b => ({ ...b, logo: reader.result })) }
    reader.readAsDataURL(file)
  }

  const handleSaveBiz = async () => {
    if (!biz.business_name.trim()) { toast.error('Business name is required'); return }
    setBSaving(true)
    try {
      await updateBusinessSettings(biz)
      localStorage.setItem('businessName', biz.business_name)
      localStorage.setItem('logoUrl', biz.logo)
      window.dispatchEvent(new Event('businessUpdated'))
      toast.success('✓ Settings saved!')
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save')
    } finally { setBSaving(false) }
  }

  const handleCreateUser = async (e) => {
    e.preventDefault(); setLoading(true)
    try { await register(newUser); toast.success('User created!'); setShowUserForm(false); setNewUser({ name: '', email: '', password: '', role: 'cashier' }); loadUsers()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed')
    } finally { setLoading(false) }
  }

  const handleDeleteUser = async () => {
    if (!userToDelete) return; setDeletingUser(true)
    try { await API.delete(`/auth/users/${userToDelete.id}`); toast.success(`${userToDelete.name} removed!`); setUserToDelete(null); loadUsers()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed')
    } finally { setDeletingUser(false) }
  }

  const handleClearAll = async () => {
    setShowConfirm(false); setClearing(true)
    try { await API.post('/admin/clear-all'); toast.success('All data cleared!')
    } catch (err) { toast.error(err.response?.data?.error || 'Failed')
    } finally { setClearing(false) }
  }

  const handleImport = (e) => {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      try { JSON.parse(reader.result); toast.success('✓ Data imported!') }
      catch { toast.error('Invalid JSON backup file') }
    }
    reader.readAsText(file); e.target.value = ''
  }


  const ConfirmModal = ({ title, msg, onConfirm, onCancel, confirmLabel }) => (
    <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={onCancel}>
      <div className="modal" style={{ maxWidth: '420px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
        <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--danger-soft)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
          <TriangleAlert size={22} strokeWidth={1.75} />
        </div>
        <h2 className="modal-title" style={{ marginBottom: '6px' }}>{title}</h2>
        <p className="modal-sub">{msg}</p>
        <div className="modal-actions" style={{ justifyContent: 'center' }}>
          <button className="btn" onClick={onCancel}>Cancel</button>
          <button className="btn-danger" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )

  const roleBadge = (role) => (
    <span className={`badge ${role === 'admin' ? 'badge-info' : 'badge-neutral'}`} style={{ textTransform: 'capitalize' }}>{role}</span>
  )

  const initials = biz.business_name ? biz.business_name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() : 'POS'
  const loadingRow = <div className="loading-row"><span className="spinner" /> Loading...</div>

  return (
    <div style={{ color: 'var(--text)' }}>
      <style>{`
        .set-layout { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 16px; align-items: start; max-width: 1100px; }
        .set-users { display: grid; grid-template-columns: 380px minmax(0, 1fr); gap: 16px; align-items: start; max-width: 1100px; }
        .set-side { position: sticky; top: 16px; }
        .type-opt { text-align: left; cursor: pointer; padding: 14px; border-radius: 8px; background: var(--surface-2); color: var(--text); border: 1.5px solid var(--border); }
        .type-opt:hover { border-color: var(--text-subtle); }
        .type-opt.active { border-color: var(--primary); background: var(--primary-soft); }
        @media (max-width: 1023px) { .set-layout, .set-users { grid-template-columns: minmax(0, 1fr); } .set-side { position: static; } }
      `}</style>

      {showConfirm && <ConfirmModal title="Clear All Data?" msg="This will delete sales, purchases, products and clients. This cannot be undone." onConfirm={handleClearAll} onCancel={() => setShowConfirm(false)} confirmLabel={clearing ? 'Clearing...' : 'Yes, Clear'} />}
      {userToDelete && <ConfirmModal title="Remove User?" msg={`Remove ${userToDelete.name}? They will no longer be able to log in.`} onConfirm={handleDeleteUser} onCancel={() => setUserToDelete(null)} confirmLabel={deletingUser ? 'Removing...' : 'Yes, Remove'} />}

      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Manage your POS system</p>
        </div>
      </div>

      <div className="tabs" role="tablist">
        {[['business', 'Business profile', Building2], ['users', 'Users', Users], ['theme', 'Theme', Palette], ['data', 'Data & backup', Database]].map(([tab, label, Icon]) => (
          <button key={tab} role="tab" aria-selected={activeTab === tab} className={`tab${activeTab === tab ? ' active' : ''}`} onClick={() => setActiveTab(tab)}>
            <Icon size={17} strokeWidth={1.75} /> {label}
          </button>
        ))}
      </div>

      {/* ── BUSINESS ── */}
      {activeTab === 'business' && (
        <div className="set-layout">
          <div>
            {bLoading ? loadingRow : (
              <>
                <div className="card">
                  <h3 className="card-title" style={{ fontSize: '15px', marginBottom: '2px' }}>Business type</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>Determines which optional fields and pages appear across the system</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px' }}>
                    {BUSINESS_TYPES.map(t => {
                      const Icon = t.icon
                      const active = biz.business_type === t.value
                      return (
                        <button key={t.value} type="button" className={`type-opt lift${active ? ' active' : ''}`} onClick={() => setBiz(b => ({ ...b, business_type: t.value }))} aria-pressed={active}>
                          <Icon size={22} strokeWidth={1.75} style={{ color: active ? 'var(--primary)' : 'var(--text-muted)', marginBottom: '8px' }} />
                          <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '2px' }}>{t.label}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>{t.desc}</div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="card">
                  <h3 className="card-title" style={{ fontSize: '15px', marginBottom: '14px' }}>Basic information</h3>
                  <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
                    {[['business_name', 'Business name *', 'PIUS HARDWARE'], ['address', 'Address', 'P.O.BOX 4629, MBEYA'], ['phone', 'Phone numbers', '0764067682 / 0759494763'], ['motto', 'Motto / tagline', 'BUILD WITH PIUS HARDWARE']].map(([f, l, p]) => (
                      <div className="form-group" key={f}><label className="form-label">{l}</label><input className="form-input" value={biz[f]} onChange={e => setBiz(b => ({ ...b, [f]: e.target.value }))} placeholder={p} /></div>
                    ))}
                  </div>
                </div>

                <div className="card">
                  <h3 className="card-title" style={{ fontSize: '15px', marginBottom: '2px' }}>TIN & bank details</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>Shown on official receipts (TRA)</p>
                  <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
                    <div className="form-group"><label className="form-label">TIN number</label><input className="form-input mono" value={biz.tin_number} onChange={e => setBiz(b => ({ ...b, tin_number: e.target.value }))} placeholder="123-456-789" /></div>
                    <div className="form-group"><label className="form-label">Bank name</label><input className="form-input" value={biz.bank_name} onChange={e => setBiz(b => ({ ...b, bank_name: e.target.value }))} placeholder="CRDB Bank" /></div>
                    <div className="form-group"><label className="form-label">Account number</label><input className="form-input mono" value={biz.bank_account} onChange={e => setBiz(b => ({ ...b, bank_account: e.target.value }))} placeholder="0150123456789" /></div>
                    <div className="form-group"><label className="form-label">Bank branch</label><input className="form-input" value={biz.bank_branch} onChange={e => setBiz(b => ({ ...b, bank_branch: e.target.value }))} placeholder="Mbeya Branch" /></div>
                  </div>
                </div>

                <button className="btn-primary btn-lg" onClick={handleSaveBiz} disabled={bSaving}>{bSaving ? 'Saving...' : 'Save all changes'}</button>
              </>
            )}
          </div>

          {/* Right — logo + preview */}
          <div className="set-side">
            <div className="card">
              <h3 className="card-title" style={{ fontSize: '15px', marginBottom: '14px' }}>Business logo</h3>
              <div style={{ marginBottom: '12px', padding: '20px', background: 'var(--surface-2)', borderRadius: '8px', minHeight: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border)' }}>
                {logoPreview
                  ? <img src={logoPreview} alt="Logo" style={{ maxHeight: '90px', maxWidth: '100%', objectFit: 'contain' }} />
                  : <div style={{ textAlign: 'center', color: 'var(--text-subtle)' }}><ImagePlus size={30} strokeWidth={1.5} /><p style={{ marginTop: '6px', fontSize: '13px' }}>No logo yet</p></div>}
              </div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <button className="btn btn-sm" onClick={() => fileRef.current.click()}>{logoPreview ? <><RefreshCcw size={14} strokeWidth={1.75} /> Change</> : <><Upload size={14} strokeWidth={1.75} /> Upload</>}</button>
                {logoPreview && <button className="btn btn-sm" style={{ color: 'var(--danger)' }} onClick={() => { setLogoPreview(''); setBiz(b => ({ ...b, logo: '' })) }}><Trash2 size={14} strokeWidth={1.75} /> Remove</button>}
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>PNG/JPG, max 2MB</p>
            </div>

            <div className="card" style={{ marginBottom: 0 }}>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>Sidebar preview</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '8px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '6px', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: logoPreview ? '#fff' : 'var(--primary)', border: logoPreview ? '1px solid var(--border)' : 'none' }}>
                  {logoPreview ? <img src={logoPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--on-primary)' }}>{initials}</span>}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: '14px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{biz.business_name || 'Business name'}</p>
                  {biz.motto && <p style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{biz.motto}</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── USERS ── */}
      {activeTab === 'users' && (
        <div style={{ maxWidth: '1100px' }}>
          <div className="table-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: '600' }}>Users</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{users.length} total · only admins can create users</span>
              </div>
              <button className="btn-primary" onClick={() => setShowUserForm(true)}><Plus size={16} strokeWidth={2} /> Create user</button>
            </div>
            {usersLoading ? loadingRow : (
              <div className="table-wrapper">
                <table className="data-table" style={{ minWidth: '460px' }}>
                  <thead><tr><th>User</th><th>Role</th><th style={{ width: '48px' }}></th></tr></thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '13px', flexShrink: 0 }}>{u.name?.charAt(0).toUpperCase()}</div>
                            <div>
                              <div style={{ fontWeight: '500' }}>{u.name} {u.id === user?.id && <span className="badge badge-neutral" style={{ marginLeft: '4px' }}>You</span>}</div>
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>{roleBadge(u.role)}</td>
                        <td>{u.id !== user?.id && <button className="icon-btn danger" onClick={() => setUserToDelete(u)} title="Remove user" aria-label={`Remove ${u.name}`}><Trash2 size={16} strokeWidth={1.75} /></button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <Modal open={showUserForm} onClose={() => setShowUserForm(false)} title="Create new user" subtitle="Choose a role that matches the person's job" size="md">
            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-light)', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.8' }}>
              <strong style={{ color: 'var(--text)' }}>Admin</strong> — Full access<br />
              <strong style={{ color: 'var(--text)' }}>Manager</strong> — Sales, Inventory, Clients, Reports<br />
              <strong style={{ color: 'var(--text)' }}>Cashier</strong> — Sales and Inventory only
            </div>
            <form onSubmit={handleCreateUser}>
              {[['name', 'text', 'Full name'], ['email', 'email', 'Email'], ['password', 'password', 'Password']].map(([f, t, l]) => (
                <div className="form-group" key={f}><label className="form-label">{l}</label><input className="form-input" type={t} value={newUser[f]} onChange={e => setNewUser({ ...newUser, [f]: e.target.value })} required placeholder={l} /></div>
              ))}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Role</label>
                <select className="form-input" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}><option value="cashier">Cashier</option><option value="manager">Manager</option><option value="admin">Admin</option></select>
              </div>
              <div className="modal-actions sticky">
                <button type="button" className="btn" onClick={() => setShowUserForm(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create user'}</button>
              </div>
            </form>
          </Modal>
        </div>
      )}

      {/* ── THEME ── */}
      {activeTab === 'theme' && (
        <div className="card" style={{ maxWidth: '680px' }}>
          <ThemeSettings />
        </div>
      )}

      {/* ── DATA ── */}
      {activeTab === 'data' && (
        <div style={{ maxWidth: '620px' }}>
          <div className="card">
            <h3 className="card-title" style={{ fontSize: '15px', marginBottom: '2px' }}>Export data</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>Download your data as a JSON backup</p>
            <button className="btn" onClick={() => { const b = new Blob([JSON.stringify({ exported: new Date().toISOString() })], { type: 'application/json' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = 'pos-backup-' + new Date().toISOString().slice(0, 10) + '.json'; a.click(); URL.revokeObjectURL(u); toast.success('Backup downloaded!') }}>
              <Download size={16} strokeWidth={1.75} /> Download backup
            </button>
          </div>

          <div className="card">
            <h3 className="card-title" style={{ fontSize: '15px', marginBottom: '2px' }}>Import data</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>Restore data from a JSON backup file</p>
            <label className="btn" style={{ cursor: 'pointer' }}>
              <FolderOpen size={16} strokeWidth={1.75} /> Choose backup file
              <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
            </label>
          </div>

          <div className="card" style={{ borderColor: 'var(--danger)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--danger-soft)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Trash2 size={20} strokeWidth={1.75} /></div>
              <div>
                <h3 className="card-title" style={{ fontSize: '15px', color: 'var(--danger)', marginBottom: '2px' }}>Clear all data</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '14px' }}>Deletes sales, purchases, products and clients. User accounts are kept.</p>
                <button className="btn-danger" onClick={() => setShowConfirm(true)} disabled={clearing}>{clearing ? 'Clearing...' : 'Clear all data'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Settings
