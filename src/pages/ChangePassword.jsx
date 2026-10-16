import { useAuth } from '../context/AuthContext'
import PasswordChangeForm from '../components/PasswordChangeForm'

const ChangePassword = ({ required = false }) => {
  const { user, logout } = useAuth()

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px', background: 'var(--bg)', color: 'var(--text)' }}>
      <section className="card" style={{ width: '100%', maxWidth: '480px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '8px' }}>
          {required ? 'Set a new password' : 'Change password'}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.6 }}>
          {required
            ? `Welcome${user?.name ? `, ${user.name}` : ''}. For your account security, change the temporary password before using the POS.`
            : 'Enter your current password and choose a new password for your account.'}
        </p>
        <PasswordChangeForm required={required} />
        {required && (
          <div style={{ padding: '0 24px 20px', textAlign: 'right' }}>
            <button className="btn" type="button" onClick={logout}>Log out</button>
          </div>
        )}
      </section>
    </main>
  )
}

export default ChangePassword
