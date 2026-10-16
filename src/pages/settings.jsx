import { useState, useRef, useEffect } from 'react'
import { Building2, Users, Palette, Database, Store, Wrench, Pill, TriangleAlert, Trash2, Upload, Download, FolderOpen, ImagePlus, RefreshCcw, Plus, KeyRound } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  register, getBusinessSettings, updateBusinessSettings, getUsers, getRoles,
  createRole, updateRole, deleteRole, updateUserRole, deleteUser, resetUserPassword
} from '../services/api'
import { PERMISSION_MODULES } from '../services/permissions'
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
  const [userToResetPassword, setUserToResetPassword] = useState(null)
  const [temporaryPassword, setTemporaryPassword] = useState('')
  const [resettingPassword, setResettingPassword] = useState(false)
  const [deletingUser, setDeletingUser] = useState(false)
  const [roles, setRoles] = useState([])
  const [rolesLoading, setRolesLoading] = useState(false)
  const [showRoles, setShowRoles] = useState(false)
  const [showRoleEditor, setShowRoleEditor] = useState(false)
  const [editingRole, setEditingRole] = useState(null)
  const [roleDraft, setRoleDraft] = useState({ name: '', permissions: {} })
  const [savingRole, setSavingRole] = useState(false)
  const [changingRoleUser, setChangingRoleUser] = useState(null)

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
    getUsers().then(r => setUsers(r.data)).catch(() => toast.error('Failed to load')).finally(() => setUsersLoading(false))
  }

  const loadRoles = () => {
    setRolesLoading(true)
    getRoles().then(r => setRoles(r.data)).catch(() => toast.error('Failed to load roles')).finally(() => setRolesLoading(false))
  }

  useEffect(() => { loadBiz() }, [])
  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers()
      loadRoles()
    }
  }, [activeTab])

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
      const editableSettings = { ...biz }
      delete editableSettings.business_type
      await updateBusinessSettings(editableSettings)
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
    try { await deleteUser(userToDelete.id); toast.success(`${userToDelete.name} removed!`); setUserToDelete(null); loadUsers()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed')
    } finally { setDeletingUser(false) }
  }

  const handleResetUserPassword = async (event) => {
    event.preventDefault()
    if (!userToResetPassword) return
    setResettingPassword(true)
    try {
      await resetUserPassword(userToResetPassword.id, temporaryPassword)
      toast.success('Temporary password set. The user must change it at next login.')
      setUserToResetPassword(null)
      setTemporaryPassword('')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password')
    } finally {
      setResettingPassword(false)
    }
  }

  const openRoleEditor = (role = null) => {
    setEditingRole(role)
    setRoleDraft({ name: role?.name || '', permissions: role?.permissions || {} })
    setShowRoleEditor(true)
  }

  const setAllPermissions = (enabled) => {
    setRoleDraft(current => ({
      ...current,
      permissions: enabled
        ? Object.fromEntries(PERMISSION_MODULES.map(module => [module.id, module.actions]))
        : {}
    }))
  }

  const togglePermission = (moduleId, action, enabled) => {
    setRoleDraft(current => {
      const selected = new Set(current.permissions[moduleId] || [])
      if (enabled) {
        selected.add(action)
        if (action !== 'view') selected.add('view')
      } else if (action === 'view') {
        selected.clear()
      } else {
        selected.delete(action)
      }
      const permissions = { ...current.permissions }
      if (selected.size) permissions[moduleId] = [...selected]
      else delete permissions[moduleId]
      return { ...current, permissions }
    })
  }

  const handleSaveRole = async (e) => {
    e.preventDefault()
    setSavingRole(true)
    try {
      if (editingRole) {
        await updateRole(editingRole.name, roleDraft.permissions)
        toast.success('Role permissions saved')
      } else {
        await createRole(roleDraft)
        toast.success('Role created')
      }
      setEditingRole(null)
      setRoleDraft({ name: '', permissions: {} })
      setShowRoleEditor(false)
      loadRoles()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save role')
    } finally {
      setSavingRole(false)
    }
  }

  const handleDeleteRole = async (role) => {
    if (!window.confirm(`Delete the "${role.name}" role?`)) return
    try {
      await deleteRole(role.name)
      toast.success('Role deleted')
      loadRoles()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete role')
    }
  }

  const handleChangeUserRole = async (target, role) => {
    setChangingRoleUser(target.id)
    try {
      await updateUserRole(target.id, role)
      setUsers(current => current.map(u => u.id === target.id ? { ...u, role } : u))
      toast.success(`${target.name}'s role updated`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update user role')
      loadUsers()
    } finally {
      setChangingRoleUser(null)
    }
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
                  {(() => {
                    const selectedType = BUSINESS_TYPES.find(type => type.value === biz.business_type) || BUSINESS_TYPES[0]
                    const Icon = selectedType.icon
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Icon size={22} strokeWidth={1.75} style={{ color: 'var(--primary)' }} />
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '14px' }}>{selectedType.label}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                            {selectedType.desc}. This is set by Multivex Labs and cannot be changed here.
                          </div>
                        </div>
                      </div>
                    )
                  })()}
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
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{users.length} total · assign reusable access roles</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button className="btn" onClick={() => setShowRoles(true)}><Users size={16} /> Manage roles</button>
                <button className="btn-primary" onClick={() => setShowUserForm(true)}><Plus size={16} strokeWidth={2} /> Create user</button>
              </div>
            </div>
            {usersLoading ? loadingRow : (
              <div className="table-wrapper">
                <table className="data-table" style={{ minWidth: '560px' }}>
                  <thead><tr><th>User</th><th>Assigned role</th><th style={{ width: '88px' }}>Actions</th></tr></thead>
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
                        <td>{u.role === 'admin'
                          ? <>{roleBadge(u.role)} <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Full access</span></>
                          : <select
                              className="form-input"
                              style={{ minWidth: '150px', maxWidth: '220px' }}
                              value={u.role}
                              disabled={changingRoleUser === u.id || u.id === user?.id}
                              onChange={e => handleChangeUserRole(u, e.target.value)}
                              aria-label={`Role for ${u.name}`}
                            >
                              {roles.filter(role => role.name !== 'admin').map(role => <option key={role.name} value={role.name}>{role.name}</option>)}
                            </select>}</td>
                        <td>
                          {u.id !== user?.id && <div className="actions">
                            <button className="icon-btn" onClick={() => { setUserToResetPassword(u); setTemporaryPassword('') }} title="Set temporary password" aria-label={`Reset password for ${u.name}`}><KeyRound size={16} strokeWidth={1.75} /></button>
                            <button className="icon-btn danger" onClick={() => setUserToDelete(u)} title="Remove user" aria-label={`Remove ${u.name}`}><Trash2 size={16} strokeWidth={1.75} /></button>
                          </div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <Modal open={showUserForm} onClose={() => setShowUserForm(false)} title="Create new user" subtitle="Choose the role that matches this person's duties" size="md">
            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-light)', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.8' }}>
              Roles can be shared by multiple users. Create or edit reusable roles with Manage roles. Admin accounts are reserved and cannot be assigned here. The new user must change this temporary password on their first login.
            </div>
            <form onSubmit={handleCreateUser}>
              {[['name', 'text', 'Full name'], ['email', 'email', 'Email'], ['password', 'password', 'Temporary password']].map(([f, t, l]) => (
                <div className="form-group" key={f}><label className="form-label">{l}</label><input className="form-input" type={t} minLength={t === 'password' ? 8 : undefined} maxLength={t === 'password' ? 128 : undefined} value={newUser[f]} onChange={e => setNewUser({ ...newUser, [f]: e.target.value })} required placeholder={l} /></div>
              ))}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Role</label>
                <select className="form-input" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })} required>
                  {roles.filter(role => role.name !== 'admin').map(role => <option key={role.name} value={role.name}>{role.name}</option>)}
                </select>
              </div>
              <div className="modal-actions sticky">
                <button type="button" className="btn" onClick={() => setShowUserForm(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create user'}</button>
              </div>
            </form>
          </Modal>

          <Modal open={Boolean(userToResetPassword)} onClose={() => setUserToResetPassword(null)} title={`Set temporary password${userToResetPassword ? ` — ${userToResetPassword.name}` : ''}`} subtitle="Share it securely. The user will be required to change it after signing in." size="md">
            <form onSubmit={handleResetUserPassword} style={{ padding: '16px 20px 20px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="temporary-user-password">Temporary password</label>
                <input
                  id="temporary-user-password"
                  className="form-input"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                  value={temporaryPassword}
                  onChange={event => setTemporaryPassword(event.target.value)}
                  required
                />
                <p className="form-hint">Use at least 8 characters.</p>
              </div>
              <div className="modal-actions sticky">
                <button type="button" className="btn" onClick={() => setUserToResetPassword(null)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={resettingPassword}>
                  {resettingPassword ? 'Saving...' : 'Set temporary password'}
                </button>
              </div>
            </form>
          </Modal>

          <Modal open={showRoles} onClose={() => setShowRoles(false)} title="Manage roles" subtitle="Create shared permission sets and assign them to multiple users." size="lg">
            <div style={{ padding: '16px 20px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Admin is a reserved account role with full access. Other system roles can be customized.</p>
                <button className="btn-primary" onClick={() => openRoleEditor()}><Plus size={16} /> Add role</button>
              </div>
              {rolesLoading ? loadingRow : (
                <div className="table-wrapper">
                  <table className="data-table" style={{ minWidth: '520px' }}>
                    <thead><tr><th>Role</th><th>Users</th><th>Permissions</th><th>Actions</th></tr></thead>
                    <tbody>
                      {roles.filter(role => role.name !== 'admin').map(role => {
                        const assigned = users.filter(u => u.role === role.name).length
                        const permissionCount = Object.values(role.permissions || {}).reduce((total, actions) => total + actions.length, 0)
                        return (
                          <tr key={role.name}>
                            <td style={{ fontWeight: '500' }}>{role.name}{role.system && <span className="badge badge-neutral" style={{ marginLeft: '6px' }}>Built-in</span>}</td>
                            <td>{assigned}</td>
                            <td>{permissionCount}</td>
                            <td>
                              <div className="actions">
                                {role.name !== 'admin' && <>
                                  <button className="btn btn-sm" onClick={() => openRoleEditor(role)}>Edit permissions</button>
                                  {!role.system && <button className="icon-btn danger" onClick={() => handleDeleteRole(role)} disabled={assigned > 0} title={assigned ? 'Reassign all users before deleting' : 'Delete role'} aria-label={`Delete ${role.name}`}><Trash2 size={16} /></button>}
                                </>}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Modal>

          <Modal
            open={showRoleEditor}
            onClose={() => { setShowRoleEditor(false); setEditingRole(null); setRoleDraft({ name: '', permissions: {} }) }}
            title={editingRole ? `Edit role — ${editingRole.name}` : 'Create role'}
            subtitle="Permissions affect access only; they do not turn POS features on or off."
            size="xl"
          >
            <form onSubmit={handleSaveRole} style={{ padding: '16px 20px 20px' }}>
              {!editingRole && (
                <div className="form-group">
                  <label className="form-label" htmlFor="new-role-name">Role name</label>
                  <input id="new-role-name" className="form-input" value={roleDraft.name} onChange={e => setRoleDraft(current => ({ ...current, name: e.target.value }))} placeholder="e.g. Storekeeper" minLength={2} maxLength={40} required />
                </div>
              )}
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '14px', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={PERMISSION_MODULES.every(module => module.actions.every(action => roleDraft.permissions[module.id]?.includes(action)))}
                  onChange={e => setAllPermissions(e.target.checked)}
                />
                Select all available permissions
              </label>
              <div className="table-wrapper">
                <table className="data-table" style={{ minWidth: '560px' }}>
                  <thead><tr><th>Page</th><th>View</th><th>Create</th><th>Edit</th><th>Delete</th></tr></thead>
                  <tbody>
                    {PERMISSION_MODULES.map(module => (
                      <tr key={module.id}>
                        <td style={{ fontWeight: '500' }}>{module.label}</td>
                        {['view', 'create', 'edit', 'delete'].map(action => {
                          const supported = module.actions.includes(action)
                          const checked = roleDraft.permissions[module.id]?.includes(action) || false
                          return (
                            <td key={action} style={{ textAlign: 'center' }}>
                              {supported && <input
                                type="checkbox"
                                checked={checked}
                                disabled={action !== 'view' && !roleDraft.permissions[module.id]?.includes('view')}
                                aria-label={`${module.label}: ${action}`}
                                onChange={e => togglePermission(module.id, action, e.target.checked)}
                              />}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="modal-actions sticky">
                <button type="button" className="btn" onClick={() => { setShowRoleEditor(false); setEditingRole(null); setRoleDraft({ name: '', permissions: {} }) }}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={savingRole}>{savingRole ? 'Saving...' : editingRole ? 'Save role' : 'Create role'}</button>
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
