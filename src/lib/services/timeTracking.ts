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

const TIMEZONE = 'America/Mexico_City';

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

export function getUserMonthlyReport(logs: AttendanceLog[], userId: string): {
    userName: string;
    monthName: string;
    days: { date: string; hours: number }[];
    totalHours: number
} {
    // 1. Filter logs for this user
    const userLogs = logs.filter(l => l.userId === userId);
    if (userLogs.length === 0) {
        return { userName: '', monthName: '', days: [], totalHours: 0 };
    }

    // 2. Identify current month in Mexico Time
    const now = new Date();
    const mexicoNow = new Date(now.toLocaleString('en-US', { timeZone: TIMEZONE }));
    const currentMonth = mexicoNow.getMonth(); // 0-11
    const currentYear = mexicoNow.getFullYear();

    const monthName = mexicoNow.toLocaleDateString('es-MX', { month: 'long', year: 'numeric', timeZone: TIMEZONE });

    // 3. Filter logs for THIS month only
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

    // Helper: is log in current month (Mexico time)?
    const currentMonthLogs = userLogs.filter(l => {
        const logDateV = new Date(l.timestamp);
        const logMexico = new Date(logDateV.toLocaleString('en-US', { timeZone: TIMEZONE }));
        return logMexico.getMonth() === currentMonth && logMexico.getFullYear() === currentYear;
    });

    if (currentMonthLogs.length === 0) {
        return { userName: userLogs[0].userName, monthName, days: [], totalHours: 0 };
    }

    // 4. Calculate daily summaries using existing logic
    // We create a dummy user object just to satisfy the function signature
    const dummyUser: User = {
        id: userId,
        name: userLogs[0].userName,
        phone: '',
        role: 'employee',
        code: '',
        active: true
    };

    const dailySummaries = calculateDailySummaries(currentMonthLogs, [dummyUser]);

    // 5. Transform to simple format
    const days = dailySummaries.filter(d => d.totalHours > 0).map(s => ({
        date: s.date, // Already formatted YYYY-MM-DD
        hours: s.totalHours
    }));

    // Sort by date asc (oldest first)
    days.sort((a, b) => a.date.localeCompare(b.date));

    const totalHours = days.reduce((sum, d) => sum + d.hours, 0);

    return {
        userName: dummyUser.name,
        monthName,
        days,
        totalHours: Number(totalHours.toFixed(2))
    };
}
