import { useState, useEffect, useRef } from 'react'
import { getProducts, getClients, createSale, getSales, getBusinessSettings, getAllProductUnits, getDepositHistory } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { hasPermission } from '../services/permissions'
import { useLanguage } from '../context/LanguageContext'
import toast from 'react-hot-toast'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import axios from 'axios'
import { Search, Plus, X, Pause, Printer, ArrowLeft, Inbox, ShoppingCart, History, Undo2, Pencil, ClipboardList, PiggyBank } from 'lucide-react'
import Returns from './Returns.jsx'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const fmtTZS = (v) => `TSh ${parseFloat(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtNum = (v) => parseFloat(v || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })

// Search input yenye icon — iko nje ya Sales ili isi-remount kila render (focus haipotei)
const SearchInput = ({ style, inputRef, ...props }) => (
  <div style={{ position: 'relative', ...style }}>
    <Search size={16} strokeWidth={1.75} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)', pointerEvents: 'none' }} />
    <input ref={inputRef} className="form-input" style={{ paddingLeft: '36px' }} {...props} />
  </div>
)

const StatusNote = ({ ok, title, children }) => (
  <div style={{ background: ok ? 'var(--success-soft)' : 'var(--danger-soft)', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px 12px', marginBottom: '16px', fontSize: '13px' }}>
    <div style={{ fontWeight: '600', color: ok ? 'var(--success)' : 'var(--danger)', marginBottom: '4px' }}>{title}</div>
    {children}
  </div>
)

const Sales = () => {
  const { user } = useAuth()
  const canCreateSale = hasPermission(user, 'sales', 'create')
  const canManageSales = hasPermission(user, 'sales', 'edit')
  const { t } = useLanguage()
  // Labels mpya ambazo bado hazipo kwenye LanguageContext — zinatumia English hadi uziongeze
  const tr = (key, fallback) => { const v = t(key); return typeof v === 'string' && v && v !== key ? v : fallback }

  const [products, setProducts] = useState([])
  const [clients, setClients] = useState([])
  const [sales, setSales] = useState([])
  const [cart, setCart] = useState([])
  const [unitsByProduct, setUnitsByProduct] = useState({}) // Unit Conversion: { [product_id]: [unit, ...] }
  const [selectedClient, setSelectedClient] = useState('')
  const [selectedClientData, setSelectedClientData] = useState(null)
  const [customerType, setCustomerType] = useState('registered') // 'registered' | 'walkin' - kwa cash sale pekee
  const [walkinName, setWalkinName] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [amountReceived, setAmountReceived] = useState('')
  const [discount, setDiscount] = useState(0)
  const [loading, setLoading] = useState(false)

  const [view, setView] = useState('hub')
  const [saleMode, setSaleMode] = useState('cash')
  const [lastSale, setLastSale] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const [entry, setEntry] = useState(null) // bidhaa iliyochaguliwa kwenye fomu ya kuingiza
  const [historySearch, setHistorySearch] = useState('')
  const [showDepositForm, setShowDepositForm] = useState(false)
  const [depositForm, setDepositForm] = useState({ client_id: '', amount: '', payment_method: 'cash', reference: '' })
  const [depositLoading, setDepositLoading] = useState(false)
  const [depositTxns, setDepositTxns] = useState([]) // deposit ledger (amana zote: zilizowekwa + zilizotumika)
  const [voidTarget, setVoidTarget] = useState(null)
  const [voidReason, setVoidReason] = useState('')
  const [voidLoading, setVoidLoading] = useState(false)
  const [heldSales, setHeldSales] = useState([])
  const [showHeldModal, setShowHeldModal] = useState(false)
  const [biz, setBiz] = useState({ business_name: 'PIUS HARDWARE', address: 'P.O.BOX 4629, MBEYA TANZANIA', phone: '0764067682', motto: 'JENGA NA PIUS HARDWARE', logo: '' })

  const searchRef = useRef(null)
  const qtyRef = useRef(null)

  useEffect(() => {
    loadData()
    try { setHeldSales(JSON.parse(localStorage.getItem('held_sales') || '[]')) } catch { setHeldSales([]) }
    getBusinessSettings().then(r => { const s = r.data || {}; setBiz(prev => ({ business_name: s.business_name || prev.business_name, address: s.address || prev.address, phone: s.phone || prev.phone, motto: s.motto || prev.motto, logo: s.logo || '' })) }).catch(() => {})
  }, [])

  // Credit/Deposit lazima ziwe na registered client - walk-in haitumiki huko
  useEffect(() => { if (saleMode !== 'cash') setCustomerType('registered') }, [saleMode])

  // Clients zikipakiwa upya (mfano baada ya kuweka amana), sasisha pia mteja aliyechaguliwa kwenye cart
  useEffect(() => { if (selectedClient) setSelectedClientData(clients.find(c => c.id == selectedClient) || null) }, [clients])

  const loadData = () => {
    getProducts().then(r => setProducts(r.data)).catch(() => toast.error('Failed to load products'))
    getClients().then(r => setClients(r.data)).catch(() => {})
    getSales().then(r => setSales(r.data)).catch(() => {})
    getDepositHistory().then(r => setDepositTxns(r.data)).catch(() => {})
    // Unit Conversion: pakia units ZOTE mara moja, kisha zi-group kwa product_id
    getAllProductUnits().then(r => {
      const grouped = {}
      for (const u of r.data) { (grouped[u.product_id] ||= []).push(u) }
      setUnitsByProduct(grouped)
    }).catch(() => {})
  }

  const handleClientChange = (e) => { const id = e.target.value; setSelectedClient(id); setSelectedClientData(id ? clients.find(c => c.id == id) || null : null) }

  // ── Role: "Amount received" ni kwa cashier tu ──
  const isCashier = user?.role === 'cashier'

  // Kila cart item ina "units" (base + alternate) na "selectedUnitId" (null = base unit)
  const getCurrentUnit = (item) => item.units.find(u => u.id === item.selectedUnitId) || item.units[0]

  const buildUnits = (product) => {
    const altUnits = unitsByProduct[product.id] || []
    const baseUnit = {
      id: null, unit_name: product.unit || 'PC', conversion_factor: 1,
      selling_price: parseFloat(product.price),
      wholesale_price: product.wholesale_price ? parseFloat(product.wholesale_price) : null
    }
    return [baseUnit, ...altUnits.map(u => ({
      id: u.id, unit_name: u.unit_name, conversion_factor: parseFloat(u.conversion_factor),
      selling_price: parseFloat(u.selling_price), wholesale_price: u.wholesale_price ? parseFloat(u.wholesale_price) : null
    }))]
  }

  // Njia ya haraka (scanner): ongeza 1 retail moja kwa moja
  const addToCart = (product) => {
    if (product.stock < 1) { toast.error(`${product.name} ${t('sales.outOfStock')}`); return }
    const existing = cart.find(i => i.product_id === product.id)
    if (existing) {
      const unit = getCurrentUnit(existing)
      const maxQty = Math.floor(product.stock / unit.conversion_factor)
      if (existing.quantity >= maxQty) { toast.error(t('sales.onlyAvailable')(maxQty)); return }
      setCart(cart.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i))
    } else {
      const units = buildUnits(product)
      setCart([...cart, { product_id: product.id, name: product.name, quantity: 1, units, selectedUnitId: null, price_type: 'retail', price: units[0].selling_price }])
    }
    toast.success(`✓ ${product.name}`)
  }

  const removeFromCart = (pid) => setCart(cart.filter(i => i.product_id !== pid))

  const updateQuantity = (pid, qty) => {
    const q = parseInt(qty); if (q < 1) return
    const item = cart.find(i => i.product_id === pid)
    const product = products.find(p => p.id === pid)
    const unit = getCurrentUnit(item)
    const maxQty = Math.floor((product?.stock || 0) / unit.conversion_factor)
    if (q > maxQty) { toast.error(t('sales.onlyAvailable')(maxQty)); return }
    setCart(cart.map(i => i.product_id === pid ? { ...i, quantity: q } : i))
  }

  // Cashier anabadilisha unit ndani ya cart (PC -> Box). Bei inarudi retail ya unit mpya,
  // quantity inapunguzwa kama ilizidi max ya unit hiyo.
  const setUnit = (pid, unitIdRaw) => {
    const unitId = unitIdRaw === '' ? null : parseInt(unitIdRaw)
    const product = products.find(p => p.id === pid)
    setCart(cart.map(i => {
      if (i.product_id !== pid) return i
      const unit = i.units.find(u => u.id === unitId) || i.units[0]
      const maxQty = Math.max(Math.floor((product?.stock || 0) / unit.conversion_factor), 1)
      return { ...i, selectedUnitId: unit.id, price_type: 'retail', price: unit.selling_price, quantity: Math.min(i.quantity, maxQty) }
    }))
  }

  const setPriceType = (pid, type) => {
    setCart(cart.map(i => {
      if (i.product_id !== pid) return i
      const unit = getCurrentUnit(i)
      if (type === 'retail') return { ...i, price_type: 'retail', price: unit.selling_price }
      if (type === 'wholesale') { if (!unit.wholesale_price) { toast.error(t('sales.noWholesalePrice')(i.name)); return i }; return { ...i, price_type: 'wholesale', price: unit.wholesale_price } }
      return { ...i, price_type: 'custom' }
    }))
  }

  const setCustomPrice = (pid, val) => {
    const v = parseFloat(val)
    setCart(cart.map(i => i.product_id === pid ? { ...i, price: isNaN(v) || v < 0 ? 0 : v, price_type: 'custom' } : i))
  }

  // ── Search na fomu ya kuingiza bidhaa ──
  const q = searchQuery.trim().toLowerCase()
  const results = (q
    ? products.filter(p => p.name.toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q) || String(p.id) === q)
    : products
  ).slice(0, 50)

  const focusSearch = () => setTimeout(() => searchRef.current?.focus(), 0)

  const selectProduct = (product) => {
    if (Number(product.stock) < 1) { toast.error(`${product.name} ${t('sales.outOfStock')}`); return }
    setEntry({ product, units: buildUnits(product), unitId: null, priceType: 'retail', qty: '1', customPrice: '' })
    setSearchQuery(''); setShowResults(false); setActiveIdx(0)
    setTimeout(() => qtyRef.current?.select(), 0)
  }

  const clearEntry = () => { setEntry(null); focusSearch() }

  const entryUnit = entry ? (entry.units.find(u => u.id === entry.unitId) || entry.units[0]) : null
  const entryPrice = !entry ? 0
    : entry.priceType === 'custom' ? (parseFloat(entry.customPrice) || 0)
    : entry.priceType === 'wholesale' ? (entryUnit.wholesale_price || 0)
    : entryUnit.selling_price
  const entryQty = entry ? (parseInt(entry.qty) || 0) : 0
  const entryAmount = entryPrice * entryQty
  const entryMax = entry ? Math.floor(Number(entry.product.stock) / entryUnit.conversion_factor) : 0

  const changeEntryUnit = (unitIdRaw) => {
    const unitId = unitIdRaw === '' ? null : parseInt(unitIdRaw)
    const unit = entry.units.find(u => u.id === unitId) || entry.units[0]
    const max = Math.max(Math.floor(Number(entry.product.stock) / unit.conversion_factor), 1)
    setEntry({ ...entry, unitId: unit.id, priceType: 'retail', customPrice: '', qty: String(Math.min(parseInt(entry.qty) || 1, max)) })
  }

  const changeEntryPriceType = (type) => {
    if (type === 'wholesale' && !entryUnit.wholesale_price) { toast.error(t('sales.noWholesalePrice')(entry.product.name)); return }
    setEntry({ ...entry, priceType: type, customPrice: type === 'custom' && entry.customPrice === '' ? String(entryUnit.selling_price) : entry.customPrice })
  }

  const addEntryToCart = () => {
    if (!entry) return
    const { product, units } = entry
    if (entryQty < 1) { toast.error(tr('sales.entry.needQty', 'Enter a quantity')); return }
    if (entryQty > entryMax) { toast.error(t('sales.onlyAvailable')(entryMax)); return }
    const existing = cart.find(i => i.product_id === product.id)
    if (existing) {
      const exUnit = getCurrentUnit(existing)
      if (exUnit.id !== entryUnit.id || existing.price_type !== entry.priceType || existing.price !== entryPrice) {
        toast.error(tr('sales.entry.alreadyInList', `${product.name} is already in the list. Edit it there.`)); return
      }
      const newQty = existing.quantity + entryQty
      if (newQty > entryMax) { toast.error(t('sales.onlyAvailable')(entryMax)); return }
      setCart(cart.map(i => i.product_id === product.id ? { ...i, quantity: newQty } : i))
    } else {
      setCart([...cart, { product_id: product.id, name: product.name, quantity: entryQty, units, selectedUnitId: entryUnit.id, price_type: entry.priceType, price: entryPrice }])
    }
    toast.success(`✓ ${product.name}`)
    setEntry(null); focusSearch()
  }

  const onSearchKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setShowResults(true); setActiveIdx(i => Math.min(i + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Escape') { setShowResults(false) }
    else if (e.key === 'Enter') {
      const raw = searchQuery.trim()
      if (!raw) return
      // Scanner: ID kamili ya bidhaa → ongeza moja kwa moja
      const byId = products.find(p => String(p.id) === raw)
      if (byId) { addToCart(byId); setSearchQuery(''); setShowResults(false); return }
      const pick = results[activeIdx]
      if (pick) selectProduct(pick); else toast.error(t('sales.productNotFound'))
    }
  }

  // ── Totals ──
  const total = cart.reduce((s, i) => s + (i.price * i.quantity), 0)
  const finalTotal = total - parseFloat(discount || 0)
  const needsReceived = isCashier && saleMode === 'cash' && paymentMethod === 'cash'
  const changeAmount = needsReceived ? (parseFloat(amountReceived || 0) - finalTotal) : 0
  const cashInsufficient = needsReceived && (amountReceived === '' || changeAmount < 0)
  const availableCredit = selectedClientData ? Number(selectedClientData.credit_limit) - Number(selectedClientData.balance) : 0
  const availableDeposit = selectedClientData ? Number(selectedClientData.deposit || 0) : 0
  const creditOk = saleMode === 'credit' ? (selectedClientData ? finalTotal <= availableCredit : false) : true
  const depositOk = saleMode === 'deposit' ? (selectedClientData ? finalTotal <= availableDeposit : false) : true

  const resetCart = () => { setCart([]); setEntry(null); setSelectedClient(''); setSelectedClientData(null); setWalkinName(''); setCustomerType('registered'); setDiscount(0); setPaymentMethod('cash'); setAmountReceived('') }

  // cart items hazina .unit ya moja kwa moja — tunaiandaa kabla ya receipt/payload
  const cartForPayload = () => cart.map(i => ({
    product_id: i.product_id, quantity: i.quantity, price_type: i.price_type,
    custom_price: i.price_type === 'custom' ? i.price : undefined,
    unit_id: i.selectedUnitId || undefined
  }))
  const cartForReceipt = () => cart.map(i => ({ ...i, unit: getCurrentUnit(i).unit_name }))

  const buildReceipt = (saleData) => {
    const doc = new jsPDF()
    if (biz.logo) { try { doc.addImage(biz.logo, 'PNG', 15, 10, 22, 18) } catch (e) {} }
    doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.text(biz.business_name, 105, 20, { align: 'center' })
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.text(biz.address, 105, 28, { align: 'center' }); doc.text(`Tel: ${biz.phone}`, 105, 34, { align: 'center' })
    doc.setFontSize(14); doc.setFont('helvetica', 'bold')
    const title = saleData.saleMode === 'credit' ? 'CREDIT SALE RECEIPT' : saleData.saleMode === 'deposit' ? 'DEPOSIT SALE RECEIPT' : 'SALES RECEIPT'
    doc.text(saleData.edited ? `${title} (CORRECTED)` : title, 105, 45, { align: 'center' }); doc.line(20, 50, 190, 50)
    doc.setFontSize(10); doc.setFont('helvetica', 'normal')
    const now = new Date()
    doc.text(`Receipt #: ${saleData.saleId || 'N/A'}`, 20, 58); doc.text(`Date: ${now.toLocaleDateString('en-GB')} ${now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`, 20, 64)
    doc.text(`Customer: ${saleData.clientName || 'WALK-IN CUSTOMER'}`, 20, 70); doc.text(`Cashier: ${saleData.cashierName || 'CASHIER'}`, 20, 76)
    if (saleData.saleMode !== 'cash') doc.text(`Payment: ${saleData.saleMode === 'credit' ? 'CREDIT' : 'DEPOSIT'}`, 20, 82)
    doc.autoTable({ startY: saleData.saleMode !== 'cash' ? 88 : 82, head: [['#', 'Item', 'Unit', 'Qty', 'Price (TSh)', 'Total (TSh)']], body: (saleData.items || []).map((item, i) => [i + 1, item.name || item.product_name, item.unit || 'PC', item.quantity, parseFloat(item.price).toLocaleString(), (parseFloat(item.price) * item.quantity).toLocaleString()]), theme: 'striped', headStyles: { fillColor: [45, 49, 57], textColor: 255, fontStyle: 'bold', fontSize: 10 }, styles: { fontSize: 9, cellPadding: 4 } })
    const finalY = doc.lastAutoTable.finalY + 10
    doc.setFontSize(13); doc.setFont('helvetica', 'bold')
    const yPos = finalY + 9
    doc.text('GRAND TOTAL:', 130, yPos); doc.text(`TSh ${parseFloat(saleData.total).toLocaleString()}`, 190, yPos, { align: 'right' })
    let afterTotalY = yPos
    if (saleData.saleMode === 'cash' && saleData.amountReceived != null) {
      doc.setFontSize(10); doc.setFont('helvetica', 'normal')
      doc.text('Amount Received:', 130, yPos + 7); doc.text(`TSh ${parseFloat(saleData.amountReceived).toLocaleString()}`, 190, yPos + 7, { align: 'right' })
      doc.text('Change:', 130, yPos + 13); doc.text(`TSh ${parseFloat(saleData.changeGiven || 0).toLocaleString()}`, 190, yPos + 13, { align: 'right' })
      afterTotalY = yPos + 13
    }
    doc.setFont('helvetica', 'italic'); doc.setFontSize(11); doc.text(biz.motto, 105, afterTotalY + 15, { align: 'center' })
    return doc
  }

  const printReceipt = (saleData) => {
    try { const doc = buildReceipt(saleData); const url = URL.createObjectURL(doc.output('blob')); const win = window.open(url, '_blank'); if (win) { win.onload = () => setTimeout(() => win.print(), 250); toast.success('✓ Receipt ready!') } else toast.error('Please allow pop-ups!') }
    catch (e) { toast.error('Failed: ' + e.message) }
  }

  const printReceiptFromHistory = async (sale) => {
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get(`${API_URL}/sales/${sale.id}`, { headers: { Authorization: `Bearer ${token}` } })
      printReceipt({ saleId: sale.id, total: sale.total, discount: sale.discount || 0, saleMode: sale.sale_type || 'cash', items: res.data.items || [], cashierName: sale.cashier_name || 'CASHIER', clientName: sale.walkin_name || sale.client_name || t('sales.walkinDefaultName'), amountReceived: res.data.sale?.amount_received, changeGiven: res.data.sale?.change_given, edited: (res.data.sale?.edit_count || 0) > 0 })
    } catch { toast.error('Failed to load receipt') }
  }

  const handleCashSale = async () => {
    if (cart.length === 0) { toast.error('Add at least one product!'); return }
    if (cashInsufficient) { toast.error(t('sales.insufficientAmount')); return }
    setLoading(true)
    try {
      const res = await createSale({
        client_id: customerType === 'registered' ? (selectedClient || null) : null,
        walkin_name: customerType === 'walkin' ? (walkinName || null) : null,
        payment_method: paymentMethod,
        // Cashier: kiasi alichoandika. Role nyingine: malipo kamili (backend inapata thamani kama kawaida, change = 0)
        amount_received: paymentMethod === 'cash' ? (needsReceived ? parseFloat(amountReceived) : finalTotal) : undefined,
        discount: parseFloat(discount || 0),
        items: cartForPayload()
      })
      const client = clients.find(c => c.id == selectedClient)
      const displayName = customerType === 'walkin' ? (walkinName || t('sales.walkinDefaultName')) : (client?.name || t('sales.walkinDefaultName'))
      setLastSale({ saleId: res.data.saleId, total: finalTotal, discount: parseFloat(discount || 0), saleMode: 'cash', items: cartForReceipt(), cashierName: user?.name, clientName: displayName, amountReceived: needsReceived ? res.data.amount_received : undefined, changeGiven: needsReceived ? res.data.change : undefined })
      toast.success(`✓ Sale of ${fmtTZS(finalTotal)} completed!`); resetCart(); loadData()
    } catch (err) { toast.error(err.response?.data?.message || 'Sale failed') } finally { setLoading(false) }
  }

  const handleCreditSale = async () => {
    if (!selectedClient) { toast.error('Select a client!'); return }
    if (!creditOk) { toast.error(`Insufficient credit! Available: ${fmtTZS(availableCredit)}`); return }
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await axios.post(`${API_URL}/sales/credit`, { client_id: selectedClient, discount: parseFloat(discount || 0), items: cartForPayload() }, { headers: { Authorization: `Bearer ${token}` } })
      setLastSale({ saleId: res.data.saleId, total: finalTotal, discount: parseFloat(discount || 0), saleMode: 'credit', items: cartForReceipt(), cashierName: user?.name, clientName: selectedClientData?.name, new_balance: res.data.new_balance })
      toast.success(res.data.message); resetCart(); loadData()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') } finally { setLoading(false) }
  }

  const handleDepositSale = async () => {
    if (!selectedClient) { toast.error('Select a client!'); return }
    if (!depositOk) { toast.error(`Insufficient deposit! Available: ${fmtTZS(availableDeposit)}`); return }
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await axios.post(`${API_URL}/sales/deposit-sale`, { client_id: selectedClient, discount: parseFloat(discount || 0), items: cartForPayload() }, { headers: { Authorization: `Bearer ${token}` } })
      setLastSale({ saleId: res.data.saleId, total: finalTotal, discount: parseFloat(discount || 0), saleMode: 'deposit', items: cartForReceipt(), cashierName: user?.name, clientName: selectedClientData?.name, remaining_deposit: res.data.remaining_deposit })
      toast.success(res.data.message); resetCart(); loadData()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') } finally { setLoading(false) }
  }

  const handleAddDeposit = async (e) => {
    e.preventDefault()
    if (!depositForm.client_id || !depositForm.amount) { toast.error('Select a client and amount'); return }
    setDepositLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await axios.post(`${API_URL}/sales/add-deposit`, depositForm, { headers: { Authorization: `Bearer ${token}` } })
      toast.success(res.data.message); setDepositForm({ client_id: '', amount: '', payment_method: 'cash', reference: '' }); setShowDepositForm(false); loadData()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') } finally { setDepositLoading(false) }
  }

  const canVoid = canManageSales

  // ── Edit Receipt (Admin/Manager) ──
  const [editTarget, setEditTarget] = useState(null)   // sale row inayohaririwa
  const [editSale, setEditSale] = useState(null)       // sale kamili kutoka server
  const [editLines, setEditLines] = useState([])
  const [editDiscount, setEditDiscount] = useState('')
  const [editMethod, setEditMethod] = useState('cash')
  const [editWalkin, setEditWalkin] = useState('')
  const [editReason, setEditReason] = useState('')
  const [editBlocked, setEditBlocked] = useState('')
  const [editFetching, setEditFetching] = useState(false)
  const [editSaving, setEditSaving] = useState(false)

  const authHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })

  const closeEdit = () => {
    setEditTarget(null); setEditSale(null); setEditLines([]); setEditReason(''); setEditBlocked('')
  }

  const openEdit = async (sale) => {
    setEditTarget(sale); setEditSale(null); setEditLines([]); setEditReason(''); setEditBlocked(''); setEditFetching(true)
    try {
      const res = await axios.get(`${API_URL}/sales/${sale.id}/returnable`, authHeaders())
      const { sale: full, items } = res.data
      if (full.voided) setEditBlocked(tr('sales.edit.isVoided', 'This receipt has been voided and cannot be edited.'))
      else if (items.some(i => Number(i.already_returned) > 0)) setEditBlocked(tr('sales.edit.hasReturns', 'This receipt already has returns processed against it, so it cannot be edited.'))
      setEditSale(full)
      setEditDiscount(String(Number(full.discount || 0)))
      setEditMethod(full.payment_method)
      setEditWalkin(full.walkin_name || '')
      setEditLines(items.map(i => {
        const product = products.find(p => p.id === i.product_id)
        const origUnitId = i.unit_id ? Number(i.unit_id) : null
        const origUnit = { id: origUnitId, unit_name: i.unit, conversion_factor: Number(i.conversion_factor || 1), selling_price: Number(i.price), wholesale_price: null }
        const units = product ? buildUnits(product) : [origUnit]
        if (!units.some(u => u.id === origUnitId)) units.push(origUnit)
        return {
          sale_item_id: i.sale_item_id, product_id: i.product_id, name: i.product_name,
          quantity: String(Number(i.quantity)), unit_id: origUnitId, price_type: i.price_type || 'retail',
          custom_price: i.price_type === 'custom' ? String(Number(i.price)) : '',
          origUnitId, origType: i.price_type || 'retail', origPrice: Number(i.price), units
        }
      }))
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load receipt')
      closeEdit()
    } finally { setEditFetching(false) }
  }

  // Muonekano wa bei mpya — server ndiye anayeamua mwisho, lakini sheria ni zilezile:
  // line isiyoguswa (unit na price type vilevile) inabaki na bei ya wakati wa mauzo.
  const editLinePrice = (l) => {
    if (l.price_type === 'custom') return parseFloat(l.custom_price) || 0
    if (l.unit_id === l.origUnitId && l.price_type === l.origType) return l.origPrice
    const u = l.units.find(x => x.id === l.unit_id) || l.units[0]
    return l.price_type === 'wholesale' ? Number(u.wholesale_price || 0) : Number(u.selling_price)
  }
  const updateEditLine = (id, patch) => setEditLines(lines => lines.map(l => l.sale_item_id === id ? { ...l, ...patch } : l))
  const removeEditLine = (id) => setEditLines(lines => lines.filter(l => l.sale_item_id !== id))
  const changeEditUnit = (l, value) => {
    const unit_id = value === '' ? null : Number(value)
    const u = l.units.find(x => x.id === unit_id)
    const type = l.price_type === 'wholesale' && !(u && u.wholesale_price) ? 'retail' : l.price_type
    updateEditLine(l.sale_item_id, { unit_id, price_type: type })
  }
  const changeEditType = (l, type) => {
    if (type === 'custom') updateEditLine(l.sale_item_id, { price_type: 'custom', custom_price: String(editLinePrice(l)) })
    else updateEditLine(l.sale_item_id, { price_type: type })
  }

  const editSubtotal = editLines.reduce((s, l) => s + editLinePrice(l) * (parseFloat(l.quantity) || 0), 0)
  const editDiscNum = parseFloat(editDiscount) || 0
  const editNewTotal = editSubtotal - editDiscNum
  const editOldTotal = editSale ? Number(editSale.total) : 0
  const editDiff = editNewTotal - editOldTotal
  const editClient = editSale && editSale.client_id ? clients.find(c => c.id == editSale.client_id) : null
  const editCashReceived = editSale && editSale.sale_type === 'cash' && editSale.payment_method === 'cash' && editMethod === 'cash' && editSale.amount_received != null
    ? Number(editSale.amount_received) : null
  const editCashTooLow = editCashReceived != null && editNewTotal > editCashReceived

  const submitEdit = async () => {
    if (!editReason.trim()) { toast.error(tr('sales.edit.needReason', 'Please enter a reason for the change')); return }
    if (editLines.length === 0) { toast.error(tr('sales.edit.needItem', 'A receipt must keep at least one item. Use Void to cancel it.')); return }
    for (const l of editLines) {
      if (!(parseFloat(l.quantity) > 0)) { toast.error(`Invalid quantity for ${l.name}`); return }
      if (l.price_type === 'custom' && !(parseFloat(l.custom_price) >= 0)) { toast.error(`Enter a valid price for ${l.name}`); return }
    }
    if (editDiscNum < 0 || editDiscNum > editSubtotal) { toast.error('Invalid discount'); return }
    if (editCashTooLow) { toast.error(tr('sales.edit.cashTooLow', 'The new total is more than the cash received')); return }

    setEditSaving(true)
    try {
      const payload = {
        reason: editReason.trim(),
        discount: editDiscNum,
        ...(editSale.sale_type === 'cash' ? { payment_method: editMethod } : {}),
        ...(!editSale.client_id ? { walkin_name: editWalkin } : {}),
        items: editLines.map(l => ({
          sale_item_id: l.sale_item_id,
          quantity: parseFloat(l.quantity),
          unit_id: l.unit_id,
          price_type: l.price_type,
          custom_price: l.price_type === 'custom' ? parseFloat(l.custom_price) : undefined
        }))
      }
      const res = await axios.put(`${API_URL}/sales/${editTarget.id}/edit`, payload, authHeaders())
      toast.success(res.data.message)
      closeEdit(); loadData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update receipt')
    } finally { setEditSaving(false) }
  }

  const persistHeldSales = (updated) => {
    setHeldSales(updated)
    localStorage.setItem('held_sales', JSON.stringify(updated))
  }

  const holdCurrentSale = () => {
    if (cart.length === 0) { toast.error(t('sales.hold.cartEmpty')); return }
    const label = (customerType === 'walkin' && walkinName) || (customerType === 'registered' && selectedClientData?.name) || `${cart.length} item(s)`
    const held = {
      id: Date.now(), label, cart, selectedClient, selectedClientData, customerType, walkinName,
      saleMode, discount, paymentMethod, amountReceived, createdAt: new Date().toISOString()
    }
    persistHeldSales([held, ...heldSales])
    resetCart()
    toast.success(t('sales.hold.success'))
  }

  const resumeHeldSale = (held) => {
    setCart(held.cart)
    setSelectedClient(held.selectedClient)
    setSelectedClientData(held.selectedClientData)
    setCustomerType(held.customerType)
    setWalkinName(held.walkinName || '')
    setSaleMode(held.saleMode)
    setDiscount(held.discount)
    setPaymentMethod(held.paymentMethod)
    setAmountReceived(held.amountReceived || '')
    persistHeldSales(heldSales.filter(h => h.id !== held.id))
    setShowHeldModal(false)
    toast.success(t('sales.hold.resumed'))
  }

  const deleteHeldSale = (id) => {
    persistHeldSales(heldSales.filter(h => h.id !== id))
  }

  const handleVoidSale = async () => {
    if (!voidReason.trim()) { toast.error(t('sales.void.needReason')); return }
    setVoidLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await axios.post(`${API_URL}/sales/${voidTarget.id}/void`, { reason: voidReason }, { headers: { Authorization: `Bearer ${token}` } })
      toast.success(res.data.message)
      setVoidTarget(null); setVoidReason(''); loadData()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to void sale') } finally { setVoidLoading(false) }
  }

  const hubCards = [
    { key: 'new', icon: ShoppingCart, title: t('sales.hub.newSale.title'), desc: t('sales.hub.newSale.desc') },
    { key: 'history', icon: History, title: t('sales.hub.history.title'), desc: t('sales.hub.history.desc') },
    { key: 'returns', icon: Undo2, title: t('sales.hub.returns.title'), desc: t('sales.hub.returns.desc') },
    { key: 'edit', icon: Pencil, title: t('sales.hub.edit.title'), desc: t('sales.hub.edit.desc') },
    { key: 'credit', icon: ClipboardList, title: t('sales.hub.credit.title'), desc: t('sales.hub.credit.desc') },
    { key: 'deposits', icon: PiggyBank, title: t('sales.hub.deposits.title'), desc: t('sales.hub.deposits.desc') },
  ].filter(c => c.key !== 'edit' || canVoid)

  const applySearch = (rows) => historySearch
    ? rows.filter(s => s.id.toString().includes(historySearch) || (s.client_name || '').toLowerCase().includes(historySearch.toLowerCase()) || (s.walkin_name || '').toLowerCase().includes(historySearch.toLowerCase()))
    : rows

  const customerLabel = (sale) => sale.walkin_name || sale.client_name || t('sales.walkinDefaultName')
  const saleBadge = (type) => type === 'credit' ? 'credit' : type === 'deposit' ? 'deposit' : 'cash'
  const saleLabel = (type) => type === 'credit' ? t('sales.mode.credit') : type === 'deposit' ? t('sales.mode.deposit') : t('sales.mode.cash')

  // Deposit ledger: amana zilizowekwa + zilizotumika (kila mabadiliko ya balance)
  const depositTypeLabel = { deposit_in: 'Deposit received', deposit_used: 'Used for sale', void_restore: 'Restored (sale voided)', adjustment: 'Adjustment' }
  const depositRows = depositTxns.filter(tx => {
    if (!historySearch) return true
    const q = historySearch.toLowerCase()
    return (tx.client_name || '').toLowerCase().includes(q) || (tx.reference || '').toLowerCase().includes(q) || String(tx.sale_id || '').includes(q)
  })
  const totalDepositsHeld = clients.reduce((s, c) => s + Number(c.deposit || 0), 0)

  const DepositLedger = () => (
    <div className="table-card">
      <div className="table-wrapper">
        <table className="data-table" style={{ minWidth: '760px' }}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Client</th>
              <th>Type</th>
              <th className="num">Amount</th>
              <th className="num">Balance after</th>
              <th>Method / Ref</th>
              <th>By</th>
            </tr>
          </thead>
          <tbody>
            {depositRows.map(tx => (
              <tr key={tx.id}>
                <td style={{ color: 'var(--text-muted)' }}>{new Date(tx.created_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}</td>
                <td style={{ fontWeight: '500' }}>{tx.client_name || '—'}</td>
                <td>
                  {depositTypeLabel[tx.type] || tx.type}
                  {tx.sale_id ? <span className="mono" style={{ color: 'var(--text-muted)' }}> #{tx.sale_id}</span> : null}
                </td>
                <td className="num mono" style={{ fontWeight: '600', color: Number(tx.amount) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {Number(tx.amount) >= 0 ? '+' : '−'}{fmtTZS(Math.abs(Number(tx.amount)))}
                </td>
                <td className="num mono">{fmtTZS(tx.balance_after)}</td>
                <td style={{ color: 'var(--text-muted)' }}>{[tx.payment_method, tx.reference].filter(Boolean).join(' · ') || '—'}</td>
                <td style={{ color: 'var(--text-muted)' }}>{tx.recorded_by_name || '—'}</td>
              </tr>
            ))}
            {depositRows.length === 0 && <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-subtle)' }}>No deposit activity yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )

  const SalesTable = ({ rows }) => (
    <div className="table-card">
      <div className="table-wrapper">
        <table className="data-table" style={{ minWidth: '760px' }}>
          <thead>
            <tr>
              <th>{t('sales.table.id')}</th>
              <th>{t('sales.table.customer')}</th>
              <th>{t('sales.table.cashier')}</th>
              <th>{t('sales.table.type')}</th>
              <th className="num">{t('sales.table.total')}</th>
              <th className="num">{t('sales.table.discount')}</th>
              <th>{t('sales.table.date')}</th>
              <th>{t('sales.table.receipt')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(sale => (
              <tr key={sale.id} style={{ opacity: sale.voided ? 0.55 : 1 }}>
                <td className="mono" style={{ color: 'var(--text-muted)' }}>#{sale.id}</td>
                <td style={{ fontWeight: '500' }}>
                  <span style={{ textDecoration: sale.voided ? 'line-through' : 'none' }}>{customerLabel(sale)}</span>
                  {sale.walkin_name && <span className="badge badge-neutral" style={{ marginLeft: '8px' }}>Walk-in</span>}
                  {sale.voided && <span className="badge badge-danger" style={{ marginLeft: '8px' }}>{t('sales.void.badge')}</span>}
                  {sale.edit_count > 0 && <span className="badge badge-neutral" style={{ marginLeft: '8px' }}>{tr('sales.edit.badge', 'Edited')}</span>}
                </td>
                <td style={{ color: 'var(--text-muted)' }}>{sale.cashier_name}</td>
                <td><span className={`badge badge-${saleBadge(sale.sale_type)}`}>{saleLabel(sale.sale_type)}</span></td>
                <td className="num mono" style={{ fontWeight: '600', textDecoration: sale.voided ? 'line-through' : 'none' }}>{fmtTZS(sale.total)}</td>
                <td className="num mono" style={{ color: 'var(--text-muted)' }}>{fmtTZS(sale.discount)}</td>
                <td style={{ color: 'var(--text-muted)' }}>{new Date(sale.created_at).toLocaleDateString('en-GB')}</td>
                <td>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="btn btn-sm" onClick={() => printReceiptFromHistory(sale)}><Printer size={14} strokeWidth={1.75} /> {t('sales.print')}</button>
                    {!sale.voided && canVoid && (
                      <button className="btn btn-sm" onClick={() => openEdit(sale)}><Pencil size={14} strokeWidth={1.75} /> {tr('sales.edit.button', 'Edit')}</button>
                    )}
                    {!sale.voided && canVoid && (
                      <button className="btn btn-sm" style={{ color: 'var(--danger)' }} onClick={() => setVoidTarget(sale)}>{t('sales.void.button')}</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-subtle)' }}>{t('sales.table.noSales')}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )

  const BackButton = () => (
    <button className="btn btn-sm" onClick={() => setView('hub')}><ArrowLeft size={15} strokeWidth={1.75} /> {t('sales.backToMenu')}</button>
  )

  return (
    <div style={{ color: 'var(--text)' }}>
      <style>{`
        .sale-layout { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 16px; align-items: start; }
        .sale-checkout { position: sticky; top: 16px; }
        @media (max-width: 1023px) {
          .sale-layout { grid-template-columns: minmax(0, 1fr); }
          .sale-checkout { position: static; }
        }
        .entry-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 12px; align-items: end; }
        .form-input.compact { height: 30px; padding: 0 8px; font-size: 13px; }
        .result-row { display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; padding: 9px 14px; border: none; border-bottom: 1px solid var(--border-light); background: transparent; color: var(--text); cursor: pointer; font-size: 14px; }
        .result-row:hover, .result-row.active { background: var(--surface-3); }
        .result-row:disabled { cursor: not-allowed; opacity: 0.5; }
        .hub-tile { text-align: left; cursor: pointer; background: var(--surface); color: var(--text); border: 1px solid var(--border); border-radius: 8px; padding: 18px; }
        .hub-tile:hover { border-color: var(--text-subtle); }
      `}</style>

      <div className="page-header">
        <div>
          <h1>{t('sales.title')}</h1>
          <p>{view === 'hub' ? t('sales.subtitleHub') : t('sales.subtitleActive')}</p>
        </div>
        {hasPermission(user, 'clients', 'create') && <button className="btn" onClick={() => setShowDepositForm(true)}><Plus size={16} strokeWidth={1.75} /> {t('sales.addDepositBtn')}</button>}
      </div>

      {/* HUB */}
      {view === 'hub' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          {hubCards.filter(c => c.key !== 'new' || canCreateSale).map(c => {
            const Icon = c.icon
            return (
              <button key={c.key} className="hub-tile lift" onClick={() => setView(c.key)}>
                <div className="lift-icon" style={{ width: '36px', height: '36px', borderRadius: '6px', background: 'var(--primary-soft)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                  <Icon size={20} strokeWidth={1.75} />
                </div>
                <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>{c.title}</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>{c.desc}</p>
              </button>
            )
          })}
        </div>
      )}

      {/* NEW SALE */}
      {view === 'new' && (
        <div>
          {/* Top bar: back, mode, held */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <BackButton />
            <div style={{ display: 'flex', gap: '4px', padding: '3px', background: 'var(--surface-3)', borderRadius: '8px', flex: '1 1 260px', maxWidth: '420px' }}>
              {[['cash', t('sales.mode.cash')], ['credit', t('sales.mode.credit')], ['deposit', t('sales.mode.deposit')]].map(([mode, label]) => (
                <button key={mode} onClick={() => setSaleMode(mode)}
                  style={{ flex: 1, height: '32px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500',
                    background: saleMode === mode ? 'var(--primary)' : 'transparent', color: saleMode === mode ? 'var(--on-primary)' : 'var(--text-muted)' }}>
                  {label}
                </button>
              ))}
            </div>
            {heldSales.length > 0 && (
              <button className="btn" style={{ marginLeft: 'auto', color: 'var(--warning)' }} onClick={() => setShowHeldModal(true)}>
                <Inbox size={16} strokeWidth={1.75} /> {t('sales.hold.badge')(heldSales.length)}
              </button>
            )}
          </div>

          <div className="sale-layout">
            {/* LEFT: entry + lines */}
            <div style={{ minWidth: 0 }}>
              {/* Add item */}
              <div className="card" style={{ marginBottom: '16px' }}>
                <SearchInput
                  inputRef={searchRef}
                  autoFocus
                  type="text"
                  placeholder={t('sales.searchProducts')}
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setShowResults(true); setActiveIdx(0) }}
                  onFocus={() => setShowResults(true)}
                  onBlur={() => setTimeout(() => setShowResults(false), 150)}
                  onKeyDown={onSearchKeyDown}
                />

                {showResults && (
                  <div style={{ marginTop: '8px', border: '1px solid var(--border)', borderRadius: '6px', maxHeight: '260px', overflowY: 'auto' }}>
                    {results.length === 0
                      ? <p style={{ padding: '16px', textAlign: 'center', fontSize: '13px', color: 'var(--text-subtle)' }}>{t('sales.productNotFound')}</p>
                      : results.map((p, idx) => {
                          const out = Number(p.stock) < 1
                          const low = !out && Number(p.stock) <= Number(p.low_stock_alert)
                          const altCount = (unitsByProduct[p.id] || []).length
                          return (
                            <button key={p.id} type="button" disabled={out} className={`result-row${idx === activeIdx ? ' active' : ''}`}
                              onMouseDown={e => e.preventDefault()} onClick={() => selectProduct(p)} onMouseEnter={() => setActiveIdx(idx)}>
                              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: '500' }}>
                                {p.name}
                                {p.category && <span style={{ marginLeft: '8px', fontSize: '12px', fontWeight: '400', color: 'var(--text-muted)' }}>{p.category}</span>}
                                {altCount > 0 && <span className="badge badge-neutral" style={{ marginLeft: '8px' }}>+{altCount}</span>}
                              </span>
                              <span style={{ fontSize: '12px', color: out ? 'var(--danger)' : 'var(--text-muted)', whiteSpace: 'nowrap' }} className="mono">{p.stock} {p.unit || 'PC'}</span>
                              {out && <span className="badge badge-out">Out</span>}
                              {low && <span className="badge badge-low">Low</span>}
                              <span className="mono" style={{ minWidth: '84px', textAlign: 'right', fontWeight: '600' }}>{fmtNum(p.price)}</span>
                            </button>
                          )
                        })}
                  </div>
                )}

                {!entry && !showResults && (
                  <p style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    {tr('sales.entry.hint', 'Search by name or category, or scan a product ID and press Enter.')}
                  </p>
                )}

                {entry && (
                  <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: '600', fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.product.name}</p>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {tr('sales.entry.inStock', 'In stock')}: <span className="mono">{entry.product.stock} {entry.product.unit || 'PC'}</span>
                          {entryUnit.conversion_factor !== 1 && <span className="mono"> · max {entryMax} {entryUnit.unit_name}</span>}
                        </p>
                      </div>
                      <button className="btn-ghost btn-sm" onClick={clearEntry} aria-label="Clear"><X size={16} strokeWidth={1.75} /></button>
                    </div>

                    <div className="entry-grid">
                      <div>
                        <label className="form-label">{tr('sales.entry.unit', 'Unit')}</label>
                        {entry.units.length > 1
                          ? <select className="form-input" value={entry.unitId ?? ''} onChange={e => changeEntryUnit(e.target.value)}>
                              {entry.units.map(u => <option key={u.id ?? 'base'} value={u.id ?? ''}>{u.unit_name}</option>)}
                            </select>
                          : <input className="form-input" value={entryUnit.unit_name} readOnly style={{ background: 'var(--surface-3)' }} />}
                      </div>
                      <div>
                        <label className="form-label">{tr('sales.entry.priceType', 'Price type')}</label>
                        <select className="form-input" value={entry.priceType} onChange={e => changeEntryPriceType(e.target.value)}>
                          <option value="retail">{t('sales.priceType.retail')}</option>
                          <option value="wholesale" disabled={!entryUnit.wholesale_price}>{entryUnit.wholesale_price ? t('sales.priceType.wholesale') : t('sales.priceType.wholesaleNA')}</option>
                          <option value="custom">{t('sales.priceType.custom')}</option>
                        </select>
                      </div>
                      <div>
                        <label className="form-label">{tr('sales.entry.price', 'Price')}</label>
                        {entry.priceType === 'custom'
                          ? <input className="form-input mono" type="number" min="0" value={entry.customPrice} onChange={e => setEntry({ ...entry, customPrice: e.target.value })} />
                          : <input className="form-input mono" value={fmtNum(entryPrice)} readOnly style={{ background: 'var(--surface-3)' }} />}
                      </div>
                      <div>
                        <label className="form-label">{tr('sales.entry.qty', 'Qty')}</label>
                        <input ref={qtyRef} className="form-input mono" type="number" min="1" value={entry.qty}
                          onChange={e => setEntry({ ...entry, qty: e.target.value })}
                          onKeyDown={e => { if (e.key === 'Enter') addEntryToCart() }} />
                      </div>
                      <div>
                        <label className="form-label">{tr('sales.entry.amount', 'Amount')}</label>
                        <input className="form-input mono" value={fmtNum(entryAmount)} readOnly style={{ background: 'var(--surface-3)', fontWeight: '600' }} />
                      </div>
                      <div>
                        <button className="btn-primary btn-block" style={{ height: '38px' }} onClick={addEntryToCart}>
                          <Plus size={16} strokeWidth={2} /> {tr('sales.entry.add', 'Add')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Lines */}
              <div className="table-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '600' }}>{t('sales.cart')}</h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{cart.length} {tr('sales.entry.items', 'items')}</span>
                </div>
                {cart.length === 0 ? (
                  <p style={{ padding: '32px 16px', textAlign: 'center', fontSize: '13px', color: 'var(--text-subtle)' }}>{t('sales.cartEmpty')}</p>
                ) : (
                  <div className="table-wrapper">
                    <table className="data-table" style={{ minWidth: '620px' }}>
                      <thead>
                        <tr>
                          <th>{tr('sales.entry.item', 'Item')}</th>
                          <th>{tr('sales.entry.unit', 'Unit')}</th>
                          <th style={{ width: '84px' }}>{tr('sales.entry.qty', 'Qty')}</th>
                          <th>{tr('sales.entry.price', 'Price')}</th>
                          <th className="num">{tr('sales.entry.amount', 'Amount')}</th>
                          <th style={{ width: '44px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {cart.map(item => {
                          const currentUnit = getCurrentUnit(item)
                          return (
                            <tr key={item.product_id}>
                              <td style={{ fontWeight: '500', maxWidth: '220px' }}>
                                <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                              </td>
                              <td>
                                {item.units.length > 1
                                  ? <select className="form-input compact" style={{ width: '90px' }} value={item.selectedUnitId ?? ''} onChange={e => setUnit(item.product_id, e.target.value)}>
                                      {item.units.map(u => <option key={u.id ?? 'base'} value={u.id ?? ''}>{u.unit_name}</option>)}
                                    </select>
                                  : <span style={{ color: 'var(--text-muted)' }}>{currentUnit.unit_name}</span>}
                              </td>
                              <td>
                                <input className="form-input compact mono" type="number" min="1" style={{ width: '70px' }} value={item.quantity} onChange={e => updateQuantity(item.product_id, e.target.value)} />
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <select className="form-input compact" style={{ width: '104px' }} value={item.price_type} onChange={e => setPriceType(item.product_id, e.target.value)}>
                                    <option value="retail">{t('sales.priceType.retail')}</option>
                                    <option value="wholesale" disabled={!currentUnit.wholesale_price}>{currentUnit.wholesale_price ? t('sales.priceType.wholesale') : t('sales.priceType.wholesaleNA')}</option>
                                    <option value="custom">{t('sales.priceType.custom')}</option>
                                  </select>
                                  {item.price_type === 'custom'
                                    ? <input className="form-input compact mono" type="number" min="0" style={{ width: '90px' }} value={item.price} onChange={e => setCustomPrice(item.product_id, e.target.value)} />
                                    : <span className="mono">{fmtNum(item.price)}</span>}
                                </div>
                              </td>
                              <td className="num mono" style={{ fontWeight: '600' }}>{fmtNum(item.price * item.quantity)}</td>
                              <td>
                                <button className="btn-ghost btn-sm" style={{ padding: '0 6px' }} onClick={() => removeFromCart(item.product_id)} aria-label={`Remove ${item.name}`}>
                                  <X size={16} strokeWidth={1.75} />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: checkout */}
            <div className="sale-checkout">
              <div className="card" style={{ marginBottom: 0 }}>
                <div className="form-group">
                  <label className="form-label">{t('sales.customer')} {saleMode !== 'cash' && <span style={{ color: 'var(--danger)' }}>*</span>}</label>
                  {saleMode === 'cash' && (
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                      <button type="button" className={`${customerType === 'registered' ? 'btn-primary' : 'btn'} btn-sm`} style={{ flex: 1 }} onClick={() => setCustomerType('registered')}>{t('sales.customerRegistered')}</button>
                      <button type="button" className={`${customerType === 'walkin' ? 'btn-primary' : 'btn'} btn-sm`} style={{ flex: 1 }} onClick={() => setCustomerType('walkin')}>{t('sales.customerWalkin')}</button>
                    </div>
                  )}
                  {customerType === 'walkin' && saleMode === 'cash' ? (
                    <input className="form-input" type="text" value={walkinName} onChange={e => setWalkinName(e.target.value)} placeholder={t('sales.walkinPlaceholder')} />
                  ) : (
                    <select className="form-input" value={selectedClient} onChange={handleClientChange}>
                      <option value="">{t('sales.selectClient')}</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  )}
                </div>

                {selectedClientData && saleMode === 'credit' && (
                  <StatusNote ok={creditOk} title={creditOk ? t('sales.creditOk') : t('sales.creditNotOk')}>
                    <div>{t('sales.limit')}: <strong className="mono">{fmtTZS(selectedClientData.credit_limit)}</strong></div>
                    <div>{t('sales.available')}: <strong className="mono">{fmtTZS(availableCredit)}</strong></div>
                  </StatusNote>
                )}
                {selectedClientData && saleMode === 'deposit' && (
                  <StatusNote ok={depositOk} title={depositOk ? t('sales.depositOk') : t('sales.depositNotOk')}>
                    <div>{t('sales.depositBalance')}: <strong className="mono">{fmtTZS(availableDeposit)}</strong></div>
                  </StatusNote>
                )}

                {saleMode === 'cash' && (
                  <div className="form-group">
                    <label className="form-label">{t('sales.payment')}</label>
                    <select className="form-input" value={paymentMethod} onChange={e => { setPaymentMethod(e.target.value); setAmountReceived('') }}>
                      <option value="cash">Cash</option>
                      <option value="mobile_money">Mobile Money</option>
                      <option value="bank_transfer">Bank Transfer</option>
                    </select>
                  </div>
                )}

                {/* Amount received — cashier tu */}
                {needsReceived && (
                  <div className="form-group">
                    <label className="form-label">{t('sales.amountReceived')}</label>
                    <input className={`form-input mono${cashInsufficient && amountReceived !== '' ? ' is-invalid' : ''}`} type="number" min="0" value={amountReceived}
                      onChange={e => setAmountReceived(e.target.value)} placeholder={finalTotal > 0 ? finalTotal.toFixed(0) : '0'} />
                    {amountReceived !== '' && (
                      <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: '6px', fontSize: '13px',
                        background: changeAmount >= 0 ? 'var(--success-soft)' : 'var(--danger-soft)', color: changeAmount >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                        <span style={{ fontWeight: '500' }}>{changeAmount >= 0 ? t('sales.change') : t('sales.insufficientAmount')}</span>
                        {changeAmount >= 0 && <span className="mono" style={{ fontWeight: '600' }}>{fmtTZS(changeAmount)}</span>}
                      </div>
                    )}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">{t('sales.discount')}</label>
                  <input className="form-input mono" type="number" min="0" value={discount} onChange={e => setDiscount(e.target.value)} placeholder="0" />
                </div>

                {/* Totals */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '14px', color: 'var(--text-muted)' }}>
                    <span>{t('sales.subtotal')}</span><span className="mono">{fmtTZS(total)}</span>
                  </div>
                  {parseFloat(discount) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '14px', color: 'var(--text-muted)' }}>
                      <span>{t('sales.discount').split(' (')[0]}</span><span className="mono" style={{ color: 'var(--danger)' }}>-{fmtTZS(discount)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '10px', fontWeight: '700' }}>
                    <span style={{ fontSize: '15px' }}>{t('sales.total')}</span><span className="mono" style={{ fontSize: '22px' }}>{fmtTZS(finalTotal)}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn-primary btn-lg" style={{ flex: 1 }}
                    onClick={saleMode === 'cash' ? handleCashSale : saleMode === 'credit' ? handleCreditSale : handleDepositSale}
                    disabled={loading || cart.length === 0 || (saleMode === 'credit' && !creditOk) || (saleMode === 'deposit' && !depositOk) || cashInsufficient}>
                    {loading ? t('sales.processing') : saleMode === 'cash' ? t('sales.completeSale') : saleMode === 'credit' ? t('sales.sellOnCredit') : t('sales.useDeposit')}
                  </button>
                  <button className="btn btn-lg" style={{ width: '48px', padding: 0 }} onClick={holdCurrentSale} disabled={cart.length === 0} title={t('sales.hold.button')} aria-label={t('sales.hold.button')}>
                    <Pause size={18} strokeWidth={1.75} />
                  </button>
                </div>

                {lastSale && (
                  <div style={{ marginTop: '16px', background: 'var(--success-soft)', border: '1px solid var(--border)', borderRadius: '6px', padding: '14px' }}>
                    <p style={{ fontSize: '13px', color: 'var(--success)', fontWeight: '600', marginBottom: '2px' }}>{t('sales.saleComplete')(lastSale.saleId)}</p>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>{lastSale.clientName}</p>
                    <p className="mono" style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>{fmtTZS(lastSale.total)}</p>
                    {lastSale.changeGiven != null && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                        <span>{t('sales.amountReceived')}: <strong className="mono">{fmtTZS(lastSale.amountReceived)}</strong></span>
                        <span>{t('sales.change')}: <strong className="mono">{fmtTZS(lastSale.changeGiven)}</strong></span>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-primary btn-sm" style={{ flex: 1 }} onClick={() => printReceipt(lastSale)}><Printer size={14} strokeWidth={1.75} /> {t('sales.printReceipt')}</button>
                      <button className="btn btn-sm" onClick={() => setLastSale(null)} aria-label="Dismiss"><X size={14} strokeWidth={1.75} /></button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HISTORY */}
      {view === 'history' && (
        <div>
          <div style={{ marginBottom: '16px' }}><BackButton /></div>
          <SearchInput type="text" placeholder={t('sales.trackSearchPlaceholder')} value={historySearch} onChange={e => setHistorySearch(e.target.value)} style={{ marginBottom: '16px', maxWidth: '420px' }} />
          <SalesTable rows={applySearch(sales)} />
        </div>
      )}

      {/* EDIT RECEIPT — orodha ya risiti za kuhariri (Admin/Manager) */}
      {view === 'edit' && canVoid && (
        <div>
          <div style={{ marginBottom: '16px' }}><BackButton /></div>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '12px' }}>{tr('sales.edit.listHint', 'Search a receipt, then press Edit to correct quantities, prices, discount or payment details.')}</p>
          <SearchInput type="text" placeholder={t('sales.trackSearchPlaceholder')} value={historySearch} onChange={e => setHistorySearch(e.target.value)} style={{ marginBottom: '16px', maxWidth: '420px' }} />
          <SalesTable rows={applySearch(sales.filter(s => !s.voided))} />
        </div>
      )}

      {/* RETURNS */}
      {view === 'returns' && (
        <div>
          <div style={{ marginBottom: '16px' }}><BackButton /></div>
          <Returns sales={sales} onDone={() => { loadData(); setView('hub') }} />
        </div>
      )}

      {/* CREDIT SALES */}
      {view === 'credit' && (
        <div>
          <div style={{ marginBottom: '16px' }}><BackButton /></div>
          <SearchInput type="text" placeholder={t('sales.trackSearchPlaceholder')} value={historySearch} onChange={e => setHistorySearch(e.target.value)} style={{ marginBottom: '16px', maxWidth: '420px' }} />
          <SalesTable rows={applySearch(sales.filter(s => s.sale_type === 'credit'))} />
        </div>
      )}

      {/* DEPOSITS */}
      {view === 'deposits' && (
        <div>
          <div style={{ marginBottom: '16px' }}><BackButton /></div>
          <StatusNote ok={true} title={`Deposits held for clients: ${fmtTZS(totalDepositsHeld)}`}>
            <div>This is customer money kept in the shop. It becomes revenue only when it is used to pay for a sale.</div>
          </StatusNote>
          <SearchInput type="text" placeholder={t('sales.trackSearchPlaceholder')} value={historySearch} onChange={e => setHistorySearch(e.target.value)} style={{ marginBottom: '16px', maxWidth: '420px' }} />
          <h3 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 8px' }}>Deposit activity</h3>
          <DepositLedger />
          <h3 style={{ fontSize: '14px', fontWeight: '600', margin: '24px 0 8px' }}>Sales paid with deposit</h3>
          <SalesTable rows={applySearch(sales.filter(s => s.sale_type === 'deposit'))} />
        </div>
      )}

      {/* ADD DEPOSIT MODAL */}
      {showDepositForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 className="modal-title">{t('sales.addDepositModal.title')}</h3>
            <p className="modal-sub" style={{ marginBottom: '20px' }}>{t('sales.addDepositModal.subtitle')}</p>
            <form onSubmit={handleAddDeposit}>
              <div className="form-group">
                <label className="form-label">{t('sales.addDepositModal.selectClient')}</label>
                <select className="form-input" value={depositForm.client_id} onChange={e => setDepositForm({ ...depositForm, client_id: e.target.value })} required>
                  <option value="">--</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{t('sales.addDepositModal.amount')}</label>
                <input className="form-input mono" type="number" value={depositForm.amount} onChange={e => setDepositForm({ ...depositForm, amount: e.target.value })} placeholder="e.g. 100000" required min="1" />
              </div>
              <div className="form-group">
                <label className="form-label">{t('sales.addDepositModal.method')}</label>
                <select className="form-input" value={depositForm.payment_method} onChange={e => setDepositForm({ ...depositForm, payment_method: e.target.value })}>
                  <option value="cash">Cash</option><option value="mobile_money">Mobile Money</option><option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{t('sales.addDepositModal.reference')} {t('common.optional')}</label>
                <input className="form-input" type="text" value={depositForm.reference} onChange={e => setDepositForm({ ...depositForm, reference: e.target.value })} placeholder="MPE123456" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn" onClick={() => setShowDepositForm(false)}>{t('common.cancel')}</button>
                <button type="submit" className="btn-primary" disabled={depositLoading}>{depositLoading ? t('common.saving') : t('sales.addDepositModal.save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VOID SALE MODAL */}
      {voidTarget && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 className="modal-title" style={{ color: 'var(--danger)' }}>{t('sales.void.modalTitle')}</h3>
            <p className="modal-sub" style={{ marginBottom: '20px' }}>{t('sales.void.modalSubtitle')(voidTarget.id)}</p>
            <label className="form-label">{t('sales.void.reasonLabel')}</label>
            <textarea className="form-input" value={voidReason} onChange={e => setVoidReason(e.target.value)} rows={3} style={{ resize: 'vertical' }} placeholder={t('sales.void.reasonPlaceholder')} autoFocus />
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => { setVoidTarget(null); setVoidReason('') }}>{t('common.cancel')}</button>
              <button className="btn-danger" onClick={handleVoidSale} disabled={voidLoading}>{voidLoading ? t('sales.void.voiding') : t('sales.void.confirm')}</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT RECEIPT MODAL */}
      {editTarget && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '880px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 className="modal-title">{tr('sales.edit.title', 'Edit Receipt')} #{editTarget.id}</h3>
            <p className="modal-sub" style={{ marginBottom: '16px' }}>{tr('sales.edit.subtitle', 'Every correction is saved in the Audit Log. Stock, credit and deposit balances are adjusted automatically.')}</p>

            {editFetching && <p style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '24px 0' }}>{t('common.loading')}</p>}

            {!editFetching && editSale && (
              <>
                {editBlocked && <StatusNote ok={false} title={editBlocked} />}

                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  <span>{tr('sales.edit.customer', 'Customer')}: <strong style={{ color: 'var(--text)' }}>{editSale.client_name || editSale.walkin_name || t('sales.walkinDefaultName')}</strong></span>
                  <span>{tr('sales.edit.type', 'Type')}: <strong style={{ color: 'var(--text)' }}>{saleLabel(editSale.sale_type)}</strong></span>
                  <span>{tr('sales.edit.date', 'Date')}: <strong style={{ color: 'var(--text)' }}>{new Date(editSale.created_at).toLocaleString('en-GB')}</strong></span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                  {!editSale.client_id && (
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">{tr('sales.edit.walkinName', 'Customer name (walk-in)')}</label>
                      <input className="form-input" value={editWalkin} onChange={e => setEditWalkin(e.target.value)} placeholder={t('sales.walkinPlaceholder')} />
                    </div>
                  )}
                  {editSale.sale_type === 'cash' && (
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">{t('sales.payment')}</label>
                      <select className="form-input" value={editMethod} onChange={e => setEditMethod(e.target.value)}>
                        <option value="cash">Cash</option>
                        <option value="mobile_money">Mobile Money</option>
                        <option value="bank_transfer">Bank Transfer</option>
                      </select>
                    </div>
                  )}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">{t('sales.discount')}</label>
                    <input className="form-input mono" type="number" min="0" value={editDiscount} onChange={e => setEditDiscount(e.target.value)} />
                  </div>
                </div>

                <div className="table-card" style={{ marginBottom: '16px' }}>
                  <div className="table-wrapper">
                    <table className="data-table" style={{ minWidth: '720px' }}>
                      <thead>
                        <tr>
                          <th>{tr('sales.edit.product', 'Product')}</th>
                          <th>{tr('sales.entry.unit', 'Unit')}</th>
                          <th>{tr('sales.entry.priceType', 'Price type')}</th>
                          <th className="num">{tr('sales.entry.price', 'Price')}</th>
                          <th className="num">{tr('sales.entry.qty', 'Qty')}</th>
                          <th className="num">{tr('sales.entry.amount', 'Amount')}</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {editLines.map(l => {
                          const u = l.units.find(x => x.id === l.unit_id) || l.units[0]
                          const price = editLinePrice(l)
                          return (
                            <tr key={l.sale_item_id}>
                              <td style={{ fontWeight: '500' }}>{l.name}</td>
                              <td>
                                {l.units.length > 1
                                  ? <select className="form-input" style={{ minWidth: '90px' }} value={l.unit_id ?? ''} onChange={e => changeEditUnit(l, e.target.value)} disabled={!!editBlocked}>
                                      {l.units.map(x => <option key={x.id ?? 'base'} value={x.id ?? ''}>{x.unit_name}</option>)}
                                    </select>
                                  : <span>{u.unit_name}</span>}
                              </td>
                              <td>
                                <select className="form-input" style={{ minWidth: '110px' }} value={l.price_type} onChange={e => changeEditType(l, e.target.value)} disabled={!!editBlocked}>
                                  <option value="retail">{t('sales.priceType.retail')}</option>
                                  <option value="wholesale" disabled={!(u && u.wholesale_price)}>{u && u.wholesale_price ? t('sales.priceType.wholesale') : t('sales.priceType.wholesaleNA')}</option>
                                  <option value="custom">{t('sales.priceType.custom')}</option>
                                </select>
                              </td>
                              <td className="num">
                                {l.price_type === 'custom'
                                  ? <input className="form-input mono" style={{ width: '110px', textAlign: 'right' }} type="number" min="0" value={l.custom_price} onChange={e => updateEditLine(l.sale_item_id, { custom_price: e.target.value })} disabled={!!editBlocked} />
                                  : <span className="mono">{fmtNum(price)}</span>}
                              </td>
                              <td className="num">
                                <input className="form-input mono" style={{ width: '80px', textAlign: 'right' }} type="number" min="0" value={l.quantity} onChange={e => updateEditLine(l.sale_item_id, { quantity: e.target.value })} disabled={!!editBlocked} />
                              </td>
                              <td className="num mono" style={{ fontWeight: '600' }}>{fmtNum(price * (parseFloat(l.quantity) || 0))}</td>
                              <td>
                                <button className="btn-ghost btn-sm" style={{ padding: '0 6px' }} onClick={() => removeEditLine(l.sale_item_id)} disabled={!!editBlocked || editLines.length === 1} aria-label={`Remove ${l.name}`}>
                                  <X size={16} strokeWidth={1.75} />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '32px', fontSize: '13px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{tr('sales.edit.previousTotal', 'Previous total')}: <strong className="mono" style={{ color: 'var(--text)' }}>{fmtTZS(editOldTotal)}</strong></span>
                  <span style={{ color: 'var(--text-muted)' }}>{tr('sales.edit.newTotal', 'New total')}: <strong className="mono" style={{ color: 'var(--text)' }}>{fmtTZS(editNewTotal)}</strong></span>
                  <span style={{ color: 'var(--text-muted)' }}>{tr('sales.edit.difference', 'Difference')}: <strong className="mono" style={{ color: editDiff > 0 ? 'var(--danger)' : editDiff < 0 ? 'var(--success)' : 'var(--text)' }}>{editDiff > 0 ? '+' : ''}{fmtTZS(editDiff)}</strong></span>
                </div>

                {editCashReceived != null && (
                  <StatusNote ok={!editCashTooLow} title={editCashTooLow ? tr('sales.edit.cashTooLow', 'The new total is more than the cash received') : `${t('sales.change')}: ${fmtTZS(editCashReceived - editNewTotal)}`}>
                    <div style={{ color: 'var(--text-muted)' }}>
                      {editCashTooLow
                        ? `${tr('sales.edit.cashTooLowHelp', 'Cash received')}: ${fmtTZS(editCashReceived)}. ${tr('sales.edit.cashTooLowHint', 'Void this receipt and create a new sale instead.')}`
                        : `${t('sales.amountReceived')}: ${fmtTZS(editCashReceived)}`}
                    </div>
                  </StatusNote>
                )}
                {editSale.sale_type === 'cash' && editCashReceived == null && Math.abs(editDiff) > 0.004 && (
                  <StatusNote ok={true} title={editDiff < 0
                    ? `${tr('sales.edit.refundDue', 'Refund the customer')}: ${fmtTZS(-editDiff)}`
                    : `${tr('sales.edit.collectDue', 'Collect from the customer')}: ${fmtTZS(editDiff)}`} />
                )}
                {editSale.sale_type === 'credit' && editClient && (
                  <StatusNote ok={editDiff <= 0 || editDiff <= Number(editClient.credit_limit) - Number(editClient.balance)} title={`${tr('sales.edit.balance', 'Client balance')}: ${fmtTZS(editClient.balance)} → ${fmtTZS(Math.max(Number(editClient.balance) + editDiff, 0))}`}>
                    <div style={{ color: 'var(--text-muted)' }}>{t('sales.limit')}: {fmtTZS(editClient.credit_limit)}</div>
                  </StatusNote>
                )}
                {editSale.sale_type === 'deposit' && editClient && (
                  <StatusNote ok={editDiff <= 0 || editDiff <= Number(editClient.deposit || 0)} title={`${tr('sales.edit.deposit', 'Client deposit')}: ${fmtTZS(editClient.deposit || 0)} → ${fmtTZS(Number(editClient.deposit || 0) - editDiff)}`} />
                )}

                <div className="form-group">
                  <label className="form-label">{tr('sales.edit.reason', 'Reason for the change')} <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <textarea className="form-input" rows={2} style={{ resize: 'vertical' }} value={editReason} onChange={e => setEditReason(e.target.value)} placeholder={tr('sales.edit.reasonPlaceholder', 'e.g. Wrong price type selected, wrong quantity keyed in...')} disabled={!!editBlocked} />
                </div>
              </>
            )}

            <div className="modal-actions">
              <button type="button" className="btn" onClick={closeEdit}>{t('common.cancel')}</button>
              <button className="btn-primary" onClick={submitEdit} disabled={editSaving || editFetching || !editSale || !!editBlocked || editCashTooLow}>
                {editSaving ? t('common.saving') : tr('sales.edit.save', 'Save changes')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HELD SALES MODAL */}
      {showHeldModal && (
        <div className="modal-overlay" onClick={() => setShowHeldModal(false)}>
          <div className="modal" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <h3 className="modal-title" style={{ marginBottom: '16px' }}>{t('sales.hold.modalTitle')}</h3>
            {heldSales.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-subtle)', padding: '24px 0', fontSize: '13px' }}>{t('sales.hold.empty')}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {heldSales.map(held => (
                  <div key={held.id} style={{ border: '1px solid var(--border)', borderRadius: '6px', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div>
                        <p style={{ fontWeight: '600', fontSize: '14px' }}>{held.label}</p>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{held.cart.length} item(s) · {new Date(held.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <span className={`badge badge-${saleBadge(held.saleMode)}`}>{t(`sales.mode.${held.saleMode}`)}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-primary btn-sm" style={{ flex: 1 }} onClick={() => resumeHeldSale(held)}>{t('sales.hold.resume')}</button>
                      <button className="btn btn-sm" style={{ color: 'var(--danger)' }} onClick={() => deleteHeldSale(held.id)}>{t('sales.hold.delete')}</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="modal-actions">
              <button className="btn" onClick={() => setShowHeldModal(false)}>{t('common.close')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Sales
