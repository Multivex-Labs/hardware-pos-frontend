import { useEffect, useMemo, useState } from 'react'
import { CalendarClock, Download, Package, Search, TriangleAlert } from 'lucide-react'
import toast from 'react-hot-toast'
import { getPharmacyBatches, getPharmacyExpirySummary } from '../services/api'

const dayCount = (date) => Math.ceil((new Date(date).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000)

const ExpiryTracker = () => {
  const [batches, setBatches] = useState([])
  const [summary, setSummary] = useState({})
  const [days, setDays] = useState(90)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([getPharmacyBatches({ status: 'expiry', limit: 200 }), getPharmacyExpirySummary()])
      .then(([batchResponse, summaryResponse]) => { setBatches(batchResponse.data?.data || []); setSummary(summaryResponse.data || {}) })
      .catch(() => toast.error('Failed to load expiry data'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => batches.filter(batch => {
    const left = dayCount(batch.expiry_date)
    return (left < 0 || left <= days) && [batch.product_name, batch.manufacturer, batch.batch_number, batch.supplier_name].some(value => String(value || '').toLowerCase().includes(search.toLowerCase()))
  }), [batches, search, days])
  const urgent = batches.filter(batch => dayCount(batch.expiry_date) >= 0 && dayCount(batch.expiry_date) <= 7).length

  const exportCsv = () => {
    const rows = [['Medicine', 'Batch', 'Supplier', 'Expiry date', 'Days remaining', 'Quantity', 'Unit cost', 'Estimated value', 'Status'],
      ...filtered.map(batch => [batch.product_name, batch.batch_number, batch.supplier_name, batch.expiry_date, dayCount(batch.expiry_date), batch.quantity_on_hand, batch.unit_cost, (Number(batch.quantity_on_hand) * Number(batch.unit_cost)).toFixed(2), batch.display_status])]
    const csv = rows.map(row => row.map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a'); link.href = url; link.download = 'pharmacy-expiry-report.csv'; link.click(); URL.revokeObjectURL(url)
  }

  return <div style={{ color: 'var(--text)' }}>
    <div className="page-header"><div><h1>Expiry management</h1><p>Prioritize expiring stock and identify expired batches. Values use each batch’s recorded purchase cost.</p></div><button className="btn" onClick={exportCsv}><Download size={15}/> Export CSV</button></div>

    <div className="stats-row">
      <div className="stat"><Package className="stat-icon" aria-hidden="true"/><p className="stat-label">Active batches</p><p className="stat-value">{summary.total_batches || 0}</p></div>
      <div className="stat"><CalendarClock className="stat-icon" aria-hidden="true"/><p className="stat-label">Within 30 / 60 / 90 days</p><p className="stat-value">{summary.within_30 || 0} / {summary.within_60 || 0} / {summary.within_90 || 0}</p></div>
      <div className="stat"><TriangleAlert className="stat-icon" aria-hidden="true"/><p className="stat-label">Expired batches / urgent ≤ 7 days</p><p className="stat-value" style={{ color: Number(summary.expired_batches) || urgent ? 'var(--danger)' : undefined }}>{summary.expired_batches || 0} / {urgent}</p></div>
      <div className="stat"><Package className="stat-icon" aria-hidden="true"/><p className="stat-label">Affected stock units</p><p className="stat-value">{Number(summary.affected_quantity || 0).toLocaleString()}</p></div>
      <div className="stat"><CalendarClock className="stat-icon" aria-hidden="true"/><p className="stat-label">At risk / expired value (TSh)</p><p className="stat-value" style={{ fontSize: 17 }}>{Number(summary.approaching_value || 0).toLocaleString()} / {Number(summary.expired_value || 0).toLocaleString()}</p></div>
    </div>

    <div className="table-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><h3 style={{ fontSize: 14, fontWeight: 600 }}>Expiry watchlist</h3><select className="form-input" value={days} onChange={e => setDays(Number(e.target.value))} style={{ width: 140 }}><option value={30}>Next 30 days</option><option value={60}>Next 60 days</option><option value={90}>Next 90 days</option></select></div>
        <label style={{ position: 'relative', width: 260, maxWidth: '100%' }}><Search size={15} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-muted)' }}/><input className="form-input" aria-label="Search medicine, batch or supplier" placeholder="Search medicine, batch or supplier" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32 }}/></label>
      </div>
      <div className="table-wrapper"><table className="data-table" style={{ minWidth: 900 }}>
        <thead><tr><th>Medicine</th><th>Batch</th><th>Supplier</th><th>Expiry</th><th>Time remaining / status</th><th className="num">Quantity / estimated value</th></tr></thead>
        <tbody>
          {loading && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading batches...</td></tr>}
          {!loading && filtered.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-subtle)' }}>{batches.length ? 'No batches match your search or selected window.' : 'No batches with expiry dates and stock on hand.'}</td></tr>}
          {!loading && filtered.map(batch => {
            const left = dayCount(batch.expiry_date)
            const blocked = batch.status !== 'active'
            const label = blocked ? batch.status : left < 0 ? `Expired ${Math.abs(left)} days ago` : left === 0 ? 'Expires today' : `${left} days left`
            const statusClass = blocked || left < 0 || left <= 7 ? 'badge-danger' : left <= 30 ? 'badge-warning' : 'badge-success'
            return <tr key={batch.id}><td style={{ fontWeight: 500 }}>{batch.product_name}</td><td className="mono">{batch.batch_number}</td><td>{batch.supplier_name || '—'}</td>
              <td>{new Date(batch.expiry_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
              <td><span className={`badge ${statusClass}`}>{label}</span></td>
              <td className="num mono">{Number(batch.quantity_on_hand).toLocaleString()} {batch.unit || ''}<div style={{ color: 'var(--text-muted)', fontSize: 12 }}>TSh {(Number(batch.quantity_on_hand) * Number(batch.unit_cost)).toLocaleString()} at TSh {Number(batch.unit_cost).toLocaleString()}/unit</div></td></tr>
          })}
        </tbody>
      </table></div>
    </div>
  </div>
}
export default ExpiryTracker
