import { useEffect, useState } from 'react'
import { Edit2, History, Package, Search, ShieldAlert, SlidersHorizontal } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '../components/Modal'
import { adjustPharmacyBatch, getPharmacyBatchMovements, getPharmacyBatches, updatePharmacyBatchInfo, updatePharmacyBatchStatus } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { hasPermission } from '../services/permissions'

const PharmacyBatches = () => {
  const { user } = useAuth()
  const [rows, setRows] = useState([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [action, setAction] = useState(null)
  const [reason, setReason] = useState('')
  const [quantity, setQuantity] = useState('')
  const [metadata, setMetadata] = useState({ batch_number: '', expiry_date: '', manufacture_date: '' })
  const [history, setHistory] = useState([])
  const [saving, setSaving] = useState(false)
  const canEdit = hasPermission(user, 'inventory', 'edit')

  const load = () => {
    setLoading(true)
    getPharmacyBatches({ search: query, status, page, limit: 30 })
      .then(({ data }) => { setRows(data.data || []); setTotal(data.total || 0) })
      .catch(() => toast.error('Failed to load batches'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [query, status, page])

  const openHistory = async (batch) => {
    setSelected(batch); setAction('history')
    try { const { data } = await getPharmacyBatchMovements(batch.id); setHistory(data) }
    catch { toast.error('Failed to load movement history') }
  }
  const submitAction = async (e) => {
    e.preventDefault()
    if (!selected || !reason.trim()) return
    setSaving(true)
    try {
      if (action === 'metadata') await updatePharmacyBatchInfo(selected.id, { ...metadata, reason })
      else if (action === 'adjustment') await adjustPharmacyBatch(selected.id, { quantity_change: Number(quantity), reason })
      else await updatePharmacyBatchStatus(selected.id, { status: action, reason })
      toast.success(action === 'adjustment' ? 'Stock adjustment recorded' : 'Batch status updated')
      setAction(null); setSelected(null); setReason(''); setQuantity(''); load()
    } catch (err) { toast.error(err.response?.data?.message || 'Could not update batch') }
    finally { setSaving(false) }
  }

  return <div style={{ color: 'var(--text)' }}>
    <div className="page-header"><div><h1>Batch management</h1><p>Review lot-level stock, suppliers, expiry dates, and movement history.</p></div></div>
    <div className="table-card">
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', padding: 12, borderBottom: '1px solid var(--border)' }}>
        <label style={{ position: 'relative', flex: '1 1 260px' }}><Search size={15} style={{ position: 'absolute', top: 10, left: 10, color: 'var(--text-muted)' }}/><input className="form-input" aria-label="Search product, batch or supplier" placeholder="Search product, batch or supplier" value={query} onChange={e => { setPage(1); setQuery(e.target.value) }} style={{ paddingLeft: 32 }}/></label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--text-muted)' }}><SlidersHorizontal size={15}/><select className="form-input" value={status} onChange={e => { setPage(1); setStatus(e.target.value) }}><option value="all">All statuses</option><option value="active">Active</option><option value="expiring">Expiring within 90 days</option><option value="expired">Expired</option><option value="quarantined">Quarantined</option><option value="recalled">Recalled</option><option value="depleted">Depleted</option></select></label>
      </div>
      <div className="table-wrapper"><table className="data-table" style={{ minWidth: 1050 }}>
        <thead><tr><th>Medicine</th><th>Batch / lot</th><th>Supplier / GRN</th><th>Expiry</th><th>Status</th><th className="num">On hand</th><th className="num">Unit cost</th><th>Actions</th></tr></thead>
        <tbody>
          {loading && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 36 }}>Loading batches…</td></tr>}
          {!loading && rows.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 36, color: 'var(--text-muted)' }}>No batches found. Receive pharmacy stock through Procurement to add a batch.</td></tr>}
          {!loading && rows.map(b => <tr key={b.id}>
            <td style={{ fontWeight: 600 }}>{b.product_name}<div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{[b.dosage, b.unit].filter(Boolean).join(' · ')}</div></td>
            <td className="mono">{b.batch_number}<div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Received {b.received_date ? new Date(b.received_date).toLocaleDateString() : '—'}</div></td>
            <td>{b.supplier_name || '—'}<div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{b.grn_number || '—'}</div></td>
            <td>{b.expiry_date ? new Date(b.expiry_date).toLocaleDateString('en-GB') : 'Not recorded'}</td>
            <td><span className={`badge ${['expired','recalled','quarantined'].includes(b.display_status) ? 'badge-danger' : b.display_status === 'expiring_soon' || b.display_status === 'low_stock' ? 'badge-warning' : 'badge-success'}`}>{String(b.display_status).replaceAll('_', ' ')}</span></td>
            <td className="num mono">{Number(b.quantity_on_hand).toLocaleString()} {b.unit || ''}</td><td className="num mono">{Number(b.unit_cost).toLocaleString()}</td>
            <td><div style={{ display: 'flex', gap: 4 }}>
              <button className="btn btn-sm" title="Movement history" onClick={() => openHistory(b)}><History size={14}/></button>
              {canEdit && <><button className="btn btn-sm" title="Edit batch details" onClick={() => { setSelected(b); setMetadata({ batch_number: b.batch_number, expiry_date: String(b.expiry_date || '').slice(0, 10), manufacture_date: String(b.manufacture_date || '').slice(0, 10) }); setAction('metadata') }}><Edit2 size={14}/></button><button className="btn btn-sm" title="Adjust batch stock" onClick={() => { setSelected(b); setAction('adjustment') }}><Package size={14}/></button>
              {b.status === 'active' && <button className="btn btn-sm" title="Quarantine batch" onClick={() => { setSelected(b); setAction('quarantined') }}><ShieldAlert size={14}/></button>}
              {(b.status === 'quarantined' || b.status === 'recalled') && <button className="btn btn-sm" title="Reactivate batch" onClick={() => { setSelected(b); setAction('active') }}>Reactivate</button>}</>}
            </div></td>
          </tr>)}
        </tbody>
      </table></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, color: 'var(--text-muted)', fontSize: 13 }}>
        <span>{total} batch(es)</span><div style={{ display: 'flex', gap: 8 }}><button className="btn btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button><span>Page {page} / {Math.max(1, Math.ceil(total / 30))}</span><button className="btn btn-sm" disabled={page >= Math.ceil(total / 30)} onClick={() => setPage(p => p + 1)}>Next</button></div>
      </div>
    </div>
    <Modal open={Boolean(action)} onClose={() => { setAction(null); setSelected(null) }} title={action === 'history' ? `Batch history · ${selected?.batch_number}` : action === 'adjustment' ? 'Adjust batch stock' : action === 'metadata' ? 'Edit batch details' : action === 'active' ? 'Reactivate batch' : 'Quarantine batch'} size="md">
      {action === 'history' ? <div className="table-wrapper"><table className="data-table"><thead><tr><th>Date</th><th>Movement</th><th className="num">Change</th><th>Reason</th><th>By</th></tr></thead><tbody>{history.map(m => <tr key={m.id}><td>{new Date(m.created_at).toLocaleString()}</td><td>{m.movement_type}</td><td className="num mono">{m.quantity_change}</td><td>{m.reason || '—'}</td><td>{m.performed_by_name || 'System'}</td></tr>)}{history.length === 0 && <tr><td colSpan={5}>No movement history.</td></tr>}</tbody></table></div> : <form onSubmit={submitAction}>
        {action === 'metadata' && <><div className="form-group"><label className="form-label">Batch / lot number *</label><input className="form-input" value={metadata.batch_number} onChange={e => setMetadata({ ...metadata, batch_number: e.target.value })} maxLength={80} required/></div><div className="form-grid"><div className="form-group"><label className="form-label">Expiry date *</label><input className="form-input" type="date" value={metadata.expiry_date} onChange={e => setMetadata({ ...metadata, expiry_date: e.target.value })} required/></div><div className="form-group"><label className="form-label">Manufacture date</label><input className="form-input" type="date" value={metadata.manufacture_date} onChange={e => setMetadata({ ...metadata, manufacture_date: e.target.value })}/></div></div></>}
        {action === 'adjustment' && <div className="form-group"><label className="form-label">Quantity change (+ or −)</label><input className="form-input" type="number" step="0.001" value={quantity} onChange={e => setQuantity(e.target.value)} required /></div>}
        <div className="form-group"><label className="form-label">Reason *</label><textarea className="form-input" value={reason} onChange={e => setReason(e.target.value)} required maxLength={255} placeholder="Enter a traceable reason" /></div>
        <div className="modal-actions"><button type="button" className="btn" onClick={() => setAction(null)}>Cancel</button><button className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Confirm'}</button></div>
      </form>}
    </Modal>
  </div>
}

export default PharmacyBatches
