import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getClients, createClient, updateClient, deleteClient, searchClients } from '../services/api'
import toast from 'react-hot-toast'

const emptyForm = { name: '', phone: '', email: '', address: '', credit_limit: '' }

const Clients = () => {
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')

  const fetchClients = () => {
    getClients()
      .then(res => setClients(res.data))
      .catch(() => toast.error('Imeshindwa kupata clients'))
  }

  useEffect(() => { fetchClients() }, [])

  // Sort clients locally
  const sortedClients = [...clients].sort((a, b) => {
    let valA = a[sortBy] ?? ''
    let valB = b[sortBy] ?? ''
    if (typeof valA === 'string') valA = valA.toLowerCase()
    if (typeof valB === 'string') valB = valB.toLowerCase()
    if (valA < valB) return sortOrder === 'asc' ? -1 : 1
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1
    return 0
  })

  const handleSort = (col) => {
    if (sortBy === col) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(col)
      setSortOrder('asc')
    }
  }

  const sortIcon = (col) => {
    if (sortBy !== col) return ' ↕'
    return sortOrder === 'asc' ? ' ↑' : ' ↓'
  }

  const handleSearch = async (e) => {
    const query = e.target.value
    setSearchQuery(query)
    if (query.length > 1) {
      const res = await searchClients(query)
      setClients(res.data)
    } else if (query.length === 0) {
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
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Una uhakika kufuta client huyu?')) return
    try {
      await deleteClient(id)
      toast.success('✓ Client amefutwa!')
      fetchClients()
    } catch (error) {
      toast.error('Imeshindwa kufuta')
    }
  }

  // Format number as currency
  const fmt = (n) => Number(n || 0).toLocaleString()

  // Color for balance — red if has debt, green if zero
  const balanceColor = (balance) => Number(balance) > 0 ? '#ef4444' : '#22c55e'

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ margin: '0 0 5px', fontSize: '32px', fontWeight: '700', background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            👥 Clients
          </h1>
          <p style={{ margin: 0, color: '#888', fontSize: '14px' }}>
            Jumla: {clients.length} clients
          </p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setForm(emptyForm); setEditId(null) }}
          style={{
            padding: '12px 25px',
            background: showForm
              ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
              : 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
          }}
        >
          {showForm ? '✕ Funga' : '+ Ongeza Client'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ background: 'white', padding: '30px', borderRadius: '16px', marginBottom: '30px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <h3 style={{ margin: '0 0 25px', fontSize: '20px', fontWeight: '600' }}>
            {editId ? '✏️ Edit Client' : '➕ Client Mpya'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {[
                { key: 'name', label: 'Jina Kamili', required: true },
                { key: 'phone', label: 'Namba ya Simu' },
                { key: 'email', label: 'Email' },
                { key: 'address', label: 'Anakotoka' },
              ].map(({ key, label, required }) => (
                <div key={key}>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: '600', fontSize: '14px' }}>
                    {label}
                  </label>
                  <input
                    type="text"
                    value={form[key]}
                    onChange={e => setForm({ ...form, [key]: e.target.value })}
                    style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '10px', boxSizing: 'border-box', fontSize: '14px' }}
                    required={required}
                  />
                </div>
              ))}
              {/* Credit Limit — field yake yenyewe */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: '600', fontSize: '14px' }}>
                  Credit Limit (TZS)
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.credit_limit}
                  onChange={e => setForm({ ...form, credit_limit: e.target.value })}
                  placeholder="0 = hakuna credit"
                  style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '10px', boxSizing: 'border-box', fontSize: '14px' }}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{ marginTop: '25px', padding: '14px 35px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '700', fontSize: '15px' }}
            >
              {loading ? '⏳ Inahifadhi...' : editId ? '✓ Hifadhi Mabadiliko' : '✓ Unda Client'}
            </button>
          </form>
        </div>
      )}

      {/* Search */}
      <input
        type="text"
        placeholder="🔍 Tafuta client kwa jina au simu..."
        value={searchQuery}
        onChange={handleSearch}
        style={{
          width: '100%',
          padding: '14px 20px',
          border: '2px solid #e5e7eb',
          borderRadius: '12px',
          marginBottom: '20px',
          boxSizing: 'border-box',
          fontSize: '14px'
        }}
      />

      {/* Table */}
      <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)' }}>
              {[
                { label: 'Jina', col: 'name' },
                { label: 'Simu', col: 'phone' },
                { label: 'Credit Limit', col: 'credit_limit' },
                { label: 'Deni (Balance)', col: 'balance' },
                { label: 'Hali', col: 'status' },
              ].map(({ label, col }) => (
                <th
                  key={col}
                  onClick={() => handleSort(col)}
                  style={{ textAlign: 'left', padding: '18px 20px', color: '#666', fontWeight: '700', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', cursor: 'pointer', userSelect: 'none' }}
                >
                  {label}{sortIcon(col)}
                </th>
              ))}
              <th style={{ textAlign: 'left', padding: '18px 20px', color: '#666', fontWeight: '700', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedClients.map(client => (
              <tr
                key={client.id}
                style={{ borderBottom: '1px solid #f0f0f0', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={e => e.currentTarget.style.background = 'white'}
              >
                <td style={{ padding: '16px 20px', fontWeight: '600' }}>
                  {client.name}
                </td>
                <td style={{ padding: '16px 20px', color: '#888' }}>
                  {client.phone || '—'}
                </td>
                <td style={{ padding: '16px 20px', color: '#888' }}>
                  {client.credit_limit > 0 ? `TZS ${fmt(client.credit_limit)}` : '—'}
                </td>
                <td style={{ padding: '16px 20px' }}>
                  {Number(client.balance) > 0 ? (
                    <span style={{ color: balanceColor(client.balance), fontWeight: '700' }}>
                      TZS {fmt(client.balance)}
                    </span>
                  ) : (
                    <span style={{ color: '#22c55e', fontWeight: '600' }}>Sawa ✓</span>
                  )}
                </td>
                <td style={{ padding: '16px 20px' }}>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '700',
                    background: client.status === 'active' ? '#dcfce7' : '#fee2e2',
                    color: client.status === 'active' ? '#16a34a' : '#dc2626'
                  }}>
                    {client.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ padding: '16px 20px' }}>
                  <button
                    onClick={() => navigate(`/clients/${client.id}`)}
                    style={{ marginRight: '8px', padding: '7px 14px', background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
                  >
                    👁 Profile
                  </button>
                  <button
                    onClick={() => handleEdit(client)}
                    style={{ marginRight: '8px', padding: '7px 14px', background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDelete(client.id)}
                    style={{ padding: '7px 14px', background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
                  >
                    🗑️ Futa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {clients.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px', color: '#888' }}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>👥</div>
            <p style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>Hakuna clients bado</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Clients