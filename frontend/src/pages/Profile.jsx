import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../api/services'
import { useLanguage } from '../context/LanguageContext'

export default function Profile() {
  const { user, updateUser } = useAuth()
  const { lang, changeLanguage, t } = useLanguage()
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', language: 'en', profile_image: '', land_details: '' })
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      setForm({
        full_name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
        language: user.language || 'en',
        profile_image: user.profile_image || '',
        land_details: user.land_details || ''
      })
    }
  }, [user])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMsg('')
    setError('')
    setLoading(true)
    try {
      const res = await authAPI.updateProfile(form)
      updateUser(res.data.user)
      changeLanguage(form.language)
      setMsg('Profile updated successfully!')
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile.')
    } finally {
      setLoading(false)
    }
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image is too large. Please select an image under 5MB.')
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        // Compress Image using Canvas
        const img = new Image()
        img.src = reader.result
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const MAX_WIDTH = 256
          const MAX_HEIGHT = 256
          let width = img.width
          let height = img.height

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width
              width = MAX_WIDTH
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height
              height = MAX_HEIGHT
            }
          }

          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, width, height)
          
          // Export as compressed jpeg (quality 0.7) to save huge amounts of space
          const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.7)
          setForm(p => ({ ...p, profile_image: resizedDataUrl }))
        }
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('profile') || 'User Profile'}</h1>
          <p className="page-subtitle">Manage your account settings and preferences</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', padding: '12px 16px', marginBottom: '24px', fontSize: '0.85rem' }}>
          <strong>ℹ️ About your Profile:</strong> This information is securely synced across your local farm nodes. Updating your language preference here instantly changes the interface, and your Land Details are used by AI to generate customized irrigation advice.
        </div>
        {msg && <div style={{ background: 'var(--accent-green-glow)', color: 'var(--accent-green)', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem' }}>{msg}</div>}
        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--bg-card-hover)', border: '2px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
              {form.profile_image ? (
                <img src={form.profile_image} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '2rem', color: 'var(--text-muted)' }}>👤</span>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label">Profile Image</label>
              <input type="file" accept="image/*" className="form-input" onChange={handleImageChange} style={{ padding: '8px' }} />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Max 5MB. Auto-compressed and stored securely.</p>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">🌐 Interface Language</label>
            <select className="form-input" value={form.language} onChange={e => { setForm(p => ({ ...p, language: e.target.value })); changeLanguage(e.target.value) }}>
              <option value="en">English</option>
              <option value="hi">हिंदी (Hindi)</option>
              <option value="mr">मराठी (Marathi)</option>
              <option value="ta">தமிழ் (Tamil)</option>
              <option value="te">తెలుగు (Telugu)</option>
              <option value="kn">ಕನ್ನಡ (Kannada)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input type="text" className="form-input" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input type="email" className="form-input" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input type="tel" className="form-input" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Farm / Land Details</label>
            <textarea className="form-input" rows="3" value={form.land_details} onChange={e => setForm(p => ({ ...p, land_details: e.target.value }))} placeholder="E.g. 5 Acres, Loamy Soil, North Zone..." />
          </div>

          <div style={{ marginTop: '24px' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
