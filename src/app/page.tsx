import UserList from '@/components/UserList';
import LogViewer from '@/components/LogViewer';
import BotManager from '@/components/BotManager';
import LocationManager from '@/components/LocationManager';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function Home() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session');

  if (!session) {
    redirect('/login');
  }

  const user = JSON.parse(session.value);
  const isAdmin = user.role === 'admin';

  return (
    <main className="container">
      <header style={{ marginBottom: '3rem', textAlign: 'center', position: 'relative' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
          <span style={{ color: '#6366f1' }}>Kadmiel</span> Checador
        </h1>
        <p style={{ color: '#94a3b8' }}>Sistema de Gestión de Asistencia vía WhatsApp</p>
        <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#cbd5e1' }}>
          Hola, <strong>{user.name}</strong> ({user.role === 'manager' ? 'Gerente' : 'Admin'})
        </div>

        <div style={{ position: 'absolute', top: 0, right: 0 }}>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="btn btn-danger" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
              Cerrar Sesión
            </button>
          </form>
        </div>

        <div style={{ marginTop: '1.5rem' }}>
          <a href="/reports" className="btn btn-primary" style={{ textDecoration: 'none', padding: '0.75rem 1.5rem', fontSize: '1rem' }}>
            📊 Ver Reporte de Horas
          </a>
        </div>
      </header>

      <div className="grid grid-cols-2" style={{ gap: '2rem' }}>
        <div>
          {isAdmin && <BotManager />}
          {isAdmin && <LocationManager />}
          <UserList />
          <div className="card">
            <h3>📱 Instrucciones</h3>
            <ol style={{ marginLeft: '1.5rem', marginTop: '1rem', color: '#94a3b8' }}>
              {isAdmin && <li style={{ marginBottom: '0.5rem' }}>Agrega ubicaciones con coordenadas y radio.</li>}
              <li style={{ marginBottom: '0.5rem' }}>Agrega empleados y asígnales una ubicación.</li>
              <li style={{ marginBottom: '0.5rem' }}>El empleado envía <strong>E</strong>+código (Entrada) o <strong>S</strong>+código (Salida).</li>
              <li style={{ marginBottom: '0.5rem' }}>El bot pedirá la <strong>Ubicación Actual</strong> y verificará que esté dentro del radio.</li>
            </ol>
          </div>
        </div>
        <div>
          <LogViewer isAdmin={isAdmin} />
        </div>
      </div>
    </main>
  );
}
