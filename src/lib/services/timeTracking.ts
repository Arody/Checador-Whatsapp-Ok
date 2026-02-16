import { AttendanceLog, User } from '../types';

export interface TimeSession {
  checkIn?: AttendanceLog;
  checkOut?: AttendanceLog;
  durationMinutes: number;
  status: 'complete' | 'missing_out' | 'missing_in';
}

export interface UserDailySummary {
  userId: string;
  userName: string;
  date: string; // YYYY-MM-DD
  sessions: TimeSession[];
  totalHours: number;
}

const TIMEZONE = 'America/Cancun';

export function getMexicoDate(dateStr: string | Date): Date {
  const date = new Date(dateStr);
  return new Date(date.toLocaleString('en-US', { timeZone: TIMEZONE }));
}

export function formatMexicoDate(date: Date): string {
    // Returns YYYY-MM-DD in Mexico time
    const mexicoDate = getMexicoDate(date);
    return mexicoDate.toISOString().split('T')[0];
}

export function calculateDailySummaries(logs: AttendanceLog[], users: User[]): UserDailySummary[] {
    const sessionsMap = new Map<string, TimeSession[]>(); // key: userId_date
    const summaries: UserDailySummary[] = [];

    // 1. Group logs by user and date
    // We need to match check-ins with subsequent check-outs
    // Sort logs by time asc
    const sortedLogs = [...logs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const userLogsFn = (userId: string) => sortedLogs.filter(l => l.userId === userId);

    users.forEach(user => {
        const uLogs = userLogsFn(user.id);
        if (uLogs.length === 0) return;

        // Group by Day
        const days = new Set(uLogs.map(l => formatMexicoDate(new Date(l.timestamp))));
        
        days.forEach(day => {
            const dayLogs = uLogs.filter(l => formatMexicoDate(new Date(l.timestamp)) === day);
            const sessions: TimeSession[] = [];
            
            let currentIn: AttendanceLog | undefined;

            dayLogs.forEach(log => {
                if (log.type === 'check-in') {
                    if (currentIn) {
                        // Double check-in? Treat previous as incomplete
                         sessions.push({
                            checkIn: currentIn,
                            durationMinutes: 0,
                            status: 'missing_out'
                        });
                    }
                    currentIn = log;
                } else if (log.type === 'check-out') {
                    if (currentIn) {
                        // Complete session
                        const durationMs = new Date(log.timestamp).getTime() - new Date(currentIn.timestamp).getTime();
                        const durationMinutes = Math.floor(durationMs / 1000 / 60);
                        sessions.push({
                            checkIn: currentIn,
                            checkOut: log,
                            durationMinutes,
                            status: 'complete'
                        });
                        currentIn = undefined;
                    } else {
                         // Check-out without check-in
                         sessions.push({
                            checkOut: log,
                            durationMinutes: 0,
                            status: 'missing_in'
                        });
                    }
                }
            });

            // If left open at end of day
            if (currentIn) {
                 sessions.push({
                    checkIn: currentIn,
                    durationMinutes: 0,
                    status: 'missing_out'
                });
            }

            const totalMinutes = sessions.reduce((acc, s) => acc + s.durationMinutes, 0);
            const totalHours = Number((totalMinutes / 60).toFixed(2));

            summaries.push({
                userId: user.id,
                userName: user.name,
                date: day,
                sessions,
                totalHours: totalHours
            });
        });
    });

    // Sort by date desc
    return summaries.sort((a, b) => b.date.localeCompare(a.date));
}
