import { useState, useEffect } from 'react'
import { getTodayReport, getMonthlyReport, getBestSelling, getPaymentMethods, getLastSevenDays } from '../services/api'
import * as XLSX from 'xlsx'

const Reports = () => {
  const [todayStats, setTodayStats] = useState(null)
  const [bestSelling, setBestSelling] = useState([])
  const [paymentMethods, setPaymentMethods] = useState([])
  const [sevenDays, setSevenDays] = useState([])
  const [monthlyStats, setMonthlyStats] = useState(null)
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)

  const formatTSh = (amount) => `TSh ${(parseFloat(amount || 0) * 2600).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  useEffect(() => {
    getTodayReport().then(res => setTodayStats(res.data)).catch(() => {})
    getBestSelling().then(res => setBestSelling(res.data)).catch(() => {})
    getPaymentMethods().then(res => setPaymentMethods(res.data)).catch(() => {})
    getLastSevenDays().then(res => setSevenDays(res.data)).catch(() => {})
  }, [])

  useEffect(() => {
    getMonthlyReport(year, month).then(res => setMonthlyStats(res.data)).catch(() => {})
  }, [year, month])

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new()
    
    // Today Stats
    const todayData = [
      ['PIUS HARDWARE - Report ya Leo'],
      [''],
      ['Total Sales', todayStats?.total_sales || 0],
      ['Revenue', formatTSh(todayStats?.revenue)],
      ['Discounts', formatTSh(todayStats?.total_discounts)],
      ['Average Sale', formatTSh(todayStats?.average_sale)]
    ]
    const ws1 = XLSX.utils.aoa_to_sheet(todayData)
    XLSX.utils.book_append_sheet(wb, ws1, 'Leo')
    
    // Best Selling
    const bestData = [
      ['Bidhaa', 'Category', 'Imeuza', 'Revenue'],
      ...bestSelling.map(p => [p.name, p.category, p.total_sold, formatTSh(p.revenue)])
    ]
    const ws2 = XLSX.utils.aoa_to_sheet(bestData)
    XLSX.utils.book_append_sheet(wb, ws2, 'Best Selling')
    
    // Last 7 Days
    const sevenData = [
      ['Tarehe', 'Sales', 'Revenue'],
      ...sevenDays.map(d => [new Date(d.date).toLocaleDateString('sw-TZ'), d.total_sales, formatTSh(d.revenue)])
    ]
    const ws3 = XLSX.utils.aoa_to_sheet(sevenData)
    XLSX.utils.book_append_sheet(wb, ws3, 'Siku 7')
    
    XLSX.writeFile(wb, `PIUS_HARDWARE_Report_${new Date().toLocaleDateString('sw-TZ')}.xlsx`)
  }

  const cardStyle = { background: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginBottom: '30px' }

  return (
    <div>
      <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: '0 0 5px', fontSize: '32px', fontWeight: '700', background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            📈 Reports
          </h1>
          <p style={{ margin: 0, color: '#888', fontSize: '14px' }}>Angalia taarifa zako za biashara</p>
        </div>
        <button
          onClick={exportToExcel}
          style={{ padding: '12px 25px', background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', boxShadow: '0 4px 15px rgba(22, 163, 74, 0.4)' }}
        >
          📊 Export to Excel
        </button>
      </div>

      {/* Today Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
        {[
          { label: 'Sales Leo', value: todayStats?.total_sales || 0, gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', icon: '🛒' },
          { label: 'Revenue Leo', value: formatTSh(todayStats?.revenue), gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', icon: '💰' },
          { label: 'Discounts Leo', value: formatTSh(todayStats?.total_discounts), gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', icon: '🎁' },
          { label: 'Average Sale', value: formatTSh(todayStats?.average_sale), gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', icon: '📊' },
        ].map(({ label, value, gradient, icon }) => (
          <div key={label} style={{ background: gradient, padding: '25px', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', color: 'white', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '80px', opacity: '0.15' }}>{icon}</div>
            <p style={{ margin: '0 0 8px', fontSize: '13px', opacity: '0.9', fontWeight: '500' }}>{label}</p>
            <h2 style={{ margin: 0, fontSize: value.toString().length > 15 ? '20px' : '28px', fontWeight: '700', position: 'relative', zIndex: 1 }}>{value}</h2>
          </div>
        ))}
      </div>

      {/* Monthly Report */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '25px' }}>
          <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>📅 Report ya Mwezi</h3>
          <select value={month} onChange={e => setMonth(e.target.value)} style={{ padding: '10px 15px', border: '2px solid #e5e7eb', borderRadius: '10px', fontWeight: '600', fontSize: '14px' }}>
            {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
          <input type="number" value={year} onChange={e => setYear(e.target.value)} style={{ padding: '10px 15px', border: '2px solid #e5e7eb', borderRadius: '10px', width: '90px', fontWeight: '600', fontSize: '14px' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          {[
            { label: 'Total Sales', value: monthlyStats?.total_sales || 0 },
            { label: 'Revenue', value: formatTSh(monthlyStats?.revenue) },
            { label: 'Avg Sale', value: formatTSh(monthlyStats?.average_sale) },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', padding: '20px', borderRadius: '12px' }}>
              <p style={{ margin: '0 0 8px', color: '#888', fontSize: '13px', fontWeight: '600' }}>{label}</p>
              <h3 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>{value}</h3>
            </div>
          ))}
        </div>
      </div>

      {/* Last 7 Days */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: '600' }}>📊 Siku 7 Zilizopita</h3>
        <div style={{ borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)' }}>
                {['Tarehe', 'Sales', 'Revenue'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '15px 20px', color: '#666', fontWeight: '700', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sevenDays.map((day, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '15px 20px', fontWeight: '600' }}>{new Date(day.date).toLocaleDateString('sw-TZ')}</td>
                  <td style={{ padding: '15px 20px', fontWeight: '600' }}>{day.total_sales}</td>
                  <td style={{ padding: '15px 20px', color: '#16a34a', fontWeight: '700' }}>{formatTSh(day.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Best Selling */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: '600' }}>🏆 Best Selling Products</h3>
        <div style={{ borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)' }}>
                {['Bidhaa', 'Category', 'Imeuza', 'Revenue'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '15px 20px', color: '#666', fontWeight: '700', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bestSelling.map((product, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '15px 20px', fontWeight: '700' }}>{product.name}</td>
                  <td style={{ padding: '15px 20px', color: '#888' }}>{product.category}</td>
                  <td style={{ padding: '15px 20px', fontWeight: '600' }}>{product.total_sold}</td>
                  <td style={{ padding: '15px 20px', color: '#16a34a', fontWeight: '700' }}>{formatTSh(product.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Methods */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: '600' }}>💳 Sales kwa Payment Method</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          {paymentMethods.map((method, i) => (
            <div key={i} style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
              <p style={{ margin: '0 0 8px', color: '#888', textTransform: 'capitalize', fontWeight: '600', fontSize: '14px' }}>{method.payment_method}</p>
              <h3 style={{ margin: '0 0 8px', fontSize: '28px', fontWeight: '700' }}>{method.total_sales}</h3>
              <p style={{ margin: 0, color: '#16a34a', fontWeight: '700', fontSize: '16px' }}>{formatTSh(method.revenue)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Reports