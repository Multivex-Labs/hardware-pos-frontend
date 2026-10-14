import { useState, useEffect } from 'react'
import { PackagePlus, Banknote, Plus } from 'lucide-react'
import { getPurchases, createPurchase, getProducts } from '../services/api'
import toast from 'react-hot-toast'
import Modal from '../components/Modal'

const fmtTZS = (v) => `TSh ${parseFloat(v || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`

const Purchases = () => {
  const [purchases, setPurchases] = useState([])
  const [products, setProducts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ product_id: '', quantity: '', cost_per_unit: '', supplier: '', notes: '' })

  useEffect(() => {
    getPurchases().then(r => setPurchases(r.data)).catch(() => {})
    getProducts().then(r => setProducts(r.data)).catch(() => {})
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.product_id || !form.quantity || !form.cost_per_unit) { toast.error('Fill in product, quantity and price'); return }
    setLoading(true)
    try {
      await createPurchase({ ...form, quantity: parseFloat(form.quantity), cost_per_unit: parseFloat(form.cost_per_unit) })
      toast.success('✓ Purchase recorded! Stock updated.')
      setForm({ product_id: '', quantity: '', cost_per_unit: '', supplier: '', notes: '' })
      setShowForm(false)
      getPurchases().then(r => setPurchases(r.data))
      getProducts().then(r => setProducts(r.data))
    } catch (err) { toast.error(err.response?.data?.message || 'Failed')
    } finally { setLoading(false) }
  }

  const now = new Date()
  const thisMonth = purchases.filter(p => { const d = new Date(p.created_at); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() })
  const thisMonthTotal = thisMonth.reduce((s, p) => s + parseFloat(p.total_cost || 0), 0)

  return (
    <div style={{ color: 'var(--text)' }}>
      <div className="page-header">
        <div>
          <h1>Purchases</h1>
          <p>Record purchases and update stock</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={16} strokeWidth={2} /> New purchase
        </button>
      </div>

      <div className="stats-row">
        <div className="stat">
          <Banknote className="stat-icon" size={88} strokeWidth={1.25} aria-hidden="true" />
          <p className="stat-label">Purchases this month</p>
          <p className="stat-value">{fmtTZS(thisMonthTotal)}</p>
        </div>
        <div className="stat">
          <PackagePlus className="stat-icon" size={88} strokeWidth={1.25} aria-hidden="true" />
          <p className="stat-label">Records this month</p>
          <p className="stat-value">{thisMonth.length.toLocaleString()}</p>
        </div>
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Record new purchase" subtitle="Stock is updated automatically" size="lg">
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Product *</label>
                <select className="form-input" value={form.product_id} onChange={e => setForm({ ...form, product_id: e.target.value })} required>
                  <option value="">-- Select product --</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Quantity *</label>
                <input className="form-input mono" type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} placeholder="e.g. 50" min="0.01" step="0.01" required />
              </div>
              <div className="form-group">
                <label className="form-label">Purchase price (TSh) *</label>
                <input className="form-input mono" type="number" value={form.cost_per_unit} onChange={e => setForm({ ...form, cost_per_unit: e.target.value })} placeholder="e.g. 11000" min="0" step="0.01" required />
                {form.cost_per_unit && form.quantity && (
                  <p className="form-hint mono">Total: {fmtTZS(parseFloat(form.cost_per_unit) * parseFloat(form.quantity))}</p>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Supplier</label>
                <input className="form-input" value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} placeholder="e.g. Dangote" />
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <input className="form-input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes" />
              </div>
            </div>
            <div className="modal-actions sticky">
              <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Recording...' : 'Record and update stock'}</button>
              <button type="button" className="btn" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
      </Modal>

      <div className="table-card">
        <div className="table-wrapper">
          <table className="data-table" style={{ minWidth: '640px' }}>
            <thead>
              <tr><th>Product</th><th className="num">Qty</th><th className="num">Unit price</th><th className="num">Total</th><th>Supplier</th><th>Date</th></tr>
            </thead>
            <tbody>
              {purchases.length === 0 && <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-subtle)' }}>No purchases yet.</td></tr>}
              {purchases.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: '500' }}>{p.product_name || p.name}</td>
                  <td className="num mono">{parseFloat(p.quantity).toLocaleString()}</td>
                  <td className="num mono" style={{ color: 'var(--text-muted)' }}>{fmtTZS(p.cost_per_unit)}</td>
                  <td className="num mono" style={{ fontWeight: '600' }}>{fmtTZS(p.total_cost)}</td>
                  <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{p.supplier || '—'}</td>
                  <td style={{ fontSize: '13px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(p.created_at).toLocaleDateString('en-GB')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Purchases
