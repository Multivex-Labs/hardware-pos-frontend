import { useState, useEffect } from 'react'
import { getProducts, createProduct, updateProduct, deleteProduct } from '../services/api'
import toast from 'react-hot-toast'

const emptyForm = { name: '', description: '', price: '', stock: '', unit: 'PC', low_stock_alert: '5', category: '' }

const UNITS = ['PC', 'KG', 'BAG', 'CARTON', 'LITERS', 'METERS', 'BOX']

const Inventory = () => {
  const [products, setProducts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [loading, setLoading] = useState(false)

  const formatTSh = (amount) => `TSh ${(parseFloat(amount || 0) * 2600).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const fetchProducts = () => {
    getProducts().then(res => setProducts(res.data)).catch(() => toast.error('Failed to fetch products'))
  }

  useEffect(() => { fetchProducts() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (editId) {
        await updateProduct(editId, form)
        toast.success('✓ Product updated!')
      } else {
        await createProduct(form)
        toast.success('✓ Product created!')
      }
      setForm(emptyForm)
      setEditId(null)
      setShowForm(false)
      fetchProducts()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (product) => {
    setForm(product)
    setEditId(product.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return
    try {
      await deleteProduct(id)
      toast.success('✓ Product deleted!')
      fetchProducts()
    } catch (error) {
      toast.error('Failed to delete')
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ margin: '0 0 5px', fontSize: '32px', fontWeight: '700', background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            📦 Inventory
          </h1>
          <p style={{ margin: 0, color: '#888', fontSize: '14px' }}>Manage all your products</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setForm(emptyForm); setEditId(null) }}
          style={{ 
            padding: '12px 25px', 
            background: showForm ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' : 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', 
            color: 'white', 
            border: 'none', 
            borderRadius: '12px', 
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
          }}
        >
          {showForm ? '✕ Close' : '+ Add Product'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ background: 'white', padding: '30px', borderRadius: '16px', marginBottom: '30px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <h3 style={{ margin: '0 0 25px', fontSize: '20px', fontWeight: '600' }}>{editId ? '✏️ Edit Product' : '➕ New Product'}</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {[
  { key: 'name', label: 'Product Name' },
  { key: 'category', label: 'Category' },
  { key: 'price', label: 'Price (TSh per unit)', multiplier: 2600 },
  { key: 'stock', label: 'Stock Quantity' },
  { key: 'low_stock_alert', label: 'Low Stock Alert' },
].map(({ key, label, multiplier }) => (
  <div key={key}>
    <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: '600', fontSize: '14px' }}>{label}</label>
    <input
      type={['price', 'stock', 'low_stock_alert'].includes(key) ? 'number' : 'text'}
      step={key === 'price' ? '100' : '1'}
      value={key === 'price' && form[key] ? (parseFloat(form[key]) * (multiplier || 1)).toFixed(0) : form[key]}
      onChange={e => setForm({ ...form, [key]: key === 'price' ? (parseFloat(e.target.value) / (multiplier || 1)).toFixed(4) : e.target.value })}
      style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '10px', boxSizing: 'border-box', fontSize: '14px', fontWeight: '500' }}
      required={['name', 'price'].includes(key)}
    />
  </div>
))}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: '600', fontSize: '14px' }}>Unit</label>
                <select
                  value={form.unit}
                  onChange={e => setForm({ ...form, unit: e.target.value })}
                  style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', fontWeight: '500' }}
                >
                  {UNITS.map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: '600', fontSize: '14px' }}>Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '10px', boxSizing: 'border-box', fontSize: '14px', fontWeight: '500' }}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{ marginTop: '25px', padding: '14px 35px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '700', fontSize: '15px' }}
            >
              {loading ? '⏳ Saving...' : editId ? '✓ Save Changes' : '✓ Create Product'}
            </button>
          </form>
        </div>
      )}

      {/* Table */}
      <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)' }}>
              {['Name', 'Category', 'Price', 'Stock', 'Unit', 'Alert', 'Actions'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '18px 20px', color: '#666', fontWeight: '700', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map(product => (
              <tr key={product.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '18px 20px', fontWeight: '600' }}>{product.name}</td>
                <td style={{ padding: '18px 20px', color: '#888' }}>{product.category}</td>
                <td style={{ padding: '18px 20px', color: '#16a34a', fontWeight: '700' }}>{formatTSh(product.price)}</td>
                <td style={{ padding: '18px 20px', color: product.stock <= product.low_stock_alert ? '#dc2626' : 'inherit', fontWeight: product.stock <= product.low_stock_alert ? 'bold' : 'normal' }}>
                  {product.stock}
                </td>
                <td style={{ padding: '18px 20px', fontWeight: '600', color: '#667eea' }}>{product.unit || 'PC'}</td>
                <td style={{ padding: '18px 20px', color: '#888' }}>{product.low_stock_alert}</td>
                <td style={{ padding: '18px 20px' }}>
                  <button onClick={() => handleEdit(product)} style={{ marginRight: '10px', padding: '8px 16px', background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>✏️ Edit</button>
                  <button onClick={() => handleDelete(product.id)} style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>🗑️ Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && (
          <div style={{ textAlign: 'center', padding: '50px', color: '#888' }}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>📦</div>
            <p style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>No products yet — add one first!</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Inventory