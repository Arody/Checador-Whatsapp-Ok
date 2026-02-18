import { NextResponse } from 'next/server';
import { getLocations, saveLocation } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session');

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const currentUser = JSON.parse(session.value);
  const locations = await getLocations();

  if (currentUser.role === 'admin') {
    return NextResponse.json(locations);
  } else if (currentUser.role === 'manager') {
    const myLocation = locations.filter(l => l.id === currentUser.locationId);
    return NextResponse.json(myLocation);
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

  if (currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can create locations' }, { status: 403 });
  }

  const body = await request.json();

  const lat = parseFloat(String(body.lat).replace(/[^\d.\-]/g, ''));
  let lng = parseFloat(String(body.lng).replace(/[^\d.\-]/g, ''));

  // Mexico is in the western hemisphere — longitude must be negative
  if (lng > 0) lng = -lng;

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: 'Coordenadas inválidas' }, { status: 400 });
  }

  const location = {
    id: body.id || uuidv4(),
    name: body.name,
    lat,
    lng,
    radiusMeters: parseInt(body.radiusMeters, 10) || 100,
  };
  await saveLocation(location);
  return NextResponse.json(location, { status: 201 });
}

export async function PUT(request: Request) {
  const cookieStore = await cookies();
  const session = cookieStore.get('session');

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const currentUser = JSON.parse(session.value);

  if (currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can update locations' }, { status: 403 });
  }

  const body = await request.json();

  if (!body.id) {
    return NextResponse.json({ error: 'Location ID is required' }, { status: 400 });
  }

  const lat = parseFloat(String(body.lat).replace(/[^\d.\-]/g, ''));
  let lng = parseFloat(String(body.lng).replace(/[^\d.\-]/g, ''));

  // Mexico is in the western hemisphere — longitude must be negative
  if (lng > 0) lng = -lng;

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: 'Coordenadas inválidas' }, { status: 400 });
  }

  const location = {
    id: body.id,
    name: body.name,
    lat,
    lng,
    radiusMeters: parseInt(body.radiusMeters, 10) || 100,
  };

  await saveLocation(location);
  return NextResponse.json(location, { status: 200 });
}
