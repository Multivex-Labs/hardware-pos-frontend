import { useState, useEffect } from 'react'
import {
  getClients, createClient, updateClient, deleteClient, searchClients,
  getClientProfile, getClientPayments, recordClientPayment, updateCreditLimit
} from '../services/api'
import toast from 'react-hot-toast'

const emptyForm = { name: '', phone: '', email: '', address: '', credit_limit: '' }
const emptyPayment = { amount: '', payment_method: 'cash', reference: '', notes: '' }

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

  // Credit limit edit
  const [editingCredit, setEditingCredit] = useState(false)
  const [newCreditLimit, setNewCreditLimit] = useState('')

  // ─── Fetch functions ───────────────────────────────────────

  const fetchClients = () => {
    getClients()
      .then(res => setClients(res.data))
      .catch(() => toast.error('Imeshindwa kupata clients'))
  }

  useEffect(() => { fetchClients() }, [])

  const fetchProfile = async (id) => {
    setLoadingProfile(true)
    try {
      const [profileRes, paymentsRes] = await Promise.all([
        getClientProfile(id),
        getClientPayments(id)
      ])
      setProfile(profileRes.data)
      setPayments(paymentsRes.data.payments || [])
    } catch {
      toast.error('Imeshindwa kupata profile')
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
        toast.success('✓ Client imebadilishwa!')
      } else {
        await createClient(form)
        toast.success('✓ Client ameundwa!')
      }
      setForm(emptyForm)
      setEditId(null)
      setShowForm(false)
      fetchClients()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Imeshindwa')
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
    if (!window.confirm('Una uhakika kufuta client huyu?')) return
    try {
      await deleteClient(id)
      toast.success('✓ Client amefutwa!')
      fetchClients()
      if (selectedClient?.id === id) setSelectedClient(null)
    } catch {
      toast.error('Imeshindwa kufuta')
    }
  }

  const handleViewProfile = (client) => {
    setSelectedClient(client)
    setActiveTab('info')
    setProfile(null)
    setPayments([])
    fetchProfile(client.id)
  }

  const handleRecordPayment = async (e) => {
    e.preventDefault()
    setPaymentLoading(true)
    try {
      await recordClientPayment(selectedClient.id, paymentForm)
      toast.success('✓ Malipo yamerekodiwa!')
      setShowPaymentModal(false)
      setPaymentForm(emptyPayment)
      fetchProfile(selectedClient.id)
      fetchClients()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Imeshindwa kurekodi malipo')
    } finally {
      setPaymentLoading(false)
    }
  }

  const handleUpdateCreditLimit = async () => {
    if (!newCreditLimit || isNaN(newCreditLimit)) {
      toast.error('Weka credit limit sahihi')
      return
    }
    try {
      await updateCreditLimit(selectedClient.id, { credit_limit: Number(newCreditLimit) })
      toast.success('✓ Credit limit imebadilishwa!')
      setEditingCredit(false)
      fetchProfile(selectedClient.id)
      fetchClients()
    } catch {
      toast.error('Imeshindwa kubadilisha credit limit')
    }
  }

  // ─── Styles ───────────────────────────────────────────────

  const s = {
    page: { display: 'flex', gap: '24px', height: 'calc(100vh - 100px)' },
    left: { flex: selectedClient ? '1' : '1', minWidth: 0 },
    right: {
      width: selectedClient ? '420px' : '0',
      minWidth: selectedClient ? '420px' : '0',
      overflow: 'hidden',
      transition: 'all 0.3s ease'
    },
    card: { background: 'white', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'hidden' },
    btn: (grad) => ({
      padding: '10px 20px', background: grad, color: 'white', border: 'none',
      borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '13px'
    }),
    input: {
      width: '100%', padding: '11px 14px', border: '2px solid #e5e7eb',
      borderRadius: '10px', boxSizing: 'border-box', fontSize: '14px', fontWeight: '500'
    },
    tab: (active) => ({
      padding: '10px 20px', border: 'none', cursor: 'pointer', fontWeight: '600',
      fontSize: '13px', borderBottom: active ? '3px solid #667eea' : '3px solid transparent',
      background: 'none', color: active ? '#667eea' : '#888'
    }),
    statBox: (color) => ({
      background: color, borderRadius: '12px', padding: '16px', textAlign: 'center'
    })
  }

  // ─── Render ───────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: '28px', fontWeight: '700', background: 'linear-gradient(135deg, #43e97b, #38f9d7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            👥 Clients
          </h1>
          <p style={{ margin: 0, color: '#888', fontSize: '13px' }}>Simamia wateja wako wote — {clients.length} clients</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setForm(emptyForm); setEditId(null) }}
          style={s.btn(showForm ? 'linear-gradient(135deg,#f093fb,#f5576c)' : 'linear-gradient(135deg,#43e97b,#38f9d7)')}
        >
          {showForm ? '✕ Funga' : '+ Client Mpya'}
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="🔍 Tafuta kwa jina au simu..."
        value={searchQuery}
        onChange={handleSearch}
        style={{ ...s.input, marginBottom: '20px' }}
      />

      {/* Add/Edit Form */}
      {showForm && (
        <div style={{ ...s.card, padding: '28px', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: '700' }}>
            {editId ? '✏️ Edit Client' : '➕ Client Mpya'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {[
                { key: 'name', label: 'Jina Kamili *', required: true },
                { key: 'phone', label: 'Namba ya Simu' },
                { key: 'email', label: 'Email' },
                { key: 'address', label: 'Anakotoka' },
                { key: 'credit_limit', label: 'Credit Limit (TZS)' },
              ].map(({ key, label, required }) => (
                <div key={key}>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#444', fontWeight: '600', fontSize: '13px' }}>{label}</label>
                  <input
                    type={key === 'credit_limit' ? 'number' : 'text'}
                    value={form[key]}
                    onChange={e => setForm({ ...form, [key]: e.target.value })}
                    style={s.input}
                    required={required}
                    min={key === 'credit_limit' ? '0' : undefined}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button type="submit" disabled={loading}
                style={s.btn('linear-gradient(135deg,#667eea,#764ba2)')}>
                {loading ? '⏳ Inahifadhi...' : editId ? '✓ Hifadhi Mabadiliko' : '✓ Unda Client'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm) }}
                style={s.btn('#aaa')}>
                Ghairi
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main content area */}
      <div style={s.page}>

        {/* LEFT — Client List */}
        <div style={s.left}>
          <div style={s.card}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'linear-gradient(135deg,#f8f9fa,#e9ecef)' }}>
                  {['Jina', 'Simu', 'Deni (Balance)', 'Credit Limit', 'Hali', 'Actions'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '16px 18px', color: '#666', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clients.map(client => (
                  <tr
                    key={client.id}
                    style={{
                      borderBottom: '1px solid #f0f0f0',
                      background: selectedClient?.id === client.id ? '#f0f4ff' : 'white',
                      cursor: 'pointer'
                    }}
                    onClick={() => handleViewProfile(client)}
                  >
                    <td style={{ padding: '16px 18px', fontWeight: '600' }}>
                      <div>{client.name}</div>
                      {client.email && <div style={{ fontSize: '12px', color: '#aaa' }}>{client.email}</div>}
                    </td>
                    <td style={{ padding: '16px 18px', color: '#666' }}>{client.phone || '—'}</td>
                    <td style={{ padding: '16px 18px' }}>
                      <span style={{
                        fontWeight: '700',
                        color: Number(client.balance) > 0 ? '#e53e3e' : '#38a169'
                      }}>
                        {Number(client.balance) > 0 ? `TZS ${Number(client.balance).toLocaleString()}` : '—'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 18px', color: '#666' }}>
                      {Number(client.credit_limit) > 0 ? `TZS ${Number(client.credit_limit).toLocaleString()}` : '—'}
                    </td>
                    <td style={{ padding: '16px 18px' }}>
                      <span style={{
                        padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                        background: client.status === 'active' ? '#d4edda' : '#f8d7da',
                        color: client.status === 'active' ? '#155724' : '#721c24'
                      }}>
                        {client.status === 'active' ? '● Active' : '● Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 18px' }} onClick={e => e.stopPropagation()}>
                      <button onClick={() => handleEdit(client)}
                        style={{ ...s.btn('linear-gradient(135deg,#4facfe,#00f2fe)'), marginRight: '8px', padding: '7px 14px' }}>
                        ✏️
                      </button>
                      <button onClick={() => handleDelete(client.id)}
                        style={{ ...s.btn('linear-gradient(135deg,#f093fb,#f5576c)'), padding: '7px 14px' }}>
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {clients.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px', color: '#aaa' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>👥</div>
                <p style={{ margin: 0, fontWeight: '500' }}>Hakuna clients bado</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — Client Profile Panel */}
        {selectedClient && (
          <div style={s.right}>
            <div style={{ ...s.card, height: '100%', overflowY: 'auto' }}>

              {/* Profile Header */}
              <div style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', padding: '24px', color: 'white', position: 'relative' }}>
                <button
                  onClick={() => setSelectedClient(null)}
                  style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '16px' }}
                >✕</button>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '12px' }}>
                  {selectedClient.name?.charAt(0).toUpperCase()}
                </div>
                <h2 style={{ margin: '0 0 4px', fontSize: '20px' }}>{selectedClient.name}</h2>
                <p style={{ margin: 0, opacity: 0.8, fontSize: '13px' }}>{selectedClient.phone}</p>
              </div>

              {/* Stats boxes */}
              {loadingProfile ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#aaa' }}>⏳ Inapakia...</div>
              ) : profile ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '20px' }}>
                    <div style={s.statBox('#fff5f5')}>
                      <div style={{ fontSize: '11px', color: '#e53e3e', fontWeight: '700', marginBottom: '4px' }}>DENI</div>
                      <div style={{ fontSize: '16px', fontWeight: '800', color: '#e53e3e' }}>
                        TZS {Number(profile.balance).toLocaleString()}
                      </div>
                    </div>
                    <div style={s.statBox('#f0fff4')}>
                      <div style={{ fontSize: '11px', color: '#38a169', fontWeight: '700', marginBottom: '4px' }}>AVAILABLE CREDIT</div>
                      <div style={{ fontSize: '16px', fontWeight: '800', color: '#38a169' }}>
                        TZS {Number(profile.available_credit || 0).toLocaleString()}
                      </div>
                    </div>
                    <div style={s.statBox('#ebf8ff')}>
                      <div style={{ fontSize: '11px', color: '#3182ce', fontWeight: '700', marginBottom: '4px' }}>TOTAL SALES</div>
                      <div style={{ fontSize: '16px', fontWeight: '800', color: '#3182ce' }}>{profile.total_sales}</div>
                    </div>
                    <div style={s.statBox('#faf5ff')}>
                      <div style={{ fontSize: '11px', color: '#805ad5', fontWeight: '700', marginBottom: '4px' }}>JUMLA UNUNUZI</div>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: '#805ad5' }}>
                        TZS {Number(profile.total_purchased).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Record Payment Button */}
                  {Number(profile.balance) > 0 && (
                    <div style={{ paddingInline: '20px', marginBottom: '16px' }}>
                      <button
                        onClick={() => { setShowPaymentModal(true); setPaymentForm(emptyPayment) }}
                        style={{ ...s.btn('linear-gradient(135deg,#43e97b,#38f9d7)'), width: '100%', padding: '13px' }}
                      >
                        💰 Rekodi Malipo
                      </button>
                    </div>
                  )}

                  {/* Credit Limit Section */}
                  <div style={{ paddingInline: '20px', marginBottom: '16px' }}>
                    <div style={{ background: '#f8f9fa', borderRadius: '12px', padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: editingCredit ? '12px' : '0' }}>
                        <div>
                          <div style={{ fontSize: '11px', color: '#888', fontWeight: '700' }}>CREDIT LIMIT</div>
                          <div style={{ fontSize: '16px', fontWeight: '700' }}>TZS {Number(profile.credit_limit).toLocaleString()}</div>
                        </div>
                        <button
                          onClick={() => { setEditingCredit(!editingCredit); setNewCreditLimit(profile.credit_limit) }}
                          style={s.btn(editingCredit ? '#aaa' : 'linear-gradient(135deg,#4facfe,#00f2fe)')}
                        >
                          {editingCredit ? 'Ghairi' : '✏️ Edit'}
                        </button>
                      </div>
                      {editingCredit && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="number"
                            value={newCreditLimit}
                            onChange={e => setNewCreditLimit(e.target.value)}
                            style={{ ...s.input, flex: 1 }}
                            placeholder="Weka limit mpya"
                            min="0"
                          />
                          <button onClick={handleUpdateCreditLimit}
                            style={s.btn('linear-gradient(135deg,#667eea,#764ba2)')}>
                            ✓ Hifadhi
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tabs */}
                  <div style={{ borderBottom: '1px solid #f0f0f0', display: 'flex', paddingInline: '20px' }}>
                    {[['info', '👤 Info'], ['payments', '💰 Malipo'], ['history', '🛒 Manunuzi']].map(([tab, label]) => (
                      <button key={tab} style={s.tab(activeTab === tab)} onClick={() => setActiveTab(tab)}>{label}</button>
                    ))}
                  </div>

                  {/* Tab Content */}
                  <div style={{ padding: '20px' }}>

                    {/* INFO TAB */}
                    {activeTab === 'info' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {[
                          ['📱 Simu', profile.phone || '—'],
                          ['📧 Email', profile.email || '—'],
                          ['📍 Anakotoka', profile.address || '—'],
                          ['📅 Aliongezwa', new Date(profile.created_at).toLocaleDateString('sw-TZ')],
                          ['🔵 Hali', profile.status],
                        ].map(([label, value]) => (
                          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f8f9fa', borderRadius: '10px' }}>
                            <span style={{ color: '#888', fontSize: '13px' }}>{label}</span>
                            <span style={{ fontWeight: '600', fontSize: '13px' }}>{value}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* PAYMENTS TAB */}
                    {activeTab === 'payments' && (
                      <div>
                        {payments.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '30px', color: '#aaa' }}>
                            <div style={{ fontSize: '32px', marginBottom: '8px' }}>💳</div>
                            <p style={{ margin: 0 }}>Hakuna malipo bado</p>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {payments.map(p => (
                              <div key={p.id} style={{ background: '#f8f9fa', borderRadius: '10px', padding: '14px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                  <span style={{ fontWeight: '700', color: '#38a169' }}>TZS {Number(p.amount).toLocaleString()}</span>
                                  <span style={{ fontSize: '12px', color: '#aaa' }}>{new Date(p.created_at).toLocaleDateString('sw-TZ')}</span>
                                </div>
                                <div style={{ fontSize: '12px', color: '#888' }}>
                                  {p.payment_method} {p.reference && `· Ref: ${p.reference}`}
                                </div>
                                {p.recorded_by_name && <div style={{ fontSize: '12px', color: '#aaa' }}>Rekodiwa na: {p.recorded_by_name}</div>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* HISTORY TAB */}
                    {activeTab === 'history' && (
                      <div style={{ textAlign: 'center', padding: '30px', color: '#aaa' }}>
                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>🛒</div>
                        <p style={{ margin: 0 }}>Tembelea Sales page kwa historia kamili</p>
                      </div>
                    )}

                  </div>
                </>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '32px', width: '440px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: '700' }}>💰 Rekodi Malipo</h3>
            <p style={{ margin: '0 0 24px', color: '#888', fontSize: '13px' }}>
              Client: <strong>{selectedClient?.name}</strong> · Deni: <strong style={{ color: '#e53e3e' }}>TZS {Number(profile?.balance).toLocaleString()}</strong>
            </p>
            <form onSubmit={handleRecordPayment}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '13px' }}>Kiasi (TZS) *</label>
                  <input type="number" value={paymentForm.amount}
                    onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    style={s.input} placeholder="eg. 50000" required min="1" max={profile?.balance} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '13px' }}>Njia ya Malipo</label>
                  <select value={paymentForm.payment_method}
                    onChange={e => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                    style={s.input}>
                    <option value="cash">💵 Cash</option>
                    <option value="bank_transfer">🏦 Bank Transfer</option>
                    <option value="mobile_money">📱 Mobile Money (M-Pesa/Tigo)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '13px' }}>Reference / Namba ya Risiti</label>
                  <input type="text" value={paymentForm.reference}
                    onChange={e => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                    style={s.input} placeholder="eg. MPE123456" />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '13px' }}>Maelezo (optional)</label>
                  <input type="text" value={paymentForm.notes}
                    onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    style={s.input} placeholder="eg. Malipo ya mkopo wa wiki iliyopita" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button type="submit" disabled={paymentLoading}
                  style={{ ...s.btn('linear-gradient(135deg,#43e97b,#38f9d7)'), flex: 1, padding: '13px' }}>
                  {paymentLoading ? '⏳ Inahifadhi...' : '✓ Rekodi Malipo'}
                </button>
                <button type="button" onClick={() => setShowPaymentModal(false)}
                  style={s.btn('#aaa')}>
                  Ghairi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

export default Clients