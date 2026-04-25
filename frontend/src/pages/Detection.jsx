import React, { useState } from 'react';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';

export default function Detection() {
  const { t, lang } = useLanguage();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setResults(null);
  };

  const analyzeImage = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('image', file);
    formData.append('lang', lang);

    try {
      const response = await axios.post('/api/detection/analyze', formData);
      setResults(response.data);
    } catch (err) {
      console.error(err);
      alert('Failed to connect to YOLOv8 engine.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="detection-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <header className="page-header">
        <h1 className="header-title">{t('plant_health')} (YOLOv8)</h1>
      </header>

      <div className="card" style={{ padding: '30px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
          {t('ai_suggestions')}
        </p>

        <div 
          style={{ 
            height: '250px', 
            border: '2px dashed var(--border-color)', 
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            overflow: 'hidden',
            backgroundColor: 'var(--bg-primary)'
          }}
          onClick={() => document.getElementById('file-input').click()}
        >
          {preview ? (
            <img src={preview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          ) : (
            <div style={{ color: 'var(--text-muted)' }}>
              <span style={{ fontSize: '3rem', display: 'block' }}>📸</span>
              {t('run_diagnostic')}
            </div>
          )}
        </div>

        <input 
          id="file-input" 
          type="file" 
          hidden 
          onChange={handleFileChange} 
          accept="image/*" 
        />

        {file && !results && (
          <button 
            className="btn btn-primary" 
            style={{ marginTop: '24px', width: '100%', padding: '15px' }}
            onClick={analyzeImage}
            disabled={loading}
          >
            {loading ? '...' : t('run_diagnostic')}
          </button>
        )}
      </div>

      {results && (
        <div className="card" style={{ marginTop: '30px', borderLeft: '4px solid var(--accent-green)' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '20px' }}>{t('plant_health')} Analysis</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {results.detections.length > 0 ? (
              results.detections.map((det, i) => (
                <div key={i} style={{ padding: '15px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <strong style={{ color: 'var(--accent-red)', textTransform: 'uppercase' }}>{det.class}</strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Match: {(det.confidence * 100).toFixed(1)}%</span>
                  </div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    <strong>💡 AI:</strong> {det.advice}
                  </p>
                  {det.product && (
                    <button className="btn btn-xs btn-outline" style={{ marginTop: '10px' }}>
                      {t('buy_treatment')}: {det.product}
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--accent-green)' }}>
                {t('no_disease')} 🌱
              </div>
            )}
          </div>
          <button 
            className="btn btn-outline" 
            style={{ marginTop: '20px', width: '100%' }}
            onClick={() => { 
              setFile(null); 
              setPreview(null); 
              setResults(null);
              const input = document.getElementById('file-input');
              if (input) input.value = '';
            }}
          >
            {t('run_diagnostic')} Again
          </button>
        </div>
      )}
    </div>
  );
}
