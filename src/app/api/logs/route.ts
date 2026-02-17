import { NextResponse } from 'next/server';
import { getLogs, getUsers } from '@/lib/db';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session');

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const currentUser = JSON.parse(session.value);
  const logs = await getLogs();

  if (currentUser.role === 'admin') {
    return NextResponse.json(logs);
  } else if (currentUser.role === 'manager') {
    const users = await getUsers();
    // Get IDs of users in my location
    const myUserIds = new Set(users.filter(u => u.locationId === currentUser.locationId).map(u => u.id));

    // Filter logs for those users
    const filteredLogs = logs.filter(log => myUserIds.has(log.userId));
    return NextResponse.json(filteredLogs);
  } else {
    return NextResponse.json([]);
  }
}
