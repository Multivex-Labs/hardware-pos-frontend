import { useState, useEffect } from 'react'
import { Lock, Search, Eye } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { getAuditLogs } from '../services/api'
import toast from 'react-hot-toast'
import Modal from '../components/Modal'

// Rangi zina maana: nyekundu = kufuta/void, machungwa = kuhariri, brand = mabadiliko ya bei
const ACTION_BADGE = {
  VOID_SALE: 'badge-danger',
  EDIT_RECEIPT: 'badge-warning',
  PRICE_CHANGE: 'badge-info',
}

const AuditLog = () => {
  const { t } = useLanguage()
  const { user } = useAuth()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [selectedLog, setSelectedLog] = useState(null)

  const canView = user?.role === 'admin' || user?.role === 'manager'

  useEffect(() => {
    if (!canView) { setLoading(false); return }
    getAuditLogs(300)
      .then(r => setLogs(r.data))
      .catch(() => toast.error('Failed to load audit log'))
      .finally(() => setLoading(false))
  }, [canView])

  if (!canView) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
        <Lock size={36} strokeWidth={1.5} style={{ marginBottom: '12px' }} />
        <p style={{ fontSize: '15px' }}>{t('auditLog.noAccess')}</p>
      </div>
    )
  }

  const actionTypes = ['all', ...new Set(logs.map(l => l.action_type))]

  const filtered = logs.filter(l => {
    const matchesAction = actionFilter === 'all' || l.action_type === actionFilter
    const matchesSearch = !search || (l.user_name || '').toLowerCase().includes(search.toLowerCase())
    return matchesAction && matchesSearch
  })

  const actionLabel = (action) => {
    const label = t(`auditLog.actionLabels.${action}`)
    return label !== `auditLog.actionLabels.${action}` ? label : action
  }

  const actionBadge = (action) => (
    <span className={`badge ${ACTION_BADGE[action] || 'badge-neutral'}`}>{actionLabel(action)}</span>
  )

  const jsonBlock = (value, tone) => (
    <pre style={{
      background: tone === 'before' ? 'var(--danger-soft)' : 'var(--success-soft)', border: '1px solid var(--border-light)',
      borderRadius: '8px', padding: '12px', fontSize: '12px', color: 'var(--text)', overflow: 'auto', marginTop: '6px', maxHeight: '260px',
    }} className="mono">{JSON.stringify(value, null, 2) || '—'}</pre>
  )

  return (
    <div style={{ color: 'var(--text)' }}>
      {/* Kichwa kikuu kinatoka Reports (tab hii iko ndani yake) */}
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>{t('auditLog.subtitle')}</p>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '420px' }}>
          <Search size={16} strokeWidth={1.75} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)', pointerEvents: 'none' }} />
          <input className="form-input" style={{ paddingLeft: '36px' }} type="text" placeholder={t('auditLog.searchPlaceholder')} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-input" style={{ width: 'auto', minWidth: '180px' }} value={actionFilter} onChange={e => setActionFilter(e.target.value)}>
          {actionTypes.map(a => <option key={a} value={a}>{a === 'all' ? t('auditLog.filterAll') : a}</option>)}
        </select>
      </div>

      <div className="table-card">
        <div className="table-wrapper">
          <table className="data-table" style={{ minWidth: '760px' }}>
            <thead>
              <tr>
                <th>{t('auditLog.table.date')}</th><th>{t('auditLog.table.user')}</th><th>{t('auditLog.table.action')}</th>
                <th>{t('auditLog.table.record')}</th><th>{t('auditLog.table.reason')}</th><th style={{ width: '110px' }}></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6}><div className="loading-row"><span className="spinner" /> {t('common.loading')}</div></td></tr>}
              {!loading && filtered.map(log => (
                <tr key={log.id}>
                  <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(log.created_at).toLocaleString('en-GB')}</td>
                  <td style={{ fontWeight: '500' }}>{log.user_name || `User #${log.user_id}`}</td>
                  <td>{actionBadge(log.action_type)}</td>
                  <td className="mono" style={{ color: 'var(--text-muted)' }}>{log.table_affected} #{log.record_id}</td>
                  <td style={{ color: 'var(--text-muted)', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.reason || '—'}</td>
                  <td><button className="btn btn-sm" onClick={() => setSelectedLog(log)}><Eye size={14} strokeWidth={1.75} /> {t('auditLog.viewDetails')}</button></td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-subtle)' }}>{t('auditLog.noLogs')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p style={{ textAlign: 'center', color: 'var(--text-subtle)', fontSize: '13px', marginTop: '12px' }}>
        {filtered.length.toLocaleString()} of {logs.length.toLocaleString()} records (latest 300)
      </p>

      <Modal
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title={selectedLog ? t('auditLog.detailsTitle')(selectedLog.id) : ''}
        subtitle={selectedLog ? `${new Date(selectedLog.created_at).toLocaleString('en-GB')} — ${selectedLog.user_name || ''}` : ''}
        size="lg"
        dismissOnOverlay
      >
        {selectedLog && (
          <>
            <div style={{ marginBottom: '16px' }}>
              <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>{t('auditLog.table.reason')}</span>
              <p style={{ marginTop: '4px', fontSize: '14px' }}>{selectedLog.reason || '—'}</p>
            </div>
            <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--danger)' }}>{t('auditLog.before')}</span>
                {jsonBlock(selectedLog.old_value, 'before')}
              </div>
              <div>
                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--success)' }}>{t('auditLog.after')}</span>
                {jsonBlock(selectedLog.new_value, 'after')}
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setSelectedLog(null)}>{t('common.close')}</button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}

export default AuditLog
