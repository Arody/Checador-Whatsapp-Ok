'use client';
import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

type BotStatus = 'connected' | 'disconnected' | 'qr_ready' | 'connecting';

export default function BotManager() {
  const [status, setStatus] = useState<BotStatus>('disconnected');
  const [qr, setQr] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  async function fetchStatus() {
    try {
      const res = await fetch('/api/bot?path=/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data.status);
        if (data.status === 'qr_ready') {
          fetchQR();
        }
      } else {
        // Assume disconnected if api fails (bot likely down)
        setStatus('disconnected');
      }
    } catch (error) {
       // console.error(error);
       setStatus('disconnected');
    }
  }

  async function fetchQR() {
    try {
      const res = await fetch('/api/bot?path=/qr');
      const data = await res.json();
      setQr(data.qr);
    } catch (error) {
      console.error(error);
    }
  }

  async function handleConnect() {
    setLoading(true);
    try {
      await fetch('/api/bot?path=/connect', { method: 'POST' });
      // Poll faster for a bit
      setTimeout(fetchStatus, 1000);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm('¿Desconectar del WhatsApp?')) return;
    setLoading(true);
    try {
      await fetch('/api/bot?path=/disconnect', { method: 'POST' });
      setStatus('disconnected');
      setQr('');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <h2>🤖 Estado del Bot</h2>
      
      <div style={{ margin: '1.5rem 0' }}>
        {status === 'connected' && (
          <div style={{ color: 'var(--success)', fontWeight: 'bold', fontSize: '1.2rem' }}>
            ✅ Conectado
          </div>
        )}
        
        {status === 'disconnected' && (
          <div style={{ color: 'var(--text-muted)' }}>
            🔴 Desconectado
          </div>
        )}

        {status === 'connecting' && (
          <div className="animate-pulse" style={{ color: 'var(--primary)' }}>
            🔄 Conectando...
          </div>
        )}

        {status === 'qr_ready' && qr && (
          <div>
            <p style={{ marginBottom: '1rem' }}>Escanea para conectar:</p>
            <div style={{ background: 'white', padding: '10px', display: 'inline-block', borderRadius: '8px' }}>
                <QRCodeSVG value={qr} size={200} />
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        {(status === 'disconnected' || status === 'qr_ready') && (
            <button onClick={handleConnect} disabled={loading || status === 'qr_ready'} className="btn btn-primary">
              {status === 'qr_ready' ? 'Escanea el QR' : 'Iniciar Bot'}
            </button>
        )}
        
        {status === 'connected' && (
            <button onClick={handleDisconnect} disabled={loading} className="btn btn-danger">
              Desconectar
            </button>
        )}
      </div>
    </div>
  );
}
