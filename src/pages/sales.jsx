import { useState, useEffect } from 'react'
import { getProducts, getClients, createSale, getSales } from '../services/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

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
  const [barcodeInput, setBarcodeInput] = useState('')

  const formatTZS = (amount) => {
    const num = parseFloat(amount || 0)
    return `TSh ${num.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`
  }

  useEffect(() => {
    loadData()
  }, [])

  const loadData = () => {
    getProducts()
      .then(res => {
        setProducts(res.data)
        setFilteredProducts(res.data)
      })
      .catch(() => toast.error('Failed to load products'))
    
    getClients()
      .then(res => setClients(res.data))
      .catch(() => {})
    
    getSales()
      .then(res => setSales(res.data))
      .catch(() => {})
  }

  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase()
    setSearchQuery(query)
    const filtered = products.filter(p => 
      p.name.toLowerCase().includes(query) || 
      p.category?.toLowerCase().includes(query)
    )
    setFilteredProducts(filtered)
  }

  const handleBarcodeSearch = (e) => {
    const barcode = e.target.value
    setBarcodeInput(barcode)
    
    if (barcode.length > 2) {
      const product = products.find(p => 
        p.id.toString() === barcode ||
        p.name.toLowerCase().includes(barcode.toLowerCase())
      )
      if (product) {
        addToCart(product)
        setBarcodeInput('')
        toast.success(`✓ ${product.name} added!`)
      }
    }
  }

  const addToCart = (product) => {
    const existing = cart.find(item => item.product_id === product.id)
    if (existing) {
      if (existing.quantity >= product.stock) {
        toast.error(`Only ${product.stock} available`)
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
        price: parseFloat(product.price),
        quantity: 1,
        unit: product.unit || 'PC'
      }])
    }
    toast.success(`✓ ${product.name}`)
  }

  const removeFromCart = (product_id) => {
    setCart(cart.filter(item => item.product_id !== product_id))
  }

  const updateQuantity = (product_id, quantity) => {
    const qty = parseInt(quantity)
    if (qty < 1) return
    const product = products.find(p => p.id === product_id)
    if (qty > product.stock) {
      toast.error(`Only ${product.stock} available`)
      return
    }
    setCart(cart.map(item =>
      item.product_id === product_id ? { ...item, quantity: qty } : item
    ))
  }

  const total = cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0)
  const finalTotal = total - parseFloat(discount || 0)

  // ✅ NEW: Print receipt from sale history
  const printReceiptFromHistory = async (sale) => {
    try {
      // Fetch sale items from backend
      const response = await fetch(`http://localhost:5000/api/sales/${sale.id}`)
      const data = await response.json()
      
      const saleData = {
        saleId: sale.id,
        total: parseFloat(sale.total),
        discount: parseFloat(sale.discount || 0),
        paymentMethod: sale.payment_method,
        items: data.items || [],
        cashierName: sale.cashier_name || 'CASHIER',
        clientName: sale.client_name || 'WALK-IN'
      }
      
      printReceipt(saleData)
    } catch (error) {
      console.error('Error fetching sale details:', error)
      toast.error('Failed to load receipt data')
    }
  }

  const printReceipt = (saleData) => {
    try {
      const doc = new jsPDF()
      
      // Header
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text('PIUS HARDWARE', 105, 20, { align: 'center' })
      
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text('P.O.BOX 4629, MBEYA TANZANIA', 105, 28, { align: 'center' })
      doc.text('Tel: 0764067682 / 0759494763 / 0756146747', 105, 34, { align: 'center' })
      
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('SALES RECEIPT', 105, 45, { align: 'center' })
      
      doc.line(20, 50, 190, 50)
      
      // Details
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      const now = new Date()
      doc.text(`Receipt #: ${saleData.saleId || 'N/A'}`, 20, 58)
      doc.text(`Date: ${now.toLocaleDateString('en-GB')} ${now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`, 20, 64)
      doc.text(`Customer: ${saleData.clientName || 'WALK-IN'}`, 20, 70)
      doc.text(`Cashier: ${saleData.cashierName || 'CASHIER'}`, 20, 76)
      
      // Items
      const tableData = saleData.items.map((item, i) => [
        i + 1,
        item.name || item.product_name,
        item.unit || 'PC',
        item.quantity,
        parseFloat(item.price).toFixed(2),
        (parseFloat(item.price) * item.quantity).toFixed(2)
      ])
      
      doc.autoTable({
        startY: 82,
        head: [['#', 'Item', 'Unit', 'Qty', 'Price (TSh)', 'Total (TSh)']],
        body: tableData,
        theme: 'striped',
        headStyles: { 
          fillColor: [41, 128, 185], 
          textColor: 255, 
          fontStyle: 'bold',
          fontSize: 10
        },
        styles: { 
          fontSize: 9, 
          cellPadding: 4
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 12 },
          1: { cellWidth: 70 },
          2: { halign: 'center', cellWidth: 18 },
          3: { halign: 'center', cellWidth: 18 },
          4: { halign: 'right', cellWidth: 32 },
          5: { halign: 'right', cellWidth: 38 }
        }
      })
      
      const finalY = doc.lastAutoTable.finalY + 10
      
      // Totals
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      
      const subtotal = parseFloat(saleData.total) + parseFloat(saleData.discount || 0)
      doc.text('Subtotal:', 130, finalY)
      doc.text(`TSh ${subtotal.toFixed(2)}`, 190, finalY, { align: 'right' })
      
      if (saleData.discount > 0) {
        doc.text('Discount:', 130, finalY + 6)
        doc.text(`-TSh ${parseFloat(saleData.discount).toFixed(2)}`, 190, finalY + 6, { align: 'right' })
      }
      
      // Grand Total
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      const yPos = finalY + (saleData.discount > 0 ? 15 : 9)
      doc.text('GRAND TOTAL:', 130, yPos)
      doc.text(`TSh ${parseFloat(saleData.total).toFixed(2)}`, 190, yPos, { align: 'right' })
      
      // Payment
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      const paymentText = saleData.paymentMethod.replace('_', ' ').toUpperCase()
      doc.text(`Payment: ${paymentText}`, 105, yPos + 12, { align: 'center' })
      
      // Footer
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(11)
      doc.text('JENGA NA PIUS HARDWARE', 105, yPos + 25, { align: 'center' })
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.text('Thank you for your business!', 105, yPos + 32, { align: 'center' })
      
      // Print
      const pdfBlob = doc.output('blob')
      const pdfUrl = URL.createObjectURL(pdfBlob)
      const printWindow = window.open(pdfUrl, '_blank')
      
      if (printWindow) {
        printWindow.onload = () => {
          setTimeout(() => printWindow.print(), 250)
        }
        toast.success('✓ Receipt ready to print!')
      } else {
        toast.error('Please allow pop-ups!')
      }
      
    } catch (error) {
      console.error('Print error:', error)
      toast.error('Failed to print: ' + error.message)
    }
  }

  const handleSale = async () => {
    if (cart.length === 0) {
      toast.error('Add items to cart first!')
      return
    }
    
    if (finalTotal < 0) {
      toast.error('Total cannot be negative!')
      return
    }
    
    setLoading(true)
    try {
      const res = await createSale({
        client_id: selectedClient || null,
        payment_method: paymentMethod,
        discount: parseFloat(discount || 0),
        items: cart.map(item => ({ 
          product_id: item.product_id, 
          quantity: item.quantity,
          price: parseFloat(item.price)
        }))
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
      toast.success('✓ Sale completed!')
      
      setTimeout(() => printReceipt(saleData), 500)
      
      setCart([])
      setSelectedClient('')
      setDiscount(0)
      setPaymentMethod('cash')
      
      loadData()
    } catch (error) {
      console.error('Sale error:', error)
      toast.error(error.response?.data?.error || 'Sale failed')
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
            style={{ padding: '12px 25px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}
          >
            🖨️ Print Last Receipt
          </button>
        )}
      </div>

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
              fontWeight: '700'
            }}
          >
            {tab === 'new' ? '🛒 New Sale' : '📋 History'}
          </button>
        ))}
      </div>

      {activeTab === 'new' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '25px' }}>
          <div>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
              <input
                type="text"
                placeholder="🔍 Search products..."
                value={searchQuery}
                onChange={handleSearch}
                style={{ flex: 1, padding: '14px 20px', border: '2px solid #e5e7eb', borderRadius: '12px', fontSize: '14px' }}
              />
              <input
                type="text"
                placeholder="📦 Barcode or ID..."
                value={barcodeInput}
                onChange={handleBarcodeSearch}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && barcodeInput) {
                    const product = products.find(p => p.id.toString() === barcodeInput)
                    if (product) {
                      addToCart(product)
                      setBarcodeInput('')
                    } else {
                      toast.error('Product not found')
                    }
                  }
                }}
                style={{ width: '280px', padding: '14px 20px', border: '2px solid #667eea', borderRadius: '12px', fontSize: '14px' }}
              />
            </div>

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
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={e => { 
                    e.currentTarget.style.borderColor = '#f093fb'
                    e.currentTarget.style.transform = 'translateY(-3px)'
                  }}
                  onMouseOut={e => { 
                    e.currentTarget.style.borderColor = 'transparent'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  <p style={{ margin: '0 0 5px', fontWeight: '700', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.name}</p>
                  <p style={{ margin: '0 0 5px', color: '#888', fontSize: '11px' }}>{product.category}</p>
                  <p style={{ margin: '0 0 5px', color: '#16a34a', fontWeight: '700', fontSize: '14px' }}>{formatTZS(product.price)}</p>
                  <p style={{ margin: 0, fontSize: '11px', color: product.stock <= product.low_stock_alert ? '#dc2626' : '#888' }}>
                    {product.stock} {product.unit || 'PC'}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', height: 'fit-content', position: 'sticky', top: '20px' }}>
            <h3 style={{ margin: '0 0 25px', fontSize: '20px', fontWeight: '700' }}>🛒 Cart</h3>

            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#888' }}>
                <div style={{ fontSize: '48px' }}>🛒</div>
                <p style={{ margin: 0 }}>Cart is empty</p>
              </div>
            ) : (
              <div style={{ maxHeight: '280px', overflowY: 'auto', marginBottom: '20px' }}>
                {cart.map(item => (
                  <div key={item.product_id} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid #f0f0f0' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: '0 0 4px', fontWeight: '600', fontSize: '14px' }}>{item.name}</p>
                      <p style={{ margin: 0, color: '#16a34a', fontSize: '13px', fontWeight: '600' }}>{formatTZS(item.price)}</p>
                    </div>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={e => updateQuantity(item.product_id, e.target.value)}
                      min="1"
                      style={{ width: '55px', padding: '6px', border: '2px solid #e5e7eb', borderRadius: '8px', textAlign: 'center' }}
                    />
                    <button onClick={() => removeFromCart(item.product_id)} style={{ background: '#f5576c', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer' }}>✕</button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>👤 Customer</label>
              <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)} style={{ width: '100%', padding: '10px', border: '2px solid #e5e7eb', borderRadius: '10px' }}>
                <option value="">Walk-in Customer</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>💳 Payment</label>
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} style={{ width: '100%', padding: '10px', border: '2px solid #e5e7eb', borderRadius: '10px' }}>
                <option value="cash">Cash</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="credit">Credit</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>🎁 Discount (TSh)</label>
              <input
                type="number"
                value={discount}
                onChange={e => setDiscount(e.target.value)}
                min="0"
                placeholder="0"
                style={{ width: '100%', padding: '10px', border: '2px solid #e5e7eb', borderRadius: '10px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '20px', padding: '20px', background: '#f8f9fa', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span>Subtotal:</span>
                <span style={{ fontWeight: '600' }}>{formatTZS(total)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span>Discount:</span>
                <span style={{ color: '#dc2626', fontWeight: '600' }}>-{formatTZS(discount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '20px', paddingTop: '10px', borderTop: '2px solid #dee2e6' }}>
                <span>TOTAL:</span>
                <span style={{ color: '#16a34a' }}>{formatTZS(finalTotal)}</span>
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
                fontWeight: '700'
              }}
            >
              {loading ? '⏳ Processing...' : '✓ Complete & Print'}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                {['#', 'Customer', 'Cashier', 'Total', 'Discount', 'Payment', 'Date', 'Receipt'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '18px 20px', fontWeight: '700', fontSize: '13px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sales.map(sale => (
                <tr key={sale.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '18px 20px' }}>#{sale.id}</td>
                  <td style={{ padding: '18px 20px' }}>{sale.client_name || 'Walk-in'}</td>
                  <td style={{ padding: '18px 20px' }}>{sale.cashier_name}</td>
                  <td style={{ padding: '18px 20px', color: '#16a34a', fontWeight: '700' }}>{formatTZS(sale.total)}</td>
                  <td style={{ padding: '18px 20px', color: '#dc2626' }}>{formatTZS(sale.discount)}</td>
                  <td style={{ padding: '18px 20px', textTransform: 'capitalize' }}>{sale.payment_method.replace('_', ' ')}</td>
                  <td style={{ padding: '18px 20px' }}>{new Date(sale.created_at).toLocaleDateString('en-GB')}</td>
                  <td style={{ padding: '18px 20px' }}>
                    <button
                      onClick={() => printReceiptFromHistory(sale)}
                      style={{ 
                        padding: '8px 16px', 
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '8px', 
                        cursor: 'pointer', 
                        fontSize: '12px',
                        fontWeight: '600'
                      }}
                    >
                      🖨️ Print
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default Sales