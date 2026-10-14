import { useLanguage } from '../context/LanguageContext'
import { useState, useEffect } from 'react'
import { getTodayReport, getLastSevenDays, getLowStock, getBusinessSettings, getExpiringSoon, getSales, getClients } from '../services/api'
import { useTheme } from '../context/ThemeContext'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { ShoppingCart, Banknote, TrendingUp, Receipt, Wallet, TriangleAlert } from 'lucide-react'

const fmt = (v) => `TSh ${parseFloat(v || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`

// Time kama ni leo, tarehe kama ni siku nyingine
const fmtWhen = (d) => {
  const dt = new Date(d)
  return dt.toDateString() === new Date().toDateString()
    ? dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : dt.toLocaleDateString('en-GB')
}

const Stat = ({ label, value, tone = '', sub, icon: Icon }) => (
  <div className="stat">
    {Icon && <Icon className="stat-icon" size={88} strokeWidth={1.25} aria-hidden="true" />}
    <p className="stat-label">{label}</p>
    <p className={`stat-value ${tone}`}>{value}</p>
    {sub && <p className="stat-sub">{sub}</p>}
  </div>
)

const Panel = ({ title, meta, children }) => (
  <div className="table-card" style={{ height: '100%' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
      <h3 style={{ fontSize: '14px', fontWeight: '600' }}>{title}</h3>
      {meta && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{meta}</span>}
    </div>
    {children}
  </div>
)

const Empty = ({ children }) => (
  <p style={{ padding: '28px 16px', textAlign: 'center', fontSize: '13px', color: 'var(--text-subtle)' }}>{children}</p>
)


const Dashboard = () => {
  const { t, language } = useLanguage()
  const { colors } = useTheme()
  const locale = language === 'sw' ? 'sw-TZ' : 'en-US'
  const [todayStats, setTodayStats] = useState(null)
  const [sevenDays, setSevenDays] = useState([])
  const [lowStock, setLowStock] = useState([])
  const [recentSales, setRecentSales] = useState([])
  const [clients, setClients] = useState([])
  const [businessType, setBusinessType] = useState('general')
  const [expiringSoon, setExpiringSoon] = useState([])

  useEffect(() => {
    getTodayReport().then(r => setTodayStats(r.data)).catch(() => {})
    getLastSevenDays().then(r => setSevenDays(r.data)).catch(() => {})
    getLowStock().then(r => setLowStock(r.data)).catch(() => {})
    getSales().then(r => setRecentSales([...r.data].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 8))).catch(() => {})
    getClients().then(r => setClients(r.data)).catch(() => {})
    getBusinessSettings().then(r => {
      const type = r.data?.business_type || 'general'
      setBusinessType(type)
      if (type === 'pharmacy') {
        getExpiringSoon(30).then(res => setExpiringSoon(res.data)).catch(() => {})
      }
    }).catch(() => {})
  }, [])

  const chartData = sevenDays.map(d => ({
    day: new Date(d.date).toLocaleDateString(locale, { weekday: 'short', day: 'numeric' }),
    revenue: parseFloat(d.revenue || 0),
    sales: parseInt(d.total_sales || 0),
  }))

  const daysUntil = (dateStr) => Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24))
  const expiryStatus = (dateStr) => {
    const d = daysUntil(dateStr)
    if (d < 0) return { label: t('dash.expired'), cls: 'badge-danger' }
    if (d <= 7) return { label: t('dash.daysLeft', { d }), cls: 'badge-danger' }
    if (d <= 30) return { label: t('dash.daysLeft', { d }), cls: 'badge-warning' }
    return { label: t('dash.daysLeft', { d }), cls: 'badge-success' }
  }

  // Wateja wenye deni (balance > 0), kubwa kwanza
  const owing = clients.filter(c => Number(c.balance) > 0).sort((a, b) => Number(b.balance) - Number(a.balance))
  const owingTotal = owing.reduce((s, c) => s + Number(c.balance), 0)

  const net = Number(todayStats?.net_profit || 0)

  const ChartTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return (
      <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '6px', padding: '8px 12px', boxShadow: colors.shadowLg }}>
        <p style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '4px' }}>{label}</p>
        <p style={{ fontSize: '14px', fontWeight: '600', color: colors.text }}>{fmt(d.revenue)}</p>
        <p style={{ fontSize: '12px', color: colors.textMuted }}>{d.sales} sales</p>
      </div>
    )
  }

  return (
    <div style={{ color: colors.text }}>
      <div className="page-header">
        <div>
          <h1>{t('dash.title')}</h1>
          <p>{new Date().toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      {/* Today at a glance */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        <Stat icon={ShoppingCart} label={t('dash.txToday')} value={(todayStats?.total_sales || 0).toLocaleString()} />
        <Stat icon={Banknote} label={t('dash.revToday')} value={fmt(todayStats?.revenue)} />
        <Stat icon={TrendingUp} label={t('dash.gross')} value={fmt(todayStats?.gross_profit)} />
        <Stat icon={Receipt} label={t('dash.expenses')} value={fmt(todayStats?.total_expenses)} />
        <Stat icon={Wallet} label={t('dash.net')} value={fmt(todayStats?.net_profit)} tone={net > 0 ? 'is-positive' : net < 0 ? 'is-negative' : ''} />
        <Stat icon={TriangleAlert} label={t('dash.lowItems')} value={lowStock.length} tone={lowStock.length > 0 ? 'is-negative' : ''} />
      </div>

      {/* Pharmacy: expiry — compliance, kwa hiyo juu */}
      {businessType === 'pharmacy' && expiringSoon.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <Panel title={t('dash.expTitle')} meta={t('dash.expMeta', { n: expiringSoon.length })}>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr><th>{t('dash.product')}</th><th>{t('dash.batch')}</th><th>{t('dash.expDate')}</th><th>{t('dash.status')}</th><th className="num">{t('dash.stock')}</th></tr>
                </thead>
                <tbody>
                  {expiringSoon.map(p => {
                    const status = expiryStatus(p.expiry_date)
                    return (
                      <tr key={p.id}>
                        <td style={{ fontWeight: '500' }}>{p.name}</td>
                        <td className="mono" style={{ color: 'var(--text-muted)' }}>{p.batch_number || '—'}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{new Date(p.expiry_date).toLocaleDateString('en-GB')}</td>
                        <td><span className={`badge ${status.cls}`}>{status.label}</span></td>
                        <td className="num mono">{Number(p.stock).toLocaleString()}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}

      {/* Trend + recent sales */}
      <div className="grid-2" style={{ marginBottom: '16px' }}>
        <Panel title={t('dash.revTitle')} meta={t('dash.total', { amount: fmt(sevenDays.reduce((s, d) => s + parseFloat(d.revenue || 0), 0)) })}>
          {chartData.length === 0 ? (
            <Empty>{t('dash.noSalesData')}</Empty>
          ) : (
            <div style={{ padding: '16px 8px 8px 0' }}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={colors.border} />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: colors.textMuted }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: colors.textMuted }} axisLine={false} tickLine={false} width={44}
                    tickFormatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: colors.surface3 }} />
                  <Bar dataKey="revenue" fill={colors.primary} radius={[3, 3, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel title={t('dash.recentTitle')} meta={t('dash.latest8')}>
          {recentSales.length === 0 ? (
            <Empty>{t('dash.noRecent')}</Empty>
          ) : (
            <div className="table-wrapper">
              <table className="data-table" style={{ minWidth: '420px' }}>
                <thead>
                  <tr><th>{t('dash.receipt')}</th><th>{t('dash.customer')}</th><th>{t('dash.type')}</th><th className="num">{t('dash.totalCol')}</th><th className="num">{t('dash.when')}</th></tr>
                </thead>
                <tbody>
                  {recentSales.map(s => (
                    <tr key={s.id} style={{ opacity: s.voided ? 0.55 : 1 }}>
                      <td className="mono" style={{ color: 'var(--text-muted)' }}>#{s.id}</td>
                      <td style={{ fontWeight: '500', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.walkin_name || s.client_name || t('dash.walkin')}
                        {s.voided && <span className="badge badge-danger" style={{ marginLeft: '6px' }}>{t('dash.void')}</span>}
                      </td>
                      <td><span className={`badge badge-${s.sale_type === 'credit' ? 'credit' : s.sale_type === 'deposit' ? 'deposit' : 'cash'}`}>{t(`dash.types.${s.sale_type === 'credit' ? 'credit' : s.sale_type === 'deposit' ? 'deposit' : 'cash'}`)}</span></td>
                      <td className="num mono" style={{ fontWeight: '500', textDecoration: s.voided ? 'line-through' : 'none' }}>{fmt(s.total)}</td>
                      <td className="num" style={{ color: 'var(--text-muted)' }}>{fmtWhen(s.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      {/* Needs attention */}
      <div className="grid-2">
        <Panel title={t('dash.lowTitle')} meta={t('dash.items', { n: lowStock.length })}>
          {lowStock.length === 0 ? (
            <Empty>{t('dash.allAbove')}</Empty>
          ) : (
            <div className="table-wrapper" style={{ maxHeight: '320px', overflowY: 'auto' }}>
              <table className="data-table" style={{ minWidth: '380px' }}>
                <thead>
                  <tr><th>{t('dash.product')}</th><th className="num">{t('dash.stock')}</th><th className="num">{t('dash.minLevel')}</th><th>{t('dash.status')}</th></tr>
                </thead>
                <tbody>
                  {lowStock.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: '500' }}>{p.name}</td>
                      <td className="num mono" style={{ fontWeight: '500', color: Number(p.stock) === 0 ? 'var(--danger)' : 'var(--text)' }}>{Number(p.stock).toLocaleString()}</td>
                      <td className="num mono" style={{ color: 'var(--text-muted)' }}>{p.low_stock_alert}</td>
                      <td><span className={`badge badge-${Number(p.stock) === 0 ? 'out' : 'low'}`}>{Number(p.stock) === 0 ? t('dash.out') : t('dash.low')}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title={t('dash.owedTitle')} meta={owing.length > 0 ? t('dash.total', { amount: fmt(owingTotal) }) : undefined}>
          {owing.length === 0 ? (
            <Empty>{t('dash.noOwe')}</Empty>
          ) : (
            <div className="table-wrapper" style={{ maxHeight: '320px', overflowY: 'auto' }}>
              <table className="data-table" style={{ minWidth: '380px' }}>
                <thead>
                  <tr><th>{t('dash.customer')}</th><th className="num">{t('dash.balance')}</th><th className="num">{t('dash.creditLimit')}</th></tr>
                </thead>
                <tbody>
                  {owing.slice(0, 10).map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: '500' }}>{c.name}</td>
                      <td className="num mono" style={{ fontWeight: '500', color: 'var(--warning)' }}>{fmt(c.balance)}</td>
                      <td className="num mono" style={{ color: 'var(--text-muted)' }}>{fmt(c.credit_limit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}

export default Dashboard
