import { useState, useEffect } from 'react'
import axios from 'axios'
import { Factory, ClipboardList, PackageCheck, Wallet, Plus, Trash2, HandCoins, Info } from 'lucide-react'
import { getProducts, getBusinessSettings } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { hasPermission } from '../services/permissions'
import toast from 'react-hot-toast'
import Modal from '../components/Modal'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const api = () => { const token = localStorage.getItem('token'); return axios.create({ baseURL: API_URL, headers: { Authorization: `Bearer ${token}` } }) }
const fmt = (v) => `TSh ${parseFloat(v || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`

// Rangi zinaeleza hali: kijivu = bado, bluu/brand = imetumwa, machungwa = sehemu, kijani = imekamilika, nyekundu = imefutwa
const STATUS = {
  draft: { cls: 'badge-neutral', label: 'Draft' },
  sent: { cls: 'badge-info', label: 'Sent' },
  partial: { cls: 'badge-warning', label: 'Partial' },
  received: { cls: 'badge-success', label: 'Received' },
  cancelled: { cls: 'badge-danger', label: 'Cancelled' },
}

const emptyGrnForm = () => ({ received_date: new Date().toISOString().slice(0, 10), notes: '', vendor_id: '', payment_type: 'cash', amount_paid: '' })

const Procurement = () => {
  const { user } = useAuth()
  const canCreate = hasPermission(user, 'procurement', 'create')
  const canDelete = hasPermission(user, 'procurement', 'delete')
  const [activeTab, setActiveTab] = useState('pos')
  const [vendors, setVendors] = useState([])
  const [pos, setPos] = useState([])
  const [grns, setGrns] = useState([])
  const [products, setProducts] = useState([])
  const [isPharmacy, setIsPharmacy] = useState(false)
  const [showVendorForm, setShowVendorForm] = useState(false)
  const [vendorForm, setVendorForm] = useState({ name: '', contact_person: '', phone: '', email: '', address: '', notes: '' })
  const [vendorLoading, setVendorLoading] = useState(false)
  const [showPOForm, setShowPOForm] = useState(false)
  const [poForm, setPoForm] = useState({ vendor_id: '', expected_date: '', notes: '' })
  const [poItems, setPoItems] = useState([{ product_id: '', product_name: '', quantity_ordered: '', unit_cost: '' }])
  const [poLoading, setPoLoading] = useState(false)
  const [showGRNForm, setShowGRNForm] = useState(false)
  const [selectedPO, setSelectedPO] = useState(null)
  const [grnForm, setGrnForm] = useState(emptyGrnForm())
  const [grnItems, setGrnItems] = useState([{ product_id: '', product_name: '', quantity_received: '', unit_cost: '' }])
  const [grnLoading, setGrnLoading] = useState(false)
  // Vendor payment (MPYA)
  const [payVendor, setPayVendor] = useState(null)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState('cash')
  const [payLoading, setPayLoading] = useState(false)

  useEffect(() => {
    loadAll(); getProducts().then(r => setProducts(r.data)).catch(() => {})
    getBusinessSettings().then(r => setIsPharmacy(r.data?.business_type === 'pharmacy')).catch(() => {})
  }, [])

  const loadAll = () => {
    api().get('/procurement/vendors').then(r => setVendors(r.data)).catch(() => {})
    api().get('/procurement/orders').then(r => setPos(r.data)).catch(() => {})
    api().get('/procurement/grn').then(r => setGrns(r.data)).catch(() => {})
  }

  const handleVendorSubmit = async (e) => {
    e.preventDefault(); if (!vendorForm.name) { toast.error('Vendor name is required'); return }
    setVendorLoading(true)
    try { await api().post('/procurement/vendors', vendorForm); toast.success(`✓ ${vendorForm.name} added!`); setVendorForm({ name: '', contact_person: '', phone: '', email: '', address: '', notes: '' }); setShowVendorForm(false); loadAll() }
    catch (err) { toast.error(err.response?.data?.message || 'Failed') } finally { setVendorLoading(false) }
  }

  const deleteVendor = async (v) => {
    if (!window.confirm(`Delete "${v.name}"?`)) return
    try { await api().delete(`/procurement/vendors/${v.id}`); toast.success('Vendor deleted'); loadAll() }
    catch (err) { toast.error(err.response?.data?.message || 'Failed') }
  }

  // MPYA: Vendor payment — kulipa deni la vendor, hupunguza balance
  const handleVendorPayment = async (e) => {
    e.preventDefault()
    if (!payAmount || parseFloat(payAmount) <= 0) { toast.error('Enter a valid amount'); return }
    if (parseFloat(payAmount) > parseFloat(payVendor.balance)) { toast.error('Amount exceeds the vendor balance'); return }
    setPayLoading(true)
    try {
      await api().post('/procurement/vendor-payments', { vendor_id: payVendor.id, amount: parseFloat(payAmount), payment_method: payMethod })
      toast.success('Payment recorded')
      setPayVendor(null); setPayAmount(''); setPayMethod('cash'); loadAll()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') } finally { setPayLoading(false) }
  }

  const addPOItem = () => setPoItems([...poItems, { product_id: '', product_name: '', quantity_ordered: '', unit_cost: '' }])
  const removePOItem = (i) => setPoItems(poItems.filter((_, idx) => idx !== i))
  const updatePOItem = (i, field, value) => {
    const u = [...poItems]; u[i] = { ...u[i], [field]: value }
    if (field === 'product_id' && value) { const p = products.find(p => p.id == value); if (p) { u[i].product_name = p.name; u[i].unit_cost = p.cost_price || '' } }
    setPoItems(u)
  }

  const handlePOSubmit = async (e) => {
    e.preventDefault()
    const validItems = poItems.filter(i => i.product_name && i.quantity_ordered && i.unit_cost)
    if (!validItems.length) { toast.error('Add at least one product'); return }
    setPoLoading(true)
    try { const res = await api().post('/procurement/orders', { ...poForm, items: validItems }); toast.success(`✓ ${res.data.po_number} created!`); setPoForm({ vendor_id: '', expected_date: '', notes: '' }); setPoItems([{ product_id: '', product_name: '', quantity_ordered: '', unit_cost: '' }]); setShowPOForm(false); loadAll() }
    catch (err) { toast.error(err.response?.data?.message || 'Failed') } finally { setPoLoading(false) }
  }

  const openGRN = async (po) => {
    try {
      const res = await api().get(`/procurement/orders/${po.id}`)
      setSelectedPO(po)
      setGrnItems(res.data.items.map(i => ({ product_id: i.product_id, product_name: i.product_name, quantity_ordered: i.quantity_ordered, quantity_received: i.quantity_ordered, unit_cost: i.unit_cost })))
      setGrnForm({ ...emptyGrnForm(), vendor_id: po.vendor_id || '' })
      setShowGRNForm(true); setActiveTab('grn')
    } catch { toast.error('Failed to load PO') }
  }

  const handleGRNSubmit = async (e) => {
    e.preventDefault()
    const validItems = grnItems.filter(i => parseFloat(i.quantity_received) > 0)
    if (!validItems.length) { toast.error('Enter the quantity received'); return }
    if (isPharmacy && validItems.some(i => !i.batch_number?.trim() || !i.expiry_date)) { toast.error('Enter a batch number and expiry date for each medicine'); return }
    if (grnForm.payment_type === 'credit' && !selectedPO && !grnForm.vendor_id) { toast.error('Select a vendor for credit purchases'); return }
    const total = validItems.reduce((s, i) => s + (parseFloat(i.quantity_received || 0) * parseFloat(i.unit_cost || 0)), 0)
    if (grnForm.payment_type === 'credit' && parseFloat(grnForm.amount_paid || 0) > total) { toast.error('Amount paid cannot exceed the purchase total'); return }
    setGrnLoading(true)
    try {
      const res = await api().post('/procurement/grn/receive', {
        po_id: selectedPO?.id || null,
        vendor_id: grnForm.vendor_id || null,
        payment_type: grnForm.payment_type,
        amount_paid: grnForm.payment_type === 'credit' ? parseFloat(grnForm.amount_paid || 0) : undefined,
        received_date: grnForm.received_date,
        notes: grnForm.notes,
        items: validItems.map(i => ({ product_id: i.product_id, product_name: i.product_name, quantity_received: parseFloat(i.quantity_received), unit_cost: parseFloat(i.unit_cost), batch_number: i.batch_number, expiry_date: i.expiry_date, manufacture_date: i.manufacture_date }))
      })
      toast.success(res.data.message); setShowGRNForm(false); setSelectedPO(null); loadAll()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') } finally { setGrnLoading(false) }
  }

  // ── Helpers za muonekano (logic ya data iko juu, haijaguswa) ──
  const updateGRNItem = (i, patch) => setGrnItems(grnItems.map((it, idx) => idx === i ? { ...it, ...patch } : it))
  const onGrnProduct = (i, value) => {
    const p = products.find(p => p.id == value)
    updateGRNItem(i, p ? { product_id: value, product_name: p.name, unit_cost: p.cost_price || '' } : { product_id: value })
  }
  const lineAmount = (q, c) => (parseFloat(q || 0) * parseFloat(c || 0))
  const poTotal = poItems.reduce((s, i) => s + lineAmount(i.quantity_ordered, i.unit_cost), 0)
  const grnTotal = grnItems.reduce((s, i) => s + lineAmount(i.quantity_received, i.unit_cost), 0)
  const vendorOwed = vendors.reduce((s, v) => s + Number(v.balance || 0), 0)
  const dash = <span style={{ color: 'var(--text-subtle)' }}>—</span>

  const cancelPO = (po) => api().patch(`/procurement/orders/${po.id}/status`, { status: 'cancelled' }).then(() => { toast.success('PO cancelled'); loadAll() })

  return (
    <div style={{ color: 'var(--text)' }}>
      <div className="page-header">
        <div>
          <h1>Procurement</h1>
          <p>Vendors, purchase orders and GRNs</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {activeTab === 'pos' && canCreate && (
            <button className="btn-primary" onClick={() => setShowPOForm(true)}><Plus size={16} strokeWidth={2} /> Purchase Order</button>
          )}
          {activeTab === 'grn' && canCreate && (
            <button className="btn-primary" onClick={() => { setSelectedPO(null); setGrnItems([{ product_id: '', product_name: '', quantity_received: '', unit_cost: '' }]); setGrnForm(emptyGrnForm()); setShowGRNForm(true) }}>
              <Plus size={16} strokeWidth={2} /> Receive without PO
            </button>
          )}
          {activeTab === 'vendors' && canCreate && (
            <button className="btn-primary" onClick={() => setShowVendorForm(true)}><Plus size={16} strokeWidth={2} /> Vendor</button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat"><Factory className="stat-icon" aria-hidden="true" /><p className="stat-label">Vendors</p><p className="stat-value">{vendors.length}</p></div>
        <div className="stat"><ClipboardList className="stat-icon" aria-hidden="true" /><p className="stat-label">Purchase Orders</p><p className="stat-value">{pos.length}</p></div>
        <div className="stat"><PackageCheck className="stat-icon" aria-hidden="true" /><p className="stat-label">GRNs</p><p className="stat-value">{grns.length}</p></div>
        <div className="stat"><Wallet className="stat-icon" aria-hidden="true" /><p className="stat-label">Owed to vendors</p><p className="stat-value" style={{ color: vendorOwed > 0 ? 'var(--danger)' : undefined }}>{fmt(vendorOwed)}</p></div>
      </div>

      {/* Tabs */}
      <div className="tabs" role="tablist">
        {[['pos', 'Purchase Orders', ClipboardList], ['grn', 'GRN / Receiving', PackageCheck], ['vendors', 'Vendors', Factory]].map(([key, label, Icon]) => (
          <button key={key} role="tab" aria-selected={activeTab === key} className={`tab${activeTab === key ? ' active' : ''}`} onClick={() => setActiveTab(key)}>
            <Icon size={17} strokeWidth={1.75} /> {label}
          </button>
        ))}
      </div>

      {/* ═════════ PURCHASE ORDERS ═════════ */}
      {activeTab === 'pos' && (
        <>
          <Modal open={showPOForm} onClose={() => setShowPOForm(false)} title="New purchase order" subtitle="Choose a vendor and the products you want to order" size="xl">
              <form onSubmit={handlePOSubmit}>
                <div className="form-grid" style={{ marginBottom: '20px' }}>
                  <div className="form-group"><label className="form-label">Vendor (optional)</label>
                    <select className="form-input" value={poForm.vendor_id} onChange={e => setPoForm({ ...poForm, vendor_id: e.target.value })}>
                      <option value="">-- Select vendor --</option>{vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select></div>
                  <div className="form-group"><label className="form-label">Expected date</label><input className="form-input" type="date" value={poForm.expected_date} onChange={e => setPoForm({ ...poForm, expected_date: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">Notes</label><input className="form-input" value={poForm.notes} onChange={e => setPoForm({ ...poForm, notes: e.target.value })} placeholder="Notes (optional)" /></div>
                </div>

                <p style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>Items to order</p>
                <div className="table-wrapper" style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                  <div style={{ minWidth: '720px' }}>
                    <div className="line-grid line-head" style={{ gridTemplateColumns: '2fr 1.6fr 0.8fr 1fr 1fr 34px', marginBottom: '6px' }}>
                      <span>Product</span><span>Name (or type)</span><span>Qty</span><span>Price (TSh)</span><span style={{ textAlign: 'right' }}>Total</span><span />
                    </div>
                    {poItems.map((item, i) => (
                      <div key={i} className="line-grid" style={{ gridTemplateColumns: '2fr 1.6fr 0.8fr 1fr 1fr 34px', marginBottom: '8px' }}>
                        <select className="form-input compact" style={{ height: '34px' }} value={item.product_id} onChange={e => updatePOItem(i, 'product_id', e.target.value)}>
                          <option value="">-- Select --</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <input className="form-input" style={{ height: '34px' }} value={item.product_name} onChange={e => updatePOItem(i, 'product_name', e.target.value)} placeholder="Product name" required />
                        <input className="form-input mono" style={{ height: '34px' }} type="number" value={item.quantity_ordered} onChange={e => updatePOItem(i, 'quantity_ordered', e.target.value)} placeholder="0" min="0.01" step="0.01" />
                        <input className="form-input mono" style={{ height: '34px' }} type="number" value={item.unit_cost} onChange={e => updatePOItem(i, 'unit_cost', e.target.value)} placeholder="0" min="0" step="0.01" />
                        <span className="mono" style={{ textAlign: 'right', fontWeight: '500' }}>{fmt(lineAmount(item.quantity_ordered, item.unit_cost))}</span>
                        <button type="button" className="icon-btn danger" onClick={() => removePOItem(i)} disabled={poItems.length === 1} aria-label="Remove item"><Trash2 size={16} strokeWidth={1.75} /></button>
                      </div>
                    ))}
                  </div>
                </div>
                <button type="button" className="btn btn-sm" onClick={addPOItem}><Plus size={14} strokeWidth={2} /> Add item</button>

                {poTotal > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '16px 0 0', padding: '12px 14px', borderTop: '1px solid var(--border)' }}>
                    <span style={{ fontWeight: '600' }}>PO total</span>
                    <span className="mono" style={{ fontSize: '20px', fontWeight: '700' }}>{fmt(poTotal)}</span>
                  </div>
                )}
                <div className="modal-actions sticky">
                  <button type="submit" className="btn-primary" disabled={poLoading}>{poLoading ? 'Creating...' : 'Create purchase order'}</button>
                  <button type="button" className="btn" onClick={() => setShowPOForm(false)}>Cancel</button>
                </div>
              </form>
          </Modal>

          <div className="table-card">
            <div className="table-wrapper">
              <table className="data-table" style={{ minWidth: '640px' }}>
                <thead><tr><th>PO Number</th><th>Vendor</th><th>Expected date</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
                <tbody>
                  {pos.length === 0 && <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-subtle)' }}>No purchase orders yet.</td></tr>}
                  {pos.map(po => {
                    const s = STATUS[po.status] || STATUS.draft
                    const open = po.status !== 'received' && po.status !== 'cancelled'
                    return (
                      <tr key={po.id}>
                        <td className="mono" style={{ fontWeight: '600' }}>{po.po_number}</td>
                        <td>{po.vendor_name || dash}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{po.expected_date ? new Date(po.expected_date).toLocaleDateString('en-GB') : '—'}</td>
                        <td><span className={`badge ${s.cls}`}>{s.label}</span></td>
                        <td>
                          <div className="actions">
                            {open && canCreate && <button className="btn btn-sm" onClick={() => openGRN(po)}><PackageCheck size={14} strokeWidth={1.75} /> Receive</button>}
                            {open && <button className="btn btn-sm" style={{ color: 'var(--danger)' }} onClick={() => cancelPO(po)}>Cancel</button>}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ═════════ GRN ═════════ */}
      {activeTab === 'grn' && (
        <>
          <Modal open={showGRNForm} onClose={() => { setShowGRNForm(false); setSelectedPO(null) }} title={`Receive goods ${selectedPO ? `— ${selectedPO.po_number}` : '(no PO)'}`} subtitle={selectedPO ? `Vendor: ${selectedPO.vendor_name || '—'}` : 'Stock increases automatically when you receive'} size="xl">
              <form onSubmit={handleGRNSubmit}>
                <div style={{ display: 'flex', gap: '8px', maxWidth: '360px', marginBottom: '16px' }}>
                  {[['cash', 'Cash'], ['credit', 'Credit']].map(([t, label]) => (
                    <button type="button" key={t} className={`seg-btn${grnForm.payment_type === t ? ' active' : ''}`} onClick={() => setGrnForm({ ...grnForm, payment_type: t })}>{label}</button>
                  ))}
                </div>

                <div className="form-grid" style={{ marginBottom: '16px' }}>
                  {!selectedPO && (
                    <div className="form-group">
                      <label className="form-label">Vendor {grnForm.payment_type === 'credit' ? '*' : '(optional)'}</label>
                      <select className="form-input" value={grnForm.vendor_id} onChange={e => setGrnForm({ ...grnForm, vendor_id: e.target.value })} required={grnForm.payment_type === 'credit'}>
                        <option value="">-- Select vendor --</option>
                        {vendors.map(v => <option key={v.id} value={v.id}>{v.name}{Number(v.balance) > 0 ? ` (Owed: ${fmt(v.balance)})` : ''}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="form-group"><label className="form-label">Received date *</label><input className="form-input" type="date" value={grnForm.received_date} onChange={e => setGrnForm({ ...grnForm, received_date: e.target.value })} required /></div>
                  <div className="form-group"><label className="form-label">Notes</label><input className="form-input" value={grnForm.notes} onChange={e => setGrnForm({ ...grnForm, notes: e.target.value })} placeholder="Notes (optional)" /></div>
                  {grnForm.payment_type === 'credit' && (
                    <div className="form-group"><label className="form-label">Amount paid sasa (optional)</label><input className="form-input mono" type="number" value={grnForm.amount_paid} onChange={e => setGrnForm({ ...grnForm, amount_paid: e.target.value })} placeholder="0" min="0" step="0.01" /></div>
                  )}
                </div>

                <p style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>Items received</p>
                <div className="table-wrapper" style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                  <div style={{ minWidth: '680px' }}>
                    <div className="line-grid line-head" style={{ gridTemplateColumns: selectedPO ? '2fr 1.6fr 1fr 1fr 1fr' : '2fr 1.6fr 1fr 1fr 1fr 34px', marginBottom: '6px' }}>
                      <span>Product</span><span>Name</span><span>Qty received</span><span>Price (TSh)</span><span style={{ textAlign: 'right' }}>Total</span>{!selectedPO && <span />}
                    </div>
                    {grnItems.map((item, i) => (
                      <div key={i} className="line-grid" style={{ gridTemplateColumns: selectedPO ? '2fr 1.6fr 1fr 1fr 1fr' : '2fr 1.6fr 1fr 1fr 1fr 34px', marginBottom: '8px' }}>
                        <select className="form-input" style={{ height: '34px' }} value={item.product_id} onChange={e => onGrnProduct(i, e.target.value)}>
                          <option value="">-- Select --</option>{products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>)}
                        </select>
                        <input className="form-input" style={{ height: '34px' }} value={item.product_name} onChange={e => updateGRNItem(i, { product_name: e.target.value })} placeholder="Name" required />
                        <input className="form-input mono" style={{ height: '34px' }} type="number" value={item.quantity_received} onChange={e => updateGRNItem(i, { quantity_received: e.target.value })} placeholder="0" min="0.01" step="0.01" required />
                        <input className="form-input mono" style={{ height: '34px' }} type="number" value={item.unit_cost} onChange={e => updateGRNItem(i, { unit_cost: e.target.value })} placeholder="0" min="0" step="0.01" />
                        <span className="mono" style={{ textAlign: 'right', fontWeight: '500' }}>{fmt(lineAmount(item.quantity_received, item.unit_cost))}</span>
                        {!selectedPO && <button type="button" className="icon-btn danger" onClick={() => setGrnItems(grnItems.filter((_, idx) => idx !== i))} disabled={grnItems.length === 1} aria-label="Remove item"><Trash2 size={16} strokeWidth={1.75} /></button>}
                        {isPharmacy && <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(120px, 1fr))', gap: 8 }}>
                          <input className="form-input" aria-label="Batch number" value={item.batch_number || ''} onChange={e => updateGRNItem(i, { batch_number: e.target.value })} placeholder="Batch / lot number *" required />
                          <input className="form-input" aria-label="Expiry date" type="date" value={item.expiry_date || ''} onChange={e => updateGRNItem(i, { expiry_date: e.target.value })} required />
                          <input className="form-input" aria-label="Manufacture date" type="date" value={item.manufacture_date || ''} onChange={e => updateGRNItem(i, { manufacture_date: e.target.value })} title="Manufacture date (optional)" />
                        </div>}
                      </div>
                    ))}
                  </div>
                </div>
                {!selectedPO && <button type="button" className="btn btn-sm" onClick={() => setGrnItems([...grnItems, { product_id: '', product_name: '', quantity_received: '', unit_cost: '' }])}><Plus size={14} strokeWidth={2} /> Add</button>}

                {grnTotal > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '16px 0 0', padding: '12px 14px', borderTop: '1px solid var(--border)' }}>
                    <span style={{ fontWeight: '600' }}>Purchase total</span>
                    <span className="mono" style={{ fontSize: '20px', fontWeight: '700' }}>{fmt(grnTotal)}</span>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', background: 'var(--success-soft)', borderRadius: '6px', padding: '10px 12px', margin: '12px 0 16px', fontSize: '13px', color: 'var(--success)' }}>
                  <Info size={18} strokeWidth={1.75} style={{ flexShrink: 0, marginTop: '1px' }} />
                  <span>When you click "Receive", product stock increases automatically.</span>
                </div>
                <div className="modal-actions sticky">
                  <button type="submit" className="btn-primary" disabled={grnLoading}>{grnLoading ? 'Receiving...' : 'Receive goods'}</button>
                  <button type="button" className="btn" onClick={() => { setShowGRNForm(false); setSelectedPO(null) }}>Cancel</button>
                </div>
              </form>
          </Modal>

          <div className="table-card">
            <div className="table-wrapper">
              <table className="data-table" style={{ minWidth: '700px' }}>
                <thead><tr><th>GRN Number</th><th>Vendor</th><th>PO Reference</th><th>Payment</th><th>Date</th><th>Received by</th></tr></thead>
                <tbody>
                  {grns.length === 0 && <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-subtle)' }}>No GRNs yet.</td></tr>}
                  {grns.map(g => (
                    <tr key={g.id}>
                      <td className="mono" style={{ fontWeight: '600' }}>{g.grn_number}</td>
                      <td>{g.vendor_name || dash}</td>
                      <td className="mono">{g.po_number || <span style={{ color: 'var(--text-subtle)' }}>Bila PO</span>}</td>
                      <td>
                        <span className={`badge ${g.payment_type === 'credit' ? 'badge-warning' : 'badge-success'}`}>
                          {g.payment_type === 'credit' ? `Credit · ${fmt(g.amount_paid)}/${fmt(g.total_amount)}` : 'Cash'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{new Date(g.received_date).toLocaleDateString('en-GB')}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{g.received_by_name || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ═════════ VENDORS ═════════ */}
      {activeTab === 'vendors' && (
        <>
          <Modal open={showVendorForm} onClose={() => setShowVendorForm(false)} title="New vendor" subtitle="Only the name is required" size="lg">
              <form onSubmit={handleVendorSubmit}>
                <div className="form-grid">
                  {[['name', 'Vendor name *', 'e.g. Dangote Cement Ltd', 'text'], ['contact_person', 'Contact person', 'e.g. John Makori', 'text'], ['phone', 'Phone', '0754123456', 'tel'], ['email', 'Email', 'vendor@email.com', 'email'], ['address', 'Address', 'e.g. Dar es Salaam', 'text'], ['notes', 'Notes', 'Notes (optional)', 'text']].map(([field, label, placeholder, type]) => (
                    <div className="form-group" key={field}>
                      <label className="form-label">{label}</label>
                      <input className="form-input" type={type} value={vendorForm[field]} placeholder={placeholder} onChange={e => setVendorForm({ ...vendorForm, [field]: e.target.value })} required={field === 'name'} />
                    </div>
                  ))}
                </div>
                <div className="modal-actions sticky">
                  <button type="submit" className="btn-primary" disabled={vendorLoading}>{vendorLoading ? 'Saving...' : 'Save vendor'}</button>
                  <button type="button" className="btn" onClick={() => setShowVendorForm(false)}>Cancel</button>
                </div>
              </form>
          </Modal>

          <div className="table-card">
            <div className="table-wrapper">
              <table className="data-table" style={{ minWidth: '800px' }}>
                <thead><tr><th>Name</th><th>Contact</th><th>Phone</th><th>Email</th><th>Address</th><th className="num">Balance</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
                <tbody>
                  {vendors.length === 0 && <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-subtle)' }}>No vendors yet.</td></tr>}
                  {vendors.map(v => (
                    <tr key={v.id}>
                      <td style={{ fontWeight: '600' }}>{v.name}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{v.contact_person || '—'}</td>
                      <td>{v.phone || '—'}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{v.email || '—'}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{v.address || '—'}</td>
                      <td className="num mono">{Number(v.balance) > 0 ? <span style={{ color: 'var(--danger)', fontWeight: '600' }}>{fmt(v.balance)}</span> : dash}</td>
                      <td>
                        <div className="actions">
                          {canCreate && Number(v.balance) > 0 && <button className="btn btn-sm" onClick={() => setPayVendor(v)}><HandCoins size={14} strokeWidth={1.75} /> Pay</button>}
                          {canDelete && <button className="icon-btn danger" onClick={() => deleteVendor(v)} title="Delete" aria-label={`Delete ${v.name}`}><Trash2 size={16} strokeWidth={1.75} /></button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Vendor payment modal */}
      {payVendor && (
        <div className="modal-overlay" onClick={() => setPayVendor(null)}>
          <div className="modal" style={{ maxWidth: '380px' }} onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Pay {payVendor.name}</h3>
            <p className="modal-sub" style={{ marginBottom: '20px' }}>Current balance: <strong style={{ color: 'var(--danger)' }}>{fmt(payVendor.balance)}</strong></p>
            <form onSubmit={handleVendorPayment}>
              <div className="form-group"><label className="form-label">Amount *</label><input className="form-input mono" type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0" min="0.01" step="0.01" required /></div>
              <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Payment method</label>
                <select className="form-input" value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                  <option value="cash">Cash</option><option value="bank">Bank</option><option value="mobile">Mobile Money</option>
                </select></div>
              <div className="modal-actions">
                <button type="button" className="btn" onClick={() => setPayVendor(null)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={payLoading}>{payLoading ? 'Recording...' : 'Record payment'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Procurement
