import { useState, useEffect } from 'react'
import { getProducts, getClients, createSale, getSales } from '../services/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import logo from '../assets/logo.png'

const Sales = () => {
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [filteredProducts, setFilteredProducts] = useState([])
  const [clients, setClients] = useState([])
  const [sales, setSales] = useState([])
  const [cart, setCart] = useState([])
  const [selectedClient, setSelectedClient] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [discount, setDiscount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('new')
  const [lastSale, setLastSale] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  const formatTSh = (amount) => `TSh ${(parseFloat(amount || 0) * 2600).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  useEffect(() => {
    getProducts().then(res => {
      setProducts(res.data)
      setFilteredProducts(res.data)
    }).catch(() => {})
    getClients().then(res => setClients(res.data)).catch(() => {})
    getSales().then(res => setSales(res.data)).catch(() => {})
  }, [])

  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase()
    setSearchQuery(query)
    const filtered = products.filter(p => 
      p.name.toLowerCase().includes(query) || 
      p.category?.toLowerCase().includes(query)
    )
    setFilteredProducts(filtered)
  }

  const addToCart = (product) => {
    const existing = cart.find(item => item.product_id === product.id)
    if (existing) {
      if (existing.quantity >= product.stock) {
        toast.error(`Stock not enough — only ${product.stock} available`)
        return
      }
      setCart(cart.map(item =>
        item.product_id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ))
    } else {
      setCart([...cart, { 
        product_id: product.id, 
        name: product.name, 
        price: product.price, 
        quantity: 1,
        unit: product.unit || 'PC'
      }])
    }
    toast.success(`✓ ${product.name} added`)
  }

  const removeFromCart = (product_id) => {
    setCart(cart.filter(item => item.product_id !== product_id))
  }

  const updateQuantity = (product_id, quantity) => {
    if (quantity < 1) return
    setCart(cart.map(item =>
      item.product_id === product_id ? { ...item, quantity: parseInt(quantity) } : item
    ))
  }

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const finalTotal = total - parseFloat(discount || 0)

  const printReceipt = (saleData) => {
    const doc = new jsPDF()
    
    // Add logo
    const img = new Image()
    img.src = logo
    doc.addImage(img, 'PNG', 85, 10, 40, 25)
    
    // Header
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('PIUS HARDWARE', 105, 42, { align: 'center' })
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('P.O.BOX 4629, MBEYA TANZANIA', 105, 48, { align: 'center' })
    doc.text('Tel: 0764067682 / 0759494763 / 0756146747', 105, 53, { align: 'center' })
    
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('CASH RECEIPT', 105, 63, { align: 'center' })
    
    doc.setLineWidth(0.5)
    doc.line(20, 68, 190, 68)
    
    // Receipt info
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Receipt #: ${saleData.saleId || 'N/A'}`, 20, 75)
    doc.text(`Date: ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB')}`, 20, 80)
    doc.text(`Customer: ${saleData.clientName || 'WALK-IN'}`, 20, 85)
    doc.text(`Currency: TSHS`, 20, 90)
    
    // Table
    const tableData = saleData.items.map((item, i) => [
      i + 1,
      item.name,
      item.unit || 'PC',
      item.quantity,
      (parseFloat(item.price) * 2600).toLocaleString('en-US', { minimumFractionDigits: 2 }),
      (parseFloat(item.price) * item.quantity * 2600).toLocaleString('en-US', { minimumFractionDigits: 2 })
    ])
    
    doc.autoTable({
      startY: 95,
      head: [['S/N', 'Description of Goods', 'Unit', 'Qty', 'Price', 'Total']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 },
        1: { cellWidth: 70 },
        2: { halign: 'center', cellWidth: 20 },
        3: { halign: 'center', cellWidth: 15 },
        4: { halign: 'right', cellWidth: 35 },
        5: { halign: 'right', cellWidth: 35 }
      }
    })
    
    const finalY = doc.lastAutoTable.finalY + 10
    
    // Grand Total
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    const grandTotal = (parseFloat(saleData.total) * 2600).toLocaleString('en-US', { minimumFractionDigits: 2 })
    doc.text(`Grand Total: TSh ${grandTotal}`, 190, finalY, { align: 'right' })
    
    // Footer
    doc.setFontSize(10)
    doc.setFont('helvetica', 'italic')
    doc.text('JENGA NA PIUS HARDWARE', 105, finalY + 15, { align: 'center' })
    
    doc.setFont('helvetica', 'normal')
    doc.text(`Served By: ${saleData.cashierName || 'CASHIER'}`, 105, finalY + 20, { align: 'center' })
    
    doc.autoPrint()
    window.open(doc.output('bloburl'), '_blank')
  }

  const handleSale = async () => {
    if (cart.length === 0) {
      toast.error('Add items to cart first!')
      return
    }
    setLoading(true)
    try {
      const res = await createSale({
        client_id: selectedClient || null,
        payment_method: paymentMethod,
        discount: parseFloat(discount || 0),
        items: cart.map(item => ({ product_id: item.product_id, quantity: item.quantity }))
      })
      
      const client = clients.find(c => c.id == selectedClient)
      
      const saleData = {
        saleId: res.data.saleId,
        total: finalTotal,
        discount: parseFloat(discount || 0),
        paymentMethod,
        items: cart,
        cashierName: user?.name || 'CASHIER',
        clientName: client?.name || 'WALK-IN'
      }
      
      setLastSale(saleData)
      toast.success('✓ Sale completed successfully!')
      
      setCart([])
      setSelectedClient('')
      setDiscount(0)
      getProducts().then(res => {
        setProducts(res.data)
        setFilteredProducts(res.data)
      })
      getSales().then(res => setSales(res.data))
    } catch (error) {
      toast.error(error.response?.data?.message || 'Sale failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: '0 0 5px', fontSize: '32px', fontWeight: '700', background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            🛒 Sales
          </h1>
          <p style={{ margin: 0, color: '#888', fontSize: '14px' }}>Process sales and manage history</p>
        </div>
        {lastSale && (
          <button
            onClick={() => printReceipt(lastSale)}
            style={{ padding: '12px 25px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}
          >
            🖨️ Print Last Receipt
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '30px' }}>
        {['new', 'history'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{ 
              padding: '12px 30px', 
              border: 'none', 
              borderRadius: '12px', 
              cursor: 'pointer', 
              background: activeTab === tab ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' : '#f0f0f0', 
              color: activeTab === tab ? 'white' : '#333', 
              fontWeight: '700',
              fontSize: '14px',
              boxShadow: activeTab === tab ? '0 4px 15px rgba(240, 147, 251, 0.4)' : 'none'
            }}
          >
            {tab === 'new' ? '🛒 New Sale' : '📋 History'}
          </button>
        ))}
      </div>

      {activeTab === 'new' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '25px' }}>
          {/* Products Grid */}
          <div>
            {/* Search Bar */}
            <input
              type="text"
              placeholder="🔍 Search products by name or category..."
              value={searchQuery}
              onChange={handleSearch}
              style={{ 
                width: '100%', 
                padding: '14px 20px', 
                border: '2px solid #e5e7eb', 
                borderRadius: '12px', 
                marginBottom: '20px', 
                boxSizing: 'border-box', 
                fontSize: '14px',
                fontWeight: '500'
              }}
            />

            <h3 style={{ marginBottom: '15px', fontSize: '16px', fontWeight: '600', color: '#666' }}>Select Products</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              {filteredProducts.map(product => (
                <div
                  key={product.id}
                  onClick={() => addToCart(product)}
                  style={{ 
                    background: 'white', 
                    padding: '12px', 
                    borderRadius: '10px', 
                    cursor: 'pointer', 
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)', 
                    border: '2px solid transparent',
                    position: 'relative'
                  }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = '#f093fb'; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 6px 15px rgba(240, 147, 251, 0.25)' }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)' }}
                >
                  <p style={{ margin: '0 0 5px', fontWeight: '700', fontSize: '13px', color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.name}</p>
                  <p style={{ margin: '0 0 5px', color: '#888', fontSize: '11px' }}>{product.category}</p>
                  <p style={{ margin: '0 0 5px', color: '#16a34a', fontWeight: '700', fontSize: '14px' }}>{formatTSh(product.price)}</p>
                  <p style={{ margin: 0, fontSize: '11px', color: product.stock <= product.low_stock_alert ? '#dc2626' : '#888', fontWeight: product.stock <= product.low_stock_alert ? '700' : '500' }}>
                    {product.stock} {product.unit || 'PC'}
                  </p>
                </div>
              ))}
            </div>
            {filteredProducts.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                <p>No products found</p>
              </div>
            )}
          </div>

          {/* Cart */}
          <div style={{ background: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', height: 'fit-content', position: 'sticky', top: '20px' }}>
            <h3 style={{ margin: '0 0 25px', fontSize: '20px', fontWeight: '700' }}>🛒 Cart</h3>

            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#888' }}>
                <div style={{ fontSize: '48px', marginBottom: '10px' }}>🛒</div>
                <p style={{ margin: 0, fontSize: '14px' }}>Cart is empty — click products to add</p>
              </div>
            ) : (
              <>
                <div style={{ maxHeight: '280px', overflowY: 'auto', marginBottom: '20px' }}>
                  {cart.map(item => (
                    <div key={item.product_id} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid #f0f0f0' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: '0 0 4px', fontWeight: '600', fontSize: '14px' }}>{item.name}</p>
                        <p style={{ margin: 0, color: '#16a34a', fontSize: '13px', fontWeight: '600' }}>{formatTSh(item.price)}</p>
                      </div>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={e => updateQuantity(item.product_id, e.target.value)}
                        min="1"
                        style={{ width: '55px', padding: '6px', border: '2px solid #e5e7eb', borderRadius: '8px', textAlign: 'center', fontWeight: '600' }}
                      />
                      <button onClick={() => removeFromCart(item.product_id)} style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontWeight: '700' }}>✕</button>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontSize: '13px', fontWeight: '600' }}>👤 Client (Optional)</label>
              <select
                value={selectedClient}
                onChange={e => setSelectedClient(e.target.value)}
                style={{ width: '100%', padding: '10px', border: '2px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', fontWeight: '500' }}
              >
                <option value="">-- Walk-in Customer --</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontSize: '13px', fontWeight: '600' }}>💳 Payment Method</label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
                style={{ width: '100%', padding: '10px', border: '2px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', fontWeight: '500' }}
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="mobile">Mobile Money</option>
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontSize: '13px', fontWeight: '600' }}>🎁 Discount (USD)</label>
              <input
                type="number"
                value={discount}
                onChange={e => setDiscount(e.target.value)}
                min="0"
                step="0.01"
                style={{ width: '100%', padding: '10px', border: '2px solid #e5e7eb', borderRadius: '10px', boxSizing: 'border-box', fontSize: '14px', fontWeight: '500' }}
              />
            </div>

            <div style={{ marginBottom: '20px', padding: '20px', background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px' }}>
                <span style={{ color: '#666', fontWeight: '500' }}>Subtotal:</span>
                <span style={{ fontWeight: '600' }}>{formatTSh(total)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px' }}>
                <span style={{ color: '#666', fontWeight: '500' }}>Discount:</span>
                <span style={{ color: '#dc2626', fontWeight: '600' }}>-{formatTSh(discount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '20px', paddingTop: '10px', borderTop: '2px solid #dee2e6' }}>
                <span>Total:</span>
                <span style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{formatTSh(finalTotal)}</span>
              </div>
            </div>

            <button
              onClick={handleSale}
              disabled={loading || cart.length === 0}
              style={{ 
                width: '100%', 
                padding: '16px', 
                background: cart.length === 0 ? '#ccc' : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', 
                color: 'white', 
                border: 'none', 
                borderRadius: '12px', 
                cursor: cart.length === 0 ? 'not-allowed' : 'pointer', 
                fontSize: '16px', 
                fontWeight: '700',
                boxShadow: cart.length === 0 ? 'none' : '0 4px 15px rgba(22, 163, 74, 0.4)'
              }}
            >
              {loading ? '⏳ Processing...' : '✓ Complete Sale'}
            </button>
          </div>
        </div>
      ) : (
        /* Sales History */
        <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)' }}>
                {['#', 'Client', 'Cashier', 'Total', 'Discount', 'Payment', 'Date'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '18px 20px', color: '#666', fontWeight: '700', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sales.map(sale => (
                <tr key={sale.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '18px 20px', color: '#888', fontWeight: '600' }}>#{sale.id}</td>
                  <td style={{ padding: '18px 20px', fontWeight: '600' }}>{sale.client_name || 'Walk-in'}</td>
                  <td style={{ padding: '18px 20px', color: '#888' }}>{sale.cashier_name}</td>
                  <td style={{ padding: '18px 20px', color: '#16a34a', fontWeight: '700' }}>{formatTSh(sale.total)}</td>
                  <td style={{ padding: '18px 20px', color: '#dc2626', fontWeight: '600' }}>{formatTSh(sale.discount)}</td>
                  <td style={{ padding: '18px 20px', textTransform: 'capitalize', fontWeight: '500' }}>{sale.payment_method}</td>
                  <td style={{ padding: '18px 20px', color: '#888' }}>{new Date(sale.created_at).toLocaleDateString('en-GB')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {sales.length === 0 && (
            <div style={{ textAlign: 'center', padding: '50px', color: '#888' }}>
              <div style={{ fontSize: '48px', marginBottom: '15px' }}>📋</div>
              <p style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>No sales yet!</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Sales