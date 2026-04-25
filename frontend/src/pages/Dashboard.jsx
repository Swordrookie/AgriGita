import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { dashboardAPI } from '../api/services'
import { useSocket } from '../context/SocketContext'
import { useLanguage } from '../context/LanguageContext'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'

export default function Dashboard() {
  const { t } = useLanguage()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const { socket } = useSocket()
  const navigate = useNavigate()
  const [weather, setWeather] = useState(null)

  const fetchWeather = async () => {
    try {
      // Standard professional weather integration
      const API_KEY = 'dcb2a3d860040542778f5d4a1e693aa6'
      const city = 'Bangalore,IN' // Focusing on Karnataka, India
      const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`)
      const data = await res.json()
      if (data.cod === 200) {
        setWeather(data)
      } else {
        throw new Error(data.message)
      }
    } catch (err) {
      // Professional fallback: Simulated micro-climate for Karnataka fields
      setWeather({
        main: { temp: 28.5, humidity: 62 },
        wind: { speed: 4.2 },
        weather: [{ description: 'sunny (Karnataka fallback)', icon: '01d' }],
        simulated: true
      })
    }
  }

  const exportToCSV = () => {
    if (!stats?.water_by_day) return
    const headers = ['Date', 'Water Volume (L)']
    const dataRows = stats.water_by_day.map(d => [d.date, d.volume])
    const csvContent = [headers, ...dataRows].map(e => e.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `agri_water_usage_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const fetchStats = async () => {
    try {
      const res = await dashboardAPI.getStats()
      setStats(res.data.stats)
    } catch (err) {
      console.error('Failed to load stats:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    fetchWeather()
    const interval = setInterval(fetchStats, 15000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!socket) return
    socket.on('valve_toggle', () => fetchStats())
    socket.on('new_alert', () => fetchStats())
    return () => {
      socket.off('valve_toggle')
      socket.off('new_alert')
    }
  }, [socket])

  const isMetric = localStorage.getItem('units') !== 'imperial'
  
  const formatValue = (val, type) => {
    if (type === 'water') {
      const displayVal = isMetric ? val : (val * 0.264172).toFixed(1)
      return `${displayVal} ${isMetric ? 'L' : 'Gal'}`
    }
    return val
  }

  if (loading) return <div className="loading-container"><div className="loading-spinner" /></div>

  const statCards = [
    { label: t('total_valves'), value: stats?.total_valves || 0, icon: '🔧', color: 'blue', link: '/valves' },
    { label: t('active_valves'), value: stats?.active_valves || 0, icon: '✅', color: 'green', link: '/valves' },
    { label: t('inactive_valves'), value: stats?.inactive_valves || 0, icon: '⏸️', color: 'amber', link: '/valves' },
    { label: t('total_wells'), value: stats?.total_wells || 0, icon: '💧', color: 'cyan', link: '/wells' },
    { label: t('water_used'), value: formatValue(stats?.total_water_used || 0, 'water'), icon: '📊', color: 'purple', link: '/dashboard' },
    { label: t('unread_alerts'), value: stats?.unread_alerts || 0, icon: '🔔', color: 'red', link: '/alerts' },
  ]

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
      return (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 14px', fontSize: '0.82rem' }}>
          <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>{label}</div>
          <div style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{formatValue(payload[0].value, 'water')}</div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('dashboard')}</h1>
          <p className="page-subtitle">Real-time overview of your irrigation system</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-outline" onClick={exportToCSV}>📥 Export Usage CSV</button>
        </div>
      </div>

      <div className="stats-grid">
        {statCards.map((card, i) => (
          <div key={i} className={`stat-card ${card.color}`}
            style={{ cursor: 'pointer' }}
            onClick={() => navigate(card.link)}>
            <div className="stat-card-header">
              <div className="stat-card-icon">{card.icon}</div>
              <span className="stat-card-label">{card.label}</span>
            </div>
            <div className="stat-card-value">{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '28px' }}>
        {/* Water Usage Chart */}
        <div className="chart-card">
          <div className="chart-title">{t('water_usage_chart')}</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={stats?.water_by_day || []}>
              <defs>
                <linearGradient id="waterGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.05)' }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.05)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="volume" stroke="#06b6d4" strokeWidth={2.5} fill="url(#waterGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Local Field Weather */}
        <div className="chart-card">
          <div className="chart-title">🌦️ Local Field Weather</div>
          {weather ? (
            <div className="fade-in" style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img src={`https://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`} alt="weather"
                     style={{ width: '60px', height: '60px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />
                <div>
                  <div style={{ fontSize: '2rem', fontWeight: 800 }}>{Math.round(weather.main.temp)}°C</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                    {weather.weather[0].description}
                    {weather.simulated && <span style={{ fontSize: '0.6rem', background: 'var(--accent-amber-glow)', color: 'var(--accent-amber)', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px' }}>SIMULATED</span>}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Humidity</div>
                  <div style={{ fontSize: '1rem', fontWeight: 600 }}>{weather.main.humidity}%</div>
                </div>
                <div style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Wind</div>
                  <div style={{ fontSize: '1rem', fontWeight: 600 }}>{weather.wind.speed} m/s</div>
                </div>
              </div>
              {weather.main.temp > 30 && (
                <div style={{ width: '100%', fontSize: '0.75rem', color: 'var(--accent-amber)', background: 'var(--accent-amber-glow)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.2)' }}>
                  ⚠️ High temp detected. Increasing evaporation rate.
                </div>
              )}
            </div>
          ) : (
            <div className="loading-spinner" />
          )}
        </div>

        <div className="chart-card" style={{ gridColumn: 'span 3' }}>
          <div className="chart-title">{t('recent_alerts')}</div>
          {stats?.recent_alerts?.length > 0 ? (
            <div className="alert-list">
              {stats.recent_alerts.map(alert => (
                <div key={alert.id} className={`alert-item ${alert.severity} ${!alert.is_read ? 'unread' : ''}`}
                  onClick={() => navigate('/alerts')}>
                  <div className={`alert-icon ${alert.severity}`}>
                    {alert.severity === 'critical' ? '🔴' : alert.severity === 'warning' ? '🟡' : '🔵'}
                  </div>
                  <div className="alert-content">
                    <div className="alert-message">{alert.message}</div>
                    <div className="alert-time">{new Date(alert.created_at).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="icon">✅</div>
              <h3>{t('all_clear')}</h3>
              <p>No recent alerts</p>
            </div>
          )}
        </div>
      </div>

      {stats?.damaged_valves > 0 && (
        <div className="card" style={{ borderColor: 'rgba(239,68,68,0.3)', marginTop: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.5rem' }}>⚠️</span>
            <div>
              <strong style={{ color: 'var(--accent-red)' }}>{stats.damaged_valves} Damaged Valve{stats.damaged_valves > 1 ? 's' : ''}</strong>
              <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Some valves need attention. <span style={{ color: 'var(--accent-blue)', cursor: 'pointer' }}
                onClick={() => navigate('/ai')}>View replacement suggestions →</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
