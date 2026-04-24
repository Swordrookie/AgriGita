import { useState, useEffect } from 'react'

const getWeatherDescription = (code, isDay) => {
  const codes = {
    0: { desc: 'Clear Sky', icon: isDay ? '☀️' : '🌙' },
    1: { desc: 'Mainly Clear', icon: isDay ? '🌤️' : '🌙' },
    2: { desc: 'Partly Cloudy', icon: '⛅' },
    3: { desc: 'Overcast', icon: '☁️' },
    45: { desc: 'Foggy', icon: '🌫️' },
    48: { desc: 'Depositing Rime Fog', icon: '🌫️' },
    51: { desc: 'Light Drizzle', icon: '🌧️' },
    53: { desc: 'Moderate Drizzle', icon: '🌧️' },
    55: { desc: 'Dense Drizzle', icon: '🌧️' },
    61: { desc: 'Slight Rain', icon: '🌦️' },
    63: { desc: 'Moderate Rain', icon: '🌧️' },
    65: { desc: 'Heavy Rain', icon: '🌧️' },
    71: { desc: 'Slight Snow', icon: '🌨️' },
    73: { desc: 'Moderate Snow', icon: '❄️' },
    75: { desc: 'Heavy Snow', icon: '❄️' },
    80: { desc: 'Rain Showers', icon: '🌦️' },
    81: { desc: 'Moderate Showers', icon: '🌧️' },
    82: { desc: 'Violent Showers', icon: '⛈️' },
    95: { desc: 'Thunderstorm', icon: '🌩️' },
    96: { desc: 'Thunderstorm with Hail', icon: '⛈️' },
    99: { desc: 'Heavy Hail Thunderstorm', icon: '⛈️' },
  }
  return codes[code] || { desc: 'Unknown', icon: '🌡️' }
}

export default function WeatherWidget({ lat, lng }) {
  const [weather, setWeather] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!lat || !lng) return

    setLoading(true)
    setError(false)

    // Delay slightly to prevent spamming the API when dragging the map continuously
    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`)
        const data = await response.json()
        if (data.current_weather) {
          setWeather(data.current_weather)
        } else {
          setError(true)
        }
      } catch (err) {
        console.error("Failed to fetch weather:", err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }, 800)

    return () => clearTimeout(timeoutId)
  }, [lat, lng])

  if (error) return null

  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      right: '20px',
      zIndex: 1000, // Leaflet needs high z-index to overlay
      background: 'rgba(255, 255, 255, 0.85)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.4)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
      borderRadius: '16px',
      padding: '12px 18px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      fontFamily: 'Inter, sans-serif',
      transition: 'all 0.3s ease',
      color: '#1e293b'
    }}>
      {loading ? (
        <div style={{ fontSize: '0.9rem', color: '#64748b', fontStyle: 'italic' }}>Tracking weather...</div>
      ) : weather ? (
        <>
          <div style={{ fontSize: '2.2rem', lineHeight: 1 }}>
            {getWeatherDescription(weather.weathercode, weather.is_day).icon}
          </div>
          <div>
            <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#0f172a' }}>
              {weather.temperature}°C
            </div>
            <div style={{ fontSize: '0.8rem', fontWeight: '500', color: '#475569' }}>
              {getWeatherDescription(weather.weathercode, weather.is_day).desc}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
              🌬️ {weather.windspeed} km/h
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
