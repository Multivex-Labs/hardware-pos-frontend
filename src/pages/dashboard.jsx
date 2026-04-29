import { useState, useEffect } from 'react'
import { getTodayReport, getLastSevenDays, getLowStock } from '../services/api'

const Dashboard = () => {
  const [todayStats, setTodayStats] = useState(null)
  const [sevenDays, setSevenDays] = useState([])
  const [lowStock, setLowStock] = useState([])

  useEffect(() => {
    getTodayReport().then(res => setTodayStats(res.data)).catch(() => {})
    getLastSevenDays().then(res => setSevenDays(res.data)).catch(() => {})
    getLowStock().then(res => setLowStock(res.data)).catch(() => {})
  }, [])

  const formatTSh = (amount) => `TSh ${(parseFloat(amount || 0) * 2600).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const cardStyle = {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '25px',
    borderRadius: '16px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
    color: 'white',
    position: 'relative',
    overflow: 'hidden'
  }

  return (
    <div>
      <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: '0 0 5px', fontSize: '32px', fontWeight: '700', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Dashboard
          </h1>
          <p style={{ margin: 0, color: '#888', fontSize: '14px' }}>Karibu! — Leo ni {new Date().toLocaleDateString('sw-TZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
        <div style={{ ...cardStyle, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '80px', opacity: '0.1' }}>🛒</div>
          <p style={{ margin: '0 0 8px', fontSize: '13px', opacity: '0.9', fontWeight: '500' }}>Leo Sales</p>
          <h2 style={{ margin: 0, fontSize: '36px', fontWeight: '700' }}>{todayStats?.total_sales || 0}</h2>
          <p style={{ margin: '5px 0 0', fontSize: '12px', opacity: '0.8' }}>Mauzo ya leo</p>
        </div>

        <div style={{ ...cardStyle, background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '80px', opacity: '0.1' }}>💰</div>
          <p style={{ margin: '0 0 8px', fontSize: '13px', opacity: '0.9', fontWeight: '500' }}>Revenue ya Leo</p>
          <h2 style={{ margin: 0, fontSize: '28px', fontWeight: '700' }}>{formatTSh(todayStats?.revenue)}</h2>
          <p style={{ margin: '5px 0 0', fontSize: '12px', opacity: '0.8' }}>Mapato ya leo</p>
        </div>

        <div style={{ ...cardStyle, background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '80px', opacity: '0.1' }}>⚠️</div>
          <p style={{ margin: '0 0 8px', fontSize: '13px', opacity: '0.9', fontWeight: '500' }}>Low Stock Items</p>
          <h2 style={{ margin: 0, fontSize: '36px', fontWeight: '700' }}>{lowStock.length}</h2>
          <p style={{ margin: '5px 0 0', fontSize: '12px', opacity: '0.8' }}>Bidhaa zenye stock chini</p>
        </div>
      </div>

      {/* Low Stock Warning */}
      {lowStock.length > 0 && (
        <div style={{ background: 'linear-gradient(135deg, #fff5f5 0%, #ffe5e5 100%)', border: '2px solid #fca5a5', borderRadius: '16px', padding: '25px', marginBottom: '30px', boxShadow: '0 4px 15px rgba(252, 165, 165, 0.2)' }}>
          <h3 style={{ margin: '0 0 20px', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '20px', fontWeight: '600' }}>
            <span style={{ fontSize: '24px' }}>⚠️</span> Bidhaa Zenye Stock Chini
          </h3>
          <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' }}>
                  <th style={{ textAlign: 'left', padding: '15px 20px', color: '#666', fontWeight: '600' }}>Bidhaa</th>
                  <th style={{ textAlign: 'left', padding: '15px 20px', color: '#666', fontWeight: '600' }}>Stock</th>
                  <th style={{ textAlign: 'left', padding: '15px 20px', color: '#666', fontWeight: '600' }}>Alert Level</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map(product => (
                  <tr key={product.id} style={{ borderBottom: '1px solid #fee2e2' }}>
                    <td style={{ padding: '15px 20px', fontWeight: '500' }}>{product.name}</td>
                    <td style={{ padding: '15px 20px', color: '#dc2626', fontWeight: 'bold', fontSize: '16px' }}>{product.stock}</td>
                    <td style={{ padding: '15px 20px', color: '#888' }}>{product.low_stock_alert}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Last 7 Days */}
      <div style={{ background: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        <h3 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: '600', color: '#333' }}>📊 Sales — Siku 7 Zilizopita</h3>
        <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)' }}>
                <th style={{ textAlign: 'left', padding: '15px 20px', color: '#666', fontWeight: '600' }}>Tarehe</th>
                <th style={{ textAlign: 'left', padding: '15px 20px', color: '#666', fontWeight: '600' }}>Sales</th>
                <th style={{ textAlign: 'left', padding: '15px 20px', color: '#666', fontWeight: '600' }}>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {sevenDays.map((day, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '15px 20px', fontWeight: '500' }}>{new Date(day.date).toLocaleDateString('sw-TZ')}</td>
                  <td style={{ padding: '15px 20px' }}>{day.total_sales}</td>
                  <td style={{ padding: '15px 20px', color: '#16a34a', fontWeight: '600' }}>{formatTSh(day.revenue)}</td>
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