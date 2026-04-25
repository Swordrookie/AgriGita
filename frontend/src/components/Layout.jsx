import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import { useLanguage } from '../context/LanguageContext'
import VoiceAssistant from './VoiceAssistant'
import LiveChat from './LiveChat'
import { useState, useEffect } from 'react'
import { alertAPI } from '../api/services'

export default function Layout() {
  const { user, logout } = useAuth()
  const { socket, connected } = useSocket()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [unreadCount, setUnreadCount] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [criticalAlert, setCriticalAlert] = useState(null)
  const [isLightMode, setIsLightMode] = useState(false)

  const toggleTheme = () => {
    setIsLightMode(!isLightMode)
    document.documentElement.setAttribute('data-theme', !isLightMode ? 'light' : 'dark')
  }

  useEffect(() => {
    const fetchUnread = () => alertAPI.getUnreadCount().then(r => setUnreadCount(r.data.unread_count)).catch(() => {})
    fetchUnread()
    const interval = setInterval(fetchUnread, 10000)
    
    const handleAlertsRead = () => setUnreadCount(0)
    window.addEventListener('alerts_read', handleAlertsRead)

    return () => {
      clearInterval(interval)
      window.removeEventListener('alerts_read', handleAlertsRead)
    }
  }, [])

  useEffect(() => {
    if (!socket) return
    const handleNewAlert = (alertData) => {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(600, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1)
        gain.gain.setValueAtTime(0.3, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2)
        osc.start()
        osc.stop(ctx.currentTime + 0.2)
      } catch(e) {}
      
      setUnreadCount(prev => prev + 1)
      if (alertData?.severity === 'critical' || alertData?.severity === 'warning') {
        setCriticalAlert(alertData.message)
        setTimeout(() => setCriticalAlert(null), 6000)
      }
    }
    socket.on('new_alert', handleNewAlert)
    return () => socket.off('new_alert', handleNewAlert)
  }, [socket])

  const handleLogout = () => { logout(); navigate('/login') }
  const initials = user?.full_name ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase() : user?.username?.[0]?.toUpperCase() || 'U'

  const navItems = [
    { to: '/', icon: '🛖', label: t('dashboard'), end: true },
    { to: '/valves', icon: '🚰', label: t('valves') },
    { to: '/wells', icon: '💦', label: t('wells') },
    { to: '/map', icon: '📍', label: t('live_map') },
    { to: '/pipelines', icon: '〰️', label: t('pipelines') },
  ]
  const toolItems = [
    { to: '/ai', icon: '🌱', label: t('ai_suggestions') },
    { to: '/detection', icon: '🔬', label: 'Disease Scan' },
    { to: '/orders', icon: '📦', label: 'Orders' },
    { to: '/alerts', icon: '📢', label: t('alerts'), showDot: unreadCount > 0 },
    { to: '/profile', icon: '🧑‍🌾', label: t('profile') },
    { to: '/settings', icon: '⚙️', label: 'Settings' },
    { to: '/admin', icon: '🛡️', label: 'Admin Panel' },
  ]

  return (
    <div className="app-layout">
      {/* Mobile overlay - click to close sidebar */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99, backdropFilter: 'blur(2px)' }} />
      )}

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <img src="/logo.png" alt="AgriGita Logo" style={{ width: '36px', height: '36px', objectFit: 'contain', flexShrink: 0 }} />
          <div className="sidebar-brand-text">
            <h1>AgriGita</h1>
            <span>Smart Agriculture</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-title">{t('main_menu')}</div>
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}>
              <span className="icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}

          <div className="nav-section-title">{t('tools')}</div>
          {toolItems.map(item => (
            <NavLink key={item.to} to={item.to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}>
              <span className="icon">{item.icon}</span>
              {item.label}
              {item.showDot && <span className="alert-dot" />}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user" onClick={handleLogout} title="Click to logout">
            <div className="sidebar-user-avatar" style={{ overflow: 'hidden', flexShrink: 0 }}>
              {user?.profile_image ? (
                <img src={user.profile_image} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                initials
              )}
            </div>
            <div className="sidebar-user-info" style={{ overflow: 'hidden' }}>
              <div className="name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.full_name || user?.username}</div>
              <div className="role">
                {connected ? '🟢 Online' : '🔴 Offline'}
              </div>
            </div>
            <span style={{ fontSize: '1.1rem', cursor: 'pointer', flexShrink: 0 }}>🚪</span>
          </div>
        </div>
      </aside>

      <div className="main-content">
        <header className="header">
          <button className="btn btn-icon btn-outline" onClick={() => setSidebarOpen(!sidebarOpen)} id="menu-toggle">
            ☰
          </button>
          <div className="header-title">AgriGita: AI-Powered Smart Agriculture</div>
          <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="notification-badge" onClick={toggleTheme} title="Toggle Theme" style={{ fontSize: '1.2rem' }}>
              {isLightMode ? '🌙' : '☀️'}
            </div>
            <div className="notification-badge" onClick={() => navigate('/alerts')} id="header-alerts">
              🔔
              {unreadCount > 0 && <span className="count">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </div>
            
            <div 
              style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: 'var(--bg-card-hover)', border: '2px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s', alignSelf: 'center' }}
              onClick={() => navigate('/profile')}
              title="View Profile"
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)' }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
            >
              {user?.profile_image ? (
                <img src={user.profile_image} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{initials}</span>
              )}
            </div>
          </div>
        </header>
        <div className="page-content">
          <Outlet />
        </div>
      </div>
      <LiveChat />
      <VoiceAssistant />

      {criticalAlert && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(2ef, 68, 68, 0.95)',
          background: 'var(--gradient-amber)',
          color: 'white',
          padding: '16px 24px',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(239, 68, 68, 0.4)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          animation: 'slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          cursor: 'pointer'
        }} onClick={() => { setCriticalAlert(null); navigate('/alerts'); }}>
          <span style={{ fontSize: '1.5rem', animation: 'pulse 1s infinite' }}>🚨</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>SYSTEM ALERT</div>
            <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>{criticalAlert}</div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from { top: -100px; opacity: 0; }
          to { top: 20px; opacity: 1; }
        }
      `}</style>
    </div>
  )
}
