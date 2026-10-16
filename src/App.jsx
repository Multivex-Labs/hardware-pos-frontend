import { AuthProvider, useAuth } from './context/AuthContext'
import { LanguageProvider } from './context/LanguageContext'
import Login from './pages/login.jsx'
import ChangePassword from './pages/ChangePassword.jsx'
import Layout from './components/layout/layout.jsx'
import { Toaster } from 'react-hot-toast'
import SplashScreen from './components/SplashScreen'

const AppContent = () => {
  const { user, loading } = useAuth()

  if (loading) return <SplashScreen />
  if (!user) return <Login />
  return user.must_change_password ? <ChangePassword required /> : <Layout />
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
