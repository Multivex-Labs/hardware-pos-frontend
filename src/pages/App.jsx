import { AuthProvider, useAuth } from './context/AuthContext'
import { LanguageProvider } from './context/LanguageContext'
import Login from './pages/login.jsx'
import Layout from './components/layout/layout.jsx'
import { Toaster } from 'react-hot-toast'

const AppContent = () => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1e1e2e' }}>
        <h2 style={{ color: 'white' }}>Loading...</h2>
      </div>
    )
  }

  return user ? <Layout /> : <Login />
}

const App = () => {
  return (
    <LanguageProvider>
      <AuthProvider>
        <Toaster position="top-right" />
        <AppContent />
      </AuthProvider>
    </LanguageProvider>
  )
}

export default App
