import { useState } from 'react'
import { Search, ArrowLeft } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import toast from 'react-hot-toast'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const fmtTZS = (v) => `TSh ${parseFloat(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const REASONS = ['Defective product', 'Wrong item', 'Customer changed mind', 'Other']

const Returns = ({ sales, onDone }) => {
  const { t } = useLanguage()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSale, setSelectedSale] = useState(null)
  const [detail, setDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [returnQty, setReturnQty] = useState({})
  const [itemReason, setItemReason] = useState({})
  const [refundMethod, setRefundMethod] = useState('cash')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const token = () => localStorage.getItem('token')

  const filteredSales = searchQuery
    ? sales.filter(s => s.id.toString() === searchQuery.trim() || (s.client_name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (s.walkin_name || '').toLowerCase().includes(searchQuery.toLowerCase()))
    : sales.slice(0, 15)

  const customerLabel = (sale) => sale.walkin_name || sale.client_name || 'Walk-in Customer'

  const openSale = async (sale) => {
    setSelectedSale(sale)
    setDetail(null)
    setReturnQty({})
    setItemReason({})
    setRefundMethod('cash')
    setNotes('')
    setLoadingDetail(true)
    try {
      const res = await axios.get(`${API_URL}/sales/${sale.id}/returnable`, { headers: { Authorization: `Bearer ${token()}` } })
      setDetail(res.data)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load receipt')
      setSelectedSale(null)
    } finally {
      setLoadingDetail(false)
    }
  }

  const setQty = (item, val) => {
    let q = parseInt(val)
    if (isNaN(q) || q < 0) q = 0
    if (q > item.max_returnable) { toast.error(t('returns.maxReturnable')(item.max_returnable)); q = item.max_returnable }
    setReturnQty({ ...returnQty, [item.sale_item_id]: q })
  }

  const itemsToReturn = detail ? detail.items.filter(i => (returnQty[i.sale_item_id] || 0) > 0) : []
  const totalRefund = itemsToReturn.reduce((s, i) => s + (i.price * returnQty[i.sale_item_id]), 0)

  const submitReturn = async () => {
    if (itemsToReturn.length === 0) { toast.error(t('returns.pickAtLeastOne')); return }
    if (refundMethod === 'store_credit' && !detail.sale.client_id) { toast.error(t('returns.needRegisteredClient')); return }
    setSubmitting(true)
    try {
      const payload = {
        sale_id: detail.sale.id,
        refund_method: refundMethod,
        reason: itemsToReturn.map(i => itemReason[i.sale_item_id]).filter(Boolean).join('; ') || null,
        notes: notes || null,
        items: itemsToReturn.map(i => ({
          sale_item_id: i.sale_item_id,
          quantity_returned: returnQty[i.sale_item_id],
          reason: itemReason[i.sale_item_id] || null
        }))
      }
      const res = await axios.post(`${API_URL}/returns`, payload, { headers: { Authorization: `Bearer ${token()}` } })
      toast.success(res.data.message || '✓ Return completed!')
      setSelectedSale(null)
      setDetail(null)
      setReturnQty({})
      setItemReason({})
      setNotes('')
      onDone && onDone()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Return failed')
    } finally {
      setSubmitting(false)
    }
  }


  const saleBadge = (type) => (type === 'credit' ? 'credit' : type === 'deposit' ? 'deposit' : 'cash')
  const saleLabel = (type) => (type === 'credit' ? 'Credit' : type === 'deposit' ? 'Deposit' : 'Cash')
  const storeCreditBlocked = detail && refundMethod === 'store_credit' && !detail.sale.client_id

  return (
    <div>
      <style>{`
        .ret-layout { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 16px; align-items: start; }
        .ret-summary { position: sticky; top: 16px; }
        @media (max-width: 1023px) { .ret-layout { grid-template-columns: minmax(0, 1fr); } .ret-summary { position: static; } }
      `}</style>

      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '2px' }}>{t('returns.title')}</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('returns.subtitle')}</p>
      </div>

      {!selectedSale ? (
        <div>
          <div style={{ position: 'relative', maxWidth: '460px', marginBottom: '16px' }}>
            <Search size={16} strokeWidth={1.75} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)', pointerEvents: 'none' }} />
            <input className="form-input" style={{ paddingLeft: '36px' }} type="text" placeholder={t('returns.searchPlaceholder')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>

          <div className="table-card">
            <div className="table-wrapper">
              <table className="data-table" style={{ minWidth: '620px' }}>
                <thead>
                  <tr>
                    <th>{t('returns.table.id')}</th><th>{t('returns.table.customer')}</th><th>{t('returns.table.type')}</th>
                    <th className="num">{t('returns.table.total')}</th><th>{t('returns.table.date')}</th><th style={{ width: '90px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.map(s => (
                    <tr key={s.id}>
                      <td className="mono" style={{ color: 'var(--text-muted)' }}>#{s.id}</td>
                      <td style={{ fontWeight: '500' }}>{customerLabel(s)}</td>
                      <td><span className={`badge badge-${saleBadge(s.sale_type)}`}>{saleLabel(s.sale_type)}</span></td>
                      <td className="num mono" style={{ fontWeight: '600' }}>{fmtTZS(s.total)}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{new Date(s.created_at).toLocaleDateString('en-GB')}</td>
                      <td><button className="btn btn-sm" onClick={() => openSale(s)}>{t('returns.choose')}</button></td>
                    </tr>
                  ))}
                  {filteredSales.length === 0 && (
                    <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-subtle)' }}>{t('returns.noMatch')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <button className="btn btn-sm" style={{ marginBottom: '16px' }} onClick={() => { setSelectedSale(null); setDetail(null) }}>
            <ArrowLeft size={15} strokeWidth={1.75} /> {t('returns.backToList')}
          </button>

          {loadingDetail ? (
            <div className="loading-row"><span className="spinner" /> {t('returns.loadingReceipt')(selectedSale.id)}</div>
          ) : detail && (
            <div className="ret-layout">
              {/* Items */}
              <div className="table-card">
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: '600' }}>{t('returns.receiptHeader')(detail.sale.id, customerLabel(detail.sale))}</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(detail.sale.created_at).toLocaleString('en-GB')}</p>
                </div>
                <div className="table-wrapper">
                  <table className="data-table" style={{ minWidth: '560px' }}>
                    <thead>
                      <tr>
                        <th>{t('returns.itemsTable.product')}</th><th className="num">{t('returns.itemsTable.price')}</th>
                        <th className="num">{t('returns.itemsTable.sold')}</th><th className="num">{t('returns.itemsTable.returned')}</th>
                        <th className="num">{t('returns.itemsTable.returnable')}</th><th style={{ width: '96px' }}>{t('returns.itemsTable.qty')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.items.map(item => (
                        <tr key={item.sale_item_id}>
                          <td style={{ fontWeight: '500' }}>{item.product_name}</td>
                          <td className="num mono">{fmtTZS(item.price)}</td>
                          <td className="num mono" style={{ color: 'var(--text-muted)' }}>{item.quantity}</td>
                          <td className="num mono" style={{ color: 'var(--text-muted)' }}>{item.already_returned}</td>
                          <td className="num mono" style={{ fontWeight: '600', color: item.max_returnable > 0 ? 'var(--success)' : 'var(--danger)' }}>{item.max_returnable}</td>
                          <td>
                            <input className="form-input compact mono" style={{ width: '76px', textAlign: 'center' }} type="number" min="0" max={item.max_returnable}
                              disabled={item.max_returnable === 0} value={returnQty[item.sale_item_id] || 0} onChange={e => setQty(item, e.target.value)} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {itemsToReturn.length > 0 && (
                  <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
                    <label className="form-label">{t('returns.reasonLabel')}</label>
                    {itemsToReturn.map(item => (
                      <div key={item.sale_item_id} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)', width: '170px', flexShrink: 0 }}>{item.product_name}</span>
                        <select className="form-input" style={{ flex: '1 1 200px' }} value={itemReason[item.sale_item_id] || ''} onChange={e => setItemReason({ ...itemReason, [item.sale_item_id]: e.target.value })}>
                          <option value="">{t('returns.chooseReason')}</option>
                          {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="ret-summary">
                <div className="card" style={{ marginBottom: 0 }}>
                  <h4 className="card-title" style={{ fontSize: '15px', marginBottom: '16px' }}>Return summary</h4>

                  <div className="form-group">
                    <label className="form-label">{t('returns.refundMethod')}</label>
                    <select className="form-input" value={refundMethod} onChange={e => setRefundMethod(e.target.value)}>
                      <option value="cash">{t('returns.refundCash')}</option>
                      <option value="store_credit">{t('returns.refundStoreCredit')}</option>
                      <option value="exchange">{t('returns.refundExchange')}</option>
                    </select>
                    {storeCreditBlocked && <p className="form-error">{t('returns.storeCreditWarning')}</p>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">{t('returns.notesLabel')}</label>
                    <textarea className="form-input" style={{ resize: 'vertical' }} rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('returns.notesPlaceholder')} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1px solid var(--border)', paddingTop: '14px', marginBottom: '16px' }}>
                    <span style={{ fontWeight: '600' }}>{t('returns.refundTotal')}</span>
                    <span className="mono" style={{ fontSize: '22px', fontWeight: '700', color: totalRefund > 0 ? 'var(--danger)' : 'var(--text)' }}>{fmtTZS(totalRefund)}</span>
                  </div>

                  <button className="btn-primary btn-lg btn-block" onClick={submitReturn} disabled={submitting || itemsToReturn.length === 0 || storeCreditBlocked}>
                    {submitting ? t('returns.submitting') : t('returns.submit')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Returns
