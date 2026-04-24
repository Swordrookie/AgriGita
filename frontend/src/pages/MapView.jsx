import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { valveAPI, wellAPI, pipelineAPI } from '../api/services'
import WeatherWidget from '../components/WeatherWidget'

// Fix leaflet icon issue in Vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const createValveIcon = (status, health) => {
  const color = health === 'damaged' ? '#ef4444' : status ? '#10b981' : '#64748b'
  return L.divIcon({
    className: '',
    html: `<div style="width:32px;height:32px;background:${color};border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.4);">🔧</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })
}

const createWellIcon = () => L.divIcon({
  className: '',
  html: `<div style="width:34px;height:34px;background:#06b6d4;border:3px solid white;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.4);">💧</div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
})

const createSuggestionIcon = () => L.divIcon({
  className: '',
  html: `<div style="width:30px;height:30px;background:#8b5cf6;border:2px dashed white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;opacity:0.85;animation:pulse 2s infinite;">✨</div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
})

function MapEventsHandler({ mode, onMapClick, onMouseMove, onMapMove }) {
  const map = useMapEvents({ 
    click: (e) => { if (mode !== 'none') onMapClick(e.latlng) },
    mousemove: (e) => { if (mode === 'draw-pipeline') onMouseMove(e.latlng) },
    moveend: () => { onMapMove(map.getCenter()) }
  })
  return null
}

export default function MapView() {
  const [valves, setValves] = useState([])
  const [wells, setWells] = useState([])
  const [pipelines, setPipelines] = useState([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('none') // none, add-valve, add-well, draw-pipeline
  const [pipelinePath, setPipelinePath] = useState([])
  const [showPipelineModal, setShowPipelineModal] = useState(false)
  const [pipelineName, setPipelineName] = useState('')
  const [showValveModal, setShowValveModal] = useState(false)
  const [showWellModal, setShowWellModal] = useState(false)
  const [pendingCoords, setPendingCoords] = useState(null)
  const [mousePos, setMousePos] = useState(null)
  const [newName, setNewName] = useState('')
  const [toast, setToast] = useState('')
  const [activeCenter, setActiveCenter] = useState(null)

  useEffect(() => {
    Promise.all([valveAPI.getAll(), wellAPI.getAll(), pipelineAPI.getAll()]).then(([v, w, p]) => {
      setValves(v.data.valves)
      setWells(w.data.wells)
      setPipelines(p.data.pipelines)
    }).finally(() => setLoading(false))
  }, [])

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const handleMapClick = (latlng) => {
    if (mode === 'add-valve') { setPendingCoords(latlng); setShowValveModal(true) }
    else if (mode === 'add-well') { setPendingCoords(latlng); setShowWellModal(true) }
    else if (mode === 'draw-pipeline') { setPipelinePath(prev => [...prev, [latlng.lat, latlng.lng]]) }
  }

  const handleMouseMove = (latlng) => {
    if (mode === 'draw-pipeline' && pipelinePath.length > 0) {
      setMousePos([latlng.lat, latlng.lng])
    }
  }

  const handleUseGPS = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPendingCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
          showToast('✅ Sensor Locked on GPS')
        },
        () => showToast('⚠️ Unable to access GPS')
      )
    } else {
      showToast('⚠️ GPS not supported')
    }
  }

  const handleAddValve = async (e) => {
    e.preventDefault()
    try {
      const res = await valveAPI.create({ name: newName, latitude: pendingCoords.lat, longitude: pendingCoords.lng })
      setValves(prev => [...prev, res.data.valve])
      setShowValveModal(false); setNewName(''); setMode('none')
      showToast('✅ Valve added to map')
    } catch (err) { console.error(err) }
  }

  const handleAddWell = async (e) => {
    e.preventDefault()
    try {
      const res = await wellAPI.create({ name: newName, latitude: pendingCoords.lat, longitude: pendingCoords.lng })
      setWells(prev => [...prev, res.data.well])
      setShowWellModal(false); setNewName(''); setMode('none')
      showToast('✅ Well added to map')
    } catch (err) { console.error(err) }
  }

  const handleSavePipeline = async (e) => {
    e.preventDefault()
    if (pipelinePath.length < 2) { showToast('⚠️ Draw at least 2 points'); return }
    try {
      const res = await pipelineAPI.create({ name: pipelineName, path_data: pipelinePath })
      setPipelines(prev => [...prev, res.data.pipeline])
      setPipelinePath([]); setShowPipelineModal(false); setPipelineName(''); setMode('none')
      showToast('✅ Pipeline saved')
    } catch (err) { console.error(err) }
  }

  const handleToggleValve = async (id) => {
    try {
      const res = await valveAPI.toggle(id)
      setValves(prev => prev.map(v => v.id === id ? res.data.valve : v))
      showToast(res.data.status_text)
    } catch (err) { console.error(err) }
  }

  const center = valves[0] ? [valves[0].latitude, valves[0].longitude]
    : wells[0] ? [wells[0].latitude, wells[0].longitude]
    : [20.5937, 78.9629]

  const displayCenter = activeCenter || { lat: center[0], lng: center[1] }

  const modeLabels = { none: 'View Mode', 'add-valve': '📍 Click map to place valve', 'add-well': '💧 Click map to place well', 'draw-pipeline': '✏️ Click to draw pipeline points' }

  if (loading) return <div className="loading-container"><div className="loading-spinner" /></div>

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Live Farm Map</h1>
          <p className="page-subtitle">Interactive GPS layout of your irrigation system</p>
        </div>
      </div>

      <div className="map-controls">
        <button className={`btn ${mode === 'none' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setMode('none')}>👁️ View</button>
        <button className={`btn ${mode === 'add-valve' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setMode('add-valve')} id="map-add-valve">+ Valve</button>
        <button className={`btn ${mode === 'add-well' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setMode('add-well')} id="map-add-well">+ Well</button>
        <button className={`btn ${mode === 'draw-pipeline' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => { setMode('draw-pipeline'); setPipelinePath([]) }} id="map-draw-pipeline">✏️ Draw Pipeline</button>
        {mode === 'draw-pipeline' && pipelinePath.length >= 2 && (
          <button className="btn btn-success" onClick={() => setShowPipelineModal(true)}>💾 Save Pipeline ({pipelinePath.length} pts)</button>
        )}
        {mode === 'draw-pipeline' && pipelinePath.length > 0 && (
          <>
            <button className="btn" style={{ background: '#f59e0b', color: 'white', border: 'none' }} onClick={() => setPipelinePath(prev => prev.slice(0, -1))}>↩️ Undo</button>
            <button className="btn btn-danger" onClick={() => { setPipelinePath([]); setMousePos(null) }}>✕ Clear</button>
          </>
        )}

        {mode !== 'none' && (
          <div style={{ marginLeft: 'auto', padding: '8px 14px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--accent-blue)', fontWeight: 500 }}>
            {modeLabels[mode]}
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '12px', flexWrap: 'wrap' }}>
        {[
          { color: '#10b981', label: 'Active Valve' },
          { color: '#64748b', label: 'Inactive Valve' },
          { color: '#ef4444', label: 'Damaged Valve' },
          { color: '#06b6d4', label: 'Well', round: false },
          { color: '#3b82f6', label: 'Pipeline (Active)' },
          { color: '#ef4444', label: 'Pipeline (Damaged)' },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            <div style={{ width: '12px', height: '12px', background: item.color, borderRadius: item.round === false ? '3px' : '50%' }} />
            {item.label}
          </div>
        ))}
      </div>

      <div className="map-container" style={{ position: 'relative' }}>
        <WeatherWidget lat={displayCenter.lat} lng={displayCenter.lng} />
        <MapContainer center={center} zoom={16} style={{ height: '100%', width: '100%', zIndex: 1 }}>
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
          />
          <MapEventsHandler mode={mode} onMapClick={handleMapClick} onMouseMove={handleMouseMove} onMapMove={setActiveCenter} />

          {valves.map(valve => (
            <Marker key={`v-${valve.id}`} position={[valve.latitude, valve.longitude]} icon={createValveIcon(valve.status, valve.health)}>
              <Popup>
                <div style={{ minWidth: '180px' }}>
                  <strong>🔧 {valve.name}</strong>
                  <div style={{ marginTop: '8px', fontSize: '13px' }}>
                    <div>Status: <b style={{ color: valve.status ? '#10b981' : '#64748b' }}>{valve.status ? 'Open' : 'Closed'}</b></div>
                    <div>Health: <b>{valve.health}</b></div>
                    <div>Flow: <b>{valve.flow_rate} L/min</b></div>
                  </div>
                  {valve.status && (
                    <div style={{ height: '4px', background: 'rgba(6, 182, 212, 0.1)', borderRadius: '2px', overflow: 'hidden', marginTop: '10px' }}>
                      <div style={{ height: '100%', background: 'linear-gradient(135deg, #10b981, #06b6d4)', animation: 'waterFlow 1.5s ease-in-out infinite' }} />
                    </div>
                  )}
                  <button onClick={() => handleToggleValve(valve.id)}
                    style={{ marginTop: '10px', padding: '6px 12px', background: valve.status ? '#ef4444' : '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, width: '100%' }}>
                    {valve.status ? '⏹ Close Valve' : '▶ Open Valve'}
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}

          {wells.map(well => (
            <Marker key={`w-${well.id}`} position={[well.latitude, well.longitude]} icon={createWellIcon()}>
              <Popup>
                <div style={{ minWidth: '160px' }}>
                  <strong>💧 {well.name}</strong>
                  <div style={{ marginTop: '8px', fontSize: '13px' }}>
                    <div>Depth: <b>{well.depth}m</b></div>
                    <div>Water Level: <b style={{ color: '#06b6d4' }}>{well.water_level}m</b></div>
                    <div>Fill: <b>{well.depth > 0 ? Math.round((well.water_level / well.depth) * 100) : 0}%</b></div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {pipelines.map(p => p.path_data?.length >= 2 && (
            <Polyline key={`p-${p.id}`} positions={p.path_data}
              pathOptions={{
                color: p.status === 'damaged' ? '#ef4444' : p.status === 'inactive' ? '#cbd5e1' : '#38bdf8',
                weight: 8,
                opacity: 0.9,
                dashArray: p.status === 'damaged' ? '8,6' : null,
                className: p.status === 'active' ? 'pipeline-flow-active' : ''
              }}>
              <Popup><strong>🔗 {p.name}</strong><div style={{ fontSize: '13px', marginTop: '6px' }}>Status: <b>{p.status}</b></div></Popup>
            </Polyline>
          ))}

          {pipelinePath.length >= 2 && (
            <Polyline positions={pipelinePath} pathOptions={{ color: '#facc15', weight: 6, dashArray: '10,8', opacity: 0.95 }} />
          )}

          {mode === 'draw-pipeline' && pipelinePath.length > 0 && mousePos && (
            <Polyline positions={[pipelinePath[pipelinePath.length - 1], mousePos]} pathOptions={{ color: '#facc15', weight: 6, dashArray: '4,10', opacity: 0.5 }} />
          )}
        </MapContainer>
      </div>

      {/* Valve Modal */}
      {showValveModal && (
        <div className="modal-overlay" onClick={() => setShowValveModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Add Valve at Location</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>
                📍 {pendingCoords?.lat.toFixed(6)}°, {pendingCoords?.lng.toFixed(6)}°
              </p>
              <button type="button" className="btn btn-sm btn-outline" onClick={handleUseGPS}>🎯 Use My GPS</button>
            </div>
            <form onSubmit={handleAddValve}>
              <div className="form-group">
                <label className="form-label">Valve Name</label>
                <input type="text" className="form-input" value={newName} required
                  onChange={e => setNewName(e.target.value)} placeholder="e.g. Field A Valve" id="map-valve-name" autoFocus />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowValveModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Valve</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Well Modal */}
      {showWellModal && (
        <div className="modal-overlay" onClick={() => setShowWellModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Add Well at Location</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>
                📍 {pendingCoords?.lat.toFixed(6)}°, {pendingCoords?.lng.toFixed(6)}°
              </p>
              <button type="button" className="btn btn-sm btn-outline" onClick={handleUseGPS}>🎯 Use My GPS</button>
            </div>
            <form onSubmit={handleAddWell}>
              <div className="form-group">
                <label className="form-label">Well Name</label>
                <input type="text" className="form-input" value={newName} required
                  onChange={e => setNewName(e.target.value)} placeholder="e.g. North Well" id="map-well-name" autoFocus />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowWellModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Well</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pipeline Modal */}
      {showPipelineModal && (
        <div className="modal-overlay" onClick={() => setShowPipelineModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Save Pipeline</h3>
            <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              📐 {pipelinePath.length} waypoints drawn
            </p>
            <form onSubmit={handleSavePipeline}>
              <div className="form-group">
                <label className="form-label">Pipeline Name</label>
                <input type="text" className="form-input" value={pipelineName} required
                  onChange={e => setPipelineName(e.target.value)} placeholder="e.g. Main Pipeline A" id="pipeline-name-input" autoFocus />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowPipelineModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">💾 Save Pipeline</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', background: 'var(--bg-card)', border: '1px solid var(--accent-blue)', color: 'var(--text-primary)', padding: '12px 24px', borderRadius: 'var(--radius-md)', fontWeight: 500, fontSize: '0.88rem', boxShadow: 'var(--shadow-lg)', animation: 'slideUp 0.3s ease', zIndex: 9999 }}>
          {toast}
        </div>
      )}
    </div>
  )
}
