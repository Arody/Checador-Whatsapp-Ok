'use client';
import { useState, useEffect } from 'react';
import { Location } from '@/lib/types';

export default function LocationManager() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [newLoc, setNewLoc] = useState({ name: '', lat: '', lng: '', radiusMeters: '100' });
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchLocations(); }, []);

  async function fetchLocations() {
    try {
      const res = await fetch('/api/locations');
      const data = await res.json();
      setLocations(data);
    } catch (error) {
      console.error('Failed to fetch locations', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddLocation(e: React.FormEvent) {
    e.preventDefault();
    if (!newLoc.name || !newLoc.lat || !newLoc.lng || !newLoc.radiusMeters) return;

    try {
      const res = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLoc),
      });
      if (res.ok) {
        setNewLoc({ name: '', lat: '', lng: '', radiusMeters: '100' });
        fetchLocations();
      }
    } catch (error) {
      console.error('Failed to add location', error);
    }
  }

  async function handleDeleteLocation(id: string) {
    if (!confirm('¿Eliminar esta ubicación?')) return;
    try {
      await fetch(`/api/locations/${id}`, { method: 'DELETE' });
      fetchLocations();
    } catch (error) {
      console.error('Failed to delete location', error);
    }
  }

  return (
    <div className="card">
      <h2>📍 Ubicaciones</h2>

      <form onSubmit={handleAddLocation} className="grid grid-cols-2" style={{ gap: '0.75rem', marginTop: '1rem' }}>
        <input
          type="text"
          placeholder="Nombre (ej: Oficina Central)"
          value={newLoc.name}
          onChange={(e) => setNewLoc({ ...newLoc, name: e.target.value })}
          required
          style={{ gridColumn: 'span 2' }}
        />
        <input
          type="text"
          placeholder="Latitud (ej: 17.9869)"
          value={newLoc.lat}
          onChange={(e) => setNewLoc({ ...newLoc, lat: e.target.value })}
          required
        />
        <input
          type="text"
          placeholder="Longitud (ej: -92.9475)"
          value={newLoc.lng}
          onChange={(e) => setNewLoc({ ...newLoc, lng: e.target.value })}
          required
        />
        <input
          type="number"
          placeholder="Radio (metros)"
          value={newLoc.radiusMeters}
          onChange={(e) => setNewLoc({ ...newLoc, radiusMeters: e.target.value })}
          min="10"
          max="5000"
          required
        />
        <div style={{ alignSelf: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Radio: <strong>{newLoc.radiusMeters || '100'}m</strong>
        </div>
        <button type="submit" className="btn btn-primary" style={{ gridColumn: 'span 2' }}>
          Agregar Ubicación
        </button>
      </form>

      {loading ? (
        <p className="animate-pulse">Cargando...</p>
      ) : locations.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', marginTop: '1rem', textAlign: 'center' }}>
          No hay ubicaciones registradas
        </p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Coordenadas</th>
              <th>Radio</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {locations.map((loc) => (
              <tr key={loc.id}>
                <td>{loc.name}</td>
                <td style={{ fontSize: '0.85rem' }}>
                  <code style={{ background: '#1e293b', padding: '2px 4px' }}>
                    {loc.lat?.toFixed(4) ?? 'N/A'}, {loc.lng?.toFixed(4) ?? 'N/A'}
                  </code>
                </td>
                <td>
                  <span className="badge badge-success">{loc.radiusMeters}m</span>
                </td>
                <td>
                  <button
                    onClick={() => handleDeleteLocation(loc.id)}
                    className="btn btn-danger"
                    style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
