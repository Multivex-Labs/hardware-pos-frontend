import { AuthProvider, useAuth } from './context/AuthContext'
import { LanguageProvider } from './context/LanguageContext'
import Login from './pages/login.jsx'
import Layout from './components/layout/layout.jsx'
import { Toaster } from 'react-hot-toast'
import SplashScreen from './components/SplashScreen'

const AppContent = () => {
  const { user, loading } = useAuth()

  if (loading) return <SplashScreen />
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
