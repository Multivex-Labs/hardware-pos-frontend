import { useState, useEffect } from 'react'
import { getTodayReport, getMonthlyReport, getBestSelling, getPaymentMethods, getLastSevenDays } from '../services/api'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'

const Reports = () => {
  const [todayStats, setTodayStats] = useState(null)
  const [bestSelling, setBestSelling] = useState([])
  const [paymentMethods, setPaymentMethods] = useState([])
  const [sevenDays, setSevenDays] = useState([])
  const [monthlyStats, setMonthlyStats] = useState(null)
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)

  const businessName = localStorage.getItem('businessName') || 'PIUS HARDWARE'
  const logoUrl = localStorage.getItem('logoUrl') || null

  const fmt = (amount) =>
    `TSh ${parseFloat(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  useEffect(() => {
    getTodayReport().then(r => setTodayStats(r.data)).catch(() => {})
    getBestSelling().then(r => setBestSelling(r.data)).catch(() => {})
    getPaymentMethods().then(r => setPaymentMethods(r.data)).catch(() => {})
    getLastSevenDays().then(r => setSevenDays(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    getMonthlyReport(year, month).then(r => setMonthlyStats(r.data)).catch(() => {})
  }, [year, month])

  const monthNames = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  // ── PDF EXPORT ──────────────────────────────────────────────────────────
  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageW = doc.internal.pageSize.getWidth()
    const now = new Date()
    const dateStr = now.toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })

    // Header background
    doc.setFillColor(30, 30, 46)
    doc.rect(0, 0, pageW, 40, 'F')

    // Logo
    if (logoUrl) {
      try { doc.addImage(logoUrl, 'PNG', 10, 6, 26, 26) } catch (e) {}
    }

    // Business name & subtitle
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.setTextColor(255, 255, 255)
    doc.text(businessName, logoUrl ? 42 : 14, 19)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(170, 170, 200)
    doc.text('Business Performance Report', logoUrl ? 42 : 14, 27)
    doc.text('Generated: ' + dateStr, logoUrl ? 42 : 14, 33)

    let y = 48

    // Today summary
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 30, 46)
    doc.text('Today\'s Summary', 14, y)
    y += 5

    const cardW = (pageW - 28 - 9) / 4
    const cards = [
      ['Sales Today', String(todayStats?.total_sales || 0)],
      ['Revenue', fmt(todayStats?.revenue)],
      ['Discounts', fmt(todayStats?.total_discounts)],
      ['Avg Sale', fmt(todayStats?.average_sale)],
    ]
    cards.forEach((card, i) => {
      const x = 14 + i * (cardW + 3)
      doc.setFillColor(245, 247, 255)
      doc.roundedRect(x, y, cardW, 18, 2, 2, 'F')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(120, 120, 150)
      doc.text(card[0], x + 3, y + 6)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(30, 30, 46)
      doc.text(card[1], x + 3, y + 14)
    })
    y += 25

    // Monthly summary
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 30, 46)
    doc.text('Monthly Report: ' + monthNames[month] + ' ' + year, 14, y)
    y += 4

    doc.autoTable({
      startY: y,
      head: [['Total Sales', 'Revenue', 'Average Sale']],
      body: [[
        monthlyStats?.total_sales || 0,
        fmt(monthlyStats?.revenue),
        fmt(monthlyStats?.average_sale)
      ]],
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [102, 126, 234], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 249, 255] },
      margin: { left: 14, right: 14 }
    })
    y = doc.lastAutoTable.finalY + 10

    // Last 7 days
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 30, 46)
    doc.text('Last 7 Days', 14, y)
    y += 4

    doc.autoTable({
      startY: y,
      head: [['Date', 'Sales', 'Revenue']],
      body: sevenDays.map(d => [
        new Date(d.date).toLocaleDateString('en-US'),
        d.total_sales,
        fmt(d.revenue)
      ]),
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [118, 75, 162], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 248, 255] },
      margin: { left: 14, right: 14 }
    })
    y = doc.lastAutoTable.finalY + 10

    // Best selling
    if (y > 230) { doc.addPage(); y = 20 }
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 30, 46)
    doc.text('Best Selling Products', 14, y)
    y += 4

    doc.autoTable({
      startY: y,
      head: [['Product', 'Category', 'Qty Sold', 'Revenue']],
      body: bestSelling.map(p => [p.name, p.category, p.total_sold, fmt(p.revenue)]),
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [240, 147, 251], textColor: 30, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [255, 250, 255] },
      margin: { left: 14, right: 14 }
    })
    y = doc.lastAutoTable.finalY + 10

    // Payment methods
    if (y > 230) { doc.addPage(); y = 20 }
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 30, 46)
    doc.text('Sales by Payment Method', 14, y)
    y += 4

    doc.autoTable({
      startY: y,
      head: [['Payment Method', 'Total Sales', 'Revenue']],
      body: paymentMethods.map(m => [m.payment_method, m.total_sales, fmt(m.revenue)]),
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [67, 233, 123], textColor: 30, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 255, 250] },
      margin: { left: 14, right: 14 }
    })

    // Footer on every page
    const totalPages = doc.internal.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(160, 160, 180)
      doc.text(businessName + ' | Page ' + i + ' of ' + totalPages, 14, 290)
      doc.text(dateStr, pageW - 14, 290, { align: 'right' })
    }

    doc.save(businessName.replace(/\s+/g, '_') + '_Report_' + now.toISOString().slice(0, 10) + '.pdf')
  }

  // ── EXCEL EXPORT ────────────────────────────────────────────────────────
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      [businessName + ' - Today\'s Report'],
      [''],
      ['Total Sales', todayStats?.total_sales || 0],
      ['Revenue', fmt(todayStats?.revenue)],
      ['Discounts', fmt(todayStats?.total_discounts)],
      ['Average Sale', fmt(todayStats?.average_sale)]
    ]), 'Today')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Product', 'Category', 'Qty Sold', 'Revenue'],
      ...bestSelling.map(p => [p.name, p.category, p.total_sold, fmt(p.revenue)])
    ]), 'Best Selling')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Date', 'Sales', 'Revenue'],
      ...sevenDays.map(d => [new Date(d.date).toLocaleDateString('en-US'), d.total_sales, fmt(d.revenue)])
    ]), 'Last 7 Days')
    XLSX.writeFile(wb, businessName.replace(/\s+/g, '_') + '_Report_' + new Date().toISOString().slice(0, 10) + '.xlsx')
  }

  const card = { background: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginBottom: '28px' }
  const thStyle = { textAlign: 'left', padding: '14px 18px', color: '#555', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }
  const tdStyle = { padding: '14px 18px', borderBottom: '1px solid #f3f4f6', fontSize: '14px' }

  return (
    <div style={{ fontFamily: 'Poppins, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: '28px', fontWeight: '700', background: 'linear-gradient(135deg, #fa709a, #fee140)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Reports
          </h1>
          <p style={{ margin: 0, color: '#888', fontSize: '14px' }}>Business performance overview</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={exportToExcel} style={{
            padding: '11px 20px', background: 'linear-gradient(135deg, #16a34a, #15803d)',
            color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer',
            fontWeight: '600', fontSize: '13px', fontFamily: 'Poppins, sans-serif'
          }}>
            Export Excel
          </button>
          <button onClick={exportToPDF} style={{
            padding: '11px 20px', background: 'linear-gradient(135deg, #dc2626, #991b1b)',
            color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer',
            fontWeight: '600', fontSize: '13px', fontFamily: 'Poppins, sans-serif'
          }}>
            Export PDF
          </button>
        </div>
      </div>

      {/* Today Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '18px', marginBottom: '28px' }}>
        {[
          { label: 'Sales Today', value: todayStats?.total_sales || 0, grad: 'linear-gradient(135deg,#667eea,#764ba2)', icon: '🛒' },
          { label: 'Revenue Today', value: fmt(todayStats?.revenue), grad: 'linear-gradient(135deg,#f093fb,#f5576c)', icon: '💰' },
          { label: 'Discounts', value: fmt(todayStats?.total_discounts), grad: 'linear-gradient(135deg,#4facfe,#00f2fe)', icon: '🎁' },
          { label: 'Average Sale', value: fmt(todayStats?.average_sale), grad: 'linear-gradient(135deg,#43e97b,#38f9d7)', icon: '📊' },
        ].map(({ label, value, grad, icon }) => (
          <div key={label} style={{ background: grad, padding: '22px', borderRadius: '14px', color: 'white', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-15px', right: '-15px', fontSize: '70px', opacity: 0.12 }}>{icon}</div>
            <p style={{ margin: '0 0 6px', fontSize: '12px', fontWeight: '500', opacity: 0.9 }}>{label}</p>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '700' }}>{value}</h2>
          </div>
        ))}
      </div>

      {/* Monthly Report */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>Monthly Report</h3>
          <select value={month} onChange={e => setMonth(e.target.value)}
            style={{ padding: '9px 14px', border: '2px solid #e5e7eb', borderRadius: '8px', fontWeight: '600', fontFamily: 'Poppins, sans-serif', fontSize: '13px' }}>
            {monthNames.slice(1).map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <input type="number" value={year} onChange={e => setYear(e.target.value)}
            style={{ padding: '9px 14px', border: '2px solid #e5e7eb', borderRadius: '8px', width: '85px', fontWeight: '600', fontFamily: 'Poppins, sans-serif', fontSize: '13px' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px' }}>
          {[
            { label: 'Total Sales', value: monthlyStats?.total_sales || 0 },
            { label: 'Revenue', value: fmt(monthlyStats?.revenue) },
            { label: 'Average Sale', value: fmt(monthlyStats?.average_sale) },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: '#f8f9ff', padding: '18px', borderRadius: '10px' }}>
              <p style={{ margin: '0 0 6px', color: '#888', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>{label}</p>
              <h3 style={{ margin: 0, fontSize: '22px', fontWeight: '700' }}>{value}</h3>
            </div>
          ))}
        </div>
      </div>

      {/* Last 7 Days */}
      <div style={card}>
        <h3 style={{ margin: '0 0 18px', fontSize: '18px', fontWeight: '700' }}>Last 7 Days</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f9ff' }}>
              {['Date', 'Sales', 'Revenue'].map(h => <th key={h} style={thStyle}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {sevenDays.length === 0 && (
              <tr><td colSpan={3} style={{ ...tdStyle, color: '#aaa', textAlign: 'center' }}>No data available</td></tr>
            )}
            {sevenDays.map((day, i) => (
              <tr key={i}>
                <td style={tdStyle}>{new Date(day.date).toLocaleDateString('en-US')}</td>
                <td style={{ ...tdStyle, fontWeight: '600' }}>{day.total_sales}</td>
                <td style={{ ...tdStyle, color: '#16a34a', fontWeight: '700' }}>{fmt(day.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Best Selling */}
      <div style={card}>
        <h3 style={{ margin: '0 0 18px', fontSize: '18px', fontWeight: '700' }}>Best Selling Products</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f9ff' }}>
              {['Product', 'Category', 'Qty Sold', 'Revenue'].map(h => <th key={h} style={thStyle}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {bestSelling.length === 0 && (
              <tr><td colSpan={4} style={{ ...tdStyle, color: '#aaa', textAlign: 'center' }}>No data available</td></tr>
            )}
            {bestSelling.map((p, i) => (
              <tr key={i}>
                <td style={{ ...tdStyle, fontWeight: '700' }}>{p.name}</td>
                <td style={{ ...tdStyle, color: '#888' }}>{p.category}</td>
                <td style={{ ...tdStyle, fontWeight: '600' }}>{p.total_sold}</td>
                <td style={{ ...tdStyle, color: '#16a34a', fontWeight: '700' }}>{fmt(p.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Payment Methods */}
      <div style={card}>
        <h3 style={{ margin: '0 0 18px', fontSize: '18px', fontWeight: '700' }}>Sales by Payment Method</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px' }}>
          {paymentMethods.length === 0 && (
            <p style={{ color: '#aaa', fontSize: '14px' }}>No data available</p>
          )}
          {paymentMethods.map((m, i) => (
            <div key={i} style={{ background: '#f8f9ff', padding: '20px', borderRadius: '10px', textAlign: 'center' }}>
              <p style={{ margin: '0 0 6px', color: '#888', textTransform: 'capitalize', fontWeight: '600', fontSize: '13px' }}>{m.payment_method}</p>
              <h3 style={{ margin: '0 0 6px', fontSize: '26px', fontWeight: '700' }}>{m.total_sales}</h3>
              <p style={{ margin: 0, color: '#16a34a', fontWeight: '700', fontSize: '15px' }}>{fmt(m.revenue)}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

export default Reports
