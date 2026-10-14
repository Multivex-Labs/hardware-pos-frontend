import { useState, useEffect } from 'react'
import { Receipt, CalendarDays, Trash2, Plus } from 'lucide-react'
import { getExpenses, createExpense, deleteExpense } from '../services/api'
import toast from 'react-hot-toast'
import Modal from '../components/Modal'

const CATEGORIES = ['Rent', 'Electricity', 'Water', 'Transport / Fuel', 'Salaries', 'Office supplies', 'Repairs', 'Other']

const fmtTZS = (v) => `TSh ${parseFloat(v || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`

const Expenses = () => {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ category: '', description: '', amount: '', expense_date: new Date().toISOString().slice(0, 10) })

  useEffect(() => { loadExpenses() }, [])

  const loadExpenses = () => {
    getExpenses().then(r => setExpenses(r.data)).catch(() => toast.error('Failed to load'))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.category || !form.amount) { toast.error('Fill in category and amount!'); return }
    setLoading(true)
    try {
      await createExpense({ ...form, amount: parseFloat(form.amount) })
      toast.success('✓ Expense recorded!')
      setForm({ category: '', description: '', amount: '', expense_date: new Date().toISOString().slice(0, 10) })
      setShowForm(false)
      loadExpenses()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed')
    } finally { setLoading(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return
    try { await deleteExpense(id); toast.success('Deleted'); loadExpenses() }
    catch { toast.error('Failed to delete') }
  }

  const now = new Date()
  const thisMonthTotal = expenses
    .filter(e => { const d = new Date(e.expense_date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() })
    .reduce((s, e) => s + parseFloat(e.amount), 0)
  const todayTotal = expenses
    .filter(e => new Date(e.expense_date).toDateString() === now.toDateString())
    .reduce((s, e) => s + parseFloat(e.amount), 0)

  return (
    <div style={{ color: 'var(--text)' }}>
      <div className="page-header">
        <div>
          <h1>Expenses</h1>
          <p>Record your business running costs</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}><Plus size={16} strokeWidth={2} /> New expense</button>
      </div>

      <div className="stats-row">
        <div className="stat">
          <Receipt className="stat-icon" size={88} strokeWidth={1.25} aria-hidden="true" />
          <p className="stat-label">Spent this month</p>
          <p className="stat-value">{fmtTZS(thisMonthTotal)}</p>
        </div>
        <div className="stat">
          <CalendarDays className="stat-icon" size={88} strokeWidth={1.25} aria-hidden="true" />
          <p className="stat-label">Spent today</p>
          <p className="stat-value">{fmtTZS(todayTotal)}</p>
        </div>
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="New expense" subtitle="Record a business expense" size="md">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Category *</label>
            <input className="form-input" type="text" list="cats" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="e.g. Electricity" required />
            <datalist id="cats">{CATEGORIES.map(c => <option key={c} value={c} />)}</datalist>
          </div>
          <div className="form-group">
            <label className="form-label">Amount (TSh) *</label>
            <input className="form-input mono" type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="e.g. 80000" min="0" required />
            {form.amount && <p className="form-hint mono">{fmtTZS(form.amount)}</p>}
          </div>
          <div className="form-group">
            <label className="form-label">Date</label>
            <input className="form-input" type="date" value={form.expense_date} onChange={e => setForm({ ...form, expense_date: e.target.value })} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Description</label>
            <textarea className="form-input" style={{ resize: 'vertical' }} rows="3" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Additional details (optional)" />
          </div>
          <div className="modal-actions sticky">
            <button type="button" className="btn" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save expense'}</button>
          </div>
        </form>
      </Modal>

      <div>
        {/* History */}
        <div className="table-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600' }}>Expense history</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{expenses.length.toLocaleString()} records</span>
          </div>
          <div className="table-wrapper">
            <table className="data-table" style={{ minWidth: '560px' }}>
              <thead>
                <tr><th>Date</th><th>Category</th><th>Description</th><th className="num">Amount</th><th>By</th><th style={{ width: '44px' }}></th></tr>
              </thead>
              <tbody>
                {expenses.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-subtle)' }}>No expenses yet.</td></tr>
                )}
                {expenses.map(exp => (
                  <tr key={exp.id}>
                    <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(exp.expense_date).toLocaleDateString('en-GB')}</td>
                    <td style={{ fontWeight: '500' }}>{exp.category}</td>
                    <td style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '240px' }}>{exp.description || '—'}</td>
                    <td className="num mono" style={{ fontWeight: '600' }}>{fmtTZS(exp.amount)}</td>
                    <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{exp.recorded_by_name || '—'}</td>
                    <td>
                      <button className="icon-btn danger" onClick={() => handleDelete(exp.id)} title="Delete" aria-label="Delete expense"><Trash2 size={16} strokeWidth={1.75} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Expenses
