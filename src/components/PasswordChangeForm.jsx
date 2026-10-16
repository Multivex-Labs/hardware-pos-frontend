import { useState } from 'react'
import toast from 'react-hot-toast'
import { changePassword } from '../services/api'
import { useAuth } from '../context/AuthContext'

const PasswordChangeForm = ({ required = false, onSuccess, onCancel }) => {
  const { updateUser } = useAuth()
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (form.newPassword !== form.confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    setSaving(true)
    try {
      await changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword })
      updateUser({ must_change_password: false })
      toast.success('Password changed successfully')
      onSuccess?.()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={required ? { padding: '24px' } : { padding: '16px 20px 20px' }}>
      <div className="form-group">
        <label className="form-label" htmlFor="current-password">Current password</label>
        <input
          id="current-password"
          className="form-input"
          type="password"
          autoComplete="current-password"
          value={form.currentPassword}
          onChange={event => setForm(current => ({ ...current, currentPassword: event.target.value }))}
          maxLength={128}
          required
        />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="new-password">New password</label>
        <input
          id="new-password"
          className="form-input"
          type="password"
          autoComplete="new-password"
          value={form.newPassword}
          onChange={event => setForm(current => ({ ...current, newPassword: event.target.value }))}
          minLength={8}
          maxLength={128}
          required
        />
        <p className="form-hint">Use at least 8 characters.</p>
      </div>
      <div className="form-group" style={{ marginBottom: required ? 0 : undefined }}>
        <label className="form-label" htmlFor="confirm-password">Confirm new password</label>
        <input
          id="confirm-password"
          className="form-input"
          type="password"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={event => setForm(current => ({ ...current, confirmPassword: event.target.value }))}
          minLength={8}
          maxLength={128}
          required
        />
      </div>
      <div className="modal-actions sticky">
        {onCancel && <button type="button" className="btn" onClick={onCancel}>Cancel</button>}
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving...' : 'Change password'}
        </button>
      </div>
    </form>
  )
}

export default PasswordChangeForm
