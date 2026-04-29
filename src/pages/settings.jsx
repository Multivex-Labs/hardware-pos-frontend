import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { register } from '../services/api'
import toast from 'react-hot-toast'

const Settings = () => {
  const { user } = useAuth()
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'cashier' })
  const [loading, setLoading] = useState(false)

  const handleCreateUser = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await register(newUser)
      toast.success('User ameundwa successfully!')
      setNewUser({ name: '', email: '', password: '', role: 'cashier' })
    } catch (error) {
      toast.error(error.response?.data?.message || 'Imeshindwa kuunda user')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 style={{ marginBottom: '30px' }}>Settings</h1>

      {user?.role === 'admin' && (
        <div style={{ background: 'white', padding: '30px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', maxWidth: '500px' }}>
          <h3 style={{ margin: '0 0 20px' }}>Unda User Mpya</h3>
          <form onSubmit={handleCreateUser}>
            {['name', 'email', 'password'].map(field => (
              <div key={field} style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', color: '#666', textTransform: 'capitalize' }}>{field}</label>
                <input
                  type={field === 'password' ? 'password' : 'text'}
                  value={newUser[field]}
                  onChange={e => setNewUser({ ...newUser, [field]: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', boxSizing: 'border-box' }}
                  required
                />
              </div>
            ))}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', color: '#666' }}>Role</label>
              <select
                value={newUser.role}
                onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
              >
                <option value="cashier">Cashier</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '12px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '15px' }}
            >
              {loading ? 'Inaunda...' : 'Unda User'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

export default Settings