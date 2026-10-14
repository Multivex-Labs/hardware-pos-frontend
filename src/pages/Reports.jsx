import { useState, useEffect } from 'react'
import { ShoppingCart, Banknote, Tag, Calculator, TrendingUp, Receipt, Wallet, FileSpreadsheet, FileText, BarChart3, ScrollText } from 'lucide-react'
import { getTodayReport, getMonthlyReport, getBestSelling, getPaymentMethods, getLastSevenDays, getBusinessSettings } from '../services/api'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import AuditLog from './AuditLog'

const fmt = (v) => `TSh ${parseFloat(v || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`

const Reports = () => {
  const [view, setView] = useState('performance') // 'performance' | 'audit'
  const [todayStats, setTodayStats] = useState(null)
  const [bestSelling, setBestSelling] = useState([])
  const [paymentMethods, setPaymentMethods] = useState([])
  const [sevenDays, setSevenDays] = useState([])
  const [monthlyStats, setMonthlyStats] = useState(null)
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [businessName, setBusinessName] = useState(localStorage.getItem('businessName') || 'POS')
  const [logoUrl, setLogoUrl] = useState(localStorage.getItem('logoUrl') || null)

  useEffect(() => {
    getTodayReport().then(r => setTodayStats(r.data)).catch(() => {})
    getBestSelling().then(r => setBestSelling(r.data)).catch(() => {})
    getPaymentMethods().then(r => setPaymentMethods(r.data)).catch(() => {})
    getLastSevenDays().then(r => setSevenDays(r.data)).catch(() => {})
    getBusinessSettings().then(r => { const s = r.data || {}; if (s.business_name) setBusinessName(s.business_name); setLogoUrl(s.logo || null) }).catch(() => {})
  }, [])

  useEffect(() => { getMonthlyReport(year, month).then(r => setMonthlyStats(r.data)).catch(() => {}) }, [year, month])

  const monthNames = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageW = doc.internal.pageSize.getWidth()
    const now = new Date()
    const dateStr = now.toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })
    doc.setFillColor(45, 49, 57); doc.rect(0, 0, pageW, 40, 'F')
    if (logoUrl) { try { doc.addImage(logoUrl, 'PNG', 10, 6, 26, 26) } catch (e) {} }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(255, 255, 255)
    doc.text(businessName, logoUrl ? 42 : 14, 19)
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(170, 170, 200)
    doc.text('Business Performance Report', logoUrl ? 42 : 14, 27)
    doc.text('Generated: ' + dateStr, logoUrl ? 42 : 14, 33)
    let y = 48
    const cards = [['Sales Today', String(todayStats?.total_sales || 0)], ['Revenue', fmt(todayStats?.revenue)], ['Gross Profit', fmt(todayStats?.gross_profit)], ['Net Profit', fmt(todayStats?.net_profit)]]
    const cardW = (pageW - 28 - 9) / 4
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 46); doc.text("Today's Summary", 14, y); y += 5
    cards.forEach((card, i) => {
      const x = 14 + i * (cardW + 3); doc.setFillColor(243, 244, 246); doc.roundedRect(x, y, cardW, 18, 2, 2, 'F')
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(120, 120, 150); doc.text(card[0], x + 3, y + 6)
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(30, 30, 46); doc.text(card[1], x + 3, y + 14)
    })
    y += 28
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 46)
    doc.text('Monthly Report: ' + monthNames[month] + ' ' + year, 14, y); y += 4
    doc.autoTable({ startY: y, head: [['Total Sales', 'Revenue', 'Gross Profit', 'Expenses', 'Net Profit']], body: [[monthlyStats?.total_sales || 0, fmt(monthlyStats?.revenue), fmt(monthlyStats?.gross_profit), fmt(monthlyStats?.total_expenses), fmt(monthlyStats?.net_profit)]], styles: { font: 'helvetica', fontSize: 8, cellPadding: 4 }, headStyles: { fillColor: [45, 49, 57], textColor: 255, fontStyle: 'bold' }, margin: { left: 14, right: 14 } })
    y = doc.lastAutoTable.finalY + 10
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.text('Best Selling Products', 14, y); y += 4
    doc.autoTable({ startY: y, head: [['Product', 'Category', 'Qty Sold', 'Revenue']], body: bestSelling.map(p => [p.name, p.category, p.total_sold, fmt(p.revenue)]), styles: { font: 'helvetica', fontSize: 9, cellPadding: 4 }, headStyles: { fillColor: [45, 49, 57], textColor: 255, fontStyle: 'bold' }, margin: { left: 14, right: 14 } })
    const totalPages = doc.internal.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(160, 160, 180); doc.text(businessName + ' | Page ' + i + ' of ' + totalPages, 14, 290); doc.text(dateStr, pageW - 14, 290, { align: 'right' }) }
    doc.save(businessName.replace(/\s+/g, '_') + '_Report_' + now.toISOString().slice(0, 10) + '.pdf')
  }

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[businessName + " - Today's Report"],[''],['Total Sales', todayStats?.total_sales || 0],['Revenue', fmt(todayStats?.revenue)],['Gross Profit', fmt(todayStats?.gross_profit)],['Expenses', fmt(todayStats?.total_expenses)],['Net Profit', fmt(todayStats?.net_profit)]]), 'Today')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Product', 'Category', 'Qty Sold', 'Revenue'], ...bestSelling.map(p => [p.name, p.category, p.total_sold, fmt(p.revenue)])]), 'Best Selling')
    XLSX.writeFile(wb, businessName.replace(/\s+/g, '_') + '_Report_' + new Date().toISOString().slice(0, 10) + '.xlsx')
  }


  const netToday = Number(todayStats?.net_profit || 0)
  const netMonth = Number(monthlyStats?.net_profit || 0)
  const toneOf = (n) => (n > 0 ? 'is-positive' : n < 0 ? 'is-negative' : '')
  const weekTotal = sevenDays.reduce((s, d) => s + parseFloat(d.revenue || 0), 0)

  const monthly = [
    { label: 'Total sales', value: (monthlyStats?.total_sales || 0).toLocaleString() },
    { label: 'Revenue', value: fmt(monthlyStats?.revenue) },
    { label: 'Average sale', value: fmt(monthlyStats?.average_sale) },
    { label: 'Gross profit', value: fmt(monthlyStats?.gross_profit), color: 'var(--success)' },
    { label: 'Total expenses', value: fmt(monthlyStats?.total_expenses), color: 'var(--warning)' },
    { label: 'Net profit', value: fmt(monthlyStats?.net_profit), color: netMonth < 0 ? 'var(--danger)' : 'var(--success)' },
  ]

  return (
    <div style={{ color: 'var(--text)' }}>
      <div className="page-header">
        <div>
          <h1>Reports</h1>
          <p>Business performance overview</p>
        </div>
        {view === 'performance' && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn" onClick={exportToExcel}><FileSpreadsheet size={16} strokeWidth={1.75} /> Export Excel</button>
            <button className="btn" onClick={exportToPDF}><FileText size={16} strokeWidth={1.75} /> Export PDF</button>
          </div>
        )}
      </div>

      {/* Performance vs Audit Log ndani ya Reports page moja */}
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={view === 'performance'} className={`tab${view === 'performance' ? ' active' : ''}`} onClick={() => setView('performance')}><BarChart3 size={17} strokeWidth={1.75} /> Performance</button>
        <button role="tab" aria-selected={view === 'audit'} className={`tab${view === 'audit' ? ' active' : ''}`} onClick={() => setView('audit')}><ScrollText size={17} strokeWidth={1.75} /> Audit log</button>
      </div>

      {view === 'audit' ? (
        <AuditLog />
      ) : (
        <>
          {/* Today */}
          <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '10px' }}>Today</p>
          <div className="stats-row">
            <div className="stat"><ShoppingCart className="stat-icon" aria-hidden="true" /><p className="stat-label">Sales today</p><p className="stat-value">{(todayStats?.total_sales || 0).toLocaleString()}</p></div>
            <div className="stat"><Banknote className="stat-icon" aria-hidden="true" /><p className="stat-label">Revenue</p><p className="stat-value">{fmt(todayStats?.revenue)}</p></div>
            <div className="stat"><Tag className="stat-icon" aria-hidden="true" /><p className="stat-label">Discounts</p><p className="stat-value">{fmt(todayStats?.total_discounts)}</p></div>
            <div className="stat"><Calculator className="stat-icon" aria-hidden="true" /><p className="stat-label">Average sale</p><p className="stat-value">{fmt(todayStats?.average_sale)}</p></div>
            <div className="stat"><TrendingUp className="stat-icon" aria-hidden="true" /><p className="stat-label">Gross profit</p><p className="stat-value">{fmt(todayStats?.gross_profit)}</p></div>
            <div className="stat"><Receipt className="stat-icon" aria-hidden="true" /><p className="stat-label">Expenses</p><p className="stat-value">{fmt(todayStats?.total_expenses)}</p></div>
            <div className="stat"><Wallet className="stat-icon" aria-hidden="true" /><p className="stat-label">Net profit</p><p className={`stat-value ${toneOf(netToday)}`}>{fmt(todayStats?.net_profit)}</p></div>
          </div>

          {/* Monthly */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginRight: 'auto' }}>Monthly report</h3>
              <select className="form-input" style={{ width: 'auto', minWidth: '100px' }} value={month} onChange={e => setMonth(e.target.value)} aria-label="Month">
                {monthNames.slice(1).map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
              <input className="form-input mono" type="number" style={{ width: '96px' }} value={year} onChange={e => setYear(e.target.value)} aria-label="Year" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '12px' }}>
              {monthly.map(({ label, value, color }) => (
                <div key={label} style={{ padding: '14px 16px', borderRadius: '8px', border: '1px solid var(--border-light)', background: 'var(--surface-2)' }}>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>{label}</p>
                  <p className="mono" style={{ fontSize: '20px', fontWeight: '600', color: color || 'var(--text)' }}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Last 7 days + Best selling */}
          <div className="grid-2" style={{ marginBottom: '16px', alignItems: 'start' }}>
            <div className="table-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600' }}>Last 7 days</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total {fmt(weekTotal)}</span>
              </div>
              <div className="table-wrapper">
                <table className="data-table" style={{ minWidth: '360px' }}>
                  <thead><tr><th>Date</th><th className="num">Sales</th><th className="num">Revenue</th></tr></thead>
                  <tbody>
                    {sevenDays.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-subtle)' }}>No data available</td></tr>}
                    {sevenDays.map((day, i) => (
                      <tr key={i}>
                        <td>{new Date(day.date).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}</td>
                        <td className="num mono" style={{ fontWeight: '500' }}>{day.total_sales}</td>
                        <td className="num mono" style={{ fontWeight: '600' }}>{fmt(day.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="table-card">
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600' }}>Best selling products</h3>
              </div>
              <div className="table-wrapper">
                <table className="data-table" style={{ minWidth: '420px' }}>
                  <thead><tr><th style={{ width: '40px' }}>#</th><th>Product</th><th className="num">Qty sold</th><th className="num">Revenue</th></tr></thead>
                  <tbody>
                    {bestSelling.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-subtle)' }}>No data available</td></tr>}
                    {bestSelling.map((p, i) => (
                      <tr key={i}>
                        <td className="mono" style={{ color: 'var(--text-subtle)' }}>{i + 1}</td>
                        <td>
                          <div style={{ fontWeight: '500' }}>{p.name}</div>
                          {p.category && <div style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>{p.category}</div>}
                        </td>
                        <td className="num mono" style={{ fontWeight: '500' }}>{p.total_sold}</td>
                        <td className="num mono" style={{ fontWeight: '600' }}>{fmt(p.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Payment methods */}
          <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '10px' }}>Sales by payment method</p>
          {paymentMethods.length === 0 ? (
            <p style={{ fontSize: '14px', color: 'var(--text-subtle)' }}>No data available</p>
          ) : (
            <div className="stats-row">
              {paymentMethods.map((m, i) => (
                <div className="stat" key={i}>
                  <p className="stat-label" style={{ textTransform: 'capitalize' }}>{String(m.payment_method).replace('_', ' ')}</p>
                  <p className="stat-value">{m.total_sales}</p>
                  <p className="stat-sub mono">{fmt(m.revenue)}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Reports
