import { useEffect, useState } from 'react'
import { FilePlus2, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '../components/Modal'
import { createPharmacyPrescription, getPharmacyPrescriptions, getProducts } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { hasPermission } from '../services/permissions'

const blankItem = () => ({ product_id: '', quantity_prescribed: '', dosage_instructions: '', frequency: '', route: '', duration: '' })
const PharmacyPrescriptions = () => {
  const { user } = useAuth()
  const canCreate = hasPermission(user, 'dispensing', 'create')
  const [prescriptions, setPrescriptions] = useState([])
  const [products, setProducts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ prescription_number: '', patient_name: '', patient_reference: '', patient_contact: '', prescriber_name: '', prescription_date: new Date().toISOString().slice(0, 10), notes: '', items: [blankItem()] })

  const load = () => getPharmacyPrescriptions({ status: 'all' }).then(r => setPrescriptions(r.data || [])).catch(() => toast.error('Failed to load prescriptions'))
  useEffect(() => { load(); getProducts().then(r => setProducts(r.data || [])).catch(() => {}) }, [])
  const updateItem = (index, patch) => setForm(current => ({ ...current, items: current.items.map((item, i) => i === index ? { ...item, ...patch } : item) }))

  const submit = async (event) => {
    event.preventDefault()
    const items = form.items.filter(item => item.product_id && Number(item.quantity_prescribed) > 0)
    if (!items.length) { toast.error('Add at least one medicine with a quantity'); return }
    setSaving(true)
    try {
      const result = await createPharmacyPrescription({ ...form, items: items.map(item => ({ ...item, product_id: Number(item.product_id), quantity_prescribed: Number(item.quantity_prescribed) })) })
      toast.success(`Prescription ${result.data.prescription_number} saved`)
      setForm({ prescription_number: '', patient_name: '', patient_reference: '', patient_contact: '', prescriber_name: '', prescription_date: new Date().toISOString().slice(0, 10), notes: '', items: [blankItem()] })
      setShowForm(false); load()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save prescription') }
    finally { setSaving(false) }
  }

  return <div style={{ color: 'var(--text)' }}>
    <div className="page-header"><div><h1>Prescriptions</h1><p>Register prescription details and track remaining quantities through dispensing.</p></div>{canCreate && <button className="btn-primary" onClick={() => setShowForm(true)}><FilePlus2 size={16}/> New prescription</button>}</div>
    <div className="table-card"><div className="table-wrapper"><table className="data-table" style={{ minWidth: 900 }}>
      <thead><tr><th>Prescription</th><th>Patient</th><th>Prescriber</th><th>Date</th><th>Medicines / remaining</th><th>Status</th></tr></thead>
      <tbody>{prescriptions.length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No prescriptions recorded.</td></tr> : prescriptions.map(rx => <tr key={rx.id}>
        <td className="mono">{rx.prescription_number || `RX-${rx.id}`}</td><td>{rx.patient_name || rx.patient_reference || '—'}{rx.patient_contact && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{rx.patient_contact}</div>}</td><td>{rx.prescriber_name || '—'}</td><td>{rx.prescription_date ? new Date(rx.prescription_date).toLocaleDateString('en-GB') : '—'}</td>
        <td>{rx.items.map(item => <div key={item.id} style={{ marginBottom: 4 }}>{item.product_name}: {Number(item.quantity_dispensed)} / {Number(item.quantity_prescribed)} {item.unit || ''}{item.dosage_instructions ? ` · ${item.dosage_instructions}` : ''}</div>)}</td>
        <td><span className={`badge ${rx.status === 'dispensed' ? 'badge-success' : rx.status === 'cancelled' ? 'badge-danger' : 'badge-warning'}`}>{String(rx.status).replaceAll('_', ' ')}</span></td>
      </tr>)}</tbody>
    </table></div></div>
    <Modal open={showForm} onClose={() => setShowForm(false)} title="Register prescription" subtitle="Enter the prescribed medicine and directions exactly as written." size="xl">
      <form onSubmit={submit}>
        <div className="form-grid">
          <div className="form-group"><label className="form-label">Prescription number</label><input className="form-input" value={form.prescription_number} onChange={e => setForm({ ...form, prescription_number: e.target.value })} placeholder="Auto-generated if blank" maxLength={80}/></div>
          <div className="form-group"><label className="form-label">Prescription date</label><input className="form-input" type="date" value={form.prescription_date} onChange={e => setForm({ ...form, prescription_date: e.target.value })}/></div>
          <div className="form-group"><label className="form-label">Patient name</label><input className="form-input" value={form.patient_name} onChange={e => setForm({ ...form, patient_name: e.target.value })} maxLength={150}/></div>
          <div className="form-group"><label className="form-label">Patient reference</label><input className="form-input" value={form.patient_reference} onChange={e => setForm({ ...form, patient_reference: e.target.value })} maxLength={80}/></div>
          <div className="form-group"><label className="form-label">Patient contact (optional)</label><input className="form-input" value={form.patient_contact} onChange={e => setForm({ ...form, patient_contact: e.target.value })} maxLength={40}/></div>
          <div className="form-group"><label className="form-label">Prescriber</label><input className="form-input" value={form.prescriber_name} onChange={e => setForm({ ...form, prescriber_name: e.target.value })} maxLength={150}/></div>
        </div>
        <p className="form-label" style={{ marginTop: 12 }}>Prescription items</p>
        {form.items.map((item, index) => <div key={index} style={{ border: '1px solid var(--border)', borderRadius: 6, padding: 12, marginBottom: 10 }}>
          <div className="form-grid">
            <div className="form-group"><label className="form-label">Medicine *</label><select className="form-input" value={item.product_id} onChange={e => updateItem(index, { product_id: e.target.value })} required><option value="">Select medicine</option>{products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Quantity prescribed *</label><input className="form-input" type="number" min="0.001" step="0.001" value={item.quantity_prescribed} onChange={e => updateItem(index, { quantity_prescribed: e.target.value })} required/></div>
            <div className="form-group"><label className="form-label">Dosage instructions</label><input className="form-input" value={item.dosage_instructions} onChange={e => updateItem(index, { dosage_instructions: e.target.value })} placeholder="As written"/></div>
            <div className="form-group"><label className="form-label">Frequency</label><input className="form-input" value={item.frequency} onChange={e => updateItem(index, { frequency: e.target.value })}/></div>
            <div className="form-group"><label className="form-label">Route</label><input className="form-input" value={item.route} onChange={e => updateItem(index, { route: e.target.value })}/></div>
            <div className="form-group"><label className="form-label">Duration</label><input className="form-input" value={item.duration} onChange={e => updateItem(index, { duration: e.target.value })}/></div>
          </div>
          {form.items.length > 1 && <button type="button" className="btn btn-sm danger" onClick={() => setForm(current => ({ ...current, items: current.items.filter((_, i) => i !== index) }))}><Trash2 size={14}/> Remove medicine</button>}
        </div>)}
        <button type="button" className="btn btn-sm" onClick={() => setForm(current => ({ ...current, items: [...current.items, blankItem()] }))}><Plus size={14}/> Add medicine</button>
        <div className="modal-actions"><button type="button" className="btn" onClick={() => setShowForm(false)}>Cancel</button><button className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save prescription'}</button></div>
      </form>
    </Modal>
  </div>
}
export default PharmacyPrescriptions
