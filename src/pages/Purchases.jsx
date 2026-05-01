import { useState, useEffect } from 'react'
import { getProducts, getPurchases, createPurchase } from '../services/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const Purchases = () => {
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [purchases, setPurchases] = useState([])
  const [formData, setFormData] = useState({
    product_id: '',
    quantity: '',
    cost_per_unit: '',
    supplier: '',
    notes: ''
  })
  const [loading, setLoading] = useState(false)

  // ✅ FIXED: TZS formatting - NO USD conversion
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
      .then(res => setProducts(res.data))
      .catch(() => toast.error('Failed to load products'))
    
    getPurchases()
      .then(res => setPurchases(res.data))
      .catch(() => {})
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.product_id || !formData.quantity || !formData.cost_per_unit) {
      toast.error('Please fill in all required fields!')
      return
    }

    setLoading(true)
    try {
      await createPurchase({
        ...formData,
        quantity: parseInt(formData.quantity),
        cost_per_unit: parseFloat(formData.cost_per_unit),
        total_cost: parseInt(formData.quantity) * parseFloat(formData.cost_per_unit)
      })
      
      toast.success('✓ Purchase registered successfully!')
      
      setFormData({
        product_id: '',
        quantity: '',
        cost_per_unit: '',
        supplier: '',
        notes: ''
      })
      
      loadData()
    } catch (error) {
      console.error('Purchase error:', error)
      toast.error(error.response?.data?.error || 'Failed!')
    } finally {
      setLoading(false)
    }
  }

  const selectedProduct = products.find(p => p.id == formData.product_id)
  const totalCost = formData.quantity && formData.cost_per_unit 
    ? parseInt(formData.quantity) * parseFloat(formData.cost_per_unit)
    : 0

  return (
    <div>
      <div style={{ marginBottom: '25px' }}>
        <h1 style={{ margin: '0 0 5px', fontSize: '32px', fontWeight: '700', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          📦 Purchases
        </h1>
        <p style={{ margin: 0, color: '#888', fontSize: '14px' }}>Record purchases from suppliers</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '25px' }}>
        {/* Form */}
        <div style={{ background: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', height: 'fit-content' }}>
          <h3 style={{ margin: '0 0 25px', fontSize: '20px', fontWeight: '700' }}>New Purchase</h3>
          
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontSize: '13px', fontWeight: '600' }}>
                📦 Product *
              </label>
              <select
                name="product_id"
                value={formData.product_id}
                onChange={handleChange}
                required
                style={{ width: '100%', padding: '10px', border: '2px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', fontWeight: '500' }}
              >
                <option value="">-- Select product --</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name} (Stock: {product.stock} {product.unit})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontSize: '13px', fontWeight: '600' }}>
                🔢 Quantity *
              </label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                min="1"
                required
                placeholder="Enter quantity"
                style={{ width: '100%', padding: '10px', border: '2px solid #e5e7eb', borderRadius: '10px', boxSizing: 'border-box', fontSize: '14px', fontWeight: '500' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontSize: '13px', fontWeight: '600' }}>
                💰 Cost per unit (TSh) *
              </label>
              <input
                type="number"
                name="cost_per_unit"
                value={formData.cost_per_unit}
                onChange={handleChange}
                min="0"
                step="0.01"
                required
                placeholder="Purchase price per unit"
                style={{ width: '100%', padding: '10px', border: '2px solid #e5e7eb', borderRadius: '10px', boxSizing: 'border-box', fontSize: '14px', fontWeight: '500' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontSize: '13px', fontWeight: '600' }}>
                🏢 Supplier
              </label>
              <input
                type="text"
                name="supplier"
                value={formData.supplier}
                onChange={handleChange}
                placeholder="Supplier name"
                style={{ width: '100%', padding: '10px', border: '2px solid #e5e7eb', borderRadius: '10px', boxSizing: 'border-box', fontSize: '14px', fontWeight: '500' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontSize: '13px', fontWeight: '600' }}>
                📝 Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="3"
                placeholder="Additional notes (optional)"
                style={{ width: '100%', padding: '10px', border: '2px solid #e5e7eb', borderRadius: '10px', boxSizing: 'border-box', fontSize: '14px', fontWeight: '500', fontFamily: 'inherit', resize: 'vertical' }}
              />
            </div>

            {totalCost > 0 && (
              <div style={{ marginBottom: '20px', padding: '15px', background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', color: '#666' }}>Product:</span>
                  <span style={{ fontSize: '14px', fontWeight: '600' }}>{selectedProduct?.name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', color: '#666' }}>Quantity:</span>
                  <span style={{ fontSize: '14px', fontWeight: '600' }}>{formData.quantity} {selectedProduct?.unit}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', color: '#666' }}>Price per unit:</span>
                  <span style={{ fontSize: '14px', fontWeight: '600' }}>{formatTZS(formData.cost_per_unit)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', borderTop: '2px solid #dee2e6' }}>
                  <span style={{ fontSize: '16px', fontWeight: '700' }}>TOTAL:</span>
                  <span style={{ fontSize: '16px', fontWeight: '700', color: '#16a34a' }}>{formatTZS(totalCost)}</span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ 
                width: '100%', 
                padding: '14px', 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                color: 'white', 
                border: 'none', 
                borderRadius: '12px', 
                cursor: loading ? 'not-allowed' : 'pointer', 
                fontSize: '16px', 
                fontWeight: '700',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
              }}
            >
              {loading ? '⏳ Registering...' : '✓ Register Purchase'}
            </button>
          </form>
        </div>

        {/* Purchase History */}
        <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid #f0f0f0' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>Purchase History</h3>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)' }}>
                  {['Date', 'Product', 'Quantity', 'Price/Unit', 'Total', 'Supplier'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '18px 20px', color: '#666', fontWeight: '700', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {purchases.map(purchase => (
                  <tr key={purchase.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '18px 20px', color: '#888', fontSize: '14px' }}>
                      {new Date(purchase.created_at).toLocaleDateString('en-US')}
                    </td>
                    <td style={{ padding: '18px 20px', fontWeight: '600', fontSize: '14px' }}>
                      {purchase.product_name}
                    </td>
                    <td style={{ padding: '18px 20px', fontSize: '14px' }}>
                      {purchase.quantity} {purchase.unit}
                    </td>
                    <td style={{ padding: '18px 20px', color: '#667eea', fontWeight: '600', fontSize: '14px' }}>
                      {formatTZS(purchase.cost_per_unit)}
                    </td>
                    <td style={{ padding: '18px 20px', color: '#16a34a', fontWeight: '700', fontSize: '14px' }}>
                      {formatTZS(purchase.total_cost)}
                    </td>
                    <td style={{ padding: '18px 20px', fontSize: '14px', color: '#888' }}>
                      {purchase.supplier || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {purchases.length === 0 && (
              <div style={{ textAlign: 'center', padding: '50px', color: '#888' }}>
                <div style={{ fontSize: '48px', marginBottom: '15px' }}>📦</div>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>No purchases yet!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Purchases