import { useState, useEffect, useContext } from 'react';
import toast from 'react-hot-toast';
// Adjust these two import paths if your ThemeContext / api service live
// somewhere else — these match the folder structure from your project summary.
import ThemeContext from '../../context/ThemeContext';
import api from '../../services/api';

const emptyItem = { product_id: '', product_name: '', quantity: '', cost_per_unit: '' };

export default function CashCreditPurchase() {
  const { colors, isDark } = useContext(ThemeContext);

  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [vendorId, setVendorId] = useState('');
  const [paymentType, setPaymentType] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([{ ...emptyItem }]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/vendors').then((res) => setVendors(res.data)).catch(() => {});
    api.get('/products').then((res) => setProducts(res.data)).catch(() => {});
  }, []);

  const totalAmount = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.cost_per_unit) || 0),
    0
  );

  const updateItem = (index, field, value) => {
    const next = [...items];
    next[index] = { ...next[index], [field]: value };

    if (field === 'product_id') {
      const product = products.find((p) => String(p.id) === String(value));
      if (product) {
        next[index].product_name = product.name;
        next[index].cost_per_unit = product.cost_price || '';
      }
    }
    setItems(next);
  };

  const addItemRow = () => setItems([...items, { ...emptyItem }]);
  const removeItemRow = (index) => setItems(items.filter((_, i) => i !== index));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!vendorId) return toast.error('Chagua vendor');
    if (items.some((i) => !i.product_id || !i.quantity || !i.cost_per_unit)) {
      return toast.error('Jaza kila item kikamilifu');
    }
    if (paymentType === 'credit' && Number(amountPaid) > totalAmount) {
      return toast.error('Amount paid haiwezi kuzidi total');
    }

    setSubmitting(true);
    try {
      await api.post('/purchases', {
        vendor_id: vendorId,
        payment_type: paymentType,
        amount_paid: paymentType === 'credit' ? Number(amountPaid) || 0 : totalAmount,
        notes,
        items: items.map((i) => ({
          product_id: i.product_id,
          product_name: i.product_name,
          quantity: Number(i.quantity),
          cost_per_unit: Number(i.cost_per_unit),
        })),
      });
      toast.success('Purchase imesajiliwa');
      setVendorId('');
      setPaymentType('cash');
      setAmountPaid('');
      setNotes('');
      setItems([{ ...emptyItem }]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Imeshindikana kusajili purchase');
    } finally {
      setSubmitting(false);
    }
  };

  const cardStyle = {
    background: colors?.card || (isDark ? '#161b22' : '#ffffff'),
    color: colors?.text || (isDark ? '#cdd9e5' : '#1a1a1a'),
    border: `1px solid ${colors?.border || (isDark ? '#30363d' : '#e2e2e2')}`,
    borderRadius: 12,
    padding: 24,
  };

  const inputStyle = {
    background: colors?.inputBg || (isDark ? '#0d1117' : '#f7f7f7'),
    color: colors?.text || (isDark ? '#cdd9e5' : '#1a1a1a'),
    border: `1px solid ${colors?.border || '#ccc'}`,
    borderRadius: 8,
    padding: '8px 10px',
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
      <h2 style={{ marginBottom: 16 }}>Cash / Credit Purchase</h2>

      <form onSubmit={handleSubmit} style={cardStyle}>
        {/* Segmented pill switcher — matches your Tab/UI style convention */}
        <div
          style={{
            display: 'inline-flex',
            background: colors?.inputBg || '#eee',
            borderRadius: 999,
            padding: 4,
            marginBottom: 20,
          }}
        >
          {['cash', 'credit'].map((type) => (
            <button
              type="button"
              key={type}
              onClick={() => setPaymentType(type)}
              style={{
                padding: '8px 24px',
                borderRadius: 999,
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                textTransform: 'capitalize',
                background:
                  paymentType === type
                    ? 'linear-gradient(135deg, #2563eb, #1d4ed8)'
                    : 'transparent',
                color: paymentType === type ? '#fff' : colors?.text,
                boxShadow: paymentType === type ? '0 2px 8px rgba(37,99,235,0.4)' : 'none',
              }}
            >
              {type}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div>
            <label>Vendor</label>
            <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} style={{ ...inputStyle, width: '100%' }}>
              <option value="">-- Chagua vendor --</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} {v.balance > 0 ? `(Balance: ${Number(v.balance).toLocaleString()})` : ''}
                </option>
              ))}
            </select>
          </div>

          {paymentType === 'credit' && (
            <div>
              <label>Amount Paid Now (optional)</label>
              <input
                type="number"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                style={{ ...inputStyle, width: '100%' }}
                placeholder="0"
              />
            </div>
          )}
        </div>

        <h4 style={{ marginBottom: 8 }}>Items</h4>
        {items.map((item, index) => (
          <div
            key={index}
            style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 8, marginBottom: 8 }}
          >
            <select
              value={item.product_id}
              onChange={(e) => updateItem(index, 'product_id', e.target.value)}
              style={inputStyle}
            >
              <option value="">-- Product --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Qty"
              value={item.quantity}
              onChange={(e) => updateItem(index, 'quantity', e.target.value)}
              style={inputStyle}
            />
            <input
              type="number"
              placeholder="Cost/unit"
              value={item.cost_per_unit}
              onChange={(e) => updateItem(index, 'cost_per_unit', e.target.value)}
              style={inputStyle}
            />
            <div style={{ ...inputStyle, display: 'flex', alignItems: 'center' }} className="mono">
              {((Number(item.quantity) || 0) * (Number(item.cost_per_unit) || 0)).toLocaleString()}
            </div>
            <button
              type="button"
              onClick={() => removeItemRow(index)}
              style={{ background: 'transparent', border: 'none', color: '#e11d48', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        ))}

        <button type="button" onClick={addItemRow} style={{ marginBottom: 20, ...inputStyle, cursor: 'pointer' }}>
          Add item
        </button>

        <div style={{ marginBottom: 20 }}>
          <label>Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={{ ...inputStyle, width: '100%' }} rows={2} />
        </div>

        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }} className="mono">
          Total: {totalAmount.toLocaleString()}
        </div>

        <button
          type="submit"
          disabled={submitting}
          style={{
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '12px 32px',
            fontWeight: 600,
            cursor: submitting ? 'not-allowed' : 'pointer',
          }}
        >
          {submitting ? 'Inasajili...' : 'Save Purchase'}
        </button>
      </form>
    </div>
  );
}
