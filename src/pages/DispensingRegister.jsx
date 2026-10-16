import { useEffect, useState } from 'react'
import { ClipboardList, Pill, Plus, TriangleAlert } from 'lucide-react'
import { createDispensingRecord, getDispensingLog, getEligiblePharmacyBatches, getPharmacyPrescriptions, getProducts } from '../services/api'
import toast from 'react-hot-toast'
import Modal from '../components/Modal'
import { useAuth } from '../context/AuthContext'
import { hasPermission } from '../services/permissions'

const fmtDate = d => new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const requestKey = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`
const emptyForm = () => ({ product_id: '', prescription_item_id: '', quantity_dispensed: '', patient_name: '', prescriber_name: '', dosage_instructions: '' })

const DispensingRegister = () => {
  const { user } = useAuth()
  const canCreate = hasPermission(user, 'dispensing', 'create')
  const [products, setProducts] = useState([])
  const [logs, setLogs] = useState([])
  const [prescriptions, setPrescriptions] = useState([])
  const [eligibleBatches, setEligibleBatches] = useState([])
  const [logsLoading, setLogsLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [idempotencyKey, setIdempotencyKey] = useState(requestKey)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const loadProducts = () => getProducts().then(r => setProducts(r.data || [])).catch(() => toast.error('Failed to load products'))
  const loadLogs = () => {
    setLogsLoading(true)
    getDispensingLog(100).then(r => setLogs(r.data || [])).catch(() => toast.error('Failed to load dispensing history')).finally(() => setLogsLoading(false))
  }
  const loadPrescriptions = () => getPharmacyPrescriptions({ status: 'open' }).then(r => setPrescriptions(r.data || [])).catch(() => {})
  useEffect(() => { loadProducts(); loadLogs(); loadPrescriptions() }, [])

  const selectedProduct = products.find(p => Number(p.id) === Number(form.product_id))
  const openPrescriptionItems = prescriptions.flatMap(rx => (rx.items || [])
    .filter(item => Number(item.quantity_dispensed) < Number(item.quantity_prescribed))
    .map(item => ({ ...item, rx_number: rx.prescription_number })))
  useEffect(() => {
    if (!form.product_id) { setEligibleBatches([]); return }
    getEligiblePharmacyBatches(form.product_id).then(r => setEligibleBatches(r.data || [])).catch(() => setEligibleBatches([]))
  }, [form.product_id])

  const submit = async event => {
    event.preventDefault()
    const qty = Number(form.quantity_dispensed)
    if (!form.product_id || !Number.isFinite(qty) || qty <= 0) { toast.error('Select a medicine and enter a valid quantity'); return }
    setSubmitting(true)
    try {
      const result = await createDispensingRecord({
        product_id: Number(form.product_id), quantity_dispensed: qty,
        patient_name: form.patient_name || undefined, prescriber_name: form.prescriber_name || undefined,
        dosage_instructions: form.dosage_instructions || undefined,
        prescription_item_id: form.prescription_item_id || undefined,
        request_key: idempotencyKey
      })
      toast.success(result.data.message || 'Dispensing recorded')
      setForm(emptyForm()); setIdempotencyKey(requestKey()); setShowForm(false)
      loadProducts(); loadLogs(); loadPrescriptions()
    } catch (error) { toast.error(error.response?.data?.message || 'Failed to record dispensing') }
    finally { setSubmitting(false) }
  }

  const today = logs.filter(log => new Date(log.created_at).toDateString() === new Date().toDateString())
  return <div style={{ color: 'var(--text)' }}>
    <div className="page-header"><div><h1>Dispensing Register</h1><p>Record prescription and counter dispensing. Eligible batches allocate in FEFO order.</p></div>{canCreate && <button className="btn-primary" onClick={() => setShowForm(true)}><Plus size={16}/> Record dispensing</button>}</div>
    <div className="stats-row"><div className="stat"><Pill className="stat-icon" aria-hidden="true"/><p className="stat-label">Dispensed today</p><p className="stat-value">{today.length.toLocaleString()}</p></div><div className="stat"><ClipboardList className="stat-icon" aria-hidden="true"/><p className="stat-label">Records (latest 100)</p><p className="stat-value">{logs.length.toLocaleString()}</p></div></div>

    <Modal open={showForm} onClose={() => setShowForm(false)} title="Record dispensing" subtitle="Prescription quantities and eligible batches are validated on the server." size="md">
      <form onSubmit={submit}>
        <div className="form-group"><label className="form-label">Prescription (optional)</label><select className="form-input" value={form.prescription_item_id} onChange={event => {
          const item = openPrescriptionItems.find(candidate => String(candidate.id) === event.target.value)
          setForm(current => item ? { ...current, prescription_item_id: String(item.id), product_id: String(item.product_id), patient_name: item.patient_name || '', prescriber_name: item.prescriber_name || '', dosage_instructions: item.dosage_instructions || '', quantity_dispensed: '' } : { ...current, prescription_item_id: '', product_id: '' })
        }}><option value="">Counter dispense / no prescription</option>{openPrescriptionItems.map(item => <option key={item.id} value={item.id}>{item.rx_number} · {item.patient_name || 'Patient'} · {item.product_name} (remaining {Number(item.quantity_prescribed) - Number(item.quantity_dispensed)})</option>)}</select></div>

        <div className="form-group"><label className="form-label">Medicine *</label><select className="form-input" value={form.product_id} disabled={Boolean(form.prescription_item_id)} onChange={event => setForm(current => ({ ...current, product_id: event.target.value, prescription_item_id: '' }))} required><option value="">Select a medicine</option>{products.map(p => <option key={p.id} value={p.id}>{p.name} (recorded stock: {p.stock} {p.unit || ''})</option>)}</select>
          {selectedProduct && <p className="form-hint">FEFO eligible batches: {eligibleBatches.length ? eligibleBatches.map(batch => `${batch.batch_number} · ${Number(batch.quantity_on_hand)} (exp ${new Date(batch.expiry_date).toLocaleDateString('en-GB')})`).join(' → ') : 'None available'}</p>}
          {selectedProduct?.requires_prescription && <p className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8 }}><TriangleAlert size={13}/> Prescription required</p>}
        </div>
        <div className="form-group"><label className="form-label">Quantity dispensed *{selectedProduct ? ` (${selectedProduct.unit || 'PC'})` : ''}</label><input className="form-input mono" type="number" min="0.001" step="0.001" value={form.quantity_dispensed} onChange={e => setForm({ ...form, quantity_dispensed: e.target.value })} required /></div>
        <div className="form-group"><label className="form-label">Patient name</label><input className="form-input" value={form.patient_name} onChange={e => setForm({ ...form, patient_name: e.target.value })} placeholder="Optional" /></div>
        <div className="form-group"><label className="form-label">Prescriber</label><input className="form-input" value={form.prescriber_name} onChange={e => setForm({ ...form, prescriber_name: e.target.value })} placeholder="Optional" /></div>
        <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Dosage instructions</label><textarea className="form-input" style={{ minHeight: 72, resize: 'vertical' }} value={form.dosage_instructions} onChange={e => setForm({ ...form, dosage_instructions: e.target.value })} placeholder="As written on prescription" /></div>
        <div className="modal-actions sticky"><button type="button" className="btn" onClick={() => setShowForm(false)}>Cancel</button><button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Saving…' : 'Record dispensing'}</button></div>
      </form>
    </Modal>

    <div className="table-card"><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}><h3 style={{ fontSize: 14, fontWeight: 600 }}>Dispensing history</h3><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Latest 100</span></div><div className="table-wrapper"><table className="data-table" style={{ minWidth: 760 }}>
      <thead><tr><th>Date</th><th>Medicine</th><th>Batch(es)</th><th>Prescription</th><th className="num">Quantity</th><th>Patient</th><th>Prescriber</th><th>Dispensed by</th></tr></thead>
      <tbody>{logsLoading && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading…</td></tr>}{!logsLoading && !logs.length && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-subtle)' }}>No dispensing records yet.</td></tr>}{!logsLoading && logs.map(log => <tr key={log.id}><td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>{fmtDate(log.created_at)}</td><td style={{ fontWeight: 500 }}>{log.product_name}</td><td className="mono">{log.batch_numbers || log.batch_number || '—'}</td><td className="mono">{log.prescription_number || 'Counter'}</td><td className="num mono">{log.quantity_dispensed} {log.unit || ''}</td><td>{log.patient_name || '—'}</td><td>{log.prescriber_name || '—'}</td><td>{log.dispensed_by_name || '—'}</td></tr>)}</tbody>
    </table></div></div>
  </div>
}
export default DispensingRegister
