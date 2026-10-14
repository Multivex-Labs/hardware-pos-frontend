import { useState, useContext } from 'react';
import toast from 'react-hot-toast';
import ThemeContext from '../../context/ThemeContext';
import api from '../../services/api';

// Drop this into your Vendor detail view (e.g. as a modal or side panel)
// so a vendor's balance can be paid down without leaving that page.
export default function VendorPayment({ vendor, onPaid }) {
  const { colors, isDark } = useContext(ThemeContext);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const inputStyle = {
    background: colors?.inputBg || (isDark ? '#0d1117' : '#f7f7f7'),
    color: colors?.text || (isDark ? '#cdd9e5' : '#1a1a1a'),
    border: `1px solid ${colors?.border || '#ccc'}`,
    borderRadius: 8,
    padding: '8px 10px',
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return toast.error('Weka amount sahihi');
    if (Number(amount) > Number(vendor.balance)) {
      return toast.error('Amount inazidi balance ya vendor');
    }

    setSubmitting(true);
    try {
      const res = await api.post('/vendor-payments', {
        vendor_id: vendor.id,
        amount: Number(amount),
        payment_method: method,
        notes,
      });
      toast.success('Malipo yamesajiliwa');
      setAmount('');
      setNotes('');
      onPaid?.(res.data.new_balance);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Imeshindikana kusajili malipo');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 10 }}>
      <div className="mono">
        Current balance: <strong>{Number(vendor.balance).toLocaleString()}</strong>
      </div>
      <input
        type="number"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        style={inputStyle}
      />
      <select value={method} onChange={(e) => setMethod(e.target.value)} style={inputStyle}>
        <option value="cash">Cash</option>
        <option value="bank">Bank</option>
        <option value="mobile">Mobile Money</option>
      </select>
      <input
        type="text"
        placeholder="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        style={inputStyle}
      />
      <button
        type="submit"
        disabled={submitting}
        style={{
          background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '10px 20px',
          fontWeight: 600,
          cursor: submitting ? 'not-allowed' : 'pointer',
        }}
      >
        {submitting ? 'Inasajili...' : 'Record Payment'}
      </button>
    </form>
  );
}
