import { useState, useEffect } from 'react'
import { getProducts, getPurchases, createPurchase } from '../services/api'
import toast from 'react-hot-toast'

const emptyForm = { product_id: '', quantity: '', cost_per_unit: '', supplier: '', notes: '' }

const Purchases = () => {
  const [products, setProducts] = useState([])
  const [purchases, setPurchases] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)

  const formatTSh = (amount) => `TSh ${(parseFloat(amount || 0) * 2600).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const fetchData = () => {
    getProducts().then(res => setProducts(res.data)).catch(() => {})
    getPurchases().then(res => setPurchases(res.data)).catch(() => {})
  }

  useEffect(() => { fetchData() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await createPurchase(form)
      toast.success('✓ Purchase recorded! Stock updated.')
      setForm(emptyForm)
      setShowForm(false)
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed')
    } finally {
      setLoading(false)
    }
  }

  const totalCost = parseFloat(form.quantity || 0) * parseFloat(form.cost_per_unit || 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ margin: '0 0 5px', fontSize: '32px', fontWeight: '700', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            📥 Stock Incoming / Purchases
          </h1>
          <p style={{ margin: 0, color: '#888', fontSize: '14px' }}>Record new stock arrivals and costs</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setForm(emptyForm) }}
          style={{ 
            padding: '12px 25px', 
            background: showForm ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
            color: 'white', 
            border: 'none', 
            borderRadius: '12px', 
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
          }}
        >
          {showForm ? '✕ Close' : '+ Record Purchase'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ background: 'white', padding: '30px', borderRadius: '16px', marginBottom: '30px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <h3 style={{ margin: '0 0 25px', fontSize: '20px', fontWeight: '600' }}>➕ New Purchase</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: '600', fontSize: '14px' }}>Product</label>
                <select
                  value={form.product_id}
                  onChange={e => setForm({ ...form, product_id: e.target.value })}
                  style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', fontWeight: '500' }}
                  required
                >
                  <option value="">-- Select Product --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (Current: {p.stock} {p.unit})</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: '600', fontSize: '14px' }}>Quantity Received</label>
                <input
                  type="number"
                  value={form.quantity}
                  onChange={e => setForm({ ...form, quantity: e.target.value })}
                  style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '10px', boxSizing: 'border-box', fontSize: '14px', fontWeight: '500' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: '600', fontSize: '14px' }}>Cost Per Unit (TZS)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.cost_per_unit}
                  onChange={e => setForm({ ...form, cost_per_unit: e.target.value })}
                  style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '10px', boxSizing: 'border-box', fontSize: '14px', fontWeight: '500' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: '600', fontSize: '14px' }}>Supplier</label>
                <input
                  type="text"
                  value={form.supplier}
                  onChange={e => setForm({ ...form, supplier: e.target.value })}
                  style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '10px', boxSizing: 'border-box', fontSize: '14px', fontWeight: '500' }}
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: '600', fontSize: '14px' }}>Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows="2"
                  style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '10px', boxSizing: 'border-box', fontSize: '14px', fontWeight: '500', resize: 'vertical' }}
                />
              </div>
            </div>

            {totalCost > 0 && (
              <div style={{ marginTop: '20px', padding: '15px', background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', borderRadius: '10px' }}>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>
                  Total Cost: <span style={{ color: '#16a34a' }}>{formatTSh(totalCost)}</span>
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ marginTop: '25px', padding: '14px 35px', background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '700', fontSize: '15px' }}
            >
              {loading ? '⏳ Recording...' : '✓ Record Purchase'}
            </button>
          </form>
        </div>
      )}

      {/* Table */}
      <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)' }}>
              {['Date', 'Product', 'Quantity', 'Unit', 'Cost/Unit', 'Total Cost', 'Supplier', 'Recorded By'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '18px 20px', color: '#666', fontWeight: '700', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {purchases.map(purchase => (
              <tr key={purchase.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '18px 20px', color: '#888' }}>{new Date(purchase.created_at).toLocaleDateString('en-GB')}</td>
                <td style={{ padding: '18px 20px', fontWeight: '600' }}>{purchase.product_name}</td>
                <td style={{ padding: '18px 20px', fontWeight: '600' }}>{purchase.quantity}</td>
                <td style={{ padding: '18px 20px', color: '#667eea', fontWeight: '600' }}>{purchase.unit}</td>
                <td style={{ padding: '18px 20px', color: '#888' }}>{formatTSh(purchase.cost_per_unit)}</td>
                <td style={{ padding: '18px 20px', color: '#16a34a', fontWeight: '700' }}>{formatTSh(purchase.total_cost)}</td>
                <td style={{ padding: '18px 20px', color: '#888' }}>{purchase.supplier || '—'}</td>
                <td style={{ padding: '18px 20px', color: '#888' }}>{purchase.recorded_by}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {purchases.length === 0 && (
          <div style={{ textAlign: 'center', padding: '50px', color: '#888' }}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>📥</div>
            <p style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>No purchases recorded yet!</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Purchases