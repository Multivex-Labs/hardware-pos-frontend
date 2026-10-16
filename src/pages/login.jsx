import { useLanguage } from '../context/LanguageContext'
import { useState, useEffect } from 'react'
import { Eye, EyeOff, MapPin, Phone } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { login as loginApi, getBusinessSettings } from '../services/api'
import toast from 'react-hot-toast'

const Login = () => {
  const { t } = useLanguage()
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showForgotPasswordHelp, setShowForgotPasswordHelp] = useState(false)
  const [biz, setBiz] = useState({ business_name: '', motto: '', logo: '', address: '', phone: '' })

  useEffect(() => {
    getBusinessSettings()
      .then(res => {
        const s = res.data || {}
        setBiz({ business_name: s.business_name || '', motto: s.motto || '', logo: s.logo || '', address: s.address || '', phone: s.phone || '' })
      })
      .catch(() => {})
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await loginApi(form)
      login(res.data.token, res.data.user)
      toast.success(t('login.welcome', { name: res.data.user.name }))
    } catch (err) {
      toast.error(err.response?.data?.message || t('login.invalid'))
    } finally { setLoading(false) }
  }

  const initials = biz.business_name
    ? biz.business_name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : 'POS'

  // Logo box — inatumika kwenye panel ya kushoto (desktop) na juu ya fomu (simu)
  const Logo = ({ size }) => (
    <div style={{
      width: `${size}px`, height: `${size}px`, borderRadius: '8px', overflow: 'hidden', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#fff', padding: biz.logo ? '6px' : 0,
    }}>
      {biz.logo
        ? <img src={biz.logo} alt={biz.business_name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        : <span style={{ fontSize: `${Math.round(size / 3)}px`, fontWeight: '700', color: '#2D3139' }}>{initials}</span>}
    </div>
  )

  return (
    <div className="login-root">
      <style>{`
        .login-root { min-height: 100vh; display: flex; background: var(--bg); color: var(--text); }
        .login-brand { width: 45%; min-width: 360px; background: var(--primary); color: var(--on-primary);
                       display: flex; flex-direction: column; justify-content: center; align-items: flex-start; padding: 64px; position: relative; }
        .login-form-wrap { flex: 1; display: flex; align-items: center; justify-content: center; padding: 32px 24px; position: relative; overflow: hidden; }
        .login-blob { position: absolute; border-radius: 50%; pointer-events: none; background: var(--primary); opacity: 0.10; filter: blur(70px); }
        .login-info { margin-top: 32px; display: flex; flex-direction: column; gap: 8px; font-size: 14px; padding: 14px 16px; border-radius: 8px;
                      background: color-mix(in srgb, var(--on-primary) 8%, transparent); border: 1px solid color-mix(in srgb, var(--on-primary) 16%, transparent); }
        .login-card { width: 100%; max-width: 400px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 32px; }
        .login-mobile-brand { display: none; align-items: center; gap: 12px; margin-bottom: 24px; }
        .pw-toggle { position: absolute; right: 4px; top: 50%; transform: translateY(-50%); width: 32px; height: 32px; padding: 0;
                     display: inline-flex; align-items: center; justify-content: center; border: none; background: transparent; color: var(--text-muted); cursor: pointer; border-radius: 6px; }
        .pw-toggle:hover { color: var(--text); background: var(--surface-3); transform: translateY(-50%); }
        @supports (backdrop-filter: blur(1px)) and (background: color-mix(in srgb, red, blue)) {
          .login-card { background: color-mix(in srgb, var(--surface) 70%, transparent); border-color: color-mix(in srgb, var(--border) 60%, transparent);
                        -webkit-backdrop-filter: blur(18px) saturate(150%); backdrop-filter: blur(18px) saturate(150%);
                        box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 35%, transparent), var(--shadow-lg); }
          .login-info { -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); }
        }
        @media (max-width: 768px) {
          .login-brand { display: none; }
          .login-mobile-brand { display: flex; }
          .login-card { padding: 24px; }
        }
      `}</style>

      {/* Brand panel */}
      <div className="login-brand">
        <Logo size={72} />
        <h1 style={{ margin: '24px 0 8px', fontSize: '26px', fontWeight: '600', lineHeight: '1.3' }}>
          {biz.business_name || t('shell.yourBusiness')}
        </h1>
        {biz.motto && <p style={{ fontSize: '15px', opacity: 0.8, lineHeight: '1.5' }}>{biz.motto}</p>}

        {(biz.address || biz.phone) && (
          <div className="login-info">
            {biz.address && <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><MapPin size={16} strokeWidth={1.75} /> {biz.address}</div>}
            {biz.phone && <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Phone size={16} strokeWidth={1.75} /> {biz.phone}</div>}
          </div>
        )}

        <p style={{ position: 'absolute', bottom: '24px', left: '64px', fontSize: '12px', opacity: 0.55 }}>
          {t('login.poweredBy')}
        </p>
      </div>

      {/* Form panel */}
      <div className="login-form-wrap">
        <div className="login-blob" style={{ width: '340px', height: '340px', top: '-100px', right: '-80px' }} />
        <div className="login-blob" style={{ width: '300px', height: '300px', bottom: '-110px', left: '-60px' }} />
        <div style={{ width: '100%', maxWidth: '400px', position: 'relative', zIndex: 1 }}>
          {/* Simu: brand juu ya fomu kwa sababu panel ya kushoto imefichwa */}
          <div className="login-mobile-brand">
            <div style={{ border: '1px solid var(--border)', borderRadius: '8px' }}><Logo size={44} /></div>
            <span style={{ fontSize: '16px', fontWeight: '600' }}>{biz.business_name || t('shell.yourBusiness')}</span>
          </div>

          <div className="login-card">
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '4px' }}>{t('login.signIn')}</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>{t('login.enterDetails')}</p>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="login-email">{t('login.email')}</label>
                <input id="login-email" className="form-input" type="email" autoComplete="username" autoFocus required
                  value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="admin@example.com" style={{ height: '42px' }} />
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label" htmlFor="login-password">{t('login.password')}</label>
                <div style={{ position: 'relative' }}>
                  <input id="login-password" className="form-input" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required
                    value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" style={{ height: '42px', paddingRight: '40px' }} />
                  <button type="button" className="pw-toggle" onClick={() => setShowPassword(s => !s)} aria-label={showPassword ? t('login.hidePw') : t('login.showPw')}>
                    {showPassword ? <EyeOff size={18} strokeWidth={1.75} /> : <Eye size={18} strokeWidth={1.75} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn-primary btn-lg btn-block" disabled={loading}>
                {loading ? t('login.signingIn') : t('login.signIn')}
              </button>
            </form>
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <button
                type="button"
                className="btn"
                aria-expanded={showForgotPasswordHelp}
                aria-controls="forgot-password-help"
                onClick={() => setShowForgotPasswordHelp(open => !open)}
                style={{ border: 0, background: 'transparent', color: 'var(--primary)', padding: '4px 8px', fontSize: '13px' }}
              >
                Forgot your password?
              </button>
              {showForgotPasswordHelp && (
                <div
                  id="forgot-password-help"
                  role="region"
                  aria-label="Forgot password instructions"
                  style={{ marginTop: '8px', padding: '12px', borderRadius: '8px', background: 'var(--surface-2)', border: '1px solid var(--border)', textAlign: 'left', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}
                >
                  <p style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>How to get back into your account</p>
                  <p>If you are a staff member, contact your business administrator. They can set a temporary password from Settings → Users. Sign in with it, then choose a new password.</p>
                  <p style={{ marginTop: '8px' }}>If you are the administrator, contact your POS provider to verify your account and reset your password. Do not share your current password with anyone.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
