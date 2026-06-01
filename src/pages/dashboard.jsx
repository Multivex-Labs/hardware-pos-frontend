import { useState, useEffect } from 'react'
import { getTodayReport, getLastSevenDays, getLowStock } from '../services/api'

const Dashboard = () => {
  const [todayStats, setTodayStats] = useState(null)
  const [sevenDays, setSevenDays] = useState([])
  const [lowStock, setLowStock] = useState([])

  useEffect(() => {
    getTodayReport().then(r => setTodayStats(r.data)).catch(() => {})
    getLastSevenDays().then(r => setSevenDays(r.data)).catch(() => {})
    getLowStock().then(r => setLowStock(r.data)).catch(() => {})
  }, [])

  const fmt = (amount) => `TSh ${parseFloat(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Dashboard
          </h1>
          <p style={{ color: '#888', fontSize: '13px', marginTop: '4px' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid-3" style={{ marginBottom: '24px' }}>
        {[
          { label: 'Sales Today', value: todayStats?.total_sales || 0, grad: 'linear-gradient(135deg,#667eea,#764ba2)', icon: '🛒' },
          { label: "Today's Revenue", value: fmt(todayStats?.revenue), grad: 'linear-gradient(135deg,#f093fb,#f5576c)', icon: '💰' },
          { label: 'Low Stock Items', value: lowStock.length, grad: 'linear-gradient(135deg,#fa709a,#fee140)', icon: '⚠️' },
        ].map(({ label, value, grad, icon }) => (
          <div key={label} className="stat-card" style={{ background: grad }}>
            <div style={{ position: 'absolute', top: '-15px', right: '-15px', fontSize: '70px', opacity: 0.1 }}>{icon}</div>
            <p style={{ margin: '0 0 6px', fontSize: '12px', opacity: 0.9, fontWeight: '500' }}>{label}</p>
            <h2 style={{ margin: 0, fontSize: '28px', fontWeight: '700' }}>{value}</h2>
          </div>
        ))}
      </div>

      {/* Low Stock Alert */}
      {lowStock.length > 0 && (
        <div className="card" style={{ background: '#fff5f5', border: '2px solid #fca5a5', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 16px', color: '#dc2626', fontSize: '16px', fontWeight: '700' }}>
            ⚠️ Low Stock Alert
          </h3>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr style={{ background: '#fef2f2' }}>
                  {['Product', 'Stock', 'Min Level'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '12px 16px', color: '#666', fontWeight: '600', fontSize: '13px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lowStock.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #fee2e2' }}>
                    <td style={{ padding: '12px 16px', fontWeight: '500', fontSize: '14px' }}>{p.name}</td>
                    <td style={{ padding: '12px 16px', color: '#dc2626', fontWeight: '700' }}>{p.stock}</td>
                    <td style={{ padding: '12px 16px', color: '#888', fontSize: '13px' }}>{p.low_stock_alert}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Last 7 Days */}
      <div className="card">
        <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '700' }}>📊 Last 7 Days</h3>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                {['Date', 'Sales', 'Revenue'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '12px 16px', color: '#666', fontWeight: '600', fontSize: '13px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sevenDays.length === 0 && (
                <tr><td colSpan={3} style={{ padding: '20px', textAlign: 'center', color: '#aaa' }}>No data yet</td></tr>
              )}
              {sevenDays.map((day, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '12px 16px', fontSize: '14px' }}>{new Date(day.date).toLocaleDateString('en-US')}</td>
                  <td style={{ padding: '12px 16px', fontWeight: '600' }}>{day.total_sales}</td>
                  <td style={{ padding: '12px 16px', color: '#16a34a', fontWeight: '700' }}>{fmt(day.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
