import { useState, useEffect } from 'react'
import { Users, TriangleAlert, Wallet, CreditCard, Search, Plus, Pencil, Trash2, X, Phone, Mail, MapPin, CalendarDays, HandCoins, PiggyBank } from 'lucide-react'
import {
  getClients, createClient, updateClient, deleteClient, searchClients,
  getClientProfile, getClientPayments, recordClientPayment, updateCreditLimit,
  getClientDeposits, addClientDeposit
} from '../services/api'
import toast from 'react-hot-toast'

const emptyForm = { name: '', phone: '', email: '', address: '', credit_limit: '' }
const emptyPayment = { amount: '', payment_method: 'cash', reference: '', notes: '' }
const emptyDeposit = { amount: '', payment_method: 'cash', reference: '', notes: '' }
const depositTypeLabel = { deposit_in: 'Deposit received', deposit_used: 'Used for sale', void_restore: 'Restored (sale voided)', adjustment: 'Adjustment' }
const fmtTZS = (v) => `TSh ${Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`

const Clients = () => {
  const [clients, setClients] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)

  // Profile / drawer state
  const [selectedClient, setSelectedClient] = useState(null)
  const [profile, setProfile] = useState(null)
  const [payments, setPayments] = useState([])
  const [activeTab, setActiveTab] = useState('info') // 'info' | 'payments' | 'history'
  const [loadingProfile, setLoadingProfile] = useState(false)

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentForm, setPaymentForm] = useState(emptyPayment)
  const [paymentLoading, setPaymentLoading] = useState(false)

  // Deposit (Amana) state
  const [deposits, setDeposits] = useState([])
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [depositForm, setDepositForm] = useState(emptyDeposit)
  const [depositLoading, setDepositLoading] = useState(false)

  // Credit limit edit
  const [editingCredit, setEditingCredit] = useState(false)
  const [newCreditLimit, setNewCreditLimit] = useState('')

  // ─── Fetch functions ───────────────────────────────────────

  const fetchClients = () => {
    getClients()
      .then(res => setClients(res.data))
      .catch(() => toast.error('Failed to load clients'))
  }

  useEffect(() => { fetchClients() }, [])

  const fetchProfile = async (id) => {
    setLoadingProfile(true)
    try {
      const [profileRes, paymentsRes, depositsRes] = await Promise.all([
        getClientProfile(id),
        getClientPayments(id),
        getClientDeposits(id)
      ])
      setProfile(profileRes.data)
      setPayments(paymentsRes.data.payments || [])
      setDeposits(depositsRes.data.transactions || [])
    } catch {
      toast.error('Failed to load profile')
    } finally {
      setLoadingProfile(false)
    }
  }

  // ─── Handlers ─────────────────────────────────────────────

  const handleSearch = async (e) => {
    const q = e.target.value
    setSearchQuery(q)
    if (q.length > 1) {
      const res = await searchClients(q)
      setClients(res.data)
    } else if (q.length === 0) {
      fetchClients()
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (editId) {
        await updateClient(editId, form)
        toast.success('✓ Client updated!')
      } else {
        await createClient(form)
        toast.success('✓ Client created!')
      }
      setForm(emptyForm)
      setEditId(null)
      setShowForm(false)
      fetchClients()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (client) => {
    setForm({
      name: client.name || '',
      phone: client.phone || '',
      email: client.email || '',
      address: client.address || '',
      credit_limit: client.credit_limit || ''
    })
    setEditId(client.id)
    setShowForm(true)
    setSelectedClient(null)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this client?')) return
    try {
      await deleteClient(id)
      toast.success('✓ Client deleted!')
      fetchClients()
      if (selectedClient?.id === id) setSelectedClient(null)
    } catch {
      toast.error('Failed to delete')
    }
  }

  const handleViewProfile = (client) => {
    setSelectedClient(client)
    setActiveTab('info')
    setProfile(null)
    setPayments([])
    setDeposits([])
    fetchProfile(client.id)
  }

  const handleRecordPayment = async (e) => {
    e.preventDefault()
    setPaymentLoading(true)
    try {
      await recordClientPayment(selectedClient.id, paymentForm)
      toast.success('✓ Payment recorded!')
      setShowPaymentModal(false)
      setPaymentForm(emptyPayment)
      fetchProfile(selectedClient.id)
      fetchClients()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to record payment')
    } finally {
      setPaymentLoading(false)
    }
  }

  const handleAddDeposit = async (e) => {
    e.preventDefault()
    setDepositLoading(true)
    try {
      await addClientDeposit({ client_id: selectedClient.id, ...depositForm })
      toast.success('✓ Deposit recorded!')
      setShowDepositModal(false)
      setDepositForm(emptyDeposit)
      fetchProfile(selectedClient.id)
      fetchClients()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to record deposit')
    } finally {
      setDepositLoading(false)
    }
  }

  const handleUpdateCreditLimit = async () => {
    if (!newCreditLimit || isNaN(newCreditLimit)) {
      toast.error('Enter a valid credit limit')
      return
    }
    try {
      await updateCreditLimit(selectedClient.id, { credit_limit: Number(newCreditLimit) })
      toast.success('✓ Credit limit updated!')
      setEditingCredit(false)
      fetchProfile(selectedClient.id)
      fetchClients()
    } catch {
      toast.error('Failed to update credit limit')
    }
  }

  // ── Muhtasari (unahesabiwa kutoka list iliyopo) ──
  const owing = clients.filter(c => Number(c.balance) > 0)
  const totalOwed = owing.reduce((s, c) => s + Number(c.balance), 0)
  const totalCreditGiven = clients.reduce((s, c) => s + Number(c.credit_limit || 0), 0)
  const totalDepositsHeld = clients.reduce((s, c) => s + Number(c.deposit || 0), 0)
  const dash = <span style={{ color: 'var(--text-subtle)' }}>—</span>

  const closeForm = () => { setShowForm(false); setEditId(null); setForm(emptyForm) }

  const InfoRow = ({ icon: Icon, label, value }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid var(--border-light)' }}>
      <Icon size={17} strokeWidth={1.75} style={{ color: 'var(--text-subtle)', flexShrink: 0 }} />
      <span style={{ fontSize: '13px', color: 'var(--text-muted)', flex: 1 }}>{label}</span>
      <span style={{ fontSize: '14px', fontWeight: '500', textAlign: 'right' }}>{value}</span>
    </div>
  )

  return (
    <div style={{ color: 'var(--text)' }}>
      <div className="page-header">
        <div>
          <h1>Clients</h1>
          <p>Manage all your customers — {clients.length} clients</p>
        </div>
        <button className="btn-primary" onClick={() => { setShowForm(true); setForm(emptyForm); setEditId(null) }}>
          <Plus size={16} strokeWidth={2} /> New client
        </button>
      </div>

      <div className="stats-row">
        <div className="stat"><Users className="stat-icon" aria-hidden="true" /><p className="stat-label">All customers</p><p className="stat-value">{clients.length.toLocaleString()}</p></div>
        <div className="stat"><TriangleAlert className="stat-icon" aria-hidden="true" /><p className="stat-label">With balance</p><p className="stat-value" style={{ color: owing.length > 0 ? 'var(--warning)' : undefined }}>{owing.length.toLocaleString()}</p></div>
        <div className="stat"><Wallet className="stat-icon" aria-hidden="true" /><p className="stat-label">Total owed</p><p className="stat-value" style={{ color: totalOwed > 0 ? 'var(--danger)' : undefined }}>{fmtTZS(totalOwed)}</p></div>
        <div className="stat"><CreditCard className="stat-icon" aria-hidden="true" /><p className="stat-label">Total credit limit</p><p className="stat-value">{fmtTZS(totalCreditGiven)}</p></div>
        <div className="stat"><PiggyBank className="stat-icon" aria-hidden="true" /><p className="stat-label">Deposits held</p><p className="stat-value" style={{ color: totalDepositsHeld > 0 ? 'var(--success)' : undefined }}>{fmtTZS(totalDepositsHeld)}</p></div>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', maxWidth: '420px', marginBottom: '16px' }}>
        <Search size={16} strokeWidth={1.75} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)', pointerEvents: 'none' }} />
        <input className="form-input" style={{ paddingLeft: '36px' }} type="text" placeholder="Search by name or phone..." value={searchQuery} onChange={handleSearch} />
      </div>

      {/* Client list */}
      <div className="table-card">
        <div className="table-wrapper">
          <table className="data-table" style={{ minWidth: '720px' }}>
            <thead>
              <tr><th>Name</th><th>Phone</th><th className="num">Balance owed</th><th className="num">Deposit</th><th className="num">Credit limit</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
            </thead>
            <tbody>
              {clients.length === 0 && <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-subtle)' }}>No clients yet.</td></tr>}
              {clients.map(client => (
                <tr key={client.id} onClick={() => handleViewProfile(client)} style={{ cursor: 'pointer', background: selectedClient?.id === client.id ? 'var(--primary-soft)' : undefined }}>
                  <td>
                    <div style={{ fontWeight: '600' }}>{client.name}</div>
                    {client.email && <div style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>{client.email}</div>}
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{client.phone || '—'}</td>
                  <td className="num mono">{Number(client.balance) > 0 ? <span style={{ color: 'var(--danger)', fontWeight: '600' }}>{fmtTZS(client.balance)}</span> : dash}</td>
                  <td className="num mono">{Number(client.deposit) > 0 ? <span style={{ color: 'var(--success)', fontWeight: '600' }}>{fmtTZS(client.deposit)}</span> : dash}</td>
                  <td className="num mono" style={{ color: 'var(--text-muted)' }}>{Number(client.credit_limit) > 0 ? fmtTZS(client.credit_limit) : dash}</td>
                  <td><span className={`badge ${client.status === 'active' ? 'badge-success' : 'badge-danger'}`}>{client.status === 'active' ? 'Active' : 'Inactive'}</span></td>
                  <td onClick={e => e.stopPropagation()}>
                    <div className="actions">
                      <button className="icon-btn" onClick={() => handleEdit(client)} title="Edit" aria-label={`Edit ${client.name}`}><Pencil size={16} strokeWidth={1.75} /></button>
                      <button className="icon-btn danger" onClick={() => handleDelete(client.id)} title="Delete" aria-label={`Delete ${client.name}`}><Trash2 size={16} strokeWidth={1.75} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═════════ Profile drawer ═════════ */}
      {selectedClient && (
        <>
          <div className="drawer-scrim" onClick={() => setSelectedClient(null)} />
          <aside className="drawer" aria-label={`Profile of ${selectedClient.name}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '20px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary)', color: 'var(--on-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '600', flexShrink: 0 }}>
                {selectedClient.name?.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{ fontSize: '17px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedClient.name}</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{selectedClient.phone || 'No phone'}</p>
              </div>
              <button className="icon-btn" onClick={() => setSelectedClient(null)} aria-label="Close"><X size={18} strokeWidth={1.75} /></button>
            </div>

            {loadingProfile ? (
              <p style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</p>
            ) : profile ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '20px' }}>
                  <div className="stat" style={{ padding: '12px 14px', gridColumn: '1 / -1' }}>
                    <p className="stat-label">Deposit balance (Amana)</p>
                    <p className="stat-value" style={{ fontSize: '17px', color: Number(profile.deposit) > 0 ? 'var(--success)' : undefined }}>{fmtTZS(profile.deposit)}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Money held for this client. It counts as revenue only when used to pay for a sale.</p>
                  </div>
                  <div className="stat" style={{ padding: '12px 14px' }}>
                    <p className="stat-label">Balance owed</p>
                    <p className="stat-value" style={{ fontSize: '17px', color: Number(profile.balance) > 0 ? 'var(--danger)' : undefined }}>{fmtTZS(profile.balance)}</p>
                  </div>
                  <div className="stat" style={{ padding: '12px 14px' }}>
                    <p className="stat-label">Available credit</p>
                    <p className="stat-value" style={{ fontSize: '17px', color: 'var(--success)' }}>{fmtTZS(profile.available_credit)}</p>
                  </div>
                  <div className="stat" style={{ padding: '12px 14px' }}>
                    <p className="stat-label">Total sales</p>
                    <p className="stat-value" style={{ fontSize: '17px' }}>{profile.total_sales}</p>
                  </div>
                  <div className="stat" style={{ padding: '12px 14px' }}>
                    <p className="stat-label">Total purchased</p>
                    <p className="stat-value" style={{ fontSize: '17px' }}>{fmtTZS(profile.total_purchased)}</p>
                  </div>
                </div>

                <div style={{ padding: '0 20px 16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button className="btn-primary btn-lg" style={{ flex: 1 }} onClick={() => { setShowDepositModal(true); setDepositForm(emptyDeposit) }}>
                    <PiggyBank size={18} strokeWidth={1.75} /> Add deposit
                  </button>
                  {Number(profile.balance) > 0 && (
                    <button className="btn-primary btn-lg" style={{ flex: 1 }} onClick={() => { setShowPaymentModal(true); setPaymentForm(emptyPayment) }}>
                      <HandCoins size={18} strokeWidth={1.75} /> Record payment
                    </button>
                  )}
                </div>

                {/* Credit limit */}
                <div style={{ padding: '0 20px 16px' }}>
                  <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Credit limit</p>
                        <p className="mono" style={{ fontSize: '17px', fontWeight: '600' }}>{fmtTZS(profile.credit_limit)}</p>
                      </div>
                      <button className="btn btn-sm" onClick={() => { setEditingCredit(!editingCredit); setNewCreditLimit(profile.credit_limit) }}>
                        {editingCredit ? 'Cancel' : <><Pencil size={14} strokeWidth={1.75} /> Edit</>}
                      </button>
                    </div>
                    {editingCredit && (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        <input className="form-input mono" type="number" value={newCreditLimit} onChange={e => setNewCreditLimit(e.target.value)} placeholder="Enter new limit" min="0" />
                        <button className="btn-primary" onClick={handleUpdateCreditLimit}>Save</button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tabs */}
                <div className="tabs" style={{ padding: '0 20px', marginBottom: 0 }}>
                  {[['info', 'Info'], ['deposits', 'Deposits'], ['payments', 'Payments'], ['history', 'Purchases']].map(([tab, label]) => (
                    <button key={tab} className={`tab${activeTab === tab ? ' active' : ''}`} onClick={() => setActiveTab(tab)}>{label}</button>
                  ))}
                </div>

                <div style={{ padding: '8px 20px 24px' }}>
                  {activeTab === 'info' && (
                    <div>
                      <InfoRow icon={Phone} label="Phone" value={profile.phone || '—'} />
                      <InfoRow icon={Mail} label="Email" value={profile.email || '—'} />
                      <InfoRow icon={MapPin} label="Address" value={profile.address || '—'} />
                      <InfoRow icon={CalendarDays} label="Added on" value={new Date(profile.created_at).toLocaleDateString('en-GB')} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Status</span>
                        <span className={`badge ${profile.status === 'active' ? 'badge-success' : 'badge-danger'}`}>{profile.status === 'active' ? 'Active' : 'Inactive'}</span>
                      </div>
                    </div>
                  )}

                  {activeTab === 'deposits' && (
                    deposits.length === 0 ? (
                      <p style={{ textAlign: 'center', padding: '32px 0', fontSize: '13px', color: 'var(--text-subtle)' }}>No deposit activity yet.</p>
                    ) : (
                      <div>
                        {deposits.map(tx => (
                          <div key={tx.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border-light)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                              <span className="mono" style={{ fontWeight: '600', color: Number(tx.amount) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                {Number(tx.amount) >= 0 ? '+' : '−'}{fmtTZS(Math.abs(Number(tx.amount)))}
                              </span>
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(tx.created_at).toLocaleDateString('en-GB')}</span>
                            </div>
                            <div style={{ fontSize: '13px' }}>
                              {depositTypeLabel[tx.type] || tx.type}{tx.sale_id ? ` #${tx.sale_id}` : ''}
                              <span className="mono" style={{ color: 'var(--text-muted)' }}> · balance {fmtTZS(tx.balance_after)}</span>
                            </div>
                            {(tx.payment_method || tx.reference) && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{[tx.payment_method, tx.reference && `Ref: ${tx.reference}`].filter(Boolean).join(' · ')}</div>}
                            {tx.recorded_by_name && <div style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>Recorded by: {tx.recorded_by_name}</div>}
                          </div>
                        ))}
                      </div>
                    )
                  )}

                  {activeTab === 'payments' && (
                    payments.length === 0 ? (
                      <p style={{ textAlign: 'center', padding: '32px 0', fontSize: '13px', color: 'var(--text-subtle)' }}>No payments yet.</p>
                    ) : (
                      <div>
                        {payments.map(p => (
                          <div key={p.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border-light)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                              <span className="mono" style={{ fontWeight: '600', color: 'var(--success)' }}>{fmtTZS(p.amount)}</span>
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(p.created_at).toLocaleDateString('en-GB')}</span>
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{p.payment_method}{p.reference && ` · Ref: ${p.reference}`}</div>
                            {p.recorded_by_name && <div style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>Recorded by: {p.recorded_by_name}</div>}
                          </div>
                        ))}
                      </div>
                    )
                  )}

                  {activeTab === 'history' && (
                    <p style={{ textAlign: 'center', padding: '32px 0', fontSize: '13px', color: 'var(--text-subtle)' }}>Visit the Sales page for the full history.</p>
                  )}
                </div>
              </>
            ) : null}
          </aside>
        </>
      )}

      {/* ═════════ Add deposit modal ═════════ */}
      {showDepositModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setShowDepositModal(false)}>
          <div className="modal" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Add deposit (Amana)</h3>
            <p className="modal-sub" style={{ marginBottom: '20px' }}>
              {selectedClient?.name} — current deposit {fmtTZS(profile?.deposit)}. This money is held for the client and counts as revenue only when it is used to pay for a sale.
            </p>
            <form onSubmit={handleAddDeposit}>
              <div className="form-group"><label className="form-label">Amount (TSh)</label>
                <input className="form-input mono" type="number" value={depositForm.amount} onChange={e => setDepositForm({ ...depositForm, amount: e.target.value })} placeholder="eg. 100000" required min="1" /></div>
              <div className="form-group"><label className="form-label">Payment method</label>
                <select className="form-input" value={depositForm.payment_method} onChange={e => setDepositForm({ ...depositForm, payment_method: e.target.value })}>
                  <option value="cash">Cash</option><option value="mobile_money">Mobile Money</option><option value="bank_transfer">Bank Transfer</option>
                </select></div>
              <div className="form-group"><label className="form-label">Reference (optional)</label>
                <input className="form-input" type="text" value={depositForm.reference} onChange={e => setDepositForm({ ...depositForm, reference: e.target.value })} placeholder="eg. MPE123456" /></div>
              <div className="form-group"><label className="form-label">Notes (optional)</label>
                <input className="form-input" type="text" value={depositForm.notes} onChange={e => setDepositForm({ ...depositForm, notes: e.target.value })} placeholder="e.g. Advance for roofing materials" /></div>
              <div className="modal-actions">
                <button type="button" className="btn" onClick={() => setShowDepositModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={depositLoading}>{depositLoading ? 'Saving...' : 'Add deposit'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════ Add / Edit client modal ═════════ */}
      {showForm && (
        <div className="modal-overlay" onClick={closeForm}>
          <div className="modal" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <h3 className="modal-title" style={{ marginBottom: '20px' }}>{editId ? 'Edit client' : 'New client'}</h3>
            <form onSubmit={handleSubmit}>
              {[
                { key: 'name', label: 'Full name *', required: true },
                { key: 'phone', label: 'Phone number' },
                { key: 'email', label: 'Email' },
                { key: 'address', label: 'Address' },
                { key: 'credit_limit', label: 'Credit limit (TSh)' },
              ].map(({ key, label, required }) => (
                <div className="form-group" key={key}>
                  <label className="form-label">{label}</label>
                  <input className={`form-input${key === 'credit_limit' ? ' mono' : ''}`} type={key === 'credit_limit' ? 'number' : 'text'} value={form[key]}
                    onChange={e => setForm({ ...form, [key]: e.target.value })} required={required} min={key === 'credit_limit' ? '0' : undefined} />
                </div>
              ))}
              <div className="modal-actions">
                <button type="button" className="btn" onClick={closeForm}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Saving...' : editId ? 'Save changes' : 'Create client'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════ Record payment modal ═════════ */}
      {showPaymentModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setShowPaymentModal(false)}>
          <div className="modal" style={{ maxWidth: '460px' }} onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Record payment</h3>
            <p className="modal-sub" style={{ marginBottom: '20px' }}>
              Client: <strong>{selectedClient?.name}</strong> · Balance owed: <strong style={{ color: 'var(--danger)' }}>{fmtTZS(profile?.balance)}</strong>
            </p>
            <form onSubmit={handleRecordPayment}>
              <div className="form-group"><label className="form-label">Amount (TSh) *</label>
                <input className="form-input mono" type="number" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} placeholder="eg. 50000" required min="1" max={profile?.balance} /></div>
              <div className="form-group"><label className="form-label">Payment method</label>
                <select className="form-input" value={paymentForm.payment_method} onChange={e => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}>
                  <option value="cash">Cash</option><option value="bank_transfer">Bank Transfer</option><option value="mobile_money">Mobile Money (M-Pesa/Tigo)</option>
                </select></div>
              <div className="form-group"><label className="form-label">Reference / receipt number</label>
                <input className="form-input" type="text" value={paymentForm.reference} onChange={e => setPaymentForm({ ...paymentForm, reference: e.target.value })} placeholder="eg. MPE123456" /></div>
              <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Notes (optional)</label>
                <input className="form-input" type="text" value={paymentForm.notes} onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })} placeholder="e.g. Payment for last week's credit" /></div>
              <div className="modal-actions">
                <button type="button" className="btn" onClick={() => setShowPaymentModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={paymentLoading}>{paymentLoading ? 'Saving...' : 'Record payment'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Clients
