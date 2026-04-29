import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { login as loginApi } from '../services/api'
import toast from 'react-hot-toast'
import logo from '../assets/logo.png'

const Login = () => {
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await loginApi(form)
      login(res.data.token, res.data.user)
      toast.success(`Karibu ${res.data.user.name}! 🎉`)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Imeshindwa kuingia')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated background circles */}
      <div style={{ position: 'absolute', top: '-100px', left: '-100px', width: '300px', height: '300px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', animation: 'float 6s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', bottom: '-150px', right: '-150px', width: '400px', height: '400px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', animation: 'float 8s ease-in-out infinite' }} />

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
      `}</style>

      <div style={{ 
        background: 'white', 
        padding: '50px 45px', 
        borderRadius: '20px', 
        width: '100%', 
        maxWidth: '420px', 
        boxShadow: '0 30px 60px rgba(0,0,0,0.3)',
        position: 'relative',
        zIndex: 1
      }}>
       <div style={{ textAlign: 'center', marginBottom: '35px' }}>
  <div style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', padding: '20px', borderRadius: '16px', marginBottom: '20px' }}>
    <img src={logo} alt="PIUS HARDWARE" style={{ width: '160px' }} />
  </div>
  <h1 style={{ 
    margin: '0 0 8px', 
    fontSize: '28px',
    fontWeight: '700',
    color: '#1e1e2e'
  }}>
    PIUS HARDWARE
  </h1>
  <p style={{ margin: 0, color: '#888', fontSize: '14px', fontWeight: '500' }}>Ingia kwenye system yako</p>
</div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '22px' }}>
            <label style={{ display: 'block', marginBottom: '10px', color: '#333', fontWeight: '600', fontSize: '14px' }}>📧 Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="admin@hardware.com"
              style={{ 
                width: '100%', 
                padding: '14px 16px', 
                border: '2px solid #e5e7eb', 
                borderRadius: '12px', 
                boxSizing: 'border-box', 
                fontSize: '14px',
                fontWeight: '500'
              }}
              required
            />
          </div>

          <div style={{ marginBottom: '30px' }}>
            <label style={{ display: 'block', marginBottom: '10px', color: '#333', fontWeight: '600', fontSize: '14px' }}>🔒 Password</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              style={{ 
                width: '100%', 
                padding: '14px 16px', 
                border: '2px solid #e5e7eb', 
                borderRadius: '12px', 
                boxSizing: 'border-box', 
                fontSize: '14px',
                fontWeight: '500'
              }}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ 
              width: '100%', 
              padding: '16px', 
              background: loading ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
              color: 'white', 
              border: 'none', 
              borderRadius: '12px', 
              cursor: loading ? 'not-allowed' : 'pointer', 
              fontSize: '16px', 
              fontWeight: '700',
              letterSpacing: '0.5px',
              boxShadow: loading ? 'none' : '0 4px 15px rgba(102, 126, 234, 0.4)'
            }}
          >
            {loading ? '⏳ Inapakia...' : '✓ Ingia Sasa'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login