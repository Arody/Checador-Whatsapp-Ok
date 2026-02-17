import { NextResponse } from 'next/server';
import { getUsers, saveUser } from '@/lib/db';
import { User } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session');

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const currentUser = JSON.parse(session.value);
  const users = await getUsers();

  if (currentUser.role === 'admin') {
    return NextResponse.json(users);
  } else if (currentUser.role === 'manager') {
    // Return only users in manager's location
    const managedUsers = users.filter(u => u.locationId === currentUser.locationId);
    return NextResponse.json(managedUsers);
  } else {
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const session = cookieStore.get('session');

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const currentUser = JSON.parse(session.value);

  try {
    const body = await request.json();
    
    // Validate fields (basic)
    if (!body.name || !body.phone) {
      return NextResponse.json({ error: 'Name and Phone are required' }, { status: 400 });
    }

    // Identify locationId
    let locationId = body.locationId;
    if (currentUser.role === 'manager') {
      // Force manager's location
      locationId = currentUser.locationId;
    }

    const newUser: User = {
      id: body.id || uuidv4(),
      name: body.name,
      phone: body.phone,
      role: body.role || 'employee',
      code: body.code || '',
      active: body.active !== undefined ? body.active : true,
      locationId: locationId || undefined,
      username: body.username,
      password: body.password,
    };

    await saveUser(newUser);
    return NextResponse.json(newUser, { status: body.id ? 200 : 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
