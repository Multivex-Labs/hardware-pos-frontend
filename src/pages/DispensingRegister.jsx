import { useState, useEffect } from 'react'
import { Pill, ClipboardList, TriangleAlert, Plus } from 'lucide-react'
import { getProducts, getDispensingLog, createDispensingRecord } from '../services/api'
import toast from 'react-hot-toast'
import Modal from '../components/Modal'
import { useAuth } from '../context/AuthContext'
import { hasPermission } from '../services/permissions'

const fmtDate = (d) => new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const DispensingRegister = () => {
  const { user } = useAuth()
  const canCreate = hasPermission(user, 'dispensing', 'create')
  const [products, setProducts] = useState([])
  const [logs, setLogs] = useState([])
  const [logsLoading, setLogsLoading] = useState(true)
  const [form, setForm] = useState({ product_id: '', quantity_dispensed: '', patient_name: '', prescriber_name: '', dosage_instructions: '' })
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const loadProducts = () => getProducts().then(r => setProducts(r.data)).catch(() => toast.error('Failed to load products'))
  const loadLogs = () => {
    setLogsLoading(true)
    getDispensingLog(100).then(r => setLogs(r.data)).catch(() => toast.error('Failed to load dispensing history')).finally(() => setLogsLoading(false))
  }

  useEffect(() => { loadProducts(); loadLogs() }, [])

  const selectedProduct = products.find(p => p.id === Number(form.product_id))

  const handleSubmit = async (e) => {
    e.preventDefault()
    const qty = parseInt(form.quantity_dispensed)

    if (!form.product_id) { toast.error('Select a product'); return }
    if (!qty || qty <= 0) { toast.error('Enter a valid quantity'); return }

    setSubmitting(true)
    try {
      const res = await createDispensingRecord({
        product_id: form.product_id,
        quantity_dispensed: qty,
        patient_name: form.patient_name || undefined,
        prescriber_name: form.prescriber_name || undefined,
        dosage_instructions: form.dosage_instructions || undefined
      })
      toast.success(res.data.message || 'Dispensing recorded')
      setForm({ product_id: '', quantity_dispensed: '', patient_name: '', prescriber_name: '', dosage_instructions: '' })
      setShowForm(false)
      loadProducts()
      loadLogs()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record dispensing')
    } finally {
      setSubmitting(false)
    }
  }

  const todayLogs = logs.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString())

  return (
    <div style={{ color: 'var(--text)' }}>
      <div className="page-header">
        <div>
          <h1>Dispensing Register</h1>
          <p>Basic PPB-compliant log of dispensed medicines</p>
        </div>
        {canCreate && <button className="btn-primary" onClick={() => setShowForm(true)}><Plus size={16} strokeWidth={2} /> Record dispensing</button>}
      </div>

      <div className="stats-row">
        <div className="stat"><Pill className="stat-icon" aria-hidden="true" /><p className="stat-label">Dispensed today</p><p className="stat-value">{todayLogs.length.toLocaleString()}</p></div>
        <div className="stat"><ClipboardList className="stat-icon" aria-hidden="true" /><p className="stat-label">Records (latest 100)</p><p className="stat-value">{logs.length.toLocaleString()}</p></div>
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Record dispensing" subtitle="Enter details of the medicine dispensed" size="md">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Product *</label>
              <select className="form-input" value={form.product_id} onChange={e => setForm({ ...form, product_id: e.target.value })} required>
                <option value="">Select a product</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} (in stock: {p.stock} {p.unit || ''})</option>)}
              </select>
              {selectedProduct?.batch_number && (
                <p className="form-hint">Batch: <strong className="mono">{selectedProduct.batch_number}</strong>{selectedProduct.expiry_date && ` · Expires ${new Date(selectedProduct.expiry_date).toLocaleDateString('en-GB')}`}</p>
              )}
              {selectedProduct?.requires_prescription && (
                <p style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '8px' }} className="badge badge-warning">
                  <TriangleAlert size={13} strokeWidth={2} /> Requires prescription
                </p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Quantity dispensed *{selectedProduct ? ` (${selectedProduct.unit || 'PC'})` : ''}</label>
              <input className="form-input mono" type="number" min="1" value={form.quantity_dispensed} onChange={e => setForm({ ...form, quantity_dispensed: e.target.value })} placeholder="e.g. 10" required />
            </div>

            <div className="form-group">
              <label className="form-label">Patient name</label>
              <input className="form-input" value={form.patient_name} onChange={e => setForm({ ...form, patient_name: e.target.value })} placeholder="Optional" />
            </div>

            <div className="form-group">
              <label className="form-label">Prescriber name</label>
              <input className="form-input" value={form.prescriber_name} onChange={e => setForm({ ...form, prescriber_name: e.target.value })} placeholder="Optional — doctor/clinician" />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Dosage instructions</label>
              <textarea className="form-input" style={{ minHeight: '72px', resize: 'vertical' }} value={form.dosage_instructions} onChange={e => setForm({ ...form, dosage_instructions: e.target.value })} placeholder="e.g. 1 tablet twice daily after meals" />
            </div>

            <div className="modal-actions sticky">
              <button type="button" className="btn" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Saving...' : 'Record dispensing'}</button>
            </div>
          </form>
      </Modal>

      <div>
        {/* History */}
        <div className="table-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600' }}>Dispensing history</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Latest 100</span>
          </div>
          <div className="table-wrapper">
            <table className="data-table" style={{ minWidth: '720px' }}>
              <thead>
                <tr><th>Date</th><th>Product</th><th>Batch</th><th className="num">Qty</th><th>Patient</th><th>Prescriber</th><th>By</th></tr>
              </thead>
              <tbody>
                {logsLoading && <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading...</td></tr>}
                {!logsLoading && logs.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-subtle)' }}>No dispensing records yet.</td></tr>}
                {!logsLoading && logs.map(l => (
                  <tr key={l.id}>
                    <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmtDate(l.created_at)}</td>
                    <td style={{ fontWeight: '500' }}>{l.product_name}</td>
                    <td className="mono" style={{ color: 'var(--text-muted)' }}>{l.batch_number || '—'}</td>
                    <td className="num mono" style={{ fontWeight: '600' }}>{l.quantity_dispensed} {l.unit || ''}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{l.patient_name || '—'}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{l.prescriber_name || '—'}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{l.dispensed_by_name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DispensingRegister
