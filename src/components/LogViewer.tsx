'use client';
import { useState, useEffect } from 'react';
import { AttendanceLog } from '@/lib/types';

export default function LogViewer() {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  async function fetchLogs() {
    try {
      const res = await fetch('/api/logs');
      const data = await res.json();
      // Sort by timestamp desc locally if API doesn't
      data.sort((a: AttendanceLog, b: AttendanceLog) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setLogs(data);
    } catch (error) {
      console.error('Failed to fetch logs', error);
    } finally {
      setLoading(false);
    }
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleString('es-MX', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  return (
    <div className="card">
      <h2>🕒 Registros de Asistencia</h2>
      {loading ? (
        <p className="animate-pulse">Cargando...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Tipo</th>
              <th>Hora</th>
              <th>Ubicación</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{log.userName}</td>
                <td>
                  <span className={`badge ${log.type === 'check-in' ? 'badge-success' : 'badge-danger'}`}>
                    {log.type === 'check-in' ? 'Entrada' : 'Salida'}
                  </span>
                </td>
                <td>{formatTime(log.timestamp)}</td>
                <td>
                  {log.location ? (
                    <a 
                      href={`https://www.google.com/maps?q=${log.location.lat},${log.location.lng}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 underline"
                      style={{ color: '#6366f1' }}
                    >
                      Ver Mapa
                    </a>
                  ) : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
