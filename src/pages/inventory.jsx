import { useState, useEffect } from 'react'
import {
  getProducts, createProduct, updateProduct, deleteProduct,
  getStockMovements, createStockAdjustment,
  getProductUnits, createProductUnit, deleteProductUnit,
  getStockConversions, createStockConversion,
  getBusinessSettings
} from '../services/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import Modal from '../components/Modal'
import { Package, History, ArrowLeftRight, Plus, X, Search, Pencil, Layers, Scale, Trash2, Pill, ArrowUp, ArrowDown, Info, Banknote, TriangleAlert, PackageX } from 'lucide-react'

const EMPTY_FORM = {
  name: '', description: '', price: '', wholesale_price: '', cost_price: '',
  stock: '', unit: 'PC', low_stock_alert: 5, category: '', shelf: '',
  // Pharmacy (hiari, zinaonekana tu ikiwa business_type === 'pharmacy')
  expiry_date: '', batch_number: '', requires_prescription: false, dosage: '', manufacturer: '', drug_category: ''
}
const UNITS = ['PC', 'KG', 'L', 'M', 'M2', 'BAG', 'BOX', 'ROLL', 'PAIR', 'SET', 'TIN', 'BTL']
const DRUG_CATEGORIES = [
  { value: '', label: '— Select —' },
  { value: 'otc', label: 'OTC (Over-the-counter)' },
  { value: 'prescription', label: 'Prescription' },
  { value: 'controlled', label: 'Controlled substance' },
  { value: 'supplement', label: 'Supplement' }
]

const MOVEMENT_TYPES = [
  { value: '', label: 'All types' },
  { value: 'sale', label: 'Sale' },
  { value: 'purchase', label: 'Purchase (GRN)' },
  { value: 'return', label: 'Return' },
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'damage', label: 'Damage' },
  { value: 'transfer_in', label: 'Transfer in' },
  { value: 'transfer_out', label: 'Transfer out' },
  { value: 'void_reversal', label: 'Void reversal' },
  { value: 'dispensing', label: 'Dispensing' }
]

// Rangi zinaeleza mwelekeo: kijani = stock inaingia, nyekundu = inatoka, machungwa = marekebisho
const MOVEMENT_LABELS = {
  sale: { label: 'Sale', cls: 'badge-danger' },
  purchase: { label: 'Purchase', cls: 'badge-success' },
  return: { label: 'Return', cls: 'badge-success' },
  adjustment: { label: 'Adjustment', cls: 'badge-warning' },
  damage: { label: 'Damage', cls: 'badge-danger' },
  transfer_in: { label: 'Transfer in', cls: 'badge-success' },
  transfer_out: { label: 'Transfer out', cls: 'badge-danger' },
  void_reversal: { label: 'Void reversal', cls: 'badge-info' },
  dispensing: { label: 'Dispensing', cls: 'badge-info' }
}

const StockBadge = ({ stock, min }) => {
  const s = Number(stock), m = Number(min)
  if (s === 0) return <span className="badge badge-out">OUT</span>
  if (s <= m) return <span className="badge badge-low">LOW</span>
  return <span className="badge badge-ok">OK</span>
}

const fmtTZS = (v) => `TSh ${parseFloat(v || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`

const daysUntil = (dateStr) => Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24))
const ExpiryBadge = ({ date }) => {
  if (!date) return <span style={{ color: 'var(--text-subtle)' }}>—</span>
  const d = daysUntil(date)
  const label = new Date(date).toLocaleDateString('en-GB')
  const cls = d < 0 ? 'badge-danger' : d <= 30 ? 'badge-warning' : 'badge-success'
  return <span className={`badge ${cls}`}>{d < 0 ? 'EXPIRED' : label}</span>
}

const TABS = [
  { key: 'products', label: 'Products', icon: Package },
  { key: 'movements', label: 'Stock History', icon: History },
  { key: 'conversions', label: 'Conversions', icon: ArrowLeftRight }
]

const Inventory = () => {
  const { user } = useAuth()
  const canAdjustStock = user?.role === 'admin' || user?.role === 'manager'
  const canManageUnits = user?.role === 'admin'
  const canConvert = user?.role === 'admin' || user?.role === 'manager'

  const [businessType, setBusinessType] = useState('general')
  const isPharmacy = businessType === 'pharmacy'

  const [activeTab, setActiveTab] = useState('products')

  // ── Products state ──────────────────────────────────────────────
  const [products, setProducts] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)

  // ── Stock Movement state ────────────────────────────────────────
  const [movements, setMovements] = useState([])
  const [movementsLoading, setMovementsLoading] = useState(false)
  const [movementTypeFilter, setMovementTypeFilter] = useState('')
  const [movementProductFilter, setMovementProductFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // ── Adjustment modal state ──────────────────────────────────────
  const [showAdjustModal, setShowAdjustModal] = useState(false)
  const [adjustForm, setAdjustForm] = useState({ product_id: '', movement_type: 'adjustment', direction: 'decrease', quantity: '', reason: '' })
  const [adjustSubmitting, setAdjustSubmitting] = useState(false)

  // ── Unit Conversion (packages) modal state ───────────────────────
  const [showUnitsModal, setShowUnitsModal] = useState(false)
  const [unitsProduct, setUnitsProduct] = useState(null)
  const [productUnitsList, setProductUnitsList] = useState([])
  const [unitsLoading, setUnitsLoading] = useState(false)
  const [newUnit, setNewUnit] = useState({ unit_name: '', conversion_factor: '', selling_price: '', wholesale_price: '' })
  const [unitSubmitting, setUnitSubmitting] = useState(false)

  // ── Stock Conversions (product -> product) state ─────────────────
  const [conversions, setConversions] = useState([])
  const [conversionsLoading, setConversionsLoading] = useState(false)
  const [showConversionModal, setShowConversionModal] = useState(false)
  const [conversionForm, setConversionForm] = useState({ from_product_id: '', from_quantity: '', to_product_id: '', to_quantity: '', reason: '' })
  const [conversionSubmitting, setConversionSubmitting] = useState(false)

  const categories = ['All', ...new Set(products.map(p => p.category).filter(Boolean))]

  useEffect(() => {
    loadProducts()
    getBusinessSettings().then(r => setBusinessType(r.data?.business_type || 'general')).catch(() => {})
  }, [])

  useEffect(() => {
    if (activeTab === 'movements') loadMovements()
    if (activeTab === 'conversions') loadConversions()
  }, [activeTab, movementTypeFilter, movementProductFilter, dateFrom, dateTo])

  useEffect(() => {
    let list = products
    if (categoryFilter !== 'All') list = list.filter(p => p.category === categoryFilter)
    if (search) list = list.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category?.toLowerCase().includes(search.toLowerCase()) ||
      p.shelf?.toLowerCase().includes(search.toLowerCase())
    )
    setFiltered(list)
  }, [products, search, categoryFilter])

  const loadProducts = () => {
    getProducts().then(r => setProducts(r.data)).catch(() => toast.error('Failed to load products'))
  }

  const loadMovements = () => {
    setMovementsLoading(true)
    const params = { limit: 100 }
    if (movementTypeFilter) params.movement_type = movementTypeFilter
    if (movementProductFilter) params.product_id = movementProductFilter
    if (dateFrom) params.date_from = dateFrom
    if (dateTo) params.date_to = dateTo

    getStockMovements(params)
      .then(r => setMovements(r.data.data || []))
      .catch(() => toast.error('Failed to load stock history'))
      .finally(() => setMovementsLoading(false))
  }

  const loadConversions = () => {
    setConversionsLoading(true)
    getStockConversions()
      .then(r => setConversions(r.data))
      .catch(() => toast.error('Failed to load conversions'))
      .finally(() => setConversionsLoading(false))
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value })
  }

  const handleEdit = (p) => {
    setForm({
      name: p.name, description: p.description || '', price: p.price, wholesale_price: p.wholesale_price || '', cost_price: p.cost_price || '',
      stock: p.stock, unit: p.unit || 'PC', low_stock_alert: p.low_stock_alert || 5, category: p.category || '', shelf: p.shelf || '',
      expiry_date: p.expiry_date ? p.expiry_date.slice(0, 10) : '', batch_number: p.batch_number || '',
      requires_prescription: !!p.requires_prescription, dosage: p.dosage || '', manufacturer: p.manufacturer || '', drug_category: p.drug_category || ''
    })
    setEditingId(p.id); setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.price) { toast.error('Name and price are required'); return }
    setLoading(true)
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price), wholesale_price: form.wholesale_price ? parseFloat(form.wholesale_price) : null,
        cost_price: parseFloat(form.cost_price || 0), stock: parseInt(form.stock || 0), low_stock_alert: parseInt(form.low_stock_alert || 5),
        expiry_date: form.expiry_date || null, batch_number: form.batch_number || null,
        dosage: form.dosage || null, manufacturer: form.manufacturer || null, drug_category: form.drug_category || null
      }
      if (editingId) { await updateProduct(editingId, payload); toast.success(`✓ ${form.name} updated!`) }
      else { await createProduct(payload); toast.success(`✓ ${form.name} added!`) }
      setForm(EMPTY_FORM); setEditingId(null); setShowForm(false); loadProducts()
    } catch (err) { toast.error(err.response?.data?.message || 'Something went wrong')
    } finally { setLoading(false) }
  }

  const handleDelete = async (p) => {
    const stockNote = Number(p.stock) > 0 ? `\n\nThis product still has ${p.stock} ${p.unit || ''} in stock.` : ''
    if (!window.confirm(`Delete "${p.name}"?${stockNote}\n\nIt will be hidden from Inventory and Sales. Past sales and reports are kept.`)) return
    try { await deleteProduct(p.id); toast.success(`${p.name} deleted`); loadProducts() }
    catch (err) { toast.error(err.response?.data?.message || 'Failed to delete') }
  }

  const openAdjustModal = (productId = '') => {
    setAdjustForm({ product_id: productId, movement_type: 'adjustment', direction: 'decrease', quantity: '', reason: '' })
    setShowAdjustModal(true)
  }

  const handleAdjustSubmit = async (e) => {
    e.preventDefault()
    const { product_id, movement_type, direction, quantity, reason } = adjustForm
    const qty = parseInt(quantity)

    if (!product_id) { toast.error('Choose a product'); return }
    if (!qty || qty <= 0) { toast.error('Enter a quantity greater than 0'); return }
    if (!reason.trim()) { toast.error('A reason is required'); return }

    const signedQty = movement_type === 'damage' ? -Math.abs(qty) : (direction === 'increase' ? qty : -qty)

    setAdjustSubmitting(true)
    try {
      await createStockAdjustment({ product_id, movement_type, quantity_change: signedQty, reason: reason.trim() })
      toast.success('Stock updated')
      setShowAdjustModal(false)
      loadProducts()
      if (activeTab === 'movements') loadMovements()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record adjustment')
    } finally {
      setAdjustSubmitting(false)
    }
  }

  // ── Unit Conversion (packages) handlers ───────────────────────────
  const openUnitsModal = (product) => {
    setUnitsProduct(product)
    setNewUnit({ unit_name: '', conversion_factor: '', selling_price: '', wholesale_price: '' })
    setShowUnitsModal(true)
    loadUnitsForProduct(product.id)
  }

  const loadUnitsForProduct = (productId) => {
    setUnitsLoading(true)
    getProductUnits(productId)
      .then(r => setProductUnitsList(r.data))
      .catch(() => toast.error('Failed to load units'))
      .finally(() => setUnitsLoading(false))
  }

  const handleAddUnit = async (e) => {
    e.preventDefault()
    const { unit_name, conversion_factor, selling_price, wholesale_price } = newUnit
    if (!unit_name.trim()) { toast.error('Unit name is required (e.g. Box, Bag, Dozen)'); return }
    if (!conversion_factor || Number(conversion_factor) <= 0) { toast.error(`How many ${unitsProduct.unit || 'PC'} make up 1 ${unit_name || 'unit'}?`); return }
    if (!selling_price || Number(selling_price) <= 0) { toast.error('Selling price for this unit is required'); return }

    setUnitSubmitting(true)
    try {
      await createProductUnit(unitsProduct.id, {
        unit_name: unit_name.trim(),
        conversion_factor: Number(conversion_factor),
        selling_price: Number(selling_price),
        wholesale_price: wholesale_price ? Number(wholesale_price) : null
      })
      toast.success(`✓ ${unit_name} added to ${unitsProduct.name}`)
      setNewUnit({ unit_name: '', conversion_factor: '', selling_price: '', wholesale_price: '' })
      loadUnitsForProduct(unitsProduct.id)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add unit')
    } finally {
      setUnitSubmitting(false)
    }
  }

  const handleDeleteUnit = async (unit) => {
    if (!window.confirm(`Remove "${unit.unit_name}" from ${unitsProduct.name}?`)) return
    try {
      await deleteProductUnit(unitsProduct.id, unit.id)
      toast.success('Unit removed')
      loadUnitsForProduct(unitsProduct.id)
    } catch {
      toast.error('Failed to remove unit')
    }
  }

  // ── Stock Conversion (product -> product) handlers ────────────────
  const openConversionModal = () => {
    setConversionForm({ from_product_id: '', from_quantity: '', to_product_id: '', to_quantity: '', reason: '' })
    setShowConversionModal(true)
  }

  const fromProductObj = products.find(p => p.id === Number(conversionForm.from_product_id))
  const toProductObj = products.find(p => p.id === Number(conversionForm.to_product_id))

  const handleConversionSubmit = async (e) => {
    e.preventDefault()
    const { from_product_id, from_quantity, to_product_id, to_quantity, reason } = conversionForm

    if (!from_product_id || !to_product_id) { toast.error('Select both products'); return }
    if (from_product_id === to_product_id) { toast.error('The two products must be different'); return }
    if (!from_quantity || Number(from_quantity) <= 0) { toast.error('Enter a quantity to take out'); return }
    if (!to_quantity || Number(to_quantity) <= 0) { toast.error('Enter a quantity to add'); return }
    if (!reason.trim()) { toast.error('A reason is required'); return }

    setConversionSubmitting(true)
    try {
      const res = await createStockConversion({
        from_product_id, from_quantity: Number(from_quantity),
        to_product_id, to_quantity: Number(to_quantity),
        reason: reason.trim()
      })
      toast.success(res.data.message || 'Conversion saved')
      setShowConversionModal(false)
      loadProducts()
      loadConversions()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save conversion')
    } finally {
      setConversionSubmitting(false)
    }
  }

  const totalProducts = products.length
  const lowStockCount = products.filter(p => Number(p.stock) > 0 && Number(p.stock) <= Number(p.low_stock_alert)).length
  const outOfStockCount = products.filter(p => Number(p.stock) === 0).length
  const stockValue = products.reduce((sum, p) => sum + (parseFloat(p.cost_price || 0) * parseInt(p.stock || 0)), 0)

  const baseHeaders = [
    { h: 'Product' }, { h: 'Category' }, { h: 'Shelf' },
    { h: 'Sell price', num: true }, { h: 'Wholesale', num: true }, { h: 'Cost', num: true }, { h: 'Margin', num: true }, { h: 'Unit' },
  ]
  const pharmacyHeaders = [{ h: 'Batch' }, { h: 'Expiry' }]
  const tailHeaders = [{ h: 'Stock', num: true }, { h: 'Min', num: true }, { h: 'Status' }, { h: '', actions: true }]
  const tableHeaders = [...baseHeaders, ...(isPharmacy ? pharmacyHeaders : []), ...tailHeaders]

  const closeForm = () => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM) }

  const ModalHeader = ({ title, sub, onClose }) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '20px' }}>
      <div>
        <h3 className="modal-title">{title}</h3>
        {sub && <p className="modal-sub">{sub}</p>}
      </div>
      <button type="button" className="btn-ghost btn-sm" style={{ padding: '0 6px' }} onClick={onClose} aria-label="Close"><X size={18} strokeWidth={1.75} /></button>
    </div>
  )

  return (
    <div style={{ color: 'var(--text)' }}>
      <style>{`
        .inv-tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--border); margin-bottom: 20px; overflow-x: auto; }
        .inv-tab { display: flex; align-items: center; gap: 8px; height: 40px; padding: 0 14px; border: none; background: transparent; cursor: pointer; white-space: nowrap;
                   font-size: 14px; font-weight: 500; color: var(--text-muted); border-bottom: 2px solid transparent; margin-bottom: -1px; border-radius: 0; }
        .inv-tab:hover:not(.active) { color: var(--text); }
        .inv-tab.active { color: var(--primary); border-bottom-color: var(--primary); font-weight: 600; }
        .inv-tab:hover { transform: none; }
        .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
        .form-grid .form-group { margin-bottom: 0; }
        .form-section { padding-top: 16px; margin-top: 16px; border-top: 1px solid var(--border-light); }
        .form-section-title { font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 12px; display: flex; align-items: center; gap: 6px; }
        .seg-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; height: 36px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500;
                   background: var(--surface); color: var(--text-muted); border: 1px solid var(--border); }
        .seg-btn:hover { background: var(--surface-3); }
        .seg-btn.active { background: var(--primary-soft); color: var(--primary); border-color: var(--primary); }
        .seg-btn.active.up { background: var(--success-soft); color: var(--success); border-color: var(--success); }
        .seg-btn.active.down { background: var(--danger-soft); color: var(--danger); border-color: var(--danger); }
        .icon-btn { width: 30px; height: 30px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border: none; border-radius: 6px; background: transparent; color: var(--text-muted); cursor: pointer; }
        .icon-btn:hover { background: var(--surface-3); color: var(--text); }
        .icon-btn.danger:hover { background: var(--danger-soft); color: var(--danger); }
        .stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 16px; margin-bottom: 20px; }
      `}</style>

      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Inventory</h1>
          <p>Manage your products and stock</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {activeTab === 'movements' && canAdjustStock && (
            <button className="btn" onClick={() => openAdjustModal()}><Plus size={16} strokeWidth={1.75} /> Adjustment</button>
          )}
          {activeTab === 'conversions' && canConvert && (
            <button className="btn" onClick={openConversionModal}><Plus size={16} strokeWidth={1.75} /> Conversion</button>
          )}
          {activeTab === 'products' && (
            <button className="btn-primary" onClick={() => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(true) }}>
              <Plus size={16} strokeWidth={2} /> New product
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat"><Package className="stat-icon" size={88} strokeWidth={1.25} aria-hidden="true" /><p className="stat-label">Total products</p><p className="stat-value">{totalProducts.toLocaleString()}</p></div>
        <div className="stat"><Banknote className="stat-icon" size={88} strokeWidth={1.25} aria-hidden="true" /><p className="stat-label">Stock value (at cost)</p><p className="stat-value">{fmtTZS(stockValue)}</p></div>
        <div className="stat"><TriangleAlert className="stat-icon" size={88} strokeWidth={1.25} aria-hidden="true" /><p className="stat-label">Low stock</p><p className="stat-value" style={{ color: lowStockCount > 0 ? 'var(--warning)' : undefined }}>{lowStockCount}</p></div>
        <div className="stat"><PackageX className="stat-icon" size={88} strokeWidth={1.25} aria-hidden="true" /><p className="stat-label">Out of stock</p><p className="stat-value" style={{ color: outOfStockCount > 0 ? 'var(--danger)' : undefined }}>{outOfStockCount}</p></div>
      </div>

      {/* Tabs */}
      <div className="inv-tabs" role="tablist" aria-label="Inventory sections">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} role="tab" aria-selected={activeTab === key} className={`inv-tab${activeTab === key ? ' active' : ''}`} onClick={() => setActiveTab(key)}>
            <Icon size={17} strokeWidth={1.75} />
            {label}
            {key === 'movements' && activeTab !== key && (lowStockCount > 0 || outOfStockCount > 0) && (
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--danger)' }} />
            )}
          </button>
        ))}
      </div>

      {/* ═════════ PRODUCTS ═════════ */}
      {activeTab === 'products' && (
        <>
          <Modal open={showForm} onClose={closeForm} title={editingId ? 'Edit product' : 'New product'} subtitle="Fill in the product details, then click Save" size="lg">
              <form onSubmit={handleSubmit}>
                <p className="form-section-title">Basic information</p>
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">Name *</label><input className="form-input" name="name" value={form.name} onChange={handleChange} placeholder="e.g. Portland Cement" required /></div>
                  <div className="form-group"><label className="form-label">Category</label><input className="form-input" name="category" value={form.category} onChange={handleChange} placeholder="e.g. Building Materials" /></div>
                  <div className="form-group"><label className="form-label">Shelf location</label><input className="form-input" name="shelf" value={form.shelf} onChange={handleChange} placeholder="e.g. A1, B3" /></div>
                  <div className="form-group"><label className="form-label">Description</label><input className="form-input" name="description" value={form.description} onChange={handleChange} placeholder="optional" /></div>
                </div>

                <div className="form-section">
                  <p className="form-section-title">Pricing</p>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Selling price (TSh) *</label>
                      <input className="form-input mono" name="price" type="number" value={form.price} onChange={handleChange} placeholder="15000" min="0" step="0.01" required />
                      {form.price && <p className="form-hint mono">{fmtTZS(form.price)}</p>}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Wholesale price</label>
                      <input className="form-input mono" name="wholesale_price" type="number" value={form.wholesale_price} onChange={handleChange} placeholder="optional" min="0" step="0.01" />
                      <p className="form-hint">Leave blank to sell at retail price only</p>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Cost price</label>
                      <input className="form-input mono" name="cost_price" type="number" value={form.cost_price} onChange={handleChange} placeholder="11000" min="0" step="0.01" />
                      {form.cost_price && form.price && (
                        <p className="form-hint mono" style={{ color: parseFloat(form.price) - parseFloat(form.cost_price) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                          Margin: {fmtTZS(parseFloat(form.price) - parseFloat(form.cost_price))}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <p className="form-section-title">Stock</p>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Base unit</label>
                      <select className="form-input" name="unit" value={form.unit} onChange={handleChange}>{UNITS.map(u => <option key={u} value={u}>{u}</option>)}</select>
                      <p className="form-hint">Smallest unit of sale. Add bigger packs later under "Manage units".</p>
                    </div>
                    <div className="form-group"><label className="form-label">Stock</label><input className="form-input mono" name="stock" type="number" value={form.stock} onChange={handleChange} placeholder="0" min="0" /></div>
                    <div className="form-group"><label className="form-label">Low stock alert</label><input className="form-input mono" name="low_stock_alert" type="number" value={form.low_stock_alert} onChange={handleChange} placeholder="5" /></div>
                  </div>
                </div>

                {/* Pharmacy Details — inaonekana tu Business Type = Pharmacy (Settings) */}
                {isPharmacy && (
                  <div className="form-section">
                    <p className="form-section-title"><Pill size={15} strokeWidth={1.75} /> Pharmacy details</p>
                    <div className="form-grid">
                      <div className="form-group"><label className="form-label">Batch number</label><input className="form-input" name="batch_number" value={form.batch_number} onChange={handleChange} placeholder="e.g. B24-0091" /></div>
                      <div className="form-group"><label className="form-label">Expiry date</label><input className="form-input" name="expiry_date" type="date" value={form.expiry_date} onChange={handleChange} /></div>
                      <div className="form-group"><label className="form-label">Manufacturer</label><input className="form-input" name="manufacturer" value={form.manufacturer} onChange={handleChange} placeholder="e.g. Shelys Pharmaceuticals" /></div>
                      <div className="form-group"><label className="form-label">Drug category</label><select className="form-input" name="drug_category" value={form.drug_category} onChange={handleChange}>{DRUG_CATEGORIES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}</select></div>
                      <div className="form-group"><label className="form-label">Dosage</label><input className="form-input" name="dosage" value={form.dosage} onChange={handleChange} placeholder="e.g. 500mg tablet" /></div>
                      <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '38px', fontSize: '14px', cursor: 'pointer' }}>
                          <input type="checkbox" name="requires_prescription" checked={form.requires_prescription} onChange={handleChange} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--primary)' }} />
                          Requires prescription
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                <div className="modal-actions sticky">
                  <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Saving...' : editingId ? 'Save changes' : 'Add product'}</button>
                  <button type="button" className="btn" onClick={closeForm}>Cancel</button>
                </div>
              </form>
          </Modal>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '420px' }}>
              <Search size={16} strokeWidth={1.75} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)', pointerEvents: 'none' }} />
              <input className="form-input" style={{ paddingLeft: '36px' }} placeholder="Search products, category, shelf..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="form-input" style={{ width: 'auto', minWidth: '170px' }} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
              {categories.map(c => <option key={c} value={c}>{c === 'All' ? 'All categories' : c}</option>)}
            </select>
          </div>

          {/* Table */}
          <div className="table-card">
            <div className="table-wrapper">
              <table className="data-table" style={{ minWidth: isPharmacy ? '1180px' : '980px' }}>
                <thead>
                  <tr>
                    {tableHeaders.map((c, i) => <th key={i} className={c.num ? 'num' : ''}>{c.h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={tableHeaders.length} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      {search || categoryFilter !== 'All' ? 'No products match your search.' : 'No products yet. Add your first one with "New product".'}
                    </td></tr>
                  )}
                  {filtered.map(p => {
                    const margin = parseFloat(p.price) - parseFloat(p.cost_price || 0)
                    const stockNum = Number(p.stock)
                    const dash = <span style={{ color: 'var(--text-subtle)' }}>—</span>
                    return (
                      <tr key={p.id}>
                        <td style={{ minWidth: '180px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: '600' }}>{p.name}</span>
                            {isPharmacy && p.requires_prescription && <span title="Requires prescription" style={{ display: 'inline-flex', color: 'var(--warning)' }}><Pill size={14} strokeWidth={2} /></span>}
                          </div>
                          {p.description && <div style={{ fontSize: '12px', color: 'var(--text-subtle)', marginTop: '1px' }}>{p.description}</div>}
                        </td>
                        <td style={{ color: 'var(--text-muted)' }}>{p.category || dash}</td>
                        <td>{p.shelf ? <span className="badge badge-neutral" style={{ letterSpacing: '0.04em' }}>{p.shelf}</span> : dash}</td>
                        <td className="num mono" style={{ fontWeight: '600' }}>{fmtTZS(p.price)}</td>
                        <td className="num mono">{p.wholesale_price ? fmtTZS(p.wholesale_price) : dash}</td>
                        <td className="num mono" style={{ color: 'var(--text-muted)' }}>{p.cost_price ? fmtTZS(p.cost_price) : dash}</td>
                        <td className="num mono" style={{ fontWeight: '500', color: margin > 0 ? 'var(--success)' : 'var(--danger)' }}>{p.cost_price ? fmtTZS(margin) : dash}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{p.unit || 'PC'}</td>
                        {isPharmacy && (
                          <>
                            <td className="mono" style={{ color: 'var(--text-muted)' }}>{p.batch_number || '—'}</td>
                            <td><ExpiryBadge date={p.expiry_date} /></td>
                          </>
                        )}
                        <td className="num mono" style={{ fontWeight: '600', color: stockNum === 0 ? 'var(--danger)' : stockNum <= Number(p.low_stock_alert) ? 'var(--warning)' : 'var(--text)' }}>{stockNum.toLocaleString()}</td>
                        <td className="num mono" style={{ color: 'var(--text-subtle)' }}>{p.low_stock_alert}</td>
                        <td><StockBadge stock={p.stock} min={p.low_stock_alert} /></td>
                        <td>
                          <div className="actions">
                            <button className="icon-btn" onClick={() => handleEdit(p)} title="Edit" aria-label={`Edit ${p.name}`}><Pencil size={16} strokeWidth={1.75} /></button>
                            {canManageUnits && <button className="icon-btn" onClick={() => openUnitsModal(p)} title="Manage units" aria-label={`Manage units for ${p.name}`}><Layers size={16} strokeWidth={1.75} /></button>}
                            {canAdjustStock && <button className="icon-btn" onClick={() => openAdjustModal(p.id)} title="Adjust stock" aria-label={`Adjust stock for ${p.name}`}><Scale size={16} strokeWidth={1.75} /></button>}
                            <button className="icon-btn danger" onClick={() => handleDelete(p)} title="Delete" aria-label={`Delete ${p.name}`}><Trash2 size={16} strokeWidth={1.75} /></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <p style={{ textAlign: 'center', color: 'var(--text-subtle)', fontSize: '13px', marginTop: '12px' }}>
            {filtered.length.toLocaleString()} of {products.length.toLocaleString()} products · Low: {lowStockCount} · Out: {outOfStockCount}
          </p>
        </>
      )}

      {/* ═════════ STOCK HISTORY ═════════ */}
      {activeTab === 'movements' && (
        <>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <label className="form-label" style={{ fontSize: '12px' }}>Type</label>
              <select className="form-input" style={{ width: 'auto', minWidth: '170px' }} value={movementTypeFilter} onChange={e => setMovementTypeFilter(e.target.value)}>
                {MOVEMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label" style={{ fontSize: '12px' }}>Product</label>
              <select className="form-input" style={{ width: 'auto', minWidth: '210px' }} value={movementProductFilter} onChange={e => setMovementProductFilter(e.target.value)}>
                <option value="">All products</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label" style={{ fontSize: '12px' }}>From</label>
              <input className="form-input" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: '12px' }}>To</label>
              <input className="form-input" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>

          <div className="table-card">
            <div className="table-wrapper">
              <table className="data-table" style={{ minWidth: '860px' }}>
                <thead>
                  <tr>
                    <th>Date</th><th>Product</th><th>Type</th><th className="num">Change</th><th className="num">Before</th><th className="num">After</th><th>Reference</th><th>Reason</th><th>By</th>
                  </tr>
                </thead>
                <tbody>
                  {movementsLoading && <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading...</td></tr>}
                  {!movementsLoading && movements.length === 0 && <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No stock movements yet.</td></tr>}
                  {!movementsLoading && movements.map(m => {
                    const meta = MOVEMENT_LABELS[m.movement_type] || { label: m.movement_type, cls: 'badge-neutral' }
                    const negative = m.quantity_change < 0
                    return (
                      <tr key={m.id}>
                        <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {new Date(m.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ fontWeight: '500' }}>{m.product_name || `#${m.product_id}`}</td>
                        <td><span className={`badge ${meta.cls}`}>{meta.label}</span></td>
                        <td className="num mono" style={{ fontWeight: '600', color: negative ? 'var(--danger)' : 'var(--success)' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            {negative ? <ArrowDown size={14} strokeWidth={2} /> : <ArrowUp size={14} strokeWidth={2} />}
                            {Math.abs(m.quantity_change)}
                          </span>
                        </td>
                        <td className="num mono" style={{ color: 'var(--text-muted)' }}>{m.stock_before}</td>
                        <td className="num mono" style={{ fontWeight: '600' }}>{m.stock_after}</td>
                        <td style={{ fontSize: '13px', color: 'var(--text-subtle)' }}>{m.reference_type ? `${m.reference_type}${m.reference_id ? ' #' + m.reference_id : ''}` : '—'}</td>
                        <td style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '220px' }}>{m.reason || '—'}</td>
                        <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{m.performed_by_name || '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <p style={{ textAlign: 'center', color: 'var(--text-subtle)', fontSize: '13px', marginTop: '12px' }}>
            Showing {movements.length.toLocaleString()} movements (most recent 100 for these filters)
          </p>
        </>
      )}

      {/* ═════════ CONVERSIONS ═════════ */}
      {activeTab === 'conversions' && (
        <>
          <div style={{ display: 'flex', gap: '10px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            <Info size={18} strokeWidth={1.75} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>Use this when you break bulk stock of one product into a differently-sold product, e.g. opening a "Cement (Bag)" to stock "Cement (KG)". Each conversion removes stock from one product and adds it to another, in one step.</span>
          </div>

          <div className="table-card">
            <div className="table-wrapper">
              <table className="data-table" style={{ minWidth: '640px' }}>
                <thead><tr><th>Date</th><th>From</th><th>To</th><th>Reason</th><th>By</th></tr></thead>
                <tbody>
                  {conversionsLoading && <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading...</td></tr>}
                  {!conversionsLoading && conversions.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No conversions recorded yet.</td></tr>}
                  {!conversionsLoading && conversions.map(c => (
                    <tr key={c.id}>
                      <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(c.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td><span className="mono" style={{ fontWeight: '600', color: 'var(--danger)' }}>-{c.from_quantity}</span> {c.from_unit} {c.from_product_name}</td>
                      <td><span className="mono" style={{ fontWeight: '600', color: 'var(--success)' }}>+{c.to_quantity}</span> {c.to_unit} {c.to_product_name}</td>
                      <td style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '240px' }}>{c.reason || '—'}</td>
                      <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{c.performed_by_name || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ═════════ Stock Adjustment Modal ═════════ */}
      {showAdjustModal && (
        <div className="modal-overlay" onClick={() => setShowAdjustModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <ModalHeader title="Stock adjustment" onClose={() => setShowAdjustModal(false)} />
            <form onSubmit={handleAdjustSubmit}>
              <div className="form-group">
                <label className="form-label">Product *</label>
                <select className="form-input" value={adjustForm.product_id} onChange={e => setAdjustForm({ ...adjustForm, product_id: e.target.value })} required>
                  <option value="">Select a product</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} (current: {p.stock})</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Reason type</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[{ v: 'adjustment', l: 'Adjustment' }, { v: 'damage', l: 'Damage' }].map(t => (
                    <button type="button" key={t.v} className={`seg-btn${adjustForm.movement_type === t.v ? ' active' : ''}`}
                      onClick={() => setAdjustForm({ ...adjustForm, movement_type: t.v, direction: t.v === 'damage' ? 'decrease' : adjustForm.direction })}>
                      {t.l}
                    </button>
                  ))}
                </div>
              </div>

              {adjustForm.movement_type === 'adjustment' && (
                <div className="form-group">
                  <label className="form-label">Direction</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[{ v: 'increase', l: 'Increase stock', icon: ArrowUp, cls: 'up' }, { v: 'decrease', l: 'Decrease stock', icon: ArrowDown, cls: 'down' }].map(d => {
                      const Icon = d.icon
                      return (
                        <button type="button" key={d.v} className={`seg-btn${adjustForm.direction === d.v ? ` active ${d.cls}` : ''}`} onClick={() => setAdjustForm({ ...adjustForm, direction: d.v })}>
                          <Icon size={14} strokeWidth={2} /> {d.l}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Quantity *</label>
                <input className="form-input mono" type="number" min="1" value={adjustForm.quantity} onChange={e => setAdjustForm({ ...adjustForm, quantity: e.target.value })} placeholder="e.g. 5" required />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Reason *</label>
                <textarea className="form-input" style={{ minHeight: '72px', resize: 'vertical' }} value={adjustForm.reason}
                  onChange={e => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  placeholder={adjustForm.movement_type === 'damage' ? 'e.g. Water damage during storage' : 'e.g. Physical count correction'} required />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn" onClick={() => setShowAdjustModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={adjustSubmitting}>{adjustSubmitting ? 'Saving...' : 'Save adjustment'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════ Units Modal (admin only) ═════════ */}
      {showUnitsModal && unitsProduct && (
        <div className="modal-overlay" onClick={() => setShowUnitsModal(false)}>
          <div className="modal" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
            <ModalHeader title="Alternate selling units" sub={<>{unitsProduct.name}, base unit: <strong>{unitsProduct.unit || 'PC'}</strong></>} onClose={() => setShowUnitsModal(false)} />

            <div style={{ display: 'flex', gap: '10px', background: 'var(--warning-soft)', borderRadius: '6px', padding: '10px 12px', marginBottom: '16px', fontSize: '13px', color: 'var(--warning)', lineHeight: '1.5' }}>
              <Info size={18} strokeWidth={1.75} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>Units here must be <strong>bigger packs</strong> of {unitsProduct.unit || 'PC'} (e.g. if base is KG, add "Bag" = 50). To sell a <strong>smaller</strong> portion than the base unit, use the "Conversions" tab to move stock into a separate, smaller-unit product.</span>
            </div>

            {unitsLoading ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0' }}>Loading...</p>
            ) : productUnitsList.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-subtle)', fontSize: '13px' }}>
                No alternate units yet. This product is only sold by {unitsProduct.unit || 'PC'}.
              </p>
            ) : (
              <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {productUnitsList.map(u => (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--surface-2)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                    <div>
                      <p style={{ fontWeight: '600', fontSize: '14px' }}>1 {u.unit_name} = {u.conversion_factor} {unitsProduct.unit || 'PC'}</p>
                      <p className="mono" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {fmtTZS(u.selling_price)}{u.wholesale_price ? ` · Wholesale ${fmtTZS(u.wholesale_price)}` : ''}
                      </p>
                    </div>
                    <button className="icon-btn danger" onClick={() => handleDeleteUnit(u)} title="Remove" aria-label={`Remove ${u.unit_name}`}><Trash2 size={16} strokeWidth={1.75} /></button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Add a unit</h4>
              <form onSubmit={handleAddUnit}>
                <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', marginBottom: '12px' }}>
                  <div className="form-group"><label className="form-label">Unit name *</label><input className="form-input" value={newUnit.unit_name} onChange={e => setNewUnit({ ...newUnit, unit_name: e.target.value })} placeholder="e.g. Box, Bag, Dozen" /></div>
                  <div className="form-group"><label className="form-label">1 unit = how many {unitsProduct.unit || 'PC'}? *</label><input className="form-input mono" type="number" min="1" step="0.001" value={newUnit.conversion_factor} onChange={e => setNewUnit({ ...newUnit, conversion_factor: e.target.value })} placeholder="e.g. 100" /></div>
                  <div className="form-group"><label className="form-label">Selling price *</label><input className="form-input mono" type="number" min="0" step="0.01" value={newUnit.selling_price} onChange={e => setNewUnit({ ...newUnit, selling_price: e.target.value })} placeholder="e.g. 30000" /></div>
                  <div className="form-group"><label className="form-label">Wholesale price</label><input className="form-input mono" type="number" min="0" step="0.01" value={newUnit.wholesale_price} onChange={e => setNewUnit({ ...newUnit, wholesale_price: e.target.value })} placeholder="optional" /></div>
                </div>
                {newUnit.unit_name && newUnit.conversion_factor && (
                  <p style={{ marginBottom: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
                    Preview: 1 <strong>{newUnit.unit_name}</strong> = {newUnit.conversion_factor} {unitsProduct.unit || 'PC'}
                  </p>
                )}
                <button type="submit" className="btn-primary btn-block" disabled={unitSubmitting}>{unitSubmitting ? 'Adding...' : 'Add unit'}</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ═════════ Stock Conversion Modal ═════════ */}
      {showConversionModal && (
        <div className="modal-overlay" onClick={() => setShowConversionModal(false)}>
          <div className="modal" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <ModalHeader title="Stock conversion" onClose={() => setShowConversionModal(false)} />
            <form onSubmit={handleConversionSubmit}>
              <div style={{ padding: '12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--danger-soft)', marginBottom: '8px' }}>
                <label className="form-label" style={{ color: 'var(--danger)' }}>Take stock from</label>
                <select className="form-input" value={conversionForm.from_product_id} onChange={e => setConversionForm({ ...conversionForm, from_product_id: e.target.value })} required>
                  <option value="">Select a product</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} (in stock: {p.stock} {p.unit || 'PC'})</option>)}
                </select>
                <div style={{ marginTop: '10px' }}>
                  <label className="form-label">Quantity to remove *{fromProductObj ? ` (${fromProductObj.unit || 'PC'})` : ''}</label>
                  <input className="form-input mono" type="number" min="0.001" step="0.001" value={conversionForm.from_quantity} onChange={e => setConversionForm({ ...conversionForm, from_quantity: e.target.value })} placeholder="e.g. 1" required />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', margin: '0 0 8px', color: 'var(--text-muted)' }}><ArrowDown size={18} strokeWidth={1.75} /></div>

              <div style={{ padding: '12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--success-soft)', marginBottom: '16px' }}>
                <label className="form-label" style={{ color: 'var(--success)' }}>Add stock to</label>
                <select className="form-input" value={conversionForm.to_product_id} onChange={e => setConversionForm({ ...conversionForm, to_product_id: e.target.value })} required>
                  <option value="">Select a product</option>
                  {products.filter(p => p.id !== Number(conversionForm.from_product_id)).map(p => <option key={p.id} value={p.id}>{p.name} (in stock: {p.stock} {p.unit || 'PC'})</option>)}
                </select>
                <div style={{ marginTop: '10px' }}>
                  <label className="form-label">Quantity to add *{toProductObj ? ` (${toProductObj.unit || 'PC'})` : ''}</label>
                  <input className="form-input mono" type="number" min="0.001" step="0.001" value={conversionForm.to_quantity} onChange={e => setConversionForm({ ...conversionForm, to_quantity: e.target.value })} placeholder="e.g. 50" required />
                </div>
              </div>

              {fromProductObj && toProductObj && conversionForm.from_quantity && conversionForm.to_quantity && (
                <p style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>
                  {conversionForm.from_quantity} {fromProductObj.unit || 'PC'} of <strong>{fromProductObj.name}</strong> → {conversionForm.to_quantity} {toProductObj.unit || 'PC'} of <strong>{toProductObj.name}</strong>
                </p>
              )}

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Reason *</label>
                <textarea className="form-input" style={{ minHeight: '64px', resize: 'vertical' }} value={conversionForm.reason}
                  onChange={e => setConversionForm({ ...conversionForm, reason: e.target.value })} placeholder="e.g. Opened 1 bag of cement for retail KG sales" required />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn" onClick={() => setShowConversionModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={conversionSubmitting}>{conversionSubmitting ? 'Saving...' : 'Save conversion'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Inventory
