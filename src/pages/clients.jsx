import { useState, useEffect } from 'react'
import { getClients, createClient, updateClient, deleteClient, searchClients } from '../services/api'
import toast from 'react-hot-toast'

const emptyForm = { name: '', phone: '', email: '', address: '' }

const Clients = () => {
  const [clients, setClients] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchClients = () => {
    getClients().then(res => setClients(res.data)).catch(() => toast.error('Imeshindwa kupata clients'))
  }

  useEffect(() => { fetchClients() }, [])

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
    setForm(client)
    setEditId(client.id)
    setShowForm(true)
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ margin: '0 0 5px', fontSize: '32px', fontWeight: '700', background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            👥 Clients
          </h1>
          <p style={{ margin: 0, color: '#888', fontSize: '14px' }}>Simamia wateja wako wote</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setForm(emptyForm); setEditId(null) }}
          style={{ 
            padding: '12px 25px', 
            background: showForm ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' : 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', 
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
          marginBottom: '25px', 
          boxSizing: 'border-box', 
          fontSize: '14px',
          fontWeight: '500'
        }}
      />

      {/* Form */}
      {showForm && (
        <div style={{ background: 'white', padding: '30px', borderRadius: '16px', marginBottom: '30px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <h3 style={{ margin: '0 0 25px', fontSize: '20px', fontWeight: '600' }}>{editId ? '✏️ Edit Client' : '➕ Client Mpya'}</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {[
                { key: 'name', label: 'Jina la Mteja', required: true },
                { key: 'phone', label: 'Namba ya Simu' },
                { key: 'email', label: 'Email' },
                { key: 'address', label: 'Anakotoka' },
              ].map(({ key, label, required }) => (
                <div key={key}>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: '600', fontSize: '14px' }}>{label}</label>
                  <input
                    type="text"
                    value={form[key]}
                    onChange={e => setForm({ ...form, [key]: e.target.value })}
                    style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '10px', boxSizing: 'border-box', fontSize: '14px', fontWeight: '500' }}
                    required={required}
                  />
                </div>
              ))}
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

      {/* Table */}
      <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)' }}>
              {['Jina', 'Simu', 'Email', 'Address', 'Actions'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '18px 20px', color: '#666', fontWeight: '700', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clients.map(client => (
              <tr key={client.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '18px 20px', fontWeight: '600' }}>{client.name}</td>
                <td style={{ padding: '18px 20px', color: '#888' }}>{client.phone || '—'}</td>
                <td style={{ padding: '18px 20px', color: '#888' }}>{client.email || '—'}</td>
                <td style={{ padding: '18px 20px', color: '#888' }}>{client.address || '—'}</td>
                <td style={{ padding: '18px 20px' }}>
                  <button onClick={() => handleEdit(client)} style={{ marginRight: '10px', padding: '8px 16px', background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>✏️ Edit</button>
                  <button onClick={() => handleDelete(client.id)} style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>🗑️ Futa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {clients.length === 0 && (
          <div style={{ textAlign: 'center', padding: '50px', color: '#888' }}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>👥</div>
            <p style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>Hakuna clients bado!</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Clients