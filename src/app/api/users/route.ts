import { NextResponse } from 'next/server';
import { getUsers, saveUser } from '@/lib/db';
import { User } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  const users = await getUsers();
  return NextResponse.json(users);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate fields (basic)
    if (!body.name || !body.phone) {
      return NextResponse.json({ error: 'Name and Phone are required' }, { status: 400 });
    }

    const newUser: User = {
      id: body.id || uuidv4(),
      name: body.name,
      phone: body.phone, // Ensure formatting is correct on client or here
      role: body.role || 'employee',
      code: body.code || '',
      active: true,
      locationId: body.locationId || undefined,
    };

    await saveUser(newUser);
    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
