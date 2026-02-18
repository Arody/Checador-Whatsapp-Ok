
import { getLogs, getUsers } from '@/lib/db';
import { calculateDailySummaries } from '@/lib/services/timeTracking';
import DateFilter from '@/components/DateFilter';
import Link from 'next/link';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Reporte de Asistencia | Kadmiel',
};

// Define searchParams type. 
// Note: In Next.js 15, searchParams is a Promise. We'll handle it assuming it might be awaitable.
interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function ReportsPage(props: PageProps) {
  // Await searchParams to be safe for Next 15 compatibility
  const searchParams = await props.searchParams;
  const filterDate = typeof searchParams.date === 'string' ? searchParams.date : undefined;

  const logs = await getLogs();
  const users = await getUsers();
  let summaries = calculateDailySummaries(logs, users);
  
  if (filterDate) {
    summaries = summaries.filter(s => s.date === filterDate);
  }

  // Calculate grand total hours
  const totalHours = summaries.reduce((acc, s) => acc + s.totalHours, 0);

  return (
    <main className="container">
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
           <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📊 Reporte de Horas</h1>
           <p style={{ color: '#94a3b8' }}>Visualiza las horas trabajadas por día</p>
        </div>
        
        <Link href="/" className="btn" style={{ background: '#334155', color: 'white', textDecoration: 'none' }}>
          ← Volver al Inicio
        </Link>
      </header>
      
      <div className="card">
        <DateFilter />
        
        <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
              <thead>
                <tr style={{ background: 'var(--surface)', borderBottom: '2px solid var(--border)' }}>
                  <th>Fecha</th>
                  <th>Trabajador</th>
                  <th>Entrada</th>
                  <th>Salida</th>
                  <th>Duración</th>
                  <th>Estado</th>
                <th>Evidencia</th>
                </tr>
              </thead>
              <tbody>
                {summaries.map((summary) => (
                   summary.sessions.map((session, sIdx) => {
                      const isFirst = sIdx === 0;
                      const rowSpan = summary.sessions.length;
                      
                      return (
                        <tr key={`${summary.userId}-${summary.date}-${sIdx}`} style={{ borderBottom: isFirst && rowSpan > 1 ? 'none' : '1px solid var(--border)' }}>
                          {isFirst && (
                            <td rowSpan={rowSpan} style={{ verticalAlign: 'top', fontWeight: 600, borderRight: '1px solid var(--border)' }}>{summary.date}</td>
                          )}
                          {isFirst && (
                            <td rowSpan={rowSpan} style={{ verticalAlign: 'top', fontWeight: 600, borderRight: '1px solid var(--border)' }}>{summary.userName}</td>
                          )}
                          <td>{session.checkIn ? new Date(session.checkIn.timestamp).toLocaleTimeString('es-MX', { timeZone: 'America/Mexico_City', hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                          <td>{session.checkOut ? new Date(session.checkOut.timestamp).toLocaleTimeString('es-MX', { timeZone: 'America/Mexico_City', hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                          <td style={{ fontWeight: session.durationMinutes > 0 ? 600 : 400 }}>
                            {session.durationMinutes > 0 ? `${(session.durationMinutes / 60).toFixed(2)} hrs` : '-'}
                          </td>
                          <td>
                            <span className={`badge ${session.status === 'complete' ? 'badge-success' : 'badge-danger'}`}>
                              {session.status === 'complete' ? 'Completado' : session.status === 'missing_out' ? '⚠️ Sin Salida' : '⚠️ Sin Entrada'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              {session.checkIn?.selfiePath && (
                                <a href={`/api/uploads?path=${session.checkIn.selfiePath}`} target="_blank" rel="noopener noreferrer">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={`/api/uploads?path=${session.checkIn.selfiePath}`}
                                    alt="Entrada"
                                    style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', border: '2px solid #22c55e' }}
                                    title="Foto de Entrada"
                                  />
                                </a>
                              )}
                              {session.checkOut?.selfiePath && (
                                <a href={`/api/uploads?path=${session.checkOut.selfiePath}`} target="_blank" rel="noopener noreferrer">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={`/api/uploads?path=${session.checkOut.selfiePath}`}
                                    alt="Salida"
                                    style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', border: '2px solid #ef4444' }}
                                    title="Foto de Salida"
                                  />
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                   })
                ))}
                {summaries.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>No hay registros para la fecha seleccionada.</td></tr>
                )}
                
                 {/* Total Row */}
                 {summaries.length > 0 && (
                    <tr style={{ background: 'var(--surface)', fontWeight: 700, borderTop: '2px solid var(--border)' }}>
                  <td colSpan={5} style={{ textAlign: 'right', paddingRight: '1rem' }}>Total Horas en vista:</td>
                        <td colSpan={2} style={{ color: 'var(--primary)', fontSize: '1.1rem' }}>{totalHours.toFixed(2)} hrs</td>
                    </tr>
                 )}
              </tbody>
            </table>
        </div>
      </div>
    </main>
  );
}
