'use client';
import { useState, useEffect } from 'react';
import { User, Location } from '@/lib/types';

export default function UserList() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [newUser, setNewUser] = useState({ name: '', phone: '', birthYear: '', role: 'employee', locationId: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', code: '', role: 'employee' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMe();
    fetchUsers();
    fetchLocations();
  }, []);

  async function fetchMe() {
    const res = await fetch('/api/auth/me');
    if (res.ok) setCurrentUser(await res.json());
  }

  const generateCode = (name: string, year: string) => {
    if (!name || !year) return '';
    const cleanName = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, '');
    return `${cleanName}${year}`;
  };

  async function fetchUsers() {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(data);
    } catch (error) {
      console.error('Failed to fetch users', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchLocations() {
    try {
      const res = await fetch('/api/locations');
      const data = await res.json();
      setLocations(data);
    } catch (error) {
      console.error('Failed to fetch locations', error);
    }
  }

  async function updateUser(updated: User) {
    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      fetchUsers();
    } catch (error) {
      console.error('Failed to update user', error);
    }
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    if (!newUser.name || !newUser.phone || !newUser.birthYear) return;
    const code = generateCode(newUser.name, newUser.birthYear);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newUser, code, locationId: newUser.locationId || undefined }),
      });
      if (res.ok) {
        setNewUser({ name: '', phone: '', birthYear: '', role: 'employee', locationId: '' });
        fetchUsers();
      }
    } catch (error) {
      console.error('Failed to add user', error);
    }
  }

  async function handleDeleteUser(id: string) {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
    try {
      await fetch(`/api/users/${id}`, { method: 'DELETE' });
      fetchUsers();
    } catch (error) {
      console.error('Failed to delete user', error);
    }
  }

  function handleToggleActive(user: User) {
    updateUser({ ...user, active: !user.active });
  }

  function handleUpdateLocation(user: User, locationId: string) {
    updateUser({ ...user, locationId: locationId || undefined });
  }

  function startEdit(user: User) {
    setEditingId(user.id);
    setEditForm({
      name: user.name,
      phone: user.phone,
      code: user.code,
      role: user.role
    });
  }

  function handleSave(user: User) {
    updateUser({
      ...user,
      name: editForm.name.trim() || user.name,
      phone: editForm.phone.trim() || user.phone,
      code: editForm.code.trim() || user.code,
      role: editForm.role as any
    });
    setEditingId(null);
  }

  return (
    <div className="card">
      <h2>👥 Empleados</h2>
      
      <form onSubmit={handleAddUser} className="grid grid-cols-2" style={{ gap: '1rem', marginTop: '1rem' }}>
        <input
          type="text"
          placeholder="Nombre Completo"
          value={newUser.name}
          onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
          required
        />
        <input
          type="text"
          placeholder="Teléfono (ej: 521...)"
          value={newUser.phone}
          onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
          required
        />
        <input
          type="number"
          placeholder="Año de Nacimiento (ej: 1990)"
          value={newUser.birthYear}
          onChange={(e) => setNewUser({ ...newUser, birthYear: e.target.value })}
          required
        />
        <select
          value={newUser.locationId}
          onChange={(e) => setNewUser({ ...newUser, locationId: e.target.value })}
          style={{ marginBottom: '1rem' }}
        >
          <option value="">📍 Sin ubicación asignada</option>
          {locations.map(loc => (
            <option key={loc.id} value={loc.id}>
              {loc.name} ({loc.radiusMeters}m)
            </option>
          ))}
        </select>
        <div style={{ alignSelf: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
           Generará código: <strong>{generateCode(newUser.name, newUser.birthYear) || '...'}</strong>
        </div>
        <button type="submit" className="btn btn-primary" style={{ gridColumn: 'span 2' }}>
          Agregar Empleado
        </button>
      </form>

      {loading ? (
        <p className="animate-pulse">Cargando...</p>
      ) : (
        <table>
          <thead>
            <tr>
                <th>Nombre y Teléfono</th>
              <th>Código</th>
              <th>Ubicación</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} style={{ opacity: user.active ? 1 : 0.5 }}>
                <td>
                  {editingId === user.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        style={{ padding: '0.25rem', fontSize: '0.9rem', marginBottom: 0 }}
                        placeholder="Nombre"
                      />
                      <input
                        type="text"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        style={{ padding: '0.25rem', fontSize: '0.8rem', marginBottom: 0 }}
                        placeholder="Teléfono"
                      />
                      {currentUser?.role === 'admin' && (
                        <select
                          value={editForm.role}
                          onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                          style={{ padding: '0.2rem', fontSize: '0.75rem', marginBottom: 0 }}
                        >
                          <option value="employee">Empleado</option>
                          <option value="manager">Gerente</option>
                          <option value="admin">Admin</option>
                        </select>
                      )}
                    </div>
                  ) : (
                    <div onClick={() => startEdit(user)} style={{ cursor: 'pointer' }} title="Clic para editar">
                      <div style={{ fontWeight: '500' }}>{user.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.phone}</div>
                      <div style={{ fontSize: '0.6rem', marginTop: '0.1rem' }}>
                        <span className="badge" style={{ padding: '1px 4px', background: '#334155', color: '#94a3b8' }}>{user.role}</span>
                      </div>
                    </div>
                  )}
                </td>
                <td>
                  {editingId === user.id ? (
                    <input
                      type="text"
                      value={editForm.code}
                      onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                      style={{ padding: '0.3rem', fontSize: '0.9rem', marginBottom: 0, width: '100px' }}
                    />
                  ) : (
                    <code
                        onClick={() => startEdit(user)}
                      style={{ background: '#1e293b', padding: '2px 6px', cursor: 'pointer', borderBottom: '1px dashed var(--text-muted)' }}
                      title="Clic para editar"
                    >
                      {user.code}
                    </code>
                  )}
                </td>
                <td>
                  <select
                    value={user.locationId || ''}
                    onChange={(e) => handleUpdateLocation(user, e.target.value)}
                    style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem', marginBottom: 0, minWidth: '120px' }}
                  >
                    <option value="">Sin ubicación</option>
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <span
                    className={`badge ${user.active ? 'badge-success' : 'badge-danger'}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleToggleActive(user)}
                    title={user.active ? 'Clic para desactivar' : 'Clic para activar'}
                  >
                    {user.active ? '✅ Activo' : '⛔ Inactivo'}
                  </span>
                </td>
                <td>
                  {editingId === user.id ? (
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button onClick={() => handleSave(user)} className="btn btn-primary" style={{ padding: '0.25rem 0.5rem' }}>
                        Guardar
                      </button>
                      <button onClick={() => setEditingId(null)} className="btn" style={{ padding: '0.25rem 0.5rem', background: '#475569' }}>
                        Cancelar
                      </button>
                    </div>
                  ) : (
                      <button onClick={() => handleDeleteUser(user.id)} className="btn btn-danger" style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}>
                        🗑️
                      </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
