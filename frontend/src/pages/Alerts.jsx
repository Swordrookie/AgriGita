import { useState, useEffect } from 'react'
import { alertAPI } from '../api/services'
import { useSocket } from '../context/SocketContext'

const SEV_CONFIG = {
  critical: { color: '#ef4444', bg: '#fef2f2', darkBg: 'rgba(239,68,68,0.1)', emoji: '🔴', label: 'Critical' },
  warning:  { color: '#f59e0b', bg: '#fffbeb', darkBg: 'rgba(245,158,11,0.1)', emoji: '🟡', label: 'Warning' },
  info:     { color: '#3b82f6', bg: '#eff6ff', darkBg: 'rgba(59,130,246,0.1)', emoji: '🔵', label: 'Info' },
}

const TYPE_ICON = {
  valve_failure:   '🔧',
  pipeline_damage: '〰️',
  low_pressure:    '📉',
  low_water:       '💧',
  system:          '⚙️',
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d === 1) return 'Yesterday'
  return `${d}d ago`
}

function groupByDate(alerts) {
  const groups = {}
  alerts.forEach(a => {
    const d = new Date(a.created_at)
    const now = new Date()
    let label
    if (d.toDateString() === now.toDateString()) label = 'Today'
    else {
      const yest = new Date(now); yest.setDate(now.getDate() - 1)
      label = d.toDateString() === yest.toDateString() ? 'Yesterday' : d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
    }
    if (!groups[label]) groups[label] = []
    groups[label].push(a)
  })
  return groups
}

export default function Alerts() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const { socket } = useSocket()

  const fetchAlerts = async () => {
    try {
      const res = await alertAPI.getAll()
      setAlerts(res.data.alerts)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchAlerts() }, [])

  useEffect(() => {
    if (!socket) return
    const handle = (data) => setAlerts(prev => [data.alert, ...prev])
    socket.on('new_alert', handle)
    return () => socket.off('new_alert', handle)
  }, [socket])

  const handleMarkRead = async (id) => {
    try {
      await alertAPI.markRead(id)
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a))
    } catch (err) {}
  }

  const handleMarkAllRead = async () => {
    try {
      await alertAPI.markAllRead()
      setAlerts(prev => prev.map(a => ({ ...a, is_read: true })))
    } catch (err) {}
  }

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    try {
      await alertAPI.delete(id)
      setAlerts(prev => prev.filter(a => a.id !== id))
    } catch (err) {}
  }

  const exportToCSV = () => {
    if (!alerts.length) return
    const rows = [['ID','Severity','Type','Message','Read','Date'],
      ...alerts.map(a => [a.id, a.severity, a.type, `"${a.message.replace(/"/g,'""')}"`, a.is_read, a.created_at])]
    const csv = rows.map(r => r.join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    Object.assign(document.createElement('a'), {
      href: url, download: `alerts_${new Date().toISOString().split('T')[0]}.csv`
    }).click()
  }

  const filtered = alerts.filter(a => {
    if (filter === 'unread') return !a.is_read
    if (filter === 'critical') return a.severity === 'critical'
    if (filter === 'warning') return a.severity === 'warning'
    return true
  })

  const unreadCount = alerts.filter(a => !a.is_read).length
  const groups = groupByDate(filtered)

  if (loading) return <div className="loading-container"><div className="loading-spinner" /></div>

  return (
    <div className="fade-in" style={{ maxWidth: '680px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: '700', margin: 0 }}>Notifications</h1>
          {unreadCount > 0
            ? <p style={{ fontSize: '0.82rem', color: 'var(--accent-blue)', marginTop: '2px', fontWeight: '500' }}>{unreadCount} new</p>
            : <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>All caught up</p>
          }
        </div>
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead}
              style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer', padding: '4px 0' }}>
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Filter chips — scrollable */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px', WebkitOverflowScrolling: 'touch' }}>
        {[
          { key: 'all',      label: `All` },
          { key: 'unread',   label: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
          { key: 'critical', label: '🔴 Critical' },
          { key: 'warning',  label: '🟡 Warning' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setFilter(tab.key)}
            style={{
              whiteSpace: 'nowrap', flexShrink: 0,
              padding: '6px 14px', borderRadius: '20px', border: '1px solid',
              fontSize: '0.8rem', fontWeight: '500', cursor: 'pointer',
              transition: 'all 0.15s',
              background: filter === tab.key ? 'var(--accent-blue)' : 'transparent',
              borderColor: filter === tab.key ? 'var(--accent-blue)' : 'var(--border-color)',
              color: filter === tab.key ? 'white' : 'var(--text-secondary)',
            }}>
            {tab.label}
          </button>
        ))}

        {/* Export — right-aligned chip */}
        <button onClick={exportToCSV}
          style={{
            whiteSpace: 'nowrap', flexShrink: 0, marginLeft: 'auto',
            padding: '6px 14px', borderRadius: '20px',
            border: '1px solid var(--border-color)', background: 'transparent',
            fontSize: '0.8rem', color: 'var(--text-muted)', cursor: 'pointer'
          }}>
          ↓ Export
        </button>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🔔</div>
          <p style={{ fontWeight: '600', fontSize: '1rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>No notifications</p>
          <p style={{ fontSize: '0.85rem' }}>You're all caught up.</p>
        </div>
      )}

      {/* Grouped notification list */}
      {Object.entries(groups).map(([date, items]) => (
        <div key={date} style={{ marginBottom: '24px' }}>
          {/* Date header */}
          <div style={{ fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)', marginBottom: '10px', paddingLeft: '2px' }}>
            {date}
          </div>

          {/* Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {items.map((alert, idx) => {
              const cfg = SEV_CONFIG[alert.severity] || SEV_CONFIG.info
              const isFirst = idx === 0
              const isLast = idx === items.length - 1
              const borderRadius = `${isFirst ? '12px 12px' : '4px 4px'} ${isLast ? '12px 12px' : '4px 4px'}`

              return (
                <div key={alert.id}
                  onClick={() => !alert.is_read && handleMarkRead(alert.id)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: '12px',
                    padding: '12px 14px',
                    background: !alert.is_read ? 'var(--bg-card)' : 'transparent',
                    borderRadius,
                    cursor: !alert.is_read ? 'pointer' : 'default',
                    transition: 'background 0.15s',
                    position: 'relative',
                    borderLeft: !alert.is_read ? `3px solid ${cfg.color}` : '3px solid transparent',
                  }}
                >
                  {/* App icon circle */}
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '12px',
                    background: cfg.darkBg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.3rem', flexShrink: 0, marginTop: '1px'
                  }}>
                    {TYPE_ICON[alert.type] || '📢'}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '2px' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: '700', color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                        {cfg.label}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                        {timeAgo(alert.created_at)}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: '1.45', wordBreak: 'break-word' }}>
                      {alert.message}
                    </p>

                    {/* Actions row */}
                    <div style={{ display: 'flex', gap: '10px', marginTop: '8px', alignItems: 'center' }}>
                      <a href={`https://wa.me/?text=${encodeURIComponent(`*${cfg.label} Alert*\n${alert.message}\n${new Date(alert.created_at).toLocaleString()}`)}`}
                        target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                        style={{
                          fontSize: '0.78rem', fontWeight: '600', color: '#25D366',
                          textDecoration: 'none',
                          display: 'inline-flex', alignItems: 'center', gap: '4px'
                        }}>
                        📤 Share on WhatsApp
                      </a>
                      <button onClick={(e) => handleDelete(alert.id, e)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.76rem', cursor: 'pointer', padding: '3px 6px' }}>
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* Unread dot */}
                  {!alert.is_read && (
                    <div style={{ width: '8px', height: '8px', background: 'var(--accent-blue)', borderRadius: '50%', flexShrink: 0, marginTop: '6px' }} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
