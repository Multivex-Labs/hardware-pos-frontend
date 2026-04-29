import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Layout from './components/layout/Layout'
import { Toaster } from 'react-hot-toast'

const AppContent = () => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1e1e2e' }}>
        <h2 style={{ color: 'white' }}>Inapakia...</h2>
      </div>
    )
  }

  return user ? <Layout /> : <Login />
}

const App = () => {
  return (
    <AuthProvider>
      <Toaster position="top-right" />
      <AppContent />
    </AuthProvider>
  )
}

export default App