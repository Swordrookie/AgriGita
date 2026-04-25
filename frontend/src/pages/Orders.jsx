import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function OrderHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await axios.get('/api/orders/history');
        setOrders(response.data);
      } catch (err) {
        console.error('Failed to fetch orders');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  return (
    <div className="orders-container">
      <header className="page-header">
        <h1 className="header-title">Treatment Order Tracking</h1>
      </header>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '100px' }}>
          <div className="loading-spinner" />
          <p style={{ marginTop: '20px', color: 'var(--text-muted)' }}>Retrieving your delivery records...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
          <span style={{ fontSize: '4rem' }}>📦</span>
          <h2 style={{ marginTop: '20px' }}>No Orders Yet</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Orders placed via the AI Disease Scanner will appear here.</p>
        </div>
      ) : (
        <div className="orders-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {orders.map(order => (
            <div key={order.id} className="card" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', color: 'var(--accent-blue)' }}>{order.product}</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Order ID: {order.id}</p>
                </div>
                <div style={{ 
                  backgroundColor: 'var(--accent-green-glow)', 
                  color: 'var(--accent-green)', 
                  padding: '6px 12px', 
                  borderRadius: '20px', 
                  fontSize: '0.75rem', 
                  fontWeight: '700' 
                }}>
                  {order.status}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '40px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Price</label>
                  <div style={{ fontWeight: '700', fontSize: '1.2rem' }}>${order.price}</div>
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Dispatch Time</label>
                  <div style={{ fontSize: '0.9rem' }}>{new Date(order.timestamp).toLocaleString()}</div>
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>GPS Target</label>
                  <div style={{ fontSize: '0.9rem', color: 'var(--accent-cyan)' }}>
                    📍 {order.location.lat.toFixed(4)}, {order.location.lng.toFixed(4)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
